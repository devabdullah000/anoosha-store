
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  LuArrowLeft,
  LuCloudUpload,
  LuImagePlus,
  LuLoaderCircle,
  LuRefreshCw,
  LuSave,
  LuTimer,
  LuTrash2,
} from "react-icons/lu";

import ConfirmationPopup from "@/components/confirmation-popup";
import { MAX_SLIDES,MAX_FILE_SIZE, ALLOWED_TYPES, NO_BANNERS_TEXT, BUTTON_TEXT_TO_PUBLISH_SLIDE, NEW_SLIDE_UPLOAD_HEADING, BANNER_INTERVAL_DESCRIPTION, BANNER_INTERVAL_HEADING, LOADING_TEXT_FOR_BANNERS, BANNER_COMPONENT_MAIN_TEXT } from "@/lib/constants";

import type {
  HeroManifest,
  HeroSlide,
} from "@/lib/storefront/types";

type HeroSliderManagerProps = {
  embedded?: boolean;
};

type FieldName =
  | "title"
  | "eyebrow"
  | "description"
  | "buttonLabel"
  | "buttonHref";

type SlideFields = Record<FieldName, string>;

type Feedback = {
  message: string;
  error: boolean;
};

const API = "/api/admin/storefront/hero";

const FIELDS: {
  key: FieldName;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "title",
    label: "Headline",
    placeholder: "Made for your everyday",
  },
  {
    key: "eyebrow",
    label: "Eyebrow",
    placeholder: "Anoosha · The next collection",
  },
  {
    key: "description",
    label: "Description",
    placeholder: "A brief story behind this slide",
  },
  {
    key: "buttonLabel",
    label: "Button label",
    placeholder: "Explore the shop",
  },
  {
    key: "buttonHref",
    label: "Button link (local)",
    placeholder: "/shop",
  },
];

const createEmptySlide = (): SlideFields => ({
  title: "",
  eyebrow: "",
  description: "",
  buttonLabel: "Explore the shop",
  buttonHref: "/shop",
});

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-200 " +
  "bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
  "outline-none transition focus:border-indigo-300 " +
  "focus:ring-4 focus:ring-indigo-50";

async function parseResponse(
  response: Response,
): Promise<HeroManifest> {
  const payload: unknown = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    !("success" in payload) ||
    payload.success !== true ||
    !("data" in payload)
  ) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Unable to load or update slider.";

    throw new Error(message);
  }

  const manifest = (
    payload as { data: HeroManifest }
  ).data;

  if (
    !manifest ||
    !Array.isArray(manifest.slides) ||
    typeof manifest.intervalMs !== "number"
  ) {
    throw new Error("Invalid slider response.");
  }

  return manifest;
}

function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please select a JPEG, PNG, WebP, or AVIF image.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "The image must not exceed 8 MB.";
  }

  if (file.size === 0) {
    return "The selected image is empty.";
  }

  return null;
}

function createFormData(
  fields: SlideFields,
  file: File,
  id?: string,
): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value);
  }

  if (id) {
    data.append("id", id);
  }

  data.append("file", file);

  return data;
}

function getSlideFields(slide: HeroSlide): SlideFields {
  return {
    title: slide.title,
    eyebrow: slide.eyebrow,
    description: slide.description,
    buttonLabel: slide.buttonLabel,
    buttonHref: slide.buttonHref,
  };
}

export default function HeroSliderManager({
  embedded = false,
}: HeroSliderManagerProps) {
  const [manifest, setManifest] =
    useState<HeroManifest | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const [newSlide, setNewSlide] =
    useState<SlideFields>(createEmptySlide);

  const [newFile, setNewFile] =
    useState<File | null>(null);

  const [replacement, setReplacement] = useState<
    Record<string, File | null>
  >({});

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (message: string, error = false) => {
    setFeedback({ message, error });
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(API, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await parseResponse(response);

      setManifest(result);
      setFeedback(null);
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Unable to load slider.",
        true,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const request = async (
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    body?: FormData | string,
    url = API,
  ): Promise<HeroManifest> => {
    const response = await fetch(url, {
      method,
      body,
      credentials: "same-origin",
      cache: "no-store",
      headers:
        typeof body === "string"
          ? { "Content-Type": "application/json" }
          : undefined,
    });

    return parseResponse(response);
  };

  const perform = async (
    operation: () => Promise<HeroManifest>,
    successMessage: string,
  ) => {
    if (busy) return;

    try {
      setBusy(true);
      setFeedback(null);

      const updated = await operation();

      setManifest(updated);
      flash(successMessage);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save changes.";

      flash(message, true);
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const addSlide = async (event: FormEvent) => {
    event.preventDefault();

    if (busy) return;

    if (!newFile) {
      flash("Select an image to upload.", true);
      return;
    }

    if ((manifest?.slides.length ?? 0) >= MAX_SLIDES) {
      flash("A maximum of five slides is allowed.", true);
      return;
    }

    const validationError = validateImage(newFile);

    if (validationError) {
      flash(validationError, true);
      return;
    }

    try {
      await perform(
        () =>
          request(
            "POST",
            createFormData(newSlide, newFile),
          ),
        "Slide added successfully.",
      );

      setNewSlide(createEmptySlide());
      setNewFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch {
      // Error is displayed by perform().
    }
  };

  const patchSlide = (
    id: string,
    key: FieldName,
    value: string,
  ) => {
    setManifest((previous) =>
      previous
        ? {
            ...previous,
            slides: previous.slides.map((slide) =>
              slide.id === id
                ? { ...slide, [key]: value }
                : slide,
            ),
          }
        : previous,
    );
  };

  const saveSlideText = async (slide: HeroSlide) => {
    try {
      await perform(
        () =>
          request(
            "PATCH",
            JSON.stringify({
              id: slide.id,
              ...getSlideFields(slide),
            }),
          ),
        "Slide text saved successfully.",
      );
    } catch {
      // Error is displayed by perform().
    }
  };

  const replaceImage = async (slide: HeroSlide) => {
    const file = replacement[slide.id];

    if (!file) {
      flash("Choose a replacement image.", true);
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      flash(validationError, true);
      return;
    }

    try {
      await perform(
        () =>
          request(
            "PUT",
            createFormData(
              getSlideFields(slide),
              file,
              slide.id,
            ),
          ),
        "Slide image replaced successfully.",
      );

      setReplacement((previous) => ({
        ...previous,
        [slide.id]: null,
      }));
    } catch {
      // Error is displayed by perform().
    }
  };

  const removeSlide = async () => {
    if (!deleteId || busy) return;

    await perform(
      () =>
        request(
          "DELETE",
          undefined,
          `${API}?id=${encodeURIComponent(deleteId)}`,
        ),
      "Slide removed successfully.",
    );

    setDeleteId(null);
  };

  const setIntervalMs = (value: number) => {
    setManifest((previous) =>
      previous
        ? {
            ...previous,
            intervalMs: value,
          }
        : previous,
    );
  };

  const updateTimer = async () => {
    if (!manifest || busy) return;

    if (
      !Number.isFinite(manifest.intervalMs) ||
      manifest.intervalMs < 2500 ||
      manifest.intervalMs > 30000
    ) {
      flash(
        "Autoplay interval must be between 2.5 and 30 seconds.",
        true,
      );
      return;
    }

    try {
      await perform(
        () =>
          request(
            "PATCH",
            JSON.stringify({
              intervalMs: manifest.intervalMs,
            }),
          ),
        "Autoplay timing saved successfully.",
      );
    } catch {
      // Error is displayed by perform().
    }
  };

  return (
    <section className="min-w-0 space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {!embedded && (
            <Link
              href="/admin/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 transition hover:underline"
            >
              <LuArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          )}

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Storefront settings
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {BANNER_COMPONENT_MAIN_TEXT}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {BANNER_COMPONENT_MAIN_TEXT}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={busy || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
        >
          <LuRefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role={feedback.error ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
        >
          <LuLoaderCircle className="h-5 w-5 animate-spin text-indigo-600" />
          {LOADING_TEXT_FOR_BANNERS}
        </div>
      )}

      {manifest && (
        <>
          {/* Autoplay settings */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <LuTimer className="h-6 w-6" />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-slate-900">
                {BANNER_INTERVAL_HEADING}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {BANNER_INTERVAL_DESCRIPTION}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={2.5}
                max={30}
                step={0.5}
                aria-label="Autoplay time in seconds"
                value={manifest.intervalMs / 1000}
                onChange={(event) =>
                  setIntervalMs(
                    Math.round(
                      Number(event.target.value) * 1000,
                    ),
                  )
                }
                className="w-20 rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400"
              />

              <span className="text-xs text-slate-500">
                sec
              </span>

              <button
                type="button"
                disabled={busy}
                onClick={() => void updateTimer()}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          {/* New slide */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  {NEW_SLIDE_UPLOAD_HEADING}
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {manifest.slides.length} of {MAX_SLIDES} slots used
                  {" · "}
                  JPEG, PNG, WebP or AVIF
                  {" · "}
                  Maximum 8 MB
                </p>
              </div>

              <LuImagePlus className="h-6 w-6 shrink-0 text-indigo-500" />
            </div>

            <form
              onSubmit={addSlide}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              {FIELDS.map((field) => (
                <label
                  key={field.key}
                  className={
                    field.key === "description"
                      ? "sm:col-span-2"
                      : ""
                  }
                >
                  <span className="text-xs font-bold text-slate-700">
                    {field.label}
                  </span>

                  <input
                    type="text"
                    maxLength={
                      field.key === "description" ? 260 : 150
                    }
                    required={field.key === "title"}
                    placeholder={field.placeholder}
                    value={newSlide[field.key]}
                    onChange={(event) =>
                      setNewSlide((previous) => ({
                        ...previous,
                        [field.key]: event.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </label>
              ))}

              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-slate-700">
                  Banner image
                </span>

                <input
                  ref={fileRef}
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) =>
                    setNewFile(
                      event.target.files?.[0] ?? null,
                    )
                  }
                  className="mt-1.5 block w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-bold file:text-indigo-700"
                />
              </label>

              <button
                type="submit"
                disabled={
                  busy || manifest.slides.length >= MAX_SLIDES
                }
                className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LuCloudUpload className="h-4 w-4" />
                {BUTTON_TEXT_TO_PUBLISH_SLIDE}
              </button>
            </form>
          </div>

          {/* Existing slides */}
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900">
              Published slides{" "}
              <span className="text-sm font-semibold text-slate-400">
                ({manifest.slides.length})
              </span>
            </h2>

            {manifest.slides.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 sm:p-10">
                {NO_BANNERS_TEXT}
              </div>
            )}

            {manifest.slides.map((slide, index) => (
              <article
                key={slide.id}
                className="grid min-w-0 gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]"
              >
                {/* Image preview */}
                <div className="min-w-0">
                  <div className="overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      loading="lazy"
                      className="aspect-[4/3] h-auto w-full object-cover"
                    />
                  </div>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Slide {index + 1}
                  </p>
                </div>

                {/* Slide fields */}
                <div className="min-w-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className={
                          field.key === "description"
                            ? "sm:col-span-2"
                            : ""
                        }
                      >
                        <span className="text-[11px] font-bold text-slate-600">
                          {field.label}
                        </span>

                        <input
                          type="text"
                          maxLength={
                            field.key === "description"
                              ? 260
                              : 150
                          }
                          value={slide[field.key]}
                          onChange={(event) =>
                            patchSlide(
                              slide.id,
                              field.key,
                              event.target.value,
                            )
                          }
                          className={INPUT_CLASS}
                        />
                      </label>
                    ))}
                  </div>

                  {/* Text management */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void saveSlideText(slide)
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-800 disabled:opacity-50"
                    >
                      <LuSave className="h-4 w-4" />
                      Save text
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setDeleteId(slide.id)
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <LuTrash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>

                  {/* Replace slide image */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    <input
                      type="file"
                      aria-label={`Replace slide ${index + 1} image`}
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={(event) =>
                        setReplacement((previous) => ({
                          ...previous,
                          [slide.id]:
                            event.target.files?.[0] ?? null,
                        }))
                      }
                      className="min-w-0 flex-1 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-bold file:text-indigo-700"
                    />

                    <button
                      type="button"
                      disabled={
                        busy || !replacement[slide.id]
                      }
                      onClick={() =>
                        void replaceImage(slide)
                      }
                      className="rounded-xl border border-indigo-200 px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40"
                    >
                      Replace image
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Existing confirmation component */}
      <ConfirmationPopup
        open={Boolean(deleteId)}
        title="Remove this homepage slide?"
        description="The banner will be removed from the live slider. You can upload a new one later."
        confirmText="Remove slide"
        variant="danger"
        isLoading={busy}
        onConfirm={removeSlide}
        onClose={() => setDeleteId(null)}
      />
    </section>
  );
}
