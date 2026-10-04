import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "@/lib/screenshot-copy";
import { localePrefix } from "@/lib/site";

const CARDS = [
  { code: "dimensions / dimensions", title: "reject_3_title", body: "reject_3_body", cta: "specs" },
  { code: "transparence / alpha", title: "reject_1_title", body: "reject_1_body", cta: "tool" },
  { code: "contenu / content", title: "reject_2_title", body: "reject_2_body", cta: "tool" },
  { code: "set / set", title: "reject_incomplete_title", body: "reject_incomplete_body", cta: "tool" },
  { code: "vidéo / video", title: "reject_video_title", body: "reject_video_body", cta: "none" },
] as const;

export function RejectionPage({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const prefix = localePrefix(locale);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={locale === "en" ? "/en/rejection" : "/rejet"} />
      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-display text-5xl">{locale === "fr" ? "Erreurs de captures App Store : dimensions et alpha" : "App Store screenshot errors: dimensions and alpha"}</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">{locale === "fr" ? "Dimensions invalides ou canal alpha : vérifiez le format du fichier et l’emplacement visé dans App Store Connect avant le dépôt." : "Wrong screenshot dimensions or an alpha channel? Check the file format and intended App Store Connect slot before uploading."}</p>
        <div className="mt-12">
          {CARDS.map((card) => (
            <article key={card.code} className="border-t border-[var(--line)] py-8">
              <p className="font-mono text-xs tracking-[0.14em] text-[var(--muted)]">{card.code}</p>
              <h2 className="mt-3 text-xl">{card.cta === "specs" ? (locale === "fr" ? "Dimensions de capture invalides" : "Wrong screenshot dimensions") : t(card.title)}</h2>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">{card.cta === "specs"
                ? (locale === "fr"
                  ? `Si Connect affiche « image dimensions are not valid », vérifiez l’écran et l’orientation. Pour Duo en portrait : ${OUTER_PORTRAIT} px en externe, ${INNER_PORTRAIT} px en interne. En paysage, inversez les dimensions. Les formats 6,9″ restent valides pour leur propre emplacement.`
                  : `If Connect reports “image dimensions are not valid”, check the display and orientation. For Duo portrait: ${OUTER_PORTRAIT} px outer, ${INNER_PORTRAIT} px inner. Swap dimensions for landscape. The 6.9″ formats remain valid for their own slot.`)
                : card.title === "reject_1_title"
                  ? (locale === "fr" ? "App Store Connect n’accepte ni canal alpha ni transparence. DuoShot exporte du PNG RGB opaque ou du JPEG. Vérifiez le fichier exporté avant le dépôt." : "App Store Connect accepts neither an alpha channel nor transparency. DuoShot exports opaque RGB PNG or JPEG. Check the exported file before uploading.")
                  : t(card.body)}</p>
              {card.cta === "tool" ? (
                <Link href={`${prefix}/tool`} className="ds-link mt-4 inline-block">
                  {t("cta_open_tool")}
                </Link>
              ) : null}
              {card.cta === "specs" ? (
                <Link href={`${prefix}/specs`} className="ds-link mt-4 inline-block">
                  {t("cta_specs")}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
