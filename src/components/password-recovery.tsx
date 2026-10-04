"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Locale } from "@/lib/specs";
import { localePrefix } from "@/lib/site";
import { useI18n } from "@/components/i18n-provider";

export function PasswordRecovery({ locale, reset }: { locale: Locale; reset: boolean }) {
  const { t } = useI18n();
  const prefix = localePrefix(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (reset && password !== confirmation) {
      setError(t("auth_passwords_do_not_match"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      if (reset) {
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !data.user) throw new Error("INVALID_SESSION");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setPassword(""); setConfirmation("");
      } else {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${prefix}/reset-password`)}`;
        const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (sendError) throw sendError;
      }
      setDone(true);
    } catch {
      setError(reset
        ? t("auth_could_not_change_password")
        : t("auth_sending_currently_unavailable_please"));
    } finally { setBusy(false); }
  }

  return <div className="studio-auth-card mx-auto w-full max-w-md">
    <h1 className="font-display text-3xl">{reset ? t("auth_new_password") : t("auth_forgot_password_title")}</h1>
    {done ? <p role="status" className="mt-6 text-sm">{reset
      ? t("auth_password_has_been_changed")
      : t("auth_if_account_matches_address")}</p>
      : <form onSubmit={submit} className="mt-6 grid gap-3">
        {reset ? <>
          <label className="ds-label" htmlFor="new-password">{t("auth_new_password")}</label>
          <input className="ds-input" id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="ds-label" htmlFor="confirm-password">{t("auth_confirm_password")}</label>
          <input className="ds-input" id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </> : <>
          <label className="ds-label" htmlFor="recovery-email">Email</label>
          <input className="ds-input" id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </>}
        <button className="ds-cta" disabled={busy} type="submit">{reset ? t("auth_save_password") : t("auth_send_recovery_link")}</button>
      </form>}
    {error ? <p className="ds-warn" role="alert">{error}</p> : null}
    <p className="mt-6 text-sm"><Link className="ds-link" href={`${prefix}/${reset && !done ? "forgot-password" : "login"}`}>{reset && !done ? t("auth_request_new_link") : t("auth_back_sign_in")}</Link></p>
  </div>;
}
