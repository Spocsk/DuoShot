"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, tf } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { checkoutReturnPath, startCheckout } from "@/lib/checkout";
import type { CheckoutKind } from "@/lib/plans";
import type { PlanId } from "@/lib/specs";
import { localePrefix, reviewPath } from "@/lib/site";

type Status = {
  plan?: PlanId;
  remainingFreeExports?: number | null;
};

export function AccountApp({ locale }: { locale: Locale }) {
  const router = useRouter();
  const prefix = localePrefix(locale);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`${prefix}/login`);
        return;
      }
      setEmail(data.user.email ?? data.user.id);
    });
    void fetch("/api/billing/status")
      .then((res) => res.json())
      .then((payload: Status) => setStatus(payload))
      .catch(() => setStatus({ plan: "free", remainingFreeExports: 2 }));
  }, [prefix, router]);

  async function checkout(kind: CheckoutKind) {
    setBusy(true);
    try {
      await startCheckout(kind, checkoutReturnPath(locale));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout indisponible");
      setBusy(false);
    }
  }

  async function exportJson() {
    const response = await fetch("/api/account/export");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "duoshot-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function erase() {
    if (!confirm(locale === "fr" ? "Supprimer le compte et les fichiers ?" : "Delete account and files?")) {
      return;
    }
    const response = await fetch("/api/account/delete", { method: "POST" });
    if (response.ok) {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
      router.replace(prefix || "/");
    } else {
      setMessage(locale === "fr" ? "Suppression incomplète." : "Deletion incomplete.");
    }
  }

  const plan = status?.plan;
  const remaining = status?.remainingFreeExports;
  const planLabel =
    plan === "studio"
      ? t(locale, "account_plan_studio")
      : plan === "indie"
        ? t(locale, "account_plan_indie")
        : plan === "free"
          ? t(locale, "account_plan_free")
          : null;

  return (
    <main id="main" className="flex-1">
      <div className="mx-auto max-w-2xl px-5 py-12" data-testid="account">
      <h1 className="font-display text-4xl">{t(locale, "account_title")}</h1>
      <p className="mt-3 text-[var(--muted)]" data-testid="account-email">{email}</p>
      <p className="ds-label mt-6">{t(locale, "account_plan_label")}</p>
      {planLabel ? (
        <p className="font-display mt-1 text-3xl" data-testid="account-plan">{planLabel}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]" role="status" data-testid="account-plan-loading">
          {locale === "fr" ? "Chargement de votre abonnement…" : "Loading your subscription…"}
        </p>
      )}
      {plan === "free" && remaining != null ? (
        <p className="mt-2 text-[var(--muted)]" data-testid="account-remaining">{tf(locale, "account_remaining", { n: remaining })}</p>
      ) : null}
      {plan === "free" ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void checkout("indie_monthly")}
            disabled={busy}
            data-testid="account-upgrade-indie"
            className="ds-cta"
          >
            {t(locale, "pricing_indie_cta")}
          </button>
          <button
            type="button"
            onClick={() => void checkout("studio_monthly")}
            disabled={busy}
            data-testid="account-upgrade-studio"
            className="ds-cta-ghost"
          >
            {t(locale, "pricing_studio_cta")}
          </button>
        </div>
      ) : null}
      {plan === "indie" ? (
        <button
          type="button"
          onClick={() => void checkout("studio_monthly")}
          disabled={busy}
          data-testid="account-upgrade-studio"
          className="ds-cta mt-8"
        >
          {t(locale, "account_upgrade_studio")}
        </button>
      ) : null}
      {plan === "studio" ? (
        <>
          <Link href={`${prefix}/tool`} className="ds-cta mt-8 inline-flex">
            {t(locale, "cta_tool")}
          </Link>
          <StudioWorkspace locale={locale} />
        </>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--line)] pt-8">
        <button type="button" onClick={() => void exportJson()} data-testid="account-export" className="ds-cta-ghost">
          {t(locale, "export_data")}
        </button>
        <button
          type="button"
          onClick={() => void erase()}
          data-testid="account-delete"
          className="ds-danger"
        >
          {t(locale, "delete_account")}
        </button>
        <Link href={`${prefix}/privacy`} className="ds-text-btn">
          Do Not Sell
        </Link>
      </div>
      {message ? <p className="ds-warn" data-testid="account-message">{message}</p> : null}
      </div>
    </main>
  );
}

type ReviewSummary = {
  public_id: string;
  set_name: string;
  client_name: string | null;
  status: string;
  expiresAt: string | null;
};

type Invitation = {
  id: string;
  email: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
};

type WorkspaceMember = {
  id: string;
  email: string | null;
  role: "owner" | "admin" | "member";
};

function StudioWorkspace({ locale }: { locale: Locale }) {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [studioMessage, setStudioMessage] = useState<string | null>(null);
  const [studioBusy, setStudioBusy] = useState(false);

  async function refreshStudio() {
    const [reviewsResponse, invitationsResponse, membersResponse] = await Promise.all([
      fetch("/api/reviews"),
      fetch("/api/workspace/invitations"),
      fetch("/api/workspace/members"),
    ]);
    if (reviewsResponse.ok) {
      const payload = (await reviewsResponse.json()) as { reviews?: ReviewSummary[] };
      setReviews(payload.reviews ?? []);
    }
    if (invitationsResponse.ok) {
      const payload = (await invitationsResponse.json()) as { invitations?: Invitation[] };
      setInvitations(payload.invitations ?? []);
    }
    if (membersResponse.ok) {
      const payload = (await membersResponse.json()) as { members?: WorkspaceMember[] };
      setMembers(payload.members ?? []);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void refreshStudio());
  }, []);

  async function invite() {
    setStudioBusy(true);
    setStudioMessage(null);
    const response = await fetch("/api/workspace/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, locale }),
    });
    const payload = (await response.json()) as { error?: string };
    if (response.ok) {
      setInviteEmail("");
      setStudioMessage(locale === "fr" ? "Invitation envoyée." : "Invitation sent.");
      await refreshStudio();
    } else {
      setStudioMessage(
        payload.error === "SEAT_LIMIT"
          ? locale === "fr" ? "Les trois sièges sont déjà attribués ou réservés." : "All three seats are already assigned or reserved."
          : locale === "fr" ? "Invitation impossible." : "Could not send invitation.",
      );
    }
    setStudioBusy(false);
  }

  async function revokeReview(id: string) {
    const response = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (response.ok) await refreshStudio();
  }

  async function revokeInvitation(id: string) {
    const response = await fetch(`/api/workspace/invitations/${id}`, { method: "DELETE" });
    if (response.ok) await refreshStudio();
  }

  async function revokeMember(id: string) {
    const response = await fetch(`/api/workspace/members/${id}`, { method: "DELETE" });
    if (response.ok) await refreshStudio();
  }

  return (
    <section className="mt-12 border-t border-[var(--line)] pt-10" data-testid="studio-workspace">
      <p className="ds-label">Studio</p>
      <h2 className="font-display mt-2 text-3xl">{locale === "fr" ? "Équipe et reviews" : "Team and reviews"}</h2>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {locale === "fr" ? "Trois sièges inclus. Les médias de review expirent après sept jours." : "Three seats included. Review media expires after seven days."}
      </p>
      <div className="mt-6 flex gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{locale === "fr" ? "E-mail du membre" : "Member email"}</span>
          <input
            className="ds-input w-full"
            type="email"
            value={inviteEmail}
            placeholder={locale === "fr" ? "collaborateur@studio.fr" : "teammate@studio.com"}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
        </label>
        <button type="button" className="ds-cta" disabled={studioBusy || !inviteEmail} onClick={() => void invite()}>
          {locale === "fr" ? "Inviter" : "Invite"}
        </button>
      </div>
      {studioMessage ? <p className="mt-3 text-sm text-[var(--muted)]">{studioMessage}</p> : null}
      {members.length ? (
        <ul className="mt-5 divide-y divide-[var(--line)] text-sm" data-testid="studio-members">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-4 py-3">
              <span>{member.email ?? member.role}</span>
              <span className="flex items-center gap-3 text-[var(--muted)]">
                {member.role}
                {member.role !== "owner" ? (
                  <button type="button" className="ds-text-btn" onClick={() => void revokeMember(member.id)}>
                    {locale === "fr" ? "Retirer" : "Remove"}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {invitations.length ? (
        <ul className="mt-5 divide-y divide-[var(--line)] text-sm">
          {invitations.slice(0, 5).map((invitation) => (
            <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
              <span>{invitation.email}</span>
              <span className="flex items-center gap-3 text-[var(--muted)]">
                {invitation.accepted_at
                  ? locale === "fr" ? "Acceptée" : "Accepted"
                  : invitation.revoked_at
                    ? locale === "fr" ? "Révoquée" : "Revoked"
                    : locale === "fr" ? "En attente" : "Pending"}
                {!invitation.accepted_at && !invitation.revoked_at ? (
                  <button type="button" className="ds-text-btn" onClick={() => void revokeInvitation(invitation.id)}>
                    {locale === "fr" ? "Révoquer" : "Revoke"}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <h3 className="font-display mt-10 text-2xl">{locale === "fr" ? "Reviews récentes" : "Recent reviews"}</h3>
      {reviews.length ? (
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {reviews.map((review) => (
            <li key={review.public_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p>{review.set_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {review.client_name ? `${review.client_name} · ` : ""}{review.status}
                  {review.expiresAt ? ` · ${locale === "fr" ? "expire" : "expires"} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(review.expiresAt))}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <Link className="ds-text-btn" href={reviewPath(locale, review.public_id)}>{locale === "fr" ? "Ouvrir" : "Open"}</Link>
                {!['expired', 'revoked'].includes(review.status) ? (
                  <button type="button" className="ds-text-btn" onClick={() => void revokeReview(review.public_id)}>
                    {locale === "fr" ? "Révoquer" : "Revoke"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-[var(--muted)]">{locale === "fr" ? "Aucune review créée." : "No reviews yet."}</p>}
    </section>
  );
}
