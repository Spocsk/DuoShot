"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Locale } from "@/lib/specs";
import { POLICY_VERSION } from "@/lib/specs";
import { t } from "@/lib/i18n";
import { localePrefix } from "@/lib/site";

type Mode = "login" | "signup";

export function AuthForm({
  locale,
  mode,
  variant = "page",
  nextPath,
  onSuccess,
}: {
  locale: Locale;
  mode: Mode;
  variant?: "page" | "modal";
  nextPath?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const prefix = localePrefix(locale);
  const afterAuth = nextPath ?? `${prefix}/tool`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [busy, setBusy] = useState(false);

  function fail(text: string) {
    setMessageOk(false);
    setMessage(text);
  }

  async function persistConsent(userId: string) {
    const supabase = createBrowserSupabase();
    await supabase.from("consent_events").insert([
      { user_id: userId, kind: "privacy", accepted: true, policy_version: POLICY_VERSION },
      { user_id: userId, kind: "terms", accepted: true, policy_version: POLICY_VERSION },
    ]);
  }

  async function onGoogle() {
    setBusy(true);
    setMessage(null);
    setMessageOk(false);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(afterAuth)}`,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data.url) {
        const raw = error?.message ?? "";
        const providerOff = /provider is not enabled|unsupported provider/i.test(raw);
        fail(providerOff ? t(locale, "google_error") : raw || t(locale, "google_error"));
        return;
      }
      const check = await fetch("/api/auth/oauth-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url }),
      });
      const result = (await check.json().catch(() => null)) as { ok?: boolean } | null;
      if (!result?.ok) {
        fail(t(locale, "google_error"));
        return;
      }
      window.location.assign(data.url);
    } catch (error) {
      fail(error instanceof Error ? error.message : t(locale, "google_error"));
    } finally {
      setBusy(false);
    }
  }

  async function onPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setMessageOk(false);
    const supabase = createBrowserSupabase();
    try {
      if (mode === "signup") {
        if (!privacy) {
          fail(locale === "fr" ? "Accepte les conditions générales et la confidentialité." : "Please accept the terms and privacy policy.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterAuth)}` },
        });
        if (error) throw error;
        if (data.user) {
          try {
            await persistConsent(data.user.id);
          } catch {
            // Consent is retried from the account page once the session exists.
          }
        }
        setMessageOk(true);
        setMessage(
          locale === "fr"
            ? "Compte créé. Vérifie tes e-mails si une confirmation est demandée."
            : "Account created. Check your email if confirmation is required.",
        );
        if (data.session) {
          onSuccess?.();
          if (variant === "page") router.push(afterAuth);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess?.();
        if (variant === "page") router.push(afterAuth);
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function onMagic() {
    setBusy(true);
    setMessage(null);
    setMessageOk(false);
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=${afterAuth}` },
    });
    if (error) {
      fail(error.message);
    } else {
      setMessageOk(true);
      setMessage(locale === "fr" ? "Lien magique envoyé." : "Magic link sent.");
    }
    setBusy(false);
  }

  return (
    <div className={variant === "page" ? "studio-auth-card mx-auto w-full max-w-md" : "studio-auth-card"}>
      <h1 id={variant === "modal" ? "auth-modal-title" : undefined} data-testid="auth-form" className="font-display text-3xl">
        {variant === "modal" ? t(locale, "auth_modal_title") : t(locale, mode === "signup" ? "signup_title" : "login_title")}
      </h1>
      {variant === "modal" ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{t(locale, "auth_modal_lead")}</p>
      ) : null}
      <button type="button" onClick={onGoogle} data-testid="auth-google" className="ds-cta-ghost mt-6 w-full gap-2.5" disabled={busy}>
        <GoogleMark />
        {t(locale, "google")}
      </button>
      {mode === "signup" ? (
        <p className="mt-3 text-center text-xs leading-relaxed text-[var(--muted)]">
          {locale === "fr" ? (
            <>
              En continuant, vous acceptez les{" "}
              <Link href={`${prefix}/terms`} className="ds-link">
                conditions générales
              </Link>{" "}
              et la{" "}
              <Link href={`${prefix}/privacy`} className="ds-link">
                politique de confidentialité
              </Link>
              .
            </>
          ) : (
            <>
              By continuing, you agree to the{" "}
              <Link href={`${prefix}/terms`} className="ds-link">
                terms
              </Link>{" "}
              and the{" "}
              <Link href={`${prefix}/privacy`} className="ds-link">
                privacy policy
              </Link>
              .
            </>
          )}
        </p>
      ) : null}
      <form onSubmit={onPassword} className="mt-6 grid gap-3">
        <div>
          <label className="ds-label" htmlFor="auth-email">
            {t(locale, "email")}
          </label>
          <input
            id="auth-email"
            type="email"
            required
            data-testid="auth-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="ds-input w-full"
          />
        </div>
        <div>
          <label className="ds-label" htmlFor="auth-password">
            {t(locale, "password")}
          </label>
          <input
            id="auth-password"
            type="password"
            minLength={8}
            required={mode === "signup"}
            data-testid="auth-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="ds-input w-full"
          />
        </div>
        {mode === "signup" ? (
          <label className="ds-check text-sm">
            <span className="t-check" aria-hidden="true" aria-checked={privacy ? "true" : "false"}>
              <svg viewBox="0 0 10.1668 10.1668">
                <path d="M1 5.52L3.92 9.17L9.17 1" />
              </svg>
            </span>
            <input
              type="checkbox"
              data-testid="auth-privacy"
              className="sr-check"
              checked={privacy}
              onChange={(event) => setPrivacy(event.target.checked)}
            />
            <span>
              {locale === "fr" ? (
                <>
                  J’accepte les{" "}
                  <Link href={`${prefix}/terms`} className="ds-link">
                    conditions générales
                  </Link>{" "}
                  et la{" "}
                  <Link href={`${prefix}/privacy`} className="ds-link">
                    politique de confidentialité
                  </Link>
                  .
                </>
              ) : (
                <>
                  I accept the{" "}
                  <Link href={`${prefix}/terms`} className="ds-link">
                    terms
                  </Link>{" "}
                  and the{" "}
                  <Link href={`${prefix}/privacy`} className="ds-link">
                    privacy policy
                  </Link>
                  .
                </>
              )}
            </span>
          </label>
        ) : null}
        <button type="submit" disabled={busy} data-testid="auth-submit" className="ds-cta">
          {mode === "signup" ? t(locale, "nav_signup") : t(locale, "nav_login")}
        </button>
        <button type="button" onClick={onMagic} disabled={busy || !email} data-testid="auth-magic" className="ds-text-btn">
          {t(locale, "magic")}
        </button>
      </form>
      {message ? (
        <p className={messageOk ? "mt-4 text-sm" : "ds-warn"} data-testid="auth-message" role={messageOk ? "status" : "alert"}>
          {message}
        </p>
      ) : null}
      {variant === "page" ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          {mode === "signup" ? (
            <>
              {locale === "fr" ? "Déjà un compte ? " : "Already have an account? "}
              <Link href={`${prefix}/login`} className="ds-link">
                {t(locale, "nav_login")}
              </Link>
            </>
          ) : (
            <>
              {locale === "fr" ? "Pas encore de compte ? " : "No account yet? "}
              <Link href={`${prefix}/signup`} className="ds-link">
                {t(locale, "nav_signup")}
              </Link>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
