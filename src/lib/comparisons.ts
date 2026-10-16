import { COMPARISON_GUIDE_PATH } from "./guides";
import { localizedPath } from "./site";
import type { Locale } from "./specs";

// Competitor summaries use only the linked official homepages, checked 2026-10-16.
// AppLaunchFlow: Screenshot Editor, Promo Videos and ASO Copy sections.
// AppScreens: template, visual editor and localized screenshot FAQs.
// Screenhance: homepage introduction (store screenshots, mockups and launch visuals).
// App Asset Kit: screenshot/icon maker, local processing, export workflow and default sizes.
export const COMPARISONS = [
  {
    slug: "duoshot-vs-applaunchflow",
    name: "AppLaunchFlow",
    url: "https://applaunchflow.com/",
    summary: {
      fr: "AppLaunchFlow présente un éditeur de captures App Store et Google Play, ainsi que des outils pour les vidéos promotionnelles et les textes de fiche store.",
      en: "AppLaunchFlow presents an editor for App Store and Google Play screenshots, alongside tools for promotional videos and store listing copy.",
    },
    focus: {
      fr: "Captures, vidéos promotionnelles et textes de fiche store",
      en: "Screenshots, promotional videos and store listing copy",
    },
  },
  {
    slug: "duoshot-vs-appscreens",
    name: "AppScreens",
    url: "https://appscreens.com/",
    summary: {
      fr: "AppScreens présente un éditeur visuel de captures App Store et Google Play, avec des modèles personnalisables et des outils de localisation.",
      en: "AppScreens presents a visual editor for App Store and Google Play screenshots, with customizable templates and localization tools.",
    },
    focus: {
      fr: "Édition visuelle, modèles et localisation de captures",
      en: "Visual editing, templates and screenshot localization",
    },
  },
  {
    slug: "duoshot-vs-screenhance",
    name: "Screenhance",
    url: "https://screenhance.com/",
    summary: {
      fr: "Screenhance présente un éditeur en ligne pour les captures App Store et Google Play, les mockups d’appareils et les visuels de lancement.",
      en: "Screenhance presents an online editor for App Store and Google Play screenshots, device mockups and launch visuals.",
    },
    focus: {
      fr: "Captures, mockups et visuels de lancement",
      en: "Screenshots, mockups and launch visuals",
    },
  },
  {
    slug: "duoshot-vs-app-asset-kit",
    name: "App Asset Kit",
    url: "https://www.appassetkit.com/",
    summary: {
      fr: "App Asset Kit est un générateur gratuit de captures App Store et Google Play dans le navigateur, qui génère aussi des icônes d’app. Les images sont traitées localement dans le navigateur, sans être envoyées au serveur. Il ne demande aucune inscription et n’ajoute aucun filigrane. Vous importez un à cinq écrans, choisissez un modèle et exportez un ZIP organisé de PNG. Les dimensions App Store par défaut sont 1320 × 2868 (6,9″) et 2064 × 2752 (iPad 13″).",
      en: "App Asset Kit is a free browser-based App Store and Google Play screenshot maker that also generates app icons. Images are processed locally in the browser and are not uploaded. It requires no signup and adds no watermark. You upload one to five screens, pick a template and export an organized ZIP of PNGs. Default App Store sizes are 1320 × 2868 (6.9″) and 2064 × 2752 (13″ iPad).",
    },
    focus: {
      fr: "Captures et icônes d’app, traitement local dans le navigateur",
      en: "Screenshots and app icons, local browser processing",
    },
  },
] as const;

export function comparisonPath(slug: string) {
  return `/guides/${slug}`;
}

export function competitorComparison(locale: Locale, slug: string) {
  const competitor = COMPARISONS.find((entry) => entry.slug === slug);
  if (!competitor) return null;
  const { name, url, summary, focus } = competitor;
  const title = locale === "fr"
    ? `DuoShot vs ${name} : captures App Store`
    : `DuoShot vs ${name}: App Store screenshots`;
  const description = locale === "fr"
    ? `Comparez DuoShot et ${name} : présentation sourcée, dimensions et tarifs DuoShot, export ZIP et points à vérifier avant de choisir.`
    : `Compare DuoShot and ${name}: sourced overview, DuoShot sizes and pricing, ZIP export and points to check before choosing.`;
  const link = (path: string) => localizedPath(locale, path);
  const related = COMPARISONS.filter((entry) => entry.slug !== slug)
    .map((entry) => `- [DuoShot vs ${entry.name}](${link(comparisonPath(entry.slug))})`).join("\n");
  const body = locale === "fr" ? `# ${title}

DuoShot est notre produit pour préparer les captures iPhone Duo (le téléphone pliable d'Apple). Ce comparatif décrit son fonctionnement et résume la présentation publique de [${name}](${url}), consultée le **16 octobre 2026**. Il ne s’agit pas d’un test du service concurrent.

## Ce que présente ${name}

${summary.fr} Source : [site officiel de ${name}](${url}). Consultez ce site pour les tarifs et les conditions actuelles ; nous ne déduisons pas de fonctionnalités absentes d’une page publique.

## Comparer les approches

| Point de comparaison | DuoShot | ${name} |
|---|---|---|
| Présentation | Préparer et vérifier vos captures iPhone Duo, puis exporter un ZIP | ${focus.fr} ([source officielle](${url})) |
| Détails à consulter | [Dimensions](${link("/specs")}) et [tarifs](${link("/pricing")}) | [Fonctionnalités et conditions sur le site officiel](${url}) |

## Ce que DuoShot exporte

DuoShot compose vos vraies captures d’app en PNG ou JPEG opaque, sans coque d’appareil, puis les regroupe dans un ZIP organisé par écran.

- iPhone Duo extérieur **5,4″ : 1398 × 2034** ; intérieur **7,6″ : 2007 × 2853**.
- iPhone **6,3″ : 1206 × 2622**, inclus dans l’essai gratuit.
- iPhone **6,9″ : 1320 × 2868**, avec Pass, Indie et Studio.

L’outil vérifie les dimensions et le format, signale les vues similaires et propose un guide de pli simulé pour examiner la lisibilité. Ces contrôles ne garantissent pas l’acceptation par Apple. Voir les [dimensions et le guide du pli](${link("/specs")}).

## Tarifs DuoShot

- Essai gratuit : **2 ZIP HD** après inscription, sans carte.
- Pass 30 jours : **19 €**, paiement unique.
- Indie : **12 €/mois ou 120 €/an**, facturation annuelle à l’avance.
- Studio : **49 €/mois ou 490 €/an**, facturation annuelle à l’avance.

Les conditions et la disponibilité des offres figurent sur la page [tarifs DuoShot](${link("/pricing")}).

## Avant de choisir

Partez de votre besoin : composition visuelle, langues à traiter, dimensions de sortie et méthode de dépôt. Vérifiez les fonctionnalités et les offres de ${name} sur son [site officiel](${url}). Pour DuoShot, vous pouvez [ouvrir l’outil](${link("/tool")}) et examiner les aperçus et contrôles avant un export.

**DuoShot fournit un ZIP ; vous déposez les fichiers manuellement. Le dépôt iPhone Duo dans App Store Connect n’a pas été testé par DuoShot.**

## Autres comparatifs

- [Guide des générateurs de captures App Store](${link(COMPARISON_GUIDE_PATH)})
${related}
` : `# ${title}

DuoShot is our product for preparing iPhone Duo (Apple's foldable iPhone) screenshots. This comparison describes its workflow and summarizes the public presentation of [${name}](${url}), checked on **October 16, 2026**. We have not tested the competing service.

## What ${name} presents

${summary.en} Source: [${name} official website](${url}). Check that site for current pricing and terms; we do not infer missing features from a public page.

## Comparing the approaches

| Comparison point | DuoShot | ${name} |
|---|---|---|
| Overview | Prepare and check iPhone Duo screenshots, then export a ZIP | ${focus.en} ([official source](${url})) |
| Details to consult | [Sizes](${link("/specs")}) and [pricing](${link("/pricing")}) | [Features and terms on the official website](${url}) |

## What DuoShot exports

DuoShot composes your real app captures as opaque PNG or JPEG images, without device frames, then packages them in a ZIP organized by screen.

- iPhone Duo outer **5.4″: 1398 × 2034**; inner **7.6″: 2007 × 2853**.
- iPhone **6.3″: 1206 × 2622**, included in the free trial.
- iPhone **6.9″: 1320 × 2868**, with Pass, Indie and Studio.

The tool checks dimensions and format, flags similar views and provides a simulated fold guide to review legibility. These checks do not guarantee Apple approval. See the [sizes and fold guide](${link("/specs")}).

## DuoShot pricing

- Free trial: **2 HD ZIPs** after signup, no card.
- 30-day Pass: **€19**, one-time payment.
- Indie: **€12/month or €120/year**, annual billing upfront.
- Studio: **€49/month or €490/year**, annual billing upfront.

Offer terms and availability are on the [DuoShot pricing page](${link("/pricing")}).

## Before choosing

Start with your needs: visual composition, languages, output dimensions and upload workflow. Check ${name} features and plans on its [official website](${url}). With DuoShot, you can [open the tool](${link("/tool")}) and inspect previews and checks before exporting.

**DuoShot provides a ZIP; you upload the files manually. DuoShot has not tested iPhone Duo uploads to App Store Connect.**

## Other comparisons

- [App Store screenshot generator guide](${link(COMPARISON_GUIDE_PATH)})
${related}
`;
  return { title, description, dateModified: "2026-10-16", body };
}
