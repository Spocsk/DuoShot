"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Locale } from "@/lib/specs";
import { POLICY_VERSION } from "@/lib/specs";
import { t } from "@/lib/i18n";

type Mode = "login" | "signup";

export function AuthForm({ locale, mode }: { locale: Locale; mode: Mode }) {
  const router = useRouter();
  const prefix = locale === "en" ? "/en" : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persistConsent(userId: string) {
    const supabase = createBrowserSupabase();
    await supabase.from("consent_events").insert([
      { user_id: userId, kind: "age_16", accepted: true, policy_version: POLICY_VERSION },
      { user_id: userId, kind: "privacy", accepted: true, policy_version: POLICY_VERSION },
    ]);
  }

  async function onGoogle() {
    setBusy(true);
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${prefix}/tool` },
    });
  }

  async function onPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createBrowserSupabase();
    try {
      if (mode === "signup") {
        if (!age || !privacy) {
          setMessage(locale === "fr" ? "Coche âge 16+ et confidentialité." : "Confirm age 16+ and privacy.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          try {
            await persistConsent(data.user.id);
          } catch {
            // Consent is retried from the account page once the session exists.
          }
        }
        setMessage(
          locale === "fr"
            ? "Compte créé. Vérifie tes e-mails si une confirmation est demandée."
            : "Account created. Check your email if confirmation is required.",
        );
        if (data.session) router.push(`${prefix}/tool`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(`${prefix}/tool`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function onMagic() {
    setBusy(true);
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=${prefix}/tool` },
    });
    setMessage(
      error
        ? error.message
        : locale === "fr"
          ? "Lien magique envoyé."
          : "Magic link sent.",
    );
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#141821] p-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        {t(locale, mode === "signup" ? "signup_title" : "login_title")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{t(locale, "no_apple")}</p>
      <button
        type="button"
        onClick={onGoogle}
        className="mt-6 w-full rounded-full border border-white/15 py-3 text-sm"
        disabled={busy}
      >
        {t(locale, "google")}
      </button>
      <form onSubmit={onPassword} className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">
          {t(locale, "email")}
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t(locale, "password")}
          <input
            type="password"
            minLength={8}
            required={mode === "signup"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2"
          />
        </label>
        {mode === "signup" ? (
          <>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} />
              {t(locale, "age_label")}
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={privacy}
                onChange={(event) => setPrivacy(event.target.checked)}
              />
              <span>
                {t(locale, "privacy_label")}{" "}
                <Link href={`${prefix}/privacy`} className="text-[var(--accent)]">
                  /privacy
                </Link>
              </span>
            </label>
          </>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[var(--accent)] py-3 font-medium text-[#111]"
        >
          {mode === "signup" ? t(locale, "nav_signup") : t(locale, "nav_login")}
        </button>
        <button type="button" onClick={onMagic} disabled={busy || !email} className="text-sm underline">
          {t(locale, "magic")}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
      <p className="mt-6 text-sm text-[var(--muted)]">
        {mode === "signup" ? (
          <Link href={`${prefix}/login`}>{t(locale, "nav_login")}</Link>
        ) : (
          <Link href={`${prefix}/signup`}>{t(locale, "nav_signup")}</Link>
        )}
      </p>
    </div>
  );
}
