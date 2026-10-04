"use client";

import { useId, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";

export type WaitlistTopic = "apple_duo_open" | "launch";

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

/**
 * Compact "Prévenez-moi" sign-up: one e-mail field and a button, with inline success
 * and error states. The address is stored only after the e-mailed confirmation.
 */
export function WaitlistForm({
  locale,
  topic = "apple_duo_open",
  className = "",
  buttonClassName = "ds-cta-ghost",
  hint,
  compact = false,
}: {
  locale: Locale;
  topic?: WaitlistTopic;
  className?: string;
  /** Ghost by default so it never competes with the page's primary call to action. */
  buttonClassName?: string;
  /** Replaces the default one-line explanation; pass "" to hide it. */
  hint?: string;
  /** One row: the label stays for screen readers only and the hint is hidden. */
  compact?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const hintText = compact ? "" : hint ?? t(topic === "launch" ? "waitlist_hint_launch" : "waitlist_hint_apple_duo_open");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      setStatus({ kind: "error", message: t("waitlist_error_email") });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topic, locale, company }),
      });
      if (response.ok) {
        setStatus({ kind: "sent" });
        return;
      }
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      const key = payload?.error === "INVALID_EMAIL" ? "waitlist_error_email" : response.status === 429 ? "waitlist_error_rate" : "waitlist_error";
      setStatus({ kind: "error", message: t(key) });
    } catch {
      setStatus({ kind: "error", message: t("waitlist_error") });
    }
  }

  if (status.kind === "sent") {
    return (
      <p className={`text-sm text-[var(--foreground)] ${className}`} role="status" data-testid={`waitlist-success-${topic}`}>
        {t("waitlist_success")}
      </p>
    );
  }

  const error = status.kind === "error" ? status.message : null;
  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className={className} data-testid={`waitlist-form-${topic}`}>
      {hintText ? <p id={`${id}-hint`} className="mb-2 text-sm text-[var(--muted)]">{hintText}</p> : null}
      <div className="flex flex-wrap items-end gap-2">
        <div className={`min-w-0 ${compact ? "flex-[1_1_10rem]" : "flex-[1_1_14rem]"}`}>
          <label className={compact ? "sr-only" : "ds-label"} htmlFor={`${id}-email`}>{t("waitlist_email_label")}</label>
          <input
            id={`${id}-email`}
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            placeholder={t("waitlist_placeholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintText ? `${id}-hint` : "", error ? `${id}-error` : `${id}-privacy`].filter(Boolean).join(" ")}
            className="ds-input w-full"
            data-testid={`waitlist-email-${topic}`}
          />
        </div>
        {/* Left empty by people; a filled value marks an automated submission. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor={`${id}-company`}>Company</label>
          <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} />
        </div>
        <button type="submit" className={buttonClassName} disabled={status.kind === "sending"} data-testid={`waitlist-submit-${topic}`}>
          {status.kind === "sending" ? t("waitlist_sending") : t("waitlist_submit")}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="ds-warn mt-2 text-sm" role="alert">{error}</p>
      ) : (
        <p id={`${id}-privacy`} className="mt-2 text-xs text-[var(--muted)]">{t("waitlist_privacy")}</p>
      )}
    </form>
  );
}
