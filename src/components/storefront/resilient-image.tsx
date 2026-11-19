"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { LuImageOff } from "react-icons/lu";

type ResilientImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "onError"
> & {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  placeholderClassName?: string;
};

type Stage = "primary" | "retry" | "fallback" | "failed";
type ImageState = {
  identity: string;
  stage: Stage;
  retryToken: number;
};

/**
 * Images first load from the existing R2 custom domain. A failed response is
 * retried once with a fresh query parameter (as in the admin image preview),
 * then the existing same-origin, publication-checked R2 Worker route is tried.
 * Only failed URLs get a cache-busting parameter, so normal CDN caching stays
 * intact. No DB schema or image upload changes are required.
 */
export default function ResilientImage({
  src,
  fallbackSrc,
  alt,
  className,
  placeholderClassName,
  ...props
}: ResilientImageProps) {
  const primary = src?.trim() || null;
  const backup = fallbackSrc?.trim() || null;
  const identity = `${primary ?? ""}\n${backup ?? ""}`;

  const [state, setState] = useState<ImageState>({
    identity,
    stage: primary ? "primary" : backup ? "fallback" : "failed",
    retryToken: 0,
  });

  // Prop-driven image changes reset the sequence even before the effect runs.
  const current: ImageState =
    state.identity === identity
      ? state
      : {
          identity,
          stage: primary ? "primary" : backup ? "fallback" : "failed",
          retryToken: 0,
        };

  useEffect(() => {
    setState({
      identity,
      stage: primary ? "primary" : backup ? "fallback" : "failed",
      retryToken: 0,
    });
  }, [identity, primary, backup]);

  const imageUrl =
    current.stage === "primary"
      ? primary
      : current.stage === "retry" && primary
        ? `${primary}${primary.includes("?") ? "&" : "?"}image_retry=${current.retryToken}`
        : current.stage === "fallback"
          ? backup
          : null;

  const handleError = () => {
    setState((previous) => {
      // Ignore obsolete network callbacks from an earlier product/image.
      const last = previous.identity === identity ? previous : current;

      if (
        last.stage === "primary" &&
        primary &&
        /^https?:\/\//i.test(primary)
      ) {
        return { identity, stage: "retry", retryToken: Date.now() };
      }

      if (
        (last.stage === "primary" || last.stage === "retry") &&
        backup &&
        backup !== primary
      ) {
        return { identity, stage: "fallback", retryToken: last.retryToken };
      }

      return { identity, stage: "failed", retryToken: last.retryToken };
    });
  };

  if (!imageUrl) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={
          placeholderClassName ??
          "grid h-full w-full place-items-center bg-slate-100 text-slate-300"
        }
      >
        {!placeholderClassName && (
          <LuImageOff className="h-10 w-10" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    // Next/Image remotePatterns are not required for the R2 custom domain.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={imageUrl}
      alt={alt ?? ""}
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
