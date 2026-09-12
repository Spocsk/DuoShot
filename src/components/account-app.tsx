"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { createBrowserSupabase } from "@/lib/supabase/client";

const KINDS = ["indie_monthly", "indie_launch", "studio_monthly", "app_pack"] as const;

export function AccountApp({ locale }: { locale: Locale }) {
  const router = useRouter();
  const prefix = locale === "en" ? "/en" : "";
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState("…");
  const [clientSlug, setClientSlug] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`${prefix}/login`);
        return;
      }
      setEmail(data.user.email ?? data.user.id);
      void (async () => {
        const { data: row } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();
        if (!row) return;
        setWorkspaceId(row.workspace_id);
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("client_slug")
          .eq("id", row.workspace_id)
          .maybeSingle();
        if (workspace?.client_slug) setClientSlug(workspace.client_slug);
      })();
    });
    void fetch("/api/billing/status")
      .then((res) => res.json())
      .then((payload: { plan?: string }) => {
        if (payload.plan) setPlan(payload.plan);
      })
      .catch(() => setPlan("free"));
  }, [prefix, router]);

  async function saveClientSlug() {
    if (!workspaceId) return;
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("workspaces")
      .update({ client_slug: clientSlug || null })
      .eq("id", workspaceId);
    setMessage(error ? error.message : locale === "fr" ? "Slug client enregistré." : "Client slug saved.");
  }

  async function checkout(kind: (typeof KINDS)[number]) {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (payload.url) window.location.assign(payload.url);
    else setMessage(payload.error || "Checkout indisponible");
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

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">{t(locale, "account_title")}</h1>
      <p className="mt-3 text-[var(--muted)]">{email}</p>
      <p className="mt-2 text-sm">
        Plan : <strong>{plan}</strong>
      </p>
      <label className="mt-6 grid gap-1 text-sm">
        Client slug (Studio)
        <input
          value={clientSlug}
          onChange={(event) => setClientSlug(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2"
        />
      </label>
      <button type="button" onClick={saveClientSlug} className="mt-2 text-sm underline">
        Enregistrer le slug
      </button>
      <div className="mt-8 grid gap-3">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => checkout(kind)}
            className="rounded-2xl border border-white/10 bg-[#141821] px-4 py-3 text-left"
          >
            {kind}
          </button>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={exportJson} className="rounded-full bg-[var(--accent)] px-4 py-2 text-[#111]">
          {t(locale, "export_data")}
        </button>
        <button type="button" onClick={erase} className="rounded-full border border-red-400/40 px-4 py-2">
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
