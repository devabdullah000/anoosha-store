"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/**
 * Image URLs are returned by D1 and fetched by the browser directly from the
 * R2 custom domain. A cached 404 can survive an upload; retry once with a
 * unique query string. Never mutate the persisted image URL or fetch R2 via API.
 */
export default function ProductImagePreview({
  src,
  alt,
  className = "h-full w-full object-cover",
  loading = "lazy",
}: Props) {
  const [state, setState] = useState({
    source: src,
    attempt: 0,
    failed: false,
  });
  const current =
    state.source === src ? state : { source: src, attempt: 0, failed: false };
  const canRetry = /^https?:\/\//.test(src);
  const displayUrl =
    current.attempt === 0 || !canRetry
      ? src
      : `${src}${src.includes("?") ? "&" : "?"}image_retry=${current.attempt}`;

  // Changing the actual image is not a mutation; no state stored in D1.
  useEffect(() => {
    setState({ source: src, attempt: 0, failed: false });
  }, [src]);

  const retry = () => {
    setState({ source: src, attempt: Date.now(), failed: false });
  };

  if (current.failed) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-slate-100 p-2 text-center"
        title={`Image failed to load: ${src}`}
      >
        <span aria-hidden="true" className="text-lg text-slate-400">
          ▧
        </span>
        <span className="text-[10px] font-medium leading-4 text-slate-500">
          Image unavailable
        </span>
        {canRetry && (
          <button
            type="button"
            onClick={retry}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        // Only the initial failure triggers an automatic cache-busting retry.
        // If the retry also fails, show a visible placeholder instead of a
        // broken-image icon. The admin can retry manually.
        if (canRetry && current.attempt === 0) retry();
        else setState({ source: src, attempt: current.attempt, failed: true });
      }}
    />
  );
}
