import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { Locale } from "@/lib/specs";

export function LegalPage({
  locale,
  path,
  title,
  children,
}: {
  locale: Locale;
  path: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={path} />
      <main className="prose prose-invert mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-4xl">{title}</h1>
        <div className="mt-8 grid gap-4 text-[var(--muted)]">{children}</div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

export function PrivacyContent({ locale }: { locale: Locale }) {
  if (locale === "en") {
    return (
      <>
        <p>Last updated: 12 September 2026. Controller: the DuoShot operator (France / CNIL). This is a product notice, not legal advice.</p>
        <p>We process account data (email, auth identifiers), consent logs, workspace membership, export metadata, and screenshot files you upload. Legal bases: contract (Art. 6.1.b GDPR) for the tool and ZIP; legal obligation + contract for Stripe invoices; contract for magic-link and receipts. No marketing in v1.</p>
        <p>UK GDPR: same rights via ICO-equivalent access/erasure. CCPA/CPRA: we do not sell or share personal information for cross-context advertising — Do Not Sell. LGPD: the same access, correction and deletion rights apply if you are in Brazil.</p>
        <p>Transfers: app captures and profile data are stored primarily in Paris (Supabase eu-west-3). Vercel, Stripe and Google OAuth may process data in the US under DPF / SCCs, documented here. Sub-processors: /legal/subprocessors.</p>
        <p>Retention: uploads and ZIP files 24 hours. Account rows until you delete the account. Stripe keeps billing records as required by law.</p>
        <p>Rights: access, portability (JSON export), erasure (account delete, target 30 days), objection. Contact via the account page. Breach: CNIL notified within 72 hours when required. No DPO appointed in v1 (Art. 37 to be reassessed).</p>
      </>
    );
  }
  return (
    <>
      <p>Dernière mise à jour : 12 septembre 2026. Responsable de traitement : l’exploitant de DuoShot (France / CNIL). Notice produit, pas un avis d’avocat.</p>
      <p>Données : e-mail et identifiants Auth, journaux de consentement, membership workspace, métadonnées d’export, fichiers de captures que tu déposes. Bases : contrat (art. 6.1.b RGPD) pour l’outil et le ZIP ; obligation légale + contrat pour la facturation Stripe ; contrat pour magic link et reçus. Pas de marketing en v1.</p>
      <p>UK GDPR : mêmes droits. CCPA/CPRA : nous ne vendons pas les données — Do Not Sell. LGPD : droits d’accès, correction et suppression si tu es au Brésil.</p>
      <p>Transferts : captures et profil en primaire à Paris (Supabase eu-west-3). Vercel, Stripe et Google OAuth peuvent traiter aux US (DPF / CCT). Liste : /legal/subprocessors.</p>
      <p>Durées : uploads et ZIP 24 h. Lignes de compte jusqu’à suppression. Stripe conserve la facturation selon la loi.</p>
      <p>Droits : accès, portabilité (export JSON), effacement (compte, objectif 30 jours), opposition. Via la page compte. Violation : CNIL sous 72 h si requis. Pas de DPO en v1 (art. 37 à réévaluer).</p>
    </>
  );
}

export function TermsContent({ locale }: { locale: Locale }) {
  return locale === "en" ? (
    <>
      <p>DuoShot generates frameless App Store screenshots for iPhone Duo. You must own the rights to every file you upload. Outputs must still comply with App Store Review Guideline 2.3.3 — we do not invent features.</p>
      <p>Free plan: 1 HD Duo-only set per day, branded README. Paid plans bill in euros via Stripe. Launch 60-day Indie is a one-time pass. Studio includes 3 seats. App pack is €19 per extra app.</p>
      <p>No warranty that Apple will accept a set. Service may be unavailable. We may suspend abuse. French law / courts of the operator’s seat, without prejudice to consumer rights.</p>
    </>
  ) : (
    <>
      <p>DuoShot génère des screenshots App Store sans chassis pour iPhone Duo. Tu dois détenir les droits sur chaque fichier déposé. Les sorties restent soumises à la guideline 2.3.3 — nous n’inventons pas de fonctionnalités.</p>
      <p>Free : 1 set HD Duo/jour, README marqué. Offres payantes en euros via Stripe. Le lancement Indie 60 j est un pass unique. Studio : 3 sièges. Pack app : 19 € par app extra.</p>
      <p>Aucune garantie d’acceptation Apple. Service susceptible d’interruption. Abus suspendable. Droit français / tribunaux du siège, sans préjudice des droits consommateurs.</p>
    </>
  );
}

export function CookiesContent({ locale }: { locale: Locale }) {
  return locale === "en" ? (
    <p>
      Strictly necessary cookies only: Supabase Auth session (PKCE). No analytics, ads or CMP banner in v1 (ePrivacy / CNIL). If we add trackers later, an opt-in banner will precede them.
    </p>
  ) : (
    <p>
      Cookies strictement nécessaires seulement : session Auth Supabase (PKCE). Pas d’analytics, pubs ni bandeau CMP en v1 (ePrivacy / CNIL). Si des trackers arrivent plus tard, un bandeau opt-in les précédera.
    </p>
  );
}

export function SubprocessorsContent({ locale }: { locale: Locale }) {
  return (
    <>
      <p>{locale === "fr" ? "Liste datée : 12 septembre 2026." : "Dated list: 12 September 2026."}</p>
      <ul className="list-disc pl-5">
        <li>Supabase — Postgres, Auth, Storage — eu-west-3 (Paris)</li>
        <li>Vercel — hosting / functions — US/EU edge</li>
        <li>Stripe — payments — US/EU</li>
        <li>Resend — transactional email — US</li>
        <li>Google — OAuth sign-in — US</li>
      </ul>
    </>
  );
}
