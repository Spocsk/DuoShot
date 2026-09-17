import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { Locale } from "@/lib/specs";
import { POLICY_VERSION } from "@/lib/specs";
import { localePrefix } from "@/lib/site";

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
      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-12">
        <p className="ds-label">{POLICY_VERSION}</p>
        <h1 className="font-display mt-3 text-4xl">{title}</h1>
        <div className="mt-8 grid gap-8 text-[var(--muted)] leading-relaxed">{children}</div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl text-[var(--foreground)]">{title}</h2>
      {children}
    </section>
  );
}

export function MentionsContent({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  if (locale === "en") {
    return (
      <>
        <p>
          Product notice, not legal advice. Last updated {POLICY_VERSION}. Required publisher information under the French LCEN.
        </p>
        <Block title="Publisher">
          <p>
            DuoShot is published by its operator, a natural person established in France. Publication director: the
            operator of the service.
          </p>
          <p>
            Company identifiers (SIRET, registered office) will be completed when the activity is registered. Until
            then, requests go through the{" "}
            <Link href={`${prefix}/account`} className="ds-link">
              account
            </Link>{" "}
            page (data export and deletion).
          </p>
        </Block>
        <Block title="Host">
          <p>
            Vercel Inc. — 440 North Barranca Avenue #4133, Covina, CA 91723, United States. The app also uses
            subprocessors listed in the{" "}
            <Link href={`${prefix}/legal/subprocessors`} className="ds-link">
              sub-processors
            </Link>{" "}
            list.
          </p>
        </Block>
      </>
    );
  }
  return (
    <>
      <p>
        Notice produit, pas un avis d’avocat. Dernière mise à jour : {POLICY_VERSION}. Mentions prévues par l’art. 6 de
        la LCEN.
      </p>
      <Block title="Éditeur">
        <p>
          Le site DuoShot est édité par l’exploitant du service, personne physique établie en France. Directeur de la
          publication : l’exploitant.
        </p>
        <p>
          Les identifiants d’entreprise (SIRET, siège) seront complétés à l’immatriculation de l’activité. En attendant,
          les demandes passent par la page{" "}
          <Link href={`${prefix}/account`} className="ds-link">
            Compte
          </Link>{" "}
          (export et suppression des données).
        </p>
      </Block>
      <Block title="Hébergeur">
        <p>
          Vercel Inc. — 440 North Barranca Avenue #4133, Covina, CA 91723, États-Unis. Le service s’appuie aussi sur les
          sous-traitants listés dans la{" "}
          <Link href={`${prefix}/legal/subprocessors`} className="ds-link">
            liste des sous-traitants
          </Link>
          .
        </p>
      </Block>
    </>
  );
}

export function PrivacyContent({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  if (locale === "en") {
    return (
      <>
        <p>
          Last updated {POLICY_VERSION}. Controller: the DuoShot operator (France / CNIL). This is a product notice, not
          legal advice.
        </p>
        <Block title="Data we process">
          <p>
            Account data (email, auth identifiers), consent logs, workspace membership, export metadata, and the
            screenshot files you upload. Vercel Web Analytics records aggregated page views without cookies. No
            marketing or ads in v1.
          </p>
        </Block>
        <Block title="Legal bases">
          <p>
            Contract (GDPR Art. 6.1.b) for the tool and ZIP. Legal obligation + contract for Stripe invoices. Contract
            for magic-link email and receipts.
          </p>
        </Block>
        <Block title="Transfers">
          <p>
            Captures and profile data are stored primarily in Paris (Supabase eu-west-3). Vercel, Stripe, Resend and
            Google OAuth may process data in the US under the Data Privacy Framework / SCCs. List:{" "}
            <Link href={`${prefix}/legal/subprocessors`} className="ds-link">
              sub-processors
            </Link>
            .
          </p>
        </Block>
        <Block title="Retention">
          <p>
            Uploads and ZIP files: 24 hours. Derived Studio review JPEGs: 7 days maximum, or earlier if the owner
            revokes the link. Account rows remain until you delete the account. Stripe keeps billing records as required by law.
          </p>
        </Block>
        <Block title="Your rights">
          <p>
            Access, portability (JSON export), erasure (account delete, target 30 days), objection — from the{" "}
            <Link href={`${prefix}/account`} className="ds-link">
              account
            </Link>{" "}
            page. UK GDPR: same rights. CCPA/CPRA: we do not sell or share personal information for cross-context
            advertising — Do Not Sell. LGPD: access, correction and deletion if you are in Brazil. Breach: CNIL notified
            within 72 hours when required. No DPO appointed in v1 (Art. 37 to be reassessed).
          </p>
        </Block>
      </>
    );
  }
  return (
    <>
      <p>
        Dernière mise à jour : {POLICY_VERSION}. Responsable de traitement : l’exploitant de DuoShot (France / CNIL).
        Notice produit, pas un avis d’avocat.
      </p>
      <Block title="Données traitées">
        <p>
          E-mail et identifiants Auth, journaux de consentement, membership workspace, métadonnées d’export, fichiers de
          captures que vous déposez. Vercel Web Analytics compte les pages vues de façon agrégée, sans cookie. Pas de
          marketing ni pubs en v1.
        </p>
      </Block>
      <Block title="Bases légales">
        <p>
          Contrat (art. 6.1.b RGPD) pour l’outil et le ZIP. Obligation légale + contrat pour la facturation Stripe.
          Contrat pour le magic link et les reçus.
        </p>
      </Block>
      <Block title="Transferts">
        <p>
          Captures et profil en primaire à Paris (Supabase eu-west-3). Vercel, Stripe, Resend et Google OAuth peuvent
          traiter aux États-Unis (DPF / CCT). Liste :{" "}
          <Link href={`${prefix}/legal/subprocessors`} className="ds-link">
            sous-traitants
          </Link>
          .
        </p>
      </Block>
      <Block title="Durées">
        <p>
          Uploads et ZIP : 24 h. JPEG dérivés des reviews Studio : 7 jours maximum, ou moins si le propriétaire
          révoque le lien. Lignes de compte jusqu’à suppression. Stripe conserve la facturation selon la loi.
        </p>
      </Block>
      <Block title="Vos droits">
        <p>
          Accès, portabilité (export JSON), effacement (compte, objectif 30 jours), opposition — depuis la page{" "}
          <Link href={`${prefix}/account`} className="ds-link">
            Compte
          </Link>
          . UK GDPR : mêmes droits. CCPA/CPRA : nous ne vendons pas les données — Do Not Sell. LGPD : accès, correction
          et suppression si vous êtes au Brésil. Violation : CNIL sous 72 h si requis. Pas de DPO en v1 (art. 37 à
          réévaluer).
        </p>
      </Block>
    </>
  );
}

export function TermsContent({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  if (locale === "en") {
    return (
      <>
        <p>
          Last updated {POLICY_VERSION}. These terms cover use of DuoShot and paid subscriptions (terms of use and sale).
          Product notice, not legal advice.
        </p>
        <Block title="Service">
          <p>
            DuoShot generates frameless App Store screenshots for iPhone Duo (outer 5.4″ and inner 7.6″, optional 6.9″).
            You must own the rights to every file you upload. Outputs must still comply with App Store Review Guideline
            2.3.3 — we do not invent features. We do not guarantee Apple will accept a set.
          </p>
        </Block>
        <Block title="Eligibility">
          <p>The service is for people aged 16 or older.</p>
        </Block>
        <Block title="Account">
          <p>
            An account is required to download a ZIP. You are responsible for access to your login. We may suspend abuse
            (automation, quota circumvention, unlawful content).
          </p>
        </Block>
        <Block title="Trial and plans">
          <p>
            Trial: 2 HD ZIPs (outer + inner), no card, Duo sizes only. Launch: €29 for 60 days until 23 Oct 2026,
            same as Indie (then €12/month). Indie: €12/month, unlimited ZIPs within a
            fair-use daily cap, 6.9″ sizes and Client/App prefix included. Studio: €49/month, everything in Indie plus
            three seats and client reviews retained for seven days. Prices include VAT where applicable.
            Billing via Stripe, cancel from Stripe. We do not guarantee Apple will accept a set.
          </p>
        </Block>
        <Block title="Withdrawal">
          <p>
            EU consumers have 14 days to withdraw from a distance contract. That right does not apply in the same way to
            professionals. By creating an account and starting an export, you ask for immediate performance of a digital
            service. After a ZIP has been generated, the trial/subscription corresponding to that use is not refunded
            except where the law requires it.
          </p>
        </Block>
        <Block title="Intellectual property">
          <p>
            You keep your rights in the files you upload. You grant DuoShot a licence limited to processing them to
            produce the ZIP. DuoShot and its marks remain ours. We do not claim ownership of your screenshots.
          </p>
        </Block>
        <Block title="Availability and liability">
          <p>
            The service may be interrupted (maintenance, third-party outage). To the extent permitted, DuoShot is not
            liable for indirect loss, lost App Store ranking, or Apple rejection. Mandatory consumer rights remain.
          </p>
        </Block>
        <Block title="Personal data">
          <p>
            Processing is described in the{" "}
            <Link href={`${prefix}/privacy`} className="ds-link">
              privacy policy
            </Link>
            .
          </p>
        </Block>
        <Block title="Governing law">
          <p>
            French law. Courts of the operator’s seat, without prejudice to consumer rights on competent courts and
            protective law.
          </p>
        </Block>
      </>
    );
  }
  return (
    <>
      <p>
        Dernière mise à jour : {POLICY_VERSION}. Les présentes conditions régissent l’usage de DuoShot et les
        abonnements payants (CGU et CGV). Notice produit, pas un avis d’avocat.
      </p>
      <Block title="Service">
        <p>
          DuoShot génère des screenshots App Store sans chassis pour iPhone Duo (outer 5,4″ et inner 7,6″, 6,9″ en
          option). Vous devez détenir les droits sur chaque fichier déposé. Les sorties restent soumises à la guideline
          2.3.3 — nous n’inventons pas de fonctionnalités. Aucune garantie d’acceptation Apple.
        </p>
      </Block>
      <Block title="Éligibilité">
        <p>Service réservé aux personnes de 16 ans et plus.</p>
      </Block>
      <Block title="Compte">
        <p>
          Un compte est requis pour télécharger un ZIP. Vous êtes responsable de l’accès à votre identifiant. Nous
          pouvons suspendre les abus (automatisation, contournement de quota, contenus illicites).
        </p>
      </Block>
      <Block title="Essai et offres">
        <p>
          Essai : 2 ZIP HD (outer + inner), sans carte, tailles Duo seulement. Launch : 29 € / 60 jours jusqu’au
          23 oct. 2026, même filet qu’Indie (puis 12 €/mois). Indie : 12 €/mois, ZIP illimités dans
          un plafond quotidien anti-abus, tailles 6,9″ et préfixe Client/App. Studio : 49 €/mois, tout Indie plus trois
          sièges et des reviews client conservées sept jours. Prix TTC le cas échéant. Paiement via Stripe, résiliation
          depuis Stripe. Aucune garantie d’acceptation Apple.
        </p>
      </Block>
      <Block title="Rétractation">
        <p>
          Le consommateur UE dispose de 14 jours pour se rétracter d’un contrat à distance. Ce droit ne s’applique pas
          de la même façon au professionnel. En créant un compte et en lançant un export, vous demandez l’exécution
          immédiate d’un service numérique. Une fois un ZIP généré, l’essai ou l’abonnement correspondant à cet usage
          n’est pas remboursé, sauf obligation légale.
        </p>
      </Block>
      <Block title="Propriété intellectuelle">
        <p>
          Vous conservez vos droits sur les fichiers déposés. Vous concédez à DuoShot une licence limitée à leur
          traitement pour produire le ZIP. DuoShot et ses signes restent les nôtres. Nous ne revendiquons pas vos
          captures.
        </p>
      </Block>
      <Block title="Disponibilité et responsabilité">
        <p>
          Le service peut être interrompu (maintenance, panne d’un tiers). Dans la limite permise, DuoShot n’est pas
          responsable d’un préjudice indirect, d’un classement App Store ou d’un refus Apple. Les droits impératifs des
          consommateurs restent.
        </p>
      </Block>
      <Block title="Données personnelles">
        <p>
          Les traitements sont décrits dans la{" "}
          <Link href={`${prefix}/privacy`} className="ds-link">
            politique de confidentialité
          </Link>
          .
        </p>
      </Block>
      <Block title="Droit applicable">
        <p>
          Droit français. Tribunaux du siège de l’exploitant, sans préjudice des droits consommateurs sur le tribunal
          compétent et la loi protectrice.
        </p>
      </Block>
    </>
  );
}

export function CookiesContent({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  if (locale === "en") {
    return (
      <>
        <p>Last updated {POLICY_VERSION}.</p>
        <Block title="Strictly necessary">
          <p>
            Auth session cookies only (Supabase PKCE). They are required to keep you signed in and to download a ZIP. The
            functional <code>duoshot_locale</code> cookie is set only if you click FR/EN; without it, the language follows
            the browser <code>Accept-Language</code> header. Vercel Web Analytics measures traffic without cookies, so
            there is no CMP banner for ads or trackers. Stripe may set its own cookies on Stripe Checkout, off this site.
          </p>
        </Block>
        <Block title="Later">
          <p>
            If we add trackers, an opt-in banner will precede them. Details on{" "}
            <Link href={`${prefix}/privacy`} className="ds-link">
              privacy
            </Link>
            .
          </p>
        </Block>
      </>
    );
  }
  return (
    <>
      <p>Dernière mise à jour : {POLICY_VERSION}.</p>
      <Block title="Strictement nécessaires">
        <p>
          Cookies de session Auth seulement (Supabase PKCE). Ils servent à rester connecté et à télécharger un ZIP. Le
          cookie fonctionnel <code>duoshot_locale</code> n’est posé que si tu cliques FR/EN ; sans lui, la langue suit
          l’en-tête <code>Accept-Language</code> du navigateur. Vercel Web Analytics mesure le trafic sans cookie, donc
          pas de bandeau CMP pour pubs ou trackers. Stripe peut déposer ses propres cookies sur Stripe Checkout, hors de
          ce site.
        </p>
      </Block>
      <Block title="Plus tard">
        <p>
          Si des trackers arrivent, un bandeau opt-in les précédera. Détail :{" "}
          <Link href={`${prefix}/privacy`} className="ds-link">
            confidentialité
          </Link>
          .
        </p>
      </Block>
    </>
  );
}

export function SubprocessorsContent({ locale }: { locale: Locale }) {
  return (
    <>
      <p>{locale === "fr" ? `Liste datée : ${POLICY_VERSION}.` : `Dated list: ${POLICY_VERSION}.`}</p>
      <ul className="list-disc pl-5">
        <li>Supabase — Postgres, Auth, Storage — eu-west-3 (Paris)</li>
        <li>Vercel — hosting, functions, Web Analytics — US/EU</li>
        <li>Stripe — payments — US/EU</li>
        <li>Resend — transactional email — US</li>
        <li>Google — OAuth sign-in — US</li>
      </ul>
      <p>
        {locale === "fr"
          ? "Des DPA sont à signer avec ces sous-traitants avant une exploitation commerciale élargie."
          : "DPAs should be in place with these processors before broader commercial operation."}
      </p>
    </>
  );
}
