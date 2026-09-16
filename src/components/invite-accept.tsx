"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/specs";
import { localePrefix } from "@/lib/site";

export function InviteAccept({ token, locale }: { token: string; locale: Locale }) {
  const prefix = localePrefix(locale);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function accept() {
    setState("busy");
    const response = await fetch("/api/workspace/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setState(response.ok ? "done" : "error");
  }
  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-5 py-20">
      <p className="ds-label">DuoShot Studio</p>
      <h1 className="font-display mt-3 text-5xl">{locale === "fr" ? "Rejoindre le workspace" : "Join the workspace"}</h1>
      <p className="mt-5 text-[var(--muted)]">
        {locale === "fr" ? "Connectez-vous avec l’adresse invitée, puis acceptez l’invitation." : "Sign in with the invited email address, then accept the invitation."}
      </p>
      {state === "done" ? (
        <Link href={`${prefix}/account`} className="ds-cta mt-8 inline-flex">{locale === "fr" ? "Ouvrir Studio" : "Open Studio"}</Link>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="ds-cta" disabled={state === "busy"} onClick={() => void accept()}>
            {state === "busy" ? "…" : locale === "fr" ? "Accepter" : "Accept"}
          </button>
          <Link href={`${prefix}/login?next=${encodeURIComponent(`${prefix}/invite/${token}`)}`} className="ds-cta-ghost">
            {locale === "fr" ? "Se connecter" : "Sign in"}
          </Link>
        </div>
      )}
      {state === "error" ? <p className="ds-warn mt-5">{locale === "fr" ? "Invitation invalide, expirée ou ouverte avec une autre adresse." : "Invalid or expired invitation, or signed in with a different email."}</p> : null}
    </main>
  );
}
