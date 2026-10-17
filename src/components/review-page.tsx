"use client";

import { Button } from "@/components/ui/button";

import { DeviceCamera } from "@/components/device-camera";
import { DsToggle } from "@/components/tool/controls";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { connectPreviewStyle, duoSpec, type Locale, type Orientation } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey, Translator } from "@/lib/i18n/types";

type Slide = { index: number; clone: "ok" | "review" | "risk"; outer: string; inner: string };
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

const STATUS_KEYS: Record<string, MessageKey> = {
  pending: "review_status_pending",
  approved: "review_status_approved",
  changes_requested: "review_status_changes_requested",
};

function reviewStatusLabel(status: string, t: Translator["t"]) {
  const key = STATUS_KEYS[status];
  return key ? t(key) : t("review_status_unknown");
}

/** Header and footer are server components, passed in so this client page does not pull them into its bundle. */
export function ReviewPage({ id, locale, demo = false, header, footer }: { id: string; locale: Locale; demo?: boolean; header: ReactNode; footer: ReactNode }) {
  const { t, tf } = useI18n();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [hinge, setHinge] = useState(false);
  const [viewMode, setViewMode] = useState<"device" | "pixels">("pixels");
  const [busy, setBusy] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<{ text: string; error: boolean } | null>(null);

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
    setDecisionFeedback(null);
    try {
      const response = await fetch(`/api/reviews/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      if (!response.ok) {
        if (response.status === 410) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          if (result?.error === "EXPIRED" || result?.error === "REVOKED") {
            setData((current) => current ? { ...current, expired: result.error === "EXPIRED", revoked: result.error === "REVOKED" } : current);
            return;
          }
        }
        throw new Error("FAIL");
      }
      setData((current) =>
        current
          ? { ...current, status: action === "approve" ? "approved" : "changes_requested", comment }
          : current,
      );
      setDecisionFeedback({ text: t("review_decision_saved"), error: false });
    } catch {
      setDecisionFeedback({ text: t("review_decision_was_not_saved"), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-review-page flex min-h-full flex-col">
      {header}
      <main id="main" className="studio-review-main mx-auto w-full max-w-6xl px-5 py-12">
        {error ? (
          <section className="max-w-2xl py-12" data-testid="review-missing">
            <h1 className="font-display text-5xl">{t("review_missing_title")}</h1>
            <p className="mt-5 text-[var(--muted)]">{t("review_missing")}</p>
          </section>
        ) : !data ? (
          <div className="t-skel max-w-md" aria-busy="true">
            <div className="t-skel-skeleton is-pulsing">
              <span className="block h-10 rounded-md bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
            </div>
            <p className="t-skel-content text-[var(--muted)]">…</p>
          </div>
        ) : data.expired || data.revoked ? (
          <section className="max-w-2xl py-12" data-testid="review-unavailable">
            <p className="ds-label">DuoShot Studio</p>
            <h1 className="font-display mt-3 text-5xl">
              {data.revoked
                ? t("review_review_revoked")
                : t("review_review_expired")}
            </h1>
            <p className="mt-5 text-[var(--muted)]">
              {data.revoked
                ? t("review_studio_closed_link_ask")
                : t("review_review_media_kept_seven")}
            </p>
          </section>
        ) : (
          <>
            <h1 className="font-display text-5xl" data-testid="review-title">{data.set_name}</h1>
            {demo ? (
              <p className="mt-3 max-w-2xl text-[var(--muted)]" data-testid="review-demo">
                {t("review_demo_banner")}
              </p>
            ) : null}
            <p className="mt-3 text-[var(--muted)]" data-testid="review-status" role="status">
              {data.client_name ? `${data.client_name} · ` : ""}
              {data.orientation === "landscape" ? t("review_orientation_landscape") : t("review_orientation_portrait")} · {reviewStatusLabel(data.status, t)}
            </p>
            {data.expiresAt ? (
              <p className="mt-2 text-sm text-[var(--muted)]" data-testid="review-expiry">
                {t("review_available_until")}{" "}
                {new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(data.expiresAt))}
              </p>
            ) : null}
            <div className="review-view-controls mt-6">
              <div className="review-view-switch" role="group" aria-label={t("review_review_view")}>
                <button
                  type="button"
                  className={viewMode === "device" ? "is-on" : ""}
                  aria-pressed={viewMode === "device"}
                  data-testid="review-device-view"
                  onClick={() => setViewMode("device")}
               >
                  {t("review_device_view")}
                </button>
                <button
                  type="button"
                  className={viewMode === "pixels" ? "is-on" : ""}
                  aria-pressed={viewMode === "pixels"}
                  data-testid="review-pixel-view"
                  onClick={() => setViewMode("pixels")}
               >
                  {t("review_pixel_view")}
                </button>
              </div>
              <DsToggle testId="review-hinge" pressed={hinge} onToggle={() => setHinge((value) => !value)}>
                {t("review_hinge_toggle")}
              </DsToggle>
            </div>
            {viewMode === "device" || hinge ? (
              <p className="mt-3 text-sm text-[var(--muted)]" data-testid="review-preview-hint">{t("review_preview_hint")}</p>
            ) : null}
            <div className="mt-10 space-y-12">
              {data.slides.map((slide) => {
                const orientation: Orientation = data.orientation === "landscape" ? "landscape" : "portrait";
                const landscape = orientation === "landscape";
                const outerSpec = duoSpec("duo-outer", orientation);
                const innerSpec = duoSpec("duo-inner", orientation);
                return (
                <section key={slide.index}>
                  <p className="duo-caption mb-3">
                    {String(slide.index + 1).padStart(2, "0")} · {t(`clone_${slide.clone}`)}
                  </p>
                  <div
                    className={`review-pair t-skel is-revealed${landscape ? " is-landscape" : ""}${viewMode === "pixels" ? " is-pixels" : ""}`}
                    style={viewMode === "pixels" ? connectPreviewStyle(outerSpec, innerSpec) as CSSProperties : undefined}
                 >
                    <p className="studio-review-label studio-review-label-outer">{t("review_closed_screen")}</p>
                    <div
                      className={`preview-glass preview-outer t-resize${viewMode === "device" ? " device-bezel" : ""}`}
                      data-aspect={viewMode === "pixels" ? `${outerSpec.width}/${outerSpec.height}` : undefined}
                   >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slide.outer} alt={tf("review_alt_numbered_outer", { n: slide.index + 1, total: data.slides.length })} />
                      {viewMode === "device" ? <DeviceCamera /> : null}
                    </div>
                    <p className="studio-review-label studio-review-label-inner">{t("review_open_screen")}</p>
                    <div
                      className={`preview-glass preview-inner t-resize ${viewMode === "device" ? "device-bezel" : ""} ${hinge ? "is-hinge" : "hinge-off"}`}
                      data-aspect={viewMode === "pixels" ? `${innerSpec.width}/${innerSpec.height}` : undefined}
                   >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slide.inner} alt={tf("review_alt_numbered_inner", { n: slide.index + 1, total: data.slides.length })} />
                      <span className="division" aria-hidden="true" />
                    </div>
                  </div>
                </section>
                );
              })}
            </div>
            {demo ? null : (
              <>
            <div className="ds-field mt-10 max-w-xl">
              <label className="ds-label" htmlFor="review-comment">
                {t("review_comment")}
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
              <Button as="button" variant="primary" type="button"  data-testid="review-approve" disabled={busy} onClick={() => void decide("approve")}>
                {t("review_approve")}
              </Button>
              <Button as="button" variant="secondary" type="button"  data-testid="review-redo" disabled={busy} onClick={() => void decide("redo")}>
                {t("review_needs_work")}
              </Button>
            </div>
            {decisionFeedback ? <p className={decisionFeedback.error ? "ds-warn mt-3" : "mt-3 text-sm text-[var(--studio-sea)]"} role={decisionFeedback.error ? "alert" : "status"} data-testid="review-decision-feedback">{decisionFeedback.text}</p> : null}
            {data.comment ? <p className="mt-4 text-sm text-[var(--muted)]">{data.comment}</p> : null}
              </>
            )}
          </>
        )}
      </main>
      {footer}
    </div>
  );
}
