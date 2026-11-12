import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { emailOTP, jwt } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "@/db/auth-schema";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

type AuthRuntimeEnv = CloudflareEnv & {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;

  RESEND_API_KEY: string;
  RESEND_FROM: string;
};

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing Cloudflare Worker secret/variable: ${name}`);
  }

  return value;
}

/**
 * Send transactional emails using Resend's HTTPS API.
 * Compatible with Cloudflare Workers.
 */
async function sendResendEmail({
  env,
  to,
  subject,
  html,
  text,
}: {
  env: AuthRuntimeEnv;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = required(env.RESEND_API_KEY, "RESEND_API_KEY");
  const from = required(env.RESEND_FROM, "RESEND_FROM");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    console.error("Resend email API failed:", {
      status: response.status,
      response: errorBody,
    });

    throw new Error(
      `Resend email delivery failed with HTTP ${response.status}`,
    );
  }
}

/**
 * Keyed OTP hashing prevents a D1-only disclosure
 * from exposing six-digit OTP codes.
 */
async function hashOtp(otp: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(otp),
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Create the auth instance inside a request
 * so the D1 binding is request-scoped.
 */
export function getAuthContext() {
  const { env: rawEnv } = getCloudflareContext();

  const env = rawEnv as AuthRuntimeEnv;

  const db = drizzle(env.DB, {
    schema: authSchema,
  });

  const baseURL = required(env.BETTER_AUTH_URL, "BETTER_AUTH_URL");

  const auth = betterAuth({
    appName: "Anoosha Store",

    baseURL,

    trustedOrigins: [baseURL],

    secret: required(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),

    // Normalize email addresses server-side. changed patch

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = ctx.body as
          | {
              email?: unknown;
              password?: unknown;
            }
          | undefined;

        // Always normalize email addresses.
        if (typeof body?.email === "string") {
          body.email = body.email.trim().toLowerCase();
        }

        // Apply this logic only to email/password signup.
        if (ctx.path !== "/sign-up/email" || typeof body?.email !== "string") {
          return;
        }

        const email = body.email;

        // Find an existing account in D1.
        const [existingUser] = await db
          .select({
            id: authSchema.user.id,
            emailVerified: authSchema.user.emailVerified,
          })
          .from(authSchema.user)
          .where(eq(authSchema.user.email, email))
          .limit(1);

        // New email: allow Better Auth to perform normal signup.
        if (!existingUser) {
          return;
        }

        // Existing verified email: completely block signup.
        if (existingUser.emailVerified) {
          throw new APIError("CONFLICT", {
            message:
              "This email is already registered. Please log in or use Forgot Password.",
          });
        }

        // Existing but unverified email:
        // Require a valid password before changing its hash.
        if (
          typeof body.password !== "string" ||
          body.password.length < 8 ||
          body.password.length > 128
        ) {
          return;
        }

        // Generate a password hash compatible with Better Auth.
        const newPasswordHash = await hashPassword(body.password);

        // Find the existing email/password credential.
        const [credentialAccount] = await db
          .select({
            id: authSchema.account.id,
          })
          .from(authSchema.account)
          .where(
            and(
              eq(authSchema.account.userId, existingUser.id),
              eq(authSchema.account.providerId, "credential"),
            ),
          )
          .limit(1);

        const now = new Date();

        if (credentialAccount) {
          // Update the existing password instead of creating
          // another user or credential.
          await db
            .update(authSchema.account)
            .set({
              password: newPasswordHash,
              updatedAt: now,
            })
            .where(eq(authSchema.account.id, credentialAccount.id));
        } else {
          // Restore the credential if the unverified user
          // does not have one.
          await db.insert(authSchema.account).values({
            id: crypto.randomUUID(),
            accountId: existingUser.id,
            providerId: "credential",
            userId: existingUser.id,
            password: newPasswordHash,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Continue to Better Auth.
        // Its existing signup/Email OTP handling will issue
        // the verification code.
      }),
    },

    // Cloudflare D1 + Drizzle.
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: authSchema.user,
        session: authSchema.session,
        account: authSchema.account,
        verification: authSchema.verification,
        jwks: authSchema.jwks,
      },
    }),

    // Email/password authentication.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },

    // Role is controlled by the server.
    // Public signup cannot assign admin privileges.
    user: {
      additionalFields: {
        role: {
          type: ["user", "admin"],
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },

    // One-year database-backed session.
    session: {
      expiresIn: ONE_YEAR_SECONDS,
      updateAge: ONE_WEEK_SECONDS,
    },

    // Google OAuth is intentionally not configured in Better Auth.
    // The independent Google flow is implemented under /api/google-auth and
    // creates only a signed HttpOnly application cookie, never D1 auth rows.

    plugins: [
      // Email OTP.
      emailOTP({
        otpLength: 6,

        expiresIn: 10 * 60,

        allowedAttempts: 5,

        storeOTP: {
          hash: (otp) =>
            hashOtp(
              otp,
              required(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
            ),
        },

        sendVerificationOnSignUp: true,

        overrideDefaultEmailVerification: true,

        // Send signup verification and password-reset OTPs.
        async sendVerificationOTP({ email, otp, type }) {
          const subject =
            type === "forget-password"
              ? "Reset your Anoosha Store password"
              : type === "email-verification"
                ? "Verify your Anoosha Store email"
                : "Your Anoosha Store sign-in code";

          const purpose =
            type === "forget-password"
              ? "reset your password"
              : type === "email-verification"
                ? "verify your email address"
                : "sign in";

          await sendResendEmail({
            env,
            to: email,
            subject,

            html: `
              <div style="
                font-family: Arial, sans-serif;
                max-width: 520px;
                margin: 0 auto;
                color: #111827;
              ">
                <h2>Anoosha Store</h2>

                <p>Use this code to ${purpose}:</p>

                <p style="
                  font-size: 30px;
                  font-weight: 700;
                  letter-spacing: 8px;
                ">
                  ${otp}
                </p>

                <p>
                  This code expires in 10 minutes.
                  Do not share it with anyone.
                </p>

                <p style="
                  color: #6b7280;
                  font-size: 12px;
                ">
                  If you did not request this code,
                  you can ignore this email.
                </p>
              </div>
            `,

            text: `
Your Anoosha Store code is ${otp}.
It expires in 10 minutes.
Do not share it with anyone.
            `.trim(),
          });
        },
      }),

      // Seven-day JWT.
      jwt({
        jwt: {
          expirationTime: "7d",

          definePayload: ({ user }) => ({
            sub: user.id,
            email: user.email,
            role: user.role,
          }),
        },
      }),
    ],
  });

  return {
    auth,
    db,
    env,
  };
}

export function getAuth() {
  return getAuthContext().auth;
}
