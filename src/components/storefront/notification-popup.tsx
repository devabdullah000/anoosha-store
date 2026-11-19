"use client";
import { NOTIFICATION_BUTTON_TEXT } from "@/lib/constants";
import { useEffect, useId, useRef } from "react";
import { LuCheck, LuInfo, LuTriangleAlert, LuX } from "react-icons/lu";
export type NotificationVariant = "success" | "info" | "error";
export type NotificationPopupProps = {
  open: boolean;
  title: string;
  description: string;
  variant?: NotificationVariant;
  durationMs?: number;
  onClose: () => void;
};
export default function NotificationPopup({
  open,
  title,
  description,
  variant = "info",
  durationMs = 5000,
  onClose,
}: NotificationPopupProps) {
  const id = useId();
  const descId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previous.current = document.activeElement as HTMLElement;
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(onClose, Math.max(1000, durationMs));
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      previous.current?.focus();
    };
  }, [open, onClose, durationMs]);
  if (!open) return null;
  const Icon =
    variant === "success"
      ? LuCheck
      : variant === "error"
        ? LuTriangleAlert
        : LuInfo;
  const color =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700"
      : variant === "error"
        ? "bg-rose-50 text-rose-700"
        : "bg-indigo-50 text-indigo-700";
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[5px]"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={descId}
        className="w-full max-w-md rounded-[1.45rem] bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl"
      >
        <div className="rounded-[1.4rem] bg-white p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${color}`}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id={id}
                className="text-lg font-extrabold tracking-tight text-slate-900"
              >
                {title}
              </h2>
              <p id={descId} className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close notification"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-800"
            >
              <LuX />
            </button>
          </div>
          <button
            ref={button}
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            {NOTIFICATION_BUTTON_TEXT}
          </button>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="notification-progress h-full bg-gradient-to-r from-pink-400 via-indigo-500 to-cyan-400"
              style={{
                width: "100%",
                animation: `anoosha-notification-progress ${Math.max(1000, durationMs)}ms linear forwards`,
              }}
            />
          </div>
          <style>
            {
              "@keyframes anoosha-notification-progress { from {width:100%} to {width:0%} } @media(prefers-reduced-motion:reduce){.notification-progress{animation:none}}"
            }
          </style>
        </div>
      </div>
    </div>
  );
}
