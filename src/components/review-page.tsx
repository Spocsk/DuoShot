"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";

type Slide = { index: number; clone: string; outer: string; inner: string };
type Payload = {
  set_name: string;
  client_name: string | null;
  orientation: string;
  status: string;
  comment: string | null;
  slides: Slide[];
};

export function ReviewPage({ id, locale }: { id: string; locale: Locale }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [hinge, setHinge] = useState(true);
  const [busy, setBusy] = useState(false);

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
    try {
      const response = await fetch(`/api/reviews/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      if (!response.ok) throw new Error("FAIL");
      setData((current) =>
        current
          ? { ...current, status: action === "approve" ? "approved" : "changes_requested", comment }
          : current,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={`/r/${id}`} />
      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        {error ? (
          <p className="text-[var(--muted)]" data-testid="review-missing">{t(locale, "review_missing")}</p>
        ) : !data ? (
          <p className="text-[var(--muted)]">…</p>
        ) : (
          <>
            <h1 className="font-display text-5xl" data-testid="review-title">{data.set_name}</h1>
            <p className="mt-3 text-[var(--muted)]" data-testid="review-status">
              {data.client_name ? `${data.client_name} · ` : ""}
              {data.orientation} · {data.status}
            </p>
            <button
              type="button"
              className="ds-toggle mt-6"
              aria-pressed={hinge}
              onClick={() => setHinge((value) => !value)}
            >
              <span className="text-sm">{t(locale, "tool_hinge_toggle")}</span>
              <span className="ds-toggle-track">
                <span className="ds-toggle-thumb" />
              </span>
            </button>
            <div className="mt-10 space-y-12">
              {data.slides.map((slide) => (
                <section key={slide.index}>
                  <p className="duo-caption mb-3">
                    {String(slide.index + 1).padStart(2, "0")} · {t(locale, `clone_${slide.clone}`)}
                  </p>
                  <div className="review-pair">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slide.outer} alt="outer" className="preview-glass preview-outer" />
                    <div className={`preview-glass preview-inner ${hinge ? "is-hinge" : "hinge-off"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slide.inner} alt="inner" className="h-full w-full object-contain" />
                    </div>
                  </div>
                </section>
              ))}
            </div>
            <textarea
              className="ds-input mt-10 min-h-28 w-full max-w-xl p-3"
              data-testid="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
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
