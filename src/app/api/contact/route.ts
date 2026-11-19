import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

/** Public customer-contact endpoint. No D1 calls and no third-party SDK required. */
export const runtime = "nodejs";

const SUPPORT_INBOX = "anooshastoree@gmail.com";
const MAX_REQUEST_BYTES = 8_192;
const TOPICS = {
  general: "General enquiry",
  order: "Order assistance",
  cancel: "Cancel an order",
  shipping: "Shipping & delivery",
  return: "Returns & refunds",
} as const;

type ContactBody = {
  name: string;
  email: string;
  subject: keyof typeof TOPICS;
  orderNumber: string;
  message: string;
  website?: string;
};

type EmailEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validBody(value: unknown): value is ContactBody {
  if (!isObject(value)) return false;
  return (
    typeof value.name === "string" &&
    value.name.trim().length >= 2 &&
    value.name.trim().length <= 80 &&
    typeof value.email === "string" &&
    value.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()) &&
    typeof value.subject === "string" &&
    Object.prototype.hasOwnProperty.call(TOPICS, value.subject) &&
    typeof value.orderNumber === "string" &&
    value.orderNumber.trim().length <= 80 &&
    typeof value.message === "string" &&
    value.message.trim().length >= 15 &&
    value.message.trim().length <= 3000 &&
    (value.website === undefined || typeof value.website === "string")
  );
}
function safe(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function json(message: string, status = 200) {
  return NextResponse.json(
    { success: status === 200, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  // Browsers send Origin on cross-origin unsafe-method requests. Reject absent or mismatched origins.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return json("Invalid request origin.", 400);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return json("Expected a JSON request.", 400);
  }
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_REQUEST_BYTES) return json("Message is too long.", 400);

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_REQUEST_BYTES)
      return json("Message is too long.", 400);
    body = JSON.parse(raw) as unknown;
  } catch {
    return json("Invalid form data.", 400);
  }
  if (!validBody(body))
    return json("Check your name, email and message, then try again.", 400);

  // Spam-trap: do not email or reveal to automated senders that this was rejected.
  if (body.website?.trim()) return json("Your message has been received.");

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const subject = TOPICS[body.subject];
  const orderNumber = body.orderNumber.trim();
  const message = body.message.trim();

  try {
    // Resolve bindings inside the request, not at module scope (OpenNext build safety).
    const { env } = getCloudflareContext();
    const vars = env as unknown as EmailEnv;
    if (!vars.RESEND_API_KEY || !vars.RESEND_FROM) {
      console.error(
        "Contact email configuration missing RESEND_API_KEY or RESEND_FROM",
      );
      return json(
        "Contact form is temporarily unavailable. Please email us directly.",
        500,
      );
    }

    const plain = [
      `Anoosha Store contact request: ${subject}`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Order number: ${orderNumber || "Not supplied"}`,
      "",
      "Message:",
      message,
    ].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6">
      <h2 style="color:#4f46e5">Anoosha Store · Customer message</h2>
      <p><strong>Topic:</strong> ${safe(subject)}</p><p><strong>Name:</strong> ${safe(name)}</p>
      <p><strong>Email:</strong> ${safe(email)}</p><p><strong>Order:</strong> ${safe(orderNumber || "Not supplied")}</p>
      <hr style="border:0;border-top:1px solid #e2e8f0" />
      <div style="white-space:pre-wrap;overflow-wrap:anywhere">${safe(message)}</div></div>`;

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vars.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: vars.RESEND_FROM,
        to: [SUPPORT_INBOX],
        reply_to: email,
        subject: `Anoosha Store | ${subject}${orderNumber ? ` | ${orderNumber.replace(/[\r\n]/g, " ")}` : ""}`,
        text: plain,
        html,
      }),
    });
    if (!sent.ok) {
      // Do not leak Resend error contents or customer data to visitors.
      console.error("Resend contact email failed", sent.status);
      return json(
        "Unable to send the message at the moment. Please email us directly.",
        500,
      );
    }
    return json("Message sent successfully.");
  } catch (error) {
    console.error(
      "Contact form delivery failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json(
      "Unable to send the message at the moment. Please email us directly.",
      500,
    );
  }
}
