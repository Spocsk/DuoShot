"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";
import type { Locale } from "@/lib/specs";
import { localePrefix } from "@/lib/site";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";

const INVITE_ERRORS: Record<string, MessageKey> = {
  AUTH_REQUIRED: "invite_sign_in_required",
  INVALID_TOKEN: "invite_invalid_link",
  INVITE_EXPIRED: "invite_invalid_link",
  EMAIL_MISMATCH: "invite_email_mismatch",
  SEAT_LIMIT: "invite_seat_limit",
  STUDIO_REQUIRED: "invite_studio_required",
};

export function InviteAccept({ token, locale }: { token: string; locale: Locale }) {
  const { t } = useI18n();
  const prefix = localePrefix(locale);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  // Invitations use 24 random bytes encoded as base64url (32 characters).
  const malformed = !/^[A-Za-z0-9_-]{32}$/.test(token);
  const visibleError = malformed ? "invite_invalid_link" : errorKey;
  async function accept() {
    if (malformed || state === "busy") return;
    setState("busy");
    setErrorKey(null);
    try {
      const response = await fetch("/api/workspace/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorKey(INVITE_ERRORS[payload?.error ?? ""] ?? "invite_accept_error");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorKey("invite_network_error");
      setState("error");
    }
  }
  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-5 py-20">
      <p className="ds-label">DuoShot Studio</p>
      <h1 className="font-display mt-3 text-5xl">{t("invite_join_workspace")}</h1>
      {!malformed && state !== "done" ? <p className="mt-5 text-[var(--muted)]">{t("invite_sign_in_invited_email")}</p> : null}
      {state === "done" ? (
        <>
          <p className="mt-5 text-[var(--muted)]" role="status" data-testid="invite-success">{t("invite_accepted")}</p>
          <Button as="link" variant="primary" href={`${prefix}/account`} className="mt-8 inline-flex">{t("invite_open_studio")}</Button>
        </>
      ) : !malformed ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button as="button" variant="primary" type="button"  data-testid="invite-accept" disabled={state === "busy"} onClick={() => void accept()}>
            {state === "busy" ? t("invite_accepting") : t("invite_accept")}
          </Button>
          <Button as="link" variant="secondary" href={`${prefix}/login?next=${encodeURIComponent(`${prefix}/invite/${token}`)}`}  data-testid="invite-login">
            {t("invite_sign_in")}
          </Button>
        </div>
      ) : null}
      {visibleError ? <p className="ds-warn mt-5" role="alert" data-testid="invite-error">{t(visibleError)}</p> : null}
    </main>
  );
}
