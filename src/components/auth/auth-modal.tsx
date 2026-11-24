"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { clearAccessTokenCache } from "@/lib/auth/access-token";
import { markGoogleSignInPending } from "@/lib/auth/google-login-pending";
import { setAuthProfile } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

type AuthMode = "login" | "signup" | "verify" | "forgot" | "reset";
type Role = "user" | "admin";
type FinishSignInMode = "read-database-role" | "force-user";

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("googleError") === "1"
    ) {
      setMode("login");
      setError("Google sign-in could not be completed. Please try again.");
      router.replace("/login", { scroll: false });
    }
  }, [router]);

  if (!open) return null;

  function changeMode(next: AuthMode) {
    setError("");
    setNotice("");
    setOtp("");
    setMode(next);
  }

  function backToLogin() {
    changeMode("login");
    router.replace("/login", { scroll: false });
  }

  async function finishSignIn(
    roleMode: FinishSignInMode = "read-database-role",
  ) {
    const result = await authClient.getSession({
      query: { disableCookieCache: true },
    });
    if (result.error || !result.data?.user) {
      throw new Error(
        result.error?.message ?? "The session could not be validated.",
      );
    }

    const user = result.data.user as typeof result.data.user & { role?: Role };
    // Login reads the role already assigned to the account in D1.
    // A newly verified signup is always a customer, never an admin.
    const role: Role =
      roleMode === "force-user"
        ? "user"
        : user.role === "admin"
          ? "admin"
          : "user";

    dispatch(setAuthProfile({ email: user.email, role }));
    clearAccessTokenCache();
    // AuthModal is rendered on /login: avoid onClose() triggering another
    // router.replace("/") before this post-login navigation.
    // Navigating to the destination obtains a fresh server-authorized page.
    router.replace(role === "admin" ? "/admin/dashboard" : "/");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.error) throw new Error(result.error.message);
      await finishSignIn("read-database-role");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      if (password !== confirmPassword)
        throw new Error("Passwords do not match.");
      if (password.length < 8)
        throw new Error("Password must contain at least 8 characters.");

      const result = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        // Keep the current no-extra-profile-fields signup flow.
        name: email.trim().toLowerCase(),
      });
      if (result.error) throw new Error(result.error.message);

      changeMode("verify");
      setNotice(
        "We sent a 6-digit verification code to your email. It expires in 10 minutes.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create account.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      const verification = await authClient.emailOtp.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (verification.error) throw new Error(verification.error.message);

      // Establish the same Better Auth session after verification. The new
      // signup is explicitly stored in Redux as role=user.
      const login = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (login.error) throw new Error(login.error.message);
      await finishSignIn("force-user");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The code could not be verified.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function resendVerificationCode() {
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });
      if (result.error) throw new Error(result.error.message);
      setNotice(
        "A new verification code has been sent. Use the latest code in your email.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to resend the code.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      if (result.error) throw new Error(result.error.message);
      changeMode("reset");
      setNotice(
        "If an account exists for this email, a 6-digit reset code has been sent. It expires in 10 minutes.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to request a reset code.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function resendResetCode() {
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      // Better Auth's password-reset OTP must be re-issued through this method;
      // sendVerificationOtp is only for email verification.
      const result = await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      if (result.error) throw new Error(result.error.message);
      setNotice(
        "If an account exists for this email, a new reset code has been sent. Use the latest code.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to resend the reset code.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      if (newPassword.length < 8)
        throw new Error("New password must contain at least 8 characters.");
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password: newPassword,
      });
      if (result.error) throw new Error(result.error.message);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      changeMode("login");
      setNotice(
        "Your password has been reset. Sign in with your new password.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to reset password.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  function handleGoogleSignIn() {
    setGoogleBusy(true);
    setError("");
    setNotice("");
    // This is a separate OAuth flow; it does not call Better Auth and does not
    // touch the email form's busy state or its button labels.
    try {
      // Recover the Google profile once after the OAuth full-page redirect.
      // Ordinary public navigation will make NO session requests.
      markGoogleSignInPending();
      window.location.assign("/api/google-auth/start?returnTo=%2F");
    } catch {
      setGoogleBusy(false);
      setError("Google sign-in could not be started. Please try again.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
  const primaryButton =
    "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
  const textButton =
    "inline-flex min-h-10 w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !emailBusy && !googleBusy)
          onClose();
      }}
    >
      <section
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        role="dialog"
        className="relative my-auto w-full max-w-[470px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_100px_rgba(2,6,23,0.35)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-500 via-blue-500 to-cyan-400" />
        <button
          type="button"
          aria-label="Close authentication"
          onClick={onClose}
          disabled={emailBusy || googleBusy}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
        >
          ×
        </button>

        <div className="px-5 pb-6 pt-8 sm:px-9 sm:pb-9 sm:pt-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-xs font-black tracking-tight text-white shadow-lg shadow-slate-300">
              AS
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[0.19em] text-slate-950">
                ANOOSHA STORE
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Mobile & gaming accessories
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h2
              id="auth-modal-title"
              className="text-2xl font-black tracking-tight text-slate-950 sm:text-[28px]"
            >
              {mode === "verify" && "Verify your email"}
              {mode === "forgot" && "Forgot your password?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === "login" &&
                "Sign in to manage your account and continue shopping."}
              {mode === "signup" &&
                "Create an account with your email address and a secure password."}
              {mode === "verify" &&
                `Enter the 6-digit verification code sent to ${email}.`}
              {mode === "forgot" && "We will email you a one-time reset code."}
              {mode === "reset" &&
                `Enter the latest code sent to ${email}, then choose a new password.`}
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-700"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm leading-5 text-blue-800"
            >
              {notice}
            </p>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Email address</span>
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <PasswordField
                label="Password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={setPassword}
                inputClass={inputClass}
                required
              />
              <div className="-mt-1 text-right">
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-sm font-semibold text-blue-700 underline-offset-4 transition hover:text-blue-900 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button
                className={primaryButton}
                disabled={emailBusy}
                type="submit"
              >
                {emailBusy ? "Signing in…" : "Login"}
              </button>
              <Divider />
              <GoogleButton busy={googleBusy} onClick={handleGoogleSignIn} />
              <p className="pt-1 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => changeMode("signup")}
                  className="font-bold text-slate-950 underline decoration-blue-400 decoration-2 underline-offset-4 hover:text-blue-700"
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Email address</span>
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <PasswordField
                label="Password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={setPassword}
                inputClass={inputClass}
                minLength={8}
                required
              />
              <PasswordField
                label="Confirm password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                inputClass={inputClass}
                minLength={8}
                required
              />
              <button
                className={primaryButton}
                disabled={emailBusy}
                type="submit"
              >
                {emailBusy ? "Sending verification code…" : "Create account"}
              </button>
              <Divider />
              <GoogleButton busy={googleBusy} onClick={handleGoogleSignIn} />
              <p className="pt-1 text-center text-sm text-slate-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="font-bold text-slate-950 underline decoration-blue-400 decoration-2 underline-offset-4 hover:text-blue-700"
                >
                  Login
                </button>
              </p>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <OtpField
                value={otp}
                onChange={setOtp}
                inputClass={inputClass}
                label="6-digit verification code"
              />
              <button
                className={primaryButton}
                disabled={emailBusy || otp.length !== 6}
                type="submit"
              >
                {emailBusy ? "Verifying…" : "Verify email and continue"}
              </button>
              <button
                type="button"
                onClick={resendVerificationCode}
                disabled={emailBusy}
                className={textButton}
              >
                {emailBusy ? "Please wait…" : "Resend verification code"}
              </button>
              <button
                type="button"
                onClick={backToLogin}
                className={textButton}
              >
                Back to login
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span>Email address</span>
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                className={primaryButton}
                disabled={emailBusy}
                type="submit"
              >
                {emailBusy ? "Requesting code…" : "Send reset code"}
              </button>
              <button
                type="button"
                onClick={backToLogin}
                className={textButton}
              >
                Back to login
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <OtpField
                value={otp}
                onChange={setOtp}
                inputClass={inputClass}
                label="6-digit reset code"
              />
              <PasswordField
                label="New password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={setNewPassword}
                inputClass={inputClass}
                minLength={8}
                required
              />
              <button
                className={primaryButton}
                disabled={emailBusy || otp.length !== 6}
                type="submit"
              >
                {emailBusy ? "Updating password…" : "Reset password"}
              </button>
              <button
                type="button"
                onClick={resendResetCode}
                disabled={emailBusy}
                className={textButton}
              >
                {emailBusy ? "Please wait…" : "Resend reset code"}
              </button>
              <button
                type="button"
                onClick={backToLogin}
                className={textButton}
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        or
      </span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function OtpField({
  label,
  value,
  onChange,
  inputClass,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        className={`${inputClass} text-center font-mono text-lg tracking-[0.45em]`}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="••••••"
        required
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
      />
    </label>
  );
}

function PasswordField({
  label,
  autoComplete,
  placeholder,
  value,
  onChange,
  inputClass,
  minLength,
  required,
}: {
  label: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <span className="relative block">
        <input
          className={`${inputClass} pr-12`}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-2 inline-flex w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"
      />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15 15 0 0 1-3 3.8M6.2 6.3C3.8 7.8 2.5 12 2.5 12s3.3 6 9.5 6c1.4 0 2.6-.3 3.7-.8"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
      />
    </svg>
  );
}

function GoogleButton({
  busy,
  onClick,
}: {
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.62 17.74 9.5 24 9.5Z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.59 5.89c4.42-4.08 7.15-10.08 7.15-17.54Z"
        />
        <path
          fill="#FBBC05"
          d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.98-6.19Z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.47 0 11.9-2.13 15.87-5.81l-7.59-5.89c-2.11 1.42-4.81 2.27-8.28 2.27-6.26 0-11.57-4.12-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        />
      </svg>
      {busy ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}
