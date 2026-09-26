"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Locale } from "@/lib/specs";

export function PasswordRecovery({ locale, reset }: { locale: Locale; reset: boolean }) {
  const fr = locale === "fr";
  const prefix = fr ? "" : "/en";
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
      setError(fr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
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
        ? (fr ? "Le mot de passe n’a pas pu être modifié. Vérifie sa longueur ou demande un nouveau lien." : "Could not change your password. Check its length or request a new link.")
        : (fr ? "Envoi indisponible pour le moment. Réessaie dans quelques minutes." : "Sending is currently unavailable. Please try again in a few minutes."));
    } finally { setBusy(false); }
  }

  return <div className="studio-auth-card mx-auto w-full max-w-md">
    <h1 className="font-display text-3xl">{reset ? (fr ? "Nouveau mot de passe" : "New password") : (fr ? "Mot de passe oublié" : "Forgot password")}</h1>
    {done ? <p role="status" className="mt-6 text-sm">{reset
      ? (fr ? "Ton mot de passe a été modifié." : "Your password has been changed.")
      : (fr ? "Si un compte correspond à cette adresse, tu recevras un lien de récupération." : "If an account matches this address, you will receive a recovery link.")}</p>
      : <form onSubmit={submit} className="mt-6 grid gap-3">
        {reset ? <>
          <label className="ds-label" htmlFor="new-password">{fr ? "Nouveau mot de passe" : "New password"}</label>
          <input className="ds-input" id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="ds-label" htmlFor="confirm-password">{fr ? "Confirmer le mot de passe" : "Confirm password"}</label>
          <input className="ds-input" id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </> : <>
          <label className="ds-label" htmlFor="recovery-email">Email</label>
          <input className="ds-input" id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </>}
        <button className="ds-cta" disabled={busy} type="submit">{reset ? (fr ? "Enregistrer" : "Save password") : (fr ? "Envoyer le lien" : "Send recovery link")}</button>
      </form>}
    {error ? <p className="ds-warn" role="alert">{error}</p> : null}
    <p className="mt-6 text-sm"><Link className="ds-link" href={`${prefix}/${reset && !done ? "forgot-password" : "login"}`}>{reset && !done ? (fr ? "Demander un nouveau lien" : "Request a new link") : (fr ? "Retour à la connexion" : "Back to sign in")}</Link></p>
  </div>;
}
