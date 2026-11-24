"use client";

import { useState, type FormEvent } from "react";
import {
  LuArrowUpRight,
  LuCircleCheck,
  LuLoaderCircle,
  LuSend,
} from "react-icons/lu";
import { SUBJECT_OPTIONS,INPUT_CLASS as inputClass, LABEL_CLASS as labelClass } from "@/lib/constants";
import Link from "next/link";
type ContactField = "name" | "email" | "orderNumber" | "subject" | "message";
type ContactValues = Record<ContactField, string>;
const emptyValues: ContactValues = {
  name: "",
  email: "",
  orderNumber: "",
  subject: "general",
  message: "",
};

export default function ContactForm() {
  const [values, setValues] = useState<ContactValues>(emptyValues);
  const [website, setWebsite] = useState(""); // Honeypot; must stay empty.
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  const change = (field: ContactField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (status !== "idle") {
      setStatus("idle");
      setFeedback("");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("idle");
    setFeedback("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ ...values, website }),
      });
      const raw: unknown = await response.json().catch(() => null);
      const result =
        raw &&
        typeof raw === "object" &&
        "message" in raw &&
        typeof raw.message === "string"
          ? raw.message
          : null;
      if (!response.ok)
        throw new Error(
          result || "We could not send your message. Please email us instead.",
        );
      setStatus("success");
      setFeedback(
        "Your message has been sent. We'll review it and get back to you using the contact details you provided.",
      );
      setValues(emptyValues);
      setWebsite("");
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to send message right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="space-y-5"
      noValidate={false}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Your name <span className="text-rose-500">*</span>
          <input
            className={inputClass}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            name="name"
            value={values.name}
            onChange={(event) => change("name", event.target.value)}
            placeholder="Your full name"
            disabled={busy}
          />
        </label>
        <label className={labelClass}>
          Email address <span className="text-rose-500">*</span>
          <input
            className={inputClass}
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            name="email"
            value={values.email}
            onChange={(event) => change("email", event.target.value)}
            placeholder="you@example.com"
            disabled={busy}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          How can we help? <span className="text-rose-500">*</span>
          <select
            className={inputClass}
            required
            name="subject"
            value={values.subject}
            onChange={(event) => change("subject", event.target.value)}
            disabled={busy}
          >
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Order number{" "}
          <span className="text-xs font-normal text-slate-400">
            (if applicable)
          </span>
          <input
            className={inputClass}
            maxLength={80}
            name="orderNumber"
            value={values.orderNumber}
            onChange={(event) => change("orderNumber", event.target.value)}
            placeholder="e.g. your order ID"
            disabled={busy}
          />
        </label>
      </div>
      <label className={labelClass}>
        Your message <span className="text-rose-500">*</span>
        <textarea
          className={`${inputClass} min-h-36 resize-y py-3.5`}
          required
          minLength={15}
          maxLength={3000}
          rows={6}
          name="message"
          value={values.message}
          onChange={(event) => change("message", event.target.value)}
          placeholder="Tell us a little about your question or order..."
          disabled={busy}
        />
      </label>
      {/* Bots that fill this hidden field receive a harmless success response. */}
      <div
        className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-6 text-slate-500">
          Your details are used to respond to your enquiry. See our{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-indigo-700 hover:underline"
            prefetch={false}
          >
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="submit"
          disabled={busy}
          className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-indigo-600 to-cyan-500 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/15 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
        >
          {busy ? (
            <LuLoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
          ) : (
            <LuSend aria-hidden="true" className="h-4 w-4" />
          )}
          {busy ? "Sending message..." : "Send message"}
          {!busy && (
            <LuArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          )}
        </button>
      </div>
      {status !== "idle" && (
        <div
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm leading-6 ${status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}
        >
          {status === "success" && (
            <LuCircleCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          )}
          {feedback}
        </div>
      )}
    </form>
  );
}
