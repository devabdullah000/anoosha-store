"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";

import { authClient } from "@/lib/auth-client";
import { clearAccessTokenCache } from "@/lib/auth/access-token";
import { clearAuthProfile } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

type AdminPasswordResetProps = {
  adminEmail: string;
};

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={disabled}
          placeholder={label}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-400 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c4.7 0 8.7 2.7 10 7a10.4 10.4 0 0 1-3.2 4.5M6.1 6.1A10.8 10.8 0 0 0 2 12c1.4 4.3 5.3 7 10 7 1.4 0 2.7-.2 3.9-.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Admin Settings: reset the signed-in administrator's password by email OTP.
 * The existing Better Auth flow handles password hashing, OTP verification,
 * and session revocation (revokeSessionsOnPasswordReset must be true).
 * Admin API routes must independently validate the authoritative DB session.
 */
export default function AdminPasswordReset({
  adminEmail,
}: AdminPasswordResetProps) {
  const dispatch = useAppDispatch();
  const email = adminEmail.trim().toLowerCase();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function validatePasswords(): string | null {
    if (newPassword.length < 8 || newPassword.length > 128) {
      return "New password must contain between 8 and 128 characters.";
    }
    if (newPassword !== confirmPassword) {
      return "New password and confirmation do not match.";
    }
    return null;
  }

  function showError(message: string) {
    setErrorMessage(message);
    toast.error(message);
  }

  async function requestResetOtp() {
    if (busy) return;

    const validationError = validatePasswords();
    if (validationError) return showError(validationError);
    if (!email) return showError("Administrator email is unavailable.");

    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await authClient.emailOtp.requestPasswordReset({
        email,
      });
      if (error) {
        throw new Error(error.message || "Unable to send the verification code.");
      }

      setOtp("");
      setOtpSent(true);
      toast.success("If this admin account exists, a reset code has been sent to its email.");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to send the verification code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const validationError = validatePasswords();
    if (validationError) return showError(validationError);
    if (!otpSent || !/^\d{6}$/.test(otp)) {
      return showError("Enter the six-digit code sent to your admin email.");
    }

    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });
      if (error) throw new Error(error.message || "Password reset failed.");

      // Existing Better Auth configuration revokes all database sessions.
      // Attempt to clear the HttpOnly session cookie on this device, too.
      try {
        await authClient.signOut();
      } catch {
        // The old session may already have been revoked; redirect regardless.
      }

      clearAccessTokenCache();
      dispatch(clearAuthProfile());
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setOtpSent(false);
      toast.success("Admin password updated. Sign in again with the new password.");

      // Full navigation clears client-side session caches in this tab.
      window.location.replace("/login");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to reset the password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-sm shadow-slate-900/5">
      <div className="rounded-[15px] bg-white p-5 sm:p-7">
        <h3 className="text-lg font-bold text-slate-900">
          Change administrator password
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Set a new password and confirm it with the code sent to your registered
          admin email. All existing admin sessions will be revoked.
        </p>

        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Verification email:{" "}
          <span className="break-all font-semibold text-slate-900">
            {adminEmail}
          </span>
        </div>

        <form
          onSubmit={(event) => void resetPassword(event)}
          className="mt-5 space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              id="admin-new-password"
              label="New password"
              value={newPassword}
              onChange={(value) => {
                setNewPassword(value);
                setErrorMessage("");
              }}
              disabled={busy}
            />
            <PasswordField
              id="admin-confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                setErrorMessage("");
              }}
              disabled={busy}
            />
          </div>

          {otpSent && (
            <div className="max-w-sm">
              <label
                htmlFor="admin-reset-otp"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email verification code <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                maxLength={6}
                value={otp}
                disabled={busy}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setErrorMessage("");
                }}
                placeholder="6-digit code"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm tracking-widest text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                The verification code expires after 10 minutes.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {errorMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {otpSent && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestResetOtp()}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resend code
              </button>
            )}

            {otpSent ? (
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Updating password..." : "Update password and sign out"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestResetOtp()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending code..." : "Send verification code"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
