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
import { localePrefix } from "@/lib/site";

type Status = {
  plan?: PlanId;
  remainingFreeExports?: number | null;
};

export function AccountApp({ locale }: { locale: Locale }) {
  const router = useRouter();
  const prefix = localePrefix(locale);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({});
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

  const plan = status.plan ?? "free";
  const remaining = status.remainingFreeExports;
  const planLabel =
    plan === "studio"
      ? t(locale, "account_plan_studio")
      : plan === "indie"
        ? t(locale, "account_plan_indie")
        : t(locale, "account_plan_free");

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-4xl">{t(locale, "account_title")}</h1>
      <p className="mt-3 text-[var(--muted)]">{email}</p>
      <p className="mt-6 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
        {t(locale, "account_plan_label")}
      </p>
      <p className="font-display mt-1 text-3xl">{planLabel}</p>
      {plan === "free" && remaining != null ? (
        <p className="mt-2 text-[var(--muted)]">{tf(locale, "account_remaining", { n: remaining })}</p>
      ) : null}
      {plan === "free" ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void checkout("indie_monthly")}
            disabled={busy}
            className="ds-cta"
          >
            {t(locale, "pricing_indie_cta")}
          </button>
          <button
            type="button"
            onClick={() => void checkout("studio_monthly")}
            disabled={busy}
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
          className="ds-cta mt-8"
        >
          {t(locale, "account_upgrade_studio")}
        </button>
      ) : null}
      {plan === "studio" ? (
        <Link href={`${prefix}/tool`} className="ds-cta mt-8 inline-flex">
          {t(locale, "cta_tool")}
        </Link>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--line)] pt-8">
        <button type="button" onClick={() => void exportJson()} className="ds-cta-ghost">
          {t(locale, "export_data")}
        </button>
        <button type="button" onClick={() => void erase()} className="rounded-full border border-red-800/30 px-4 py-2">
          {t(locale, "delete_account")}
        </button>
        <Link href={`${prefix}/privacy`} className="px-4 py-2 underline">
          Do Not Sell
        </Link>
      </div>
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </div>
  );
}
