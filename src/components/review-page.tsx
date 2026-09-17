"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";
import { localePrefix } from "@/lib/site";

type Slide = { index: number; clone: string; outer: string; inner: string };
type Payload = {
  set_name: string;
  client_name: string | null;
  orientation: string;
  status: string;
  comment: string | null;
  expiresAt: string | null;
  expired: boolean;
  revoked: boolean;
  slides: Slide[];
};

function Unavailable({ locale, testId }: { locale: Locale; testId: string }) {
  const prefix = localePrefix(locale);
  return (
    <section className="max-w-2xl py-12" data-testid={testId}>
      <p className="ds-label">DuoShot Studio</p>
      <h1 className="font-display mt-3 text-5xl">{t(locale, "review_unavailable")}</h1>
      <p className="mt-5 text-[var(--muted)]">{t(locale, "review_unavailable")}</p>
      <Link href={prefix || "/"} className="ds-cta mt-8 inline-flex" data-testid="review-home">
        {t(locale, "cta_home")}
      </Link>
    </section>
  );
}

export function ReviewPage({ id, locale, demo = false }: { id: string; locale: Locale; demo?: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [hinge, setHinge] = useState(true);
  const [viewMode, setViewMode] = useState<"device" | "pixels">("device");
  const [busy, setBusy] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    void fetch(`/api/reviews/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("NOT_FOUND");
        setData((await response.json()) as Payload);
      })
      .catch(() => setError("NOT_FOUND"));
  }, [id]);

  async function decide(action: "approve" | "redo") {
    setBusy(true);
    const nextStatus = action === "approve" ? "approved" : "changes_requested";
    try {
      if (demo) {
        setData((current) => (current ? { ...current, status: nextStatus, comment } : current));
        return;
      }
      const response = await fetch(`/api/reviews/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      if (!response.ok) throw new Error("FAIL");
      setData((current) => (current ? { ...current, status: nextStatus, comment } : current));
    } finally {
      setBusy(false);
    }
  }

  const slides = data?.slides ?? [];
  const visible = slides[activeSlide] ? [slides[activeSlide]!] : slides;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={locale === "en" ? `/en/r/${id}` : `/r/${id}`} />
      <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
        {error ? (
          <Unavailable locale={locale} testId="review-missing" />
        ) : !data ? (
          <div className="t-skel max-w-md" aria-busy="true">
            <div className="t-skel-skeleton is-pulsing">
              <span className="block h-10 rounded-md bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
            </div>
            <p className="t-skel-content text-[var(--muted)]">…</p>
          </div>
        ) : data.expired || data.revoked ? (
          <Unavailable locale={locale} testId="review-unavailable" />
        ) : (
          <>
            <h1 className="font-display text-5xl" data-testid="review-title">{data.set_name}</h1>
            {demo ? (
              <p className="mt-3 max-w-2xl text-[var(--muted)]" data-testid="review-demo">
                {t(locale, "review_demo_banner")}
              </p>
            ) : null}
            <p className="ds-label mt-3">{t(locale, "example_listing")}</p>
            <p className="mt-3 text-[var(--muted)]" data-testid="review-status">
              {data.client_name ? `${data.client_name} · ` : ""}
              {data.orientation} · {data.status}
            </p>
            {data.expiresAt ? (
              <p className="mt-2 text-sm text-[var(--muted)]" data-testid="review-expiry">
                {locale === "fr" ? "Disponible jusqu’au" : "Available until"}{" "}
                {new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(data.expiresAt))}
              </p>
            ) : null}
            {slides.length > 1 ? (
              <nav className="mt-6 flex flex-wrap gap-2" aria-label={t(locale, "review_slide_nav")} data-testid="review-slides">
                {slides.map((slide) => (
                  <button
                    key={slide.index}
                    type="button"
                    className={`ds-pill ${activeSlide === slide.index ? "ds-pill-ink" : ""}`}
                    data-testid={`review-slide-${String(slide.index + 1).padStart(2, "0")}`}
                    aria-pressed={activeSlide === slide.index}
                    onClick={() => setActiveSlide(slide.index)}
                  >
                    {String(slide.index + 1).padStart(2, "0")} · {t(locale, `clone_${slide.clone}` as "clone_ok")}
                  </button>
                ))}
              </nav>
            ) : null}
            <div className="review-view-controls mt-6">
              <div className="review-view-switch" role="group" aria-label={locale === "fr" ? "Affichage de la review" : "Review view"}>
                <button
                  type="button"
                  className={viewMode === "device" ? "is-on" : ""}
                  aria-pressed={viewMode === "device"}
                  data-testid="review-device-view"
                  onClick={() => setViewMode("device")}
                >
                  {t(locale, "review_device_view")}
                </button>
                <button
                  type="button"
                  className={viewMode === "pixels" ? "is-on" : ""}
                  aria-pressed={viewMode === "pixels"}
                  data-testid="review-pixel-view"
                  onClick={() => setViewMode("pixels")}
                >
                  {t(locale, "review_pixel_view")}
                </button>
              </div>
              <button
                type="button"
                className="ds-toggle"
                aria-pressed={hinge}
                data-testid="review-hinge"
                onClick={() => setHinge((value) => !value)}
              >
                <span className="text-sm">{t(locale, "tool_hinge_toggle")}</span>
                <span className="ds-toggle-track t-toggle" data-on={hinge ? "true" : "false"}>
                  <span className="ds-toggle-thumb t-toggle-thumb" />
                </span>
              </button>
            </div>
            <div className="mt-10 space-y-12">
              {visible.map((slide) => {
                const landscape = data.orientation === "landscape";
                return (
                <section key={slide.index} id={`review-slide-${slide.index}`}>
                  <p className="duo-caption mb-3" data-testid={`review-clone-${slide.index}`}>
                    {String(slide.index + 1).padStart(2, "0")} · {t(locale, `clone_${slide.clone}` as "clone_ok")}
                  </p>
                  <div className={`review-pair t-skel is-revealed${landscape ? " is-landscape" : ""}${viewMode === "pixels" ? " is-pixels" : ""}`}>
                    <div className={`preview-glass preview-outer t-resize${viewMode === "device" ? " device-bezel" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slide.outer} alt={t(locale, "review_alt_outer")} />
                    </div>
                    <div className={`preview-glass preview-inner t-resize ${viewMode === "device" ? "device-bezel" : ""} ${hinge ? "is-hinge" : "hinge-off"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slide.inner} alt={t(locale, "review_alt_inner")} />
                      <span className="division" aria-hidden="true" />
                    </div>
                  </div>
                </section>
                );
              })}
            </div>
            <div className="ds-field mt-10 max-w-xl">
              <label className="ds-label" htmlFor="review-comment">
                {t(locale, "review_comment")}
              </label>
              <textarea
                id="review-comment"
                className="ds-input min-h-28 w-full"
                data-testid="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="ds-cta" data-testid="review-approve" disabled={busy} onClick={() => void decide("approve")}>
                {locale === "fr" ? "Approuver" : "Approve"}
              </button>
              <button type="button" className="ds-cta-ghost" data-testid="review-redo" disabled={busy} onClick={() => void decide("redo")}>
                {locale === "fr" ? "À refaire" : "Needs work"}
              </button>
            </div>
            {data.comment ? <p className="mt-4 text-sm text-[var(--muted)]">{data.comment}</p> : null}
          </>
        )}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
