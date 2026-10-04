"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";
import type { Locale } from "@/lib/specs";

export type AscConnectionStatus = {
  enabled: true;
  owner: boolean;
  paid: boolean;
  connected: boolean;
  keyId: string | null;
  issuerId: string | null;
  lastVerifiedAt: string | null;
};

const ERRORS: Record<string, MessageKey> = {
  ASC_ISSUER_INVALID: "asc_error_issuer",
  ASC_KEY_ID_INVALID: "asc_error_key_id",
  ASC_KEY_INVALID: "asc_error_key",
  ASC_CREDENTIALS_REJECTED: "asc_error_rejected",
  PAID_PLAN_REQUIRED: "asc_paid_only",
  OWNER_REQUIRED: "asc_owner_only",
};

/**
 * "Connexions" section of the account page. Renders nothing while the server
 * flag ASC_CONNECTOR_ENABLED is off (the status route answers 404).
 */
export function AscConnectionPanel({ locale }: { locale: Locale }) {
  const { t, tf } = useI18n();
  const [status, setStatus] = useState<AscConnectionStatus | null>(null);
  const [issuerId, setIssuerId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const ids = useId();

  useEffect(() => {
    let live = true;
    void fetch("/api/asc/connection", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as AscConnectionStatus) : null))
      .then((payload) => { if (live) setStatus(payload); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  // The section appears after the status fetch, too late for the browser's own jump to #connexions.
  const shown = status !== null;
  useEffect(() => {
    if (shown && window.location.hash === "#connexions") document.getElementById("connexions")?.scrollIntoView();
  }, [shown]);

  if (!status) return null;

  async function readKey(file: File | undefined) {
    setPrivateKey(null);
    if (!file) return;
    // A .p8 is a few hundred bytes; anything large is not one.
    if (file.size > 4096) { setMessage({ text: t("asc_error_key"), error: true }); return; }
    const text = await file.text();
    if (!text.includes("-----BEGIN PRIVATE KEY-----")) { setMessage({ text: t("asc_error_key"), error: true }); return; }
    setMessage(null);
    setPrivateKey(text);
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    if (!privateKey) { setMessage({ text: t("asc_error_key"), error: true }); return; }
    setBusy(true);
    setMessage({ text: t("asc_connecting"), error: false });
    try {
      const response = await fetch("/api/asc/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerId, keyId, privateKey }),
      });
      const payload = await response.json() as AscConnectionStatus & { error?: string };
      if (!response.ok) {
        setMessage({ text: t(ERRORS[payload.error ?? ""] ?? "asc_error_generic"), error: true });
        return;
      }
      setStatus(payload);
      setIssuerId("");
      setKeyId("");
      setPrivateKey(null);
      setMessage(null);
    } catch {
      setMessage({ text: t("asc_error_generic"), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!confirm(t("asc_revoke_confirm"))) return;
    setBusy(true);
    try {
      const response = await fetch("/api/asc/connection", { method: "DELETE" });
      if (!response.ok) throw new Error("ASC_UNAVAILABLE");
      setStatus((current) => current && { ...current, connected: false, keyId: null, issuerId: null, lastVerifiedAt: null });
      setMessage({ text: t("asc_revoked"), error: false });
    } catch {
      setMessage({ text: t("asc_error_generic"), error: true });
    } finally {
      setBusy(false);
    }
  }

  const verified = status.lastVerifiedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(status.lastVerifiedAt))
    : "";

  return (
    <section id="connexions" className="mt-12 scroll-mt-24 border-t border-[var(--line)] pt-10" aria-labelledby={`${ids}-title`} data-testid="asc-connection">
      <p className="ds-label">{t("asc_section_label")}</p>
      <h2 id={`${ids}-title`} className="font-display mt-2 text-3xl">{t("asc_title")}</h2>
      <p className="mt-3 text-sm text-[var(--muted)]">{t("asc_lead")}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{t("asc_duo_note")}</p>

      {status.connected ? (
        <div className="mt-6" data-testid="asc-connected">
          <p className="font-display text-xl">{t("asc_connected")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {tf("asc_connected_detail", { key: status.keyId ?? "", issuer: status.issuerId ?? "", date: verified })}
          </p>
          {status.owner ? (
            <button type="button" className="ds-danger mt-5" disabled={busy} onClick={() => void revoke()} data-testid="asc-revoke">
              {t("asc_revoke")}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm" role="status">{t("asc_not_connected")}</p>
      )}

      {!status.paid ? (
        <p className="mt-4 text-sm text-[var(--muted)]">{t("asc_paid_only")}</p>
      ) : !status.owner ? (
        <p className="mt-4 text-sm text-[var(--muted)]">{t("asc_owner_only")}</p>
      ) : !status.connected ? (
        <>
          <h3 className="font-display mt-8 text-2xl">{t("asc_guide_title")}</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>{t("asc_guide_1")}</li>
            <li>{t("asc_guide_2")}</li>
            <li>{t("asc_guide_3")}</li>
            <li>{t("asc_guide_4")}</li>
          </ol>
          <form className="mt-6 grid gap-4" onSubmit={(event) => void connect(event)} data-testid="asc-connect-form">
            <label className="ds-field grid gap-1" htmlFor={`${ids}-issuer`}>
              <span className="ds-label">{t("asc_issuer")}</span>
              <input
                id={`${ids}-issuer`} className="ds-input w-full font-mono" required autoComplete="off" spellCheck={false}
                placeholder="57246542-96fe-1a63-e053-0824d011072a" value={issuerId} onChange={(event) => setIssuerId(event.target.value)}
              />
            </label>
            <label className="ds-field grid gap-1" htmlFor={`${ids}-key`}>
              <span className="ds-label">{t("asc_key_id")}</span>
              <input
                id={`${ids}-key`} className="ds-input w-full font-mono" required autoComplete="off" spellCheck={false}
                maxLength={10} placeholder="2X9R4HXF34" value={keyId} onChange={(event) => setKeyId(event.target.value.toUpperCase())}
              />
            </label>
            <label className="ds-field grid gap-1" htmlFor={`${ids}-p8`}>
              <span className="ds-label">{t("asc_p8")}</span>
              <input
                id={`${ids}-p8`} className="ds-input w-full" type="file" accept=".p8" required aria-describedby={`${ids}-p8-hint`}
                onChange={(event) => void readKey(event.target.files?.[0])}
              />
              <span id={`${ids}-p8-hint`} className="text-xs text-[var(--muted)]">{t("asc_p8_hint")}</span>
            </label>
            <div>
              <button type="submit" className="ds-cta" disabled={busy || !issuerId || !keyId || !privateKey} data-testid="asc-connect">
                {busy ? t("asc_connecting") : t("asc_connect")}
              </button>
            </div>
          </form>
        </>
      ) : null}

      {message ? (
        <p className={message.error ? "ds-warn mt-4" : "mt-4 text-sm text-[var(--muted)]"} role={message.error ? "alert" : "status"} data-testid="asc-message">
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
