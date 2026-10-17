"use client";

import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { billingErrorKey, checkoutReturnPath, startCheckout } from "@/lib/checkout";
import { PLANS, formatEurFromCents, type CheckoutKind } from "@/lib/plans";
import type { PlanId } from "@/lib/specs";
import { localePrefix, reviewPath } from "@/lib/site";
import { AscConnectionPanel } from "@/components/asc/asc-connection-panel";
import { Overlay } from "@/components/overlay";
import { loadStudioWorkspace, type ReviewSummary, type Invitation, type WorkspaceMember } from "@/lib/studio-workspace";

type Status = {
  plan?: PlanId;
  source?: "stripe" | "workspace" | "free";
  remainingFreeExports?: number | null;
  subscriptionStatus?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  hasBillingCustomer?: boolean;
  checkoutAvailable?: boolean;
};

export function AccountApp({ locale }: { locale: Locale }) {
  const { t, tf } = useI18n();
  const router = useRouter();
  const prefix = localePrefix(locale);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error && error.name !== "AuthSessionMissingError") {
        setMessage(t("account_session_error"));
        return;
      }
      if (!data.user) {
        router.replace(`${prefix}/login?next=${encodeURIComponent(`${prefix}/account`)}`);
        return;
      }
      setEmail(data.user.email ?? data.user.id);
    }).catch(() => setMessage(t("account_session_error")));
    void fetch("/api/billing/status")
      .then((res) => {
        if (!res.ok) throw new Error("BILLING_UNAVAILABLE");
        return res.json();
      })
      .then((payload: Status) => setStatus(payload))
      .catch(() => setStatusError(true));
  }, [prefix, router, t]);

  async function checkout(kind: CheckoutKind) {
    if (!status?.checkoutAvailable) { setMessage(t("account_payments_not_open_yet")); return; }
    setBusy(true);
    setMessage(null);
    try {
      await startCheckout(kind, checkoutReturnPath(locale), t);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("billing_error_unavailable"));
      setBusy(false);
    }
  }

  async function manageBilling() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setMessage(t(billingErrorKey(payload.error)));
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setMessage(t("billing_error_unavailable"));
    } finally {
      setBusy(false);
    }
  }

  async function exportJson() {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) throw new Error("EXPORT_FAILED");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "duoshot-data.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage(t("account_export_error"));
    } finally {
      setExporting(false);
    }
  }

  async function erase() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      await createBrowserSupabase().auth.signOut({ scope: "local" });
      router.replace(prefix || "/");
    } catch {
      setDeleteError(t("account_deletion_incomplete"));
    } finally {
      setDeleting(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await createBrowserSupabase().auth.signOut();
      if (error) throw error;
      router.replace(`${prefix}/login?next=${encodeURIComponent(`${prefix}/account`)}`);
    } catch {
      setMessage(t("account_sign_out_error"));
    } finally {
      setBusy(false);
    }
  }

  const plan = status?.plan;
  const remaining = status?.remainingFreeExports;
  const planLabel =
    plan === "studio"
      ? t("account_plan_studio")
      : plan === "indie"
        ? t("account_plan_indie")
        : plan === "free"
          ? t("account_plan_free")
          : null;
  const subscriptionLabel = status?.subscriptionStatus
    ? ({
        active: t("account_active"),
        trialing: t("account_trialing"),
        past_due: t("account_payment_overdue"),
        unpaid: t("account_unpaid"),
        canceled: t("account_canceled"),
        incomplete: t("account_incomplete"),
        incomplete_expired: t("account_incomplete_expired"),
        paused: t("account_paused"),
      } as Record<string, string>)[status.subscriptionStatus] ?? t("account_status_unknown")
    : null;

  return (
    <main id="main" className="studio-account-page flex-1">
      <div className="studio-account-inner mx-auto max-w-2xl px-5 py-12" data-testid="account">
        <div className="studio-account-heading">
          <h1 className="font-display text-4xl">{t("account_title")}</h1>
          <p className="mt-3 text-[var(--muted)]" data-testid="account-email">{email}</p>
          <Button as="button" variant="text" type="button" className="mt-3" disabled={busy} onClick={() => void signOut()}>{t("account_sign_out")}</Button>
        </div>
        <section className="studio-account-plan" aria-label={t("account_plan")}>
          <p className="ds-label">{t("account_plan_label")}</p>
          {planLabel ? (
            <p className="font-display mt-1 text-3xl" data-testid="account-plan">{planLabel}</p>
          ) : statusError ? (
            <p className="ds-warn mt-2 text-sm" role="alert" data-testid="account-plan-error">
              {t("account_could_not_load_plan")}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]" role="status" data-testid="account-plan-loading">
              {t("account_loading_subscription")}
            </p>
          )}
          {plan === "free" && remaining != null ? (
            <p className="mt-2 text-[var(--muted)]" data-testid="account-remaining">{tf("account_remaining", { n: remaining })}</p>
          ) : null}
          {status?.source === "workspace" ? <p className="mt-2 text-sm text-[var(--muted)]">{t("account_manually_granted_access")}</p> : null}
          {status?.subscriptionStatus && status.source !== "workspace" ? (
            <p className="mt-2 text-sm text-[var(--muted)]" data-testid="account-billing-state">
              {t("account_subscription")}: {subscriptionLabel}
              {status.periodEnd ? ` · ${status.cancelAtPeriodEnd ? t("account_ends") : t("account_renews")} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(status.periodEnd))}` : ""}
            </p>
          ) : null}
          {status?.hasBillingCustomer ? (
            <Button as="button" variant="secondary" type="button" className="mt-5" onClick={() => void manageBilling()} disabled={busy} data-testid="account-manage-billing">
              {t("account_manage_subscription_invoices")}
            </Button>
          ) : null}
          {plan === "free" ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {status?.checkoutAvailable !== true ? <p className="w-full text-sm text-[var(--muted)]">{t("account_payments_not_open_yet")}</p> : null}
              <Button as="button" variant="primary"
                type="button"
                onClick={() => void checkout("indie_monthly")}
                disabled={busy || status?.checkoutAvailable !== true}
                data-testid="account-upgrade-indie"
             >
                {tf("pricing_indie_cta", { price: formatEurFromCents(PLANS.indie.monthlyEur * 100, locale) })}
              </Button>
              <Button as="button" variant="secondary"
                type="button"
                onClick={() => void checkout("studio_monthly")}
                disabled={busy || status?.checkoutAvailable !== true}
                data-testid="account-upgrade-studio"
             >
                {tf("pricing_studio_cta", { price: formatEurFromCents(PLANS.studio.monthlyEur * 100, locale) })}
              </Button>
            </div>
          ) : null}
          {plan === "indie" || plan === "studio" ? (
            <Button as="link" variant="primary" href={`${prefix}/tool`} className="mt-8 inline-flex" data-testid="account-open-tool">
              {t("cta_tool")}
            </Button>
          ) : null}
        </section>
        {plan === "studio" ? <StudioWorkspace locale={locale} /> : null}
        <AscConnectionPanel locale={locale} />
        <div className="studio-account-settings mt-10 flex flex-wrap gap-3 border-t border-[var(--line)] pt-8">
          <Button as="button" variant="secondary" type="button" onClick={() => void exportJson()} disabled={exporting} aria-busy={exporting} data-testid="account-export" >
            {exporting ? t("account_export_busy") : t("export_data")}
          </Button>
          <Button as="button" variant="danger"
            type="button"
            onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
            data-testid="account-delete"
         >
            {t("delete_account")}
          </Button>
          <Button as="link" variant="text" href={`${prefix}/privacy`} >
            {t("footer_privacy")}
          </Button>
        </div>
        {message ? <p className="ds-warn" role="alert" data-testid="account-message">{message}</p> : null}
        {exporting ? <p role="status" className="mt-3 text-sm">{t("account_export_busy")}</p> : null}
        {deleteOpen ? (
          <Overlay labelledBy="account-delete-title" closeLabel={t("account_delete_close")} closeDisabled={deleting} onClose={() => setDeleteOpen(false)}>
            <h2 id="account-delete-title" className="font-display text-2xl">{t("account_delete_account_files")}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{t("account_delete_description")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button as="button" variant="secondary" type="button"  disabled={deleting} onClick={() => setDeleteOpen(false)}>{t("account_delete_cancel")}</Button>
              <Button as="button" variant="danger" type="button"  data-testid="account-delete-confirm" disabled={deleting} onClick={() => void erase()}>{deleting ? t("account_delete_busy") : t("account_delete_confirm")}</Button>
            </div>
            {deleteError ? <p role="alert" className="ds-warn">{deleteError}</p> : null}
          </Overlay>
        ) : null}
      </div>
    </main>
  );
}

function StudioWorkspace({ locale }: { locale: Locale }) {
  const { t, tf } = useI18n();
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [studioMessage, setStudioMessage] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioBusy, setStudioBusy] = useState(false);
  const [studioLoading, setStudioLoading] = useState(true);
  const [canInvite, setCanInvite] = useState(false);

  const refreshStudio = useCallback(async () => {
    setStudioLoading(true);
    setStudioError(null);
    try {
      const { reviews, invitations, members } = await loadStudioWorkspace();
      if (reviews.state === "ready") setReviews(reviews.items);
      if (invitations.state === "ready") setInvitations(invitations.items);
      else if (invitations.state === "restricted") setInvitations([]);
      if (members.state === "ready") setMembers(members.items);
      else if (members.state === "restricted") setMembers([]);
      setCanInvite(invitations.state === "ready");
      if ([reviews, invitations, members].some((result) => result.state === "error")) {
        setStudioError(t("account_studio_load_error"));
      }
    } catch {
      setStudioError(t("account_studio_load_error"));
    } finally {
      setStudioLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => void refreshStudio());
  }, [refreshStudio]);

  async function invite() {
    setStudioBusy(true);
    setStudioMessage(null);
    setStudioError(null);
    try {
      const response = await fetch("/api/workspace/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, locale }),
      });
      const payload = (await response.json()) as { error?: string; emailSent?: boolean; acceptPath?: string };
      if (!response.ok) {
        setStudioError(payload.error === "SEAT_LIMIT"
          ? tf("account_all_three_seats_already", { seats: PLANS.studio.seats })
          : t("account_could_not_send_invitation"));
        return;
      }
      setInviteEmail("");
      setStudioMessage(payload.emailSent ? t("account_invitation_sent") : `${t("account_invitation_created_email_not")}${window.location.origin}${payload.acceptPath ?? ""}`);
      await refreshStudio();
    } catch {
      setStudioError(t("account_could_not_send_invitation"));
    } finally {
      setStudioBusy(false);
    }
  }

  async function revoke(path: string) {
    setStudioBusy(true);
    setStudioMessage(null);
    setStudioError(null);
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok) throw new Error("STUDIO_ACTION_FAILED");
      await refreshStudio();
    } catch {
      setStudioError(t("account_studio_action_error"));
    } finally {
      setStudioBusy(false);
    }
  }

  const roleLabel = (role: WorkspaceMember["role"]) => t(role === "owner" ? "account_role_owner" : "account_role_member");
  const reviewLabels: Record<string, string> = {
    pending: t("account_review_pending"),
    approved: t("account_review_approved"),
    changes_requested: t("account_review_changes_requested"),
    expired: t("account_review_expired"),
    revoked: t("account_review_revoked"),
  };

  return (
    <section className="mt-12 border-t border-[var(--line)] pt-10" data-testid="studio-workspace">
      <p className="ds-label">Studio</p>
      <h2 className="font-display mt-2 text-3xl">{t("account_team_reviews")}</h2>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {tf("account_three_seats_included_review", { seats: PLANS.studio.seats })}
      </p>
      {canInvite ? <form className="mt-6 flex items-end gap-3" onSubmit={(event) => { event.preventDefault(); void invite(); }}>
        <label className="min-w-0 flex-1">
          <span className="ds-label mb-2 block">{t("account_member_email")}</span>
          <input
            className="ds-input w-full"
            type="email"
            required
            value={inviteEmail}
            placeholder={t("account_invite_email_placeholder")}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
        </label>
        <Button as="button" variant="primary" type="submit"  disabled={studioBusy || !inviteEmail}>
          {t("account_invite")}
        </Button>
      </form> : null}
      {studioMessage ? <p role="status" className="mt-3 text-sm text-[var(--muted)]">{studioMessage}</p> : null}
      {studioError ? (
        <div className="mt-3">
          <p role="alert" className="ds-warn">{studioError}</p>
          <Button as="button" variant="text" type="button"  disabled={studioBusy || studioLoading} onClick={() => void refreshStudio()}>{t("account_studio_retry")}</Button>
        </div>
      ) : null}
      {studioLoading ? <p role="status" className="mt-3 text-sm text-[var(--muted)]">{t("account_studio_loading")}</p> : null}
      {members.length ? (
        <ul className="mt-5 divide-y divide-[var(--line)] text-sm" data-testid="studio-members">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-4 py-3">
              <span>{member.email ?? roleLabel(member.role)}</span>
              <span className="flex items-center gap-3 text-[var(--muted)]">
                {roleLabel(member.role)}
                {member.role !== "owner" ? (
                  <Button as="button" variant="text" type="button"  disabled={studioBusy} onClick={() => void revoke(`/api/workspace/members/${member.id}`)}>
                    {t("account_remove")}
                  </Button>
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
                  ? t("account_invitation_accepted")
                  : invitation.revoked_at
                    ? t("account_revoked")
                    : t("account_pending")}
                {!invitation.accepted_at && !invitation.revoked_at ? (
                  <Button as="button" variant="text" type="button"  disabled={studioBusy} onClick={() => void revoke(`/api/workspace/invitations/${invitation.id}`)}>
                    {t("account_revoke")}
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <h3 className="font-display mt-10 text-2xl">{t("account_recent_reviews")}</h3>
      {reviews.length ? (
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {reviews.map((review) => (
            <li key={review.public_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p>{review.set_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {review.client_name ? `${review.client_name} · ` : ""}{reviewLabels[review.status] ?? t("account_status_unknown")}
                  {review.expiresAt ? ` · ${t("account_expires")} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(review.expiresAt))}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <Button as="link" variant="text"  href={reviewPath(locale, review.public_id)}>{t("account_open")}</Button>
                {!['expired', 'revoked'].includes(review.status) ? (
                  <Button as="button" variant="text" type="button"  disabled={studioBusy} onClick={() => void revoke(`/api/reviews/${review.public_id}`)}>
                    {t("account_revoke")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : !studioLoading && !studioError ? <p className="mt-3 text-sm text-[var(--muted)]">{t("account_no_reviews_yet")}</p> : null}
    </section>
  );
}
