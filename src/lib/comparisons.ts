import { COMPARISON_GUIDE_PATH } from "./guides";
import { localizedPath, rejectionPath } from "./site";
import { ALTERNATIVE_SLUGS, alternativePath } from "./alternatives";
import type { Locale } from "./specs";
import type { FaqItem } from "./screenshot-copy";

// Competitor summaries use only the linked official homepages, checked 2026-10-16.
// AppLaunchFlow: Screenshot Editor, Promo Videos and ASO Copy sections.
// AppScreens: template, visual editor and localized screenshot FAQs.
// Screenhance: homepage introduction (store screenshots, mockups and launch visuals).
// App Asset Kit: screenshot/icon maker, local processing, export workflow and default sizes.
// Checked 2026-11-01: Screenies (iPhone Duo generator page), AppShot Maker, AppLaunchpad, Screenshots.pro, AppMockUp homepages.
// Checked 2026-11-07: Duo Studio (duomockup.com) English homepage — free browser mockup editor with device frames and local processing.
// Checked 2026-11-08: AppScreen (appscreen.pro) homepage and v1.5 changelog; a different product from AppScreens (appscreens.com).
// Checked 2026-11-10: Store Connect Studio (Anax, anaxkg.com) English page — Mac app for screenshots, metadata, translation and direct App Store Connect sync.
// Checked 2026-11-13: AppScreens (appscreens.com) public homepage, menu and pricing page — enriched comparison; only facts visible on those pages are used.
export const COMPARISONS = [
  {
    slug: "duoshot-vs-applaunchflow",
    checked: "2026-10-16",
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
    checked: "2026-11-13",
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
    checked: "2026-10-16",
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
    checked: "2026-10-16",
    name: "App Asset Kit",
    url: "https://www.appassetkit.com/",
    summary: {
      fr: "App Asset Kit est un générateur gratuit de captures App Store et Google Play dans le navigateur, qui génère aussi des icônes d’app. Les images sont traitées localement dans le navigateur, sans être envoyées au serveur. Il ne demande aucune inscription et n’ajoute aucun filigrane. Vous importez un à cinq écrans, choisissez un modèle et exportez un ZIP organisé de PNG. Les dimensions App Store par défaut sont 1320 × 2868 (6,9″).",
      en: "App Asset Kit is a free browser-based App Store and Google Play screenshot maker that also generates app icons. Images are processed locally in the browser and are not uploaded. It requires no signup and adds no watermark. You upload one to five screens, pick a template and export an organized ZIP of PNGs. The default App Store size is 1320 × 2868 (6.9″).",
    },
    focus: {
      fr: "Captures et icônes d’app, traitement local dans le navigateur",
      en: "Screenshots and app icons, local browser processing",
    },
  },
  {
    slug: "duoshot-vs-screenies",
    name: "Screenies",
    url: "https://screenies.app/iphone-duo-screenshot-generator",
    checked: "2026-11-01",
    summary: {
      fr: "Screenies présente un générateur de captures App Store qui ajoute titres, fonds et le cadre iPhone Duo d’Apple à vos captures réelles, pour l’écran interne ou externe. Il fonctionne avec des crédits (1 crédit par slide externe, 2 par slide interne) et peut déposer un jeu terminé dans App Store Connect après l’achat d’un pack de crédits.",
      en: "Screenies presents an App Store screenshot generator that adds headlines, backgrounds and Apple’s iPhone Duo frame to your real captures, for the inner or outer display. It uses credits (1 credit per outer slide, 2 per inner slide) and can upload a finished set to App Store Connect after a credit pack purchase.",
    },
    focus: {
      fr: "Captures avec cadre iPhone Duo, crédits et dépôt App Store Connect",
      en: "Framed iPhone Duo screenshots, credits and App Store Connect upload",
    },
  },
  {
    slug: "duoshot-vs-appshot-maker",
    name: "AppShot Maker",
    url: "https://appshotmaker.com/en",
    checked: "2026-11-01",
    summary: {
      fr: "AppShot Maker présente un éditeur de captures App Store et Google Play dans le navigateur, sans envoi des fichiers au serveur. Il propose des préréglages iPhone 6,3″, 6,9″, iPhone Duo et iPad 13″, des cadres d’appareil et un export ZIP de PNG.",
      en: "AppShot Maker presents a browser-based App Store and Google Play screenshot editor that does not upload your files. It offers iPhone 6.3″, 6.9″, iPhone Duo and iPad 13″ presets, device frames and a PNG ZIP export.",
    },
    focus: {
      fr: "Éditeur local dans le navigateur, préréglages Duo et cadres",
      en: "Local in-browser editor, Duo presets and frames",
    },
  },
  {
    slug: "duoshot-vs-applaunchpad",
    name: "AppLaunchpad",
    url: "https://theapplaunchpad.com/",
    checked: "2026-11-01",
    summary: {
      fr: "AppLaunchpad présente un générateur de captures App Store et Google Play avec plus de 1 000 modèles, des cadres d’appareils iOS et Android, la localisation et le redimensionnement automatique vers les tailles des stores.",
      en: "AppLaunchpad presents an App Store and Google Play screenshot generator with 1,000+ templates, iOS and Android device frames, localization and automatic resizing to store sizes.",
    },
    focus: {
      fr: "Modèles, cadres d’appareils et localisation",
      en: "Templates, device frames and localization",
    },
  },
  {
    slug: "duoshot-vs-screenshots-pro",
    name: "Screenshots.pro",
    url: "https://screenshots.pro/",
    checked: "2026-11-01",
    summary: {
      fr: "Screenshots.pro présente un éditeur de captures panoramiques pour iOS et Android, utilisable sans compte, avec des cadres d’appareils (dont des angles 3D), la traduction des captures, l’export multi-tailles et une API REST pour les pipelines CI/CD.",
      en: "Screenshots.pro presents a panoramic screenshot editor for iOS and Android, usable without an account, with device frames (including 3D angles), screenshot translation, multi-size export and a REST API for CI/CD pipelines.",
    },
    focus: {
      fr: "Éditeur panoramique, cadres 3D et API",
      en: "Panoramic editor, 3D frames and API",
    },
  },
  {
    slug: "duoshot-vs-appmockup",
    name: "AppMockUp",
    url: "https://app-mockup.com/",
    checked: "2026-11-01",
    summary: {
      fr: "AppMockUp Studio présente un éditeur gratuit de captures App Store et Google Play, utilisable sans compte, avec des fonds et dégradés prédéfinis.",
      en: "AppMockUp Studio presents a free App Store and Google Play screenshot designer, usable without an account, with preset backgrounds and gradients.",
    },
    focus: {
      fr: "Éditeur gratuit sans compte",
      en: "Free editor, no account",
    },
  },
  {
    slug: "duoshot-vs-duo-studio",
    name: "Duo Studio",
    url: "https://duomockup.com/en/",
    checked: "2026-11-07",
    summary: {
      fr: "Duo Studio (duomockup.com) présente un éditeur gratuit dans le navigateur pour créer jusqu’à 10 canevas marketing App Store. Il propose des artworks iPhone 17 Pro, iPad Pro et iPhone Duo plié/déplié, des titres par image, un aperçu App Store et un export PNG ou ZIP ordonné. Aucun compte n’est requis ; le traitement reste local. Il précise que ses cadres ne sont pas des assets marketing officiels Apple.",
      en: "Duo Studio (duomockup.com) presents a free browser editor for up to 10 App Store marketing canvases. It offers iPhone 17 Pro, iPad Pro and folded/unfolded iPhone Duo artwork, per-image headlines, an App Store preview and PNG or ordered ZIP export. No account is required; processing stays local. It states that its frames are not official Apple marketing assets.",
    },
    focus: {
      fr: "Mockups marketing gratuits avec cadres, traitement local",
      en: "Free marketing mockups with device frames, local processing",
    },
  },
  {
    slug: "duoshot-vs-appscreen-pro",
    name: "AppScreen",
    url: "https://appscreen.pro/",
    checked: "2026-11-08",
    summary: {
      fr: "AppScreen (appscreen.pro, édité par Intenseloop, Inc.) présente un éditeur de captures panoramiques pour l’App Store et Google Play, avec des cadres d’appareils, des légendes et 65 modèles sur une seule toile panoramique, pour iPhone, iPad, Apple Watch, bannières App Store et Android. Depuis la v1.5 (4 novembre 2026), sa toile iPhone Duo exporte à la taille de l’écran interne, 2007 × 2853, comme taille Pro. Son offre Pro est un achat unique et ajoute la prise en charge des agents (MCP). AppScreen est un produit différent d’AppScreens (appscreens.com).",
      en: "AppScreen (appscreen.pro, by Intenseloop, Inc.) presents a panorama screenshot editor for the App Store and Google Play, with device frames, captions and 65 templates on a single panorama canvas, covering iPhone, iPad, Apple Watch, App Store banners and Android. Since v1.5 (November 4, 2026) its iPhone Duo canvas exports at the inner display size, 2007 × 2853, as a Pro size. Its Pro plan is a one-time purchase and adds agent (MCP) support. AppScreen is a different product from AppScreens (appscreens.com).",
    },
    focus: {
      fr: "Éditeur panoramique (App Store + Google Play), cadres, modèles et export iPhone Duo écran interne",
      en: "Panorama editor (App Store + Google Play), frames, templates and iPhone Duo inner-display export",
    },
  },
  {
    slug: "duoshot-vs-store-connect-studio",
    name: "Store Connect Studio",
    url: "https://anaxkg.com/en/store-connect-studio",
    checked: "2026-11-10",
    summary: {
      fr: "Store Connect Studio, édité par Anax, présente une app Mac native (macOS 26 ou version ultérieure) avec une app compagnon gratuite pour iPhone et iPad, qui conçoit les captures App Store à partir de modèles, modifie et traduit vos métadonnées App Store, et synchronise l’ensemble avec App Store Connect via votre propre clé API conservée dans le trousseau macOS. Elle annonce des cadres d’appareils (plats ou 3D), des légendes, une loupe, des panneaux sur deux captures et 53 modèles intégrés, et indique prendre en charge les tailles de captures iPhone Duo et Mac, aux côtés de l’iPhone 6,3″ et de l’iPad 13″. Les fonctions principales sont gratuites, les modèles ou apps supplémentaires étant des achats uniques. Contrairement à la synchronisation directe de Store Connect Studio, DuoShot ne dépose pas encore vers App Store Connect et s’arrête à un ZIP que vous déposez vous-même.",
      en: "Store Connect Studio, by Anax, presents a native Mac app (macOS 26 or later) with a free iPhone and iPad companion that designs App Store screenshots from templates, edits and translates your App Store metadata, and syncs everything to App Store Connect with your own API key kept in the macOS Keychain. It lists device frames (flat or 3D), captions, a magnifier lens, cross-page panels and 53 built-in templates, and states it supports iPhone Duo and Mac screenshot sizes alongside iPhone 6.3″ and iPad 13″. Core features are free, with extra templates or apps as one-time purchases. Unlike Store Connect Studio's direct sync, DuoShot does not yet upload to App Store Connect and stops at a ZIP you upload yourself.",
    },
    focus: {
      fr: "App Mac pour captures, métadonnées, traduction et synchronisation directe avec App Store Connect",
      en: "Mac app for screenshots, metadata, translation and direct App Store Connect sync",
    },
  },
] as const;

export function comparisonPath(slug: string) {
  return `/guides/${slug}`;
}

export function competitorComparison(locale: Locale, slug: string) {
  const competitor = COMPARISONS.find((entry) => entry.slug === slug);
  if (!competitor) return null;
  const { name, url, summary, focus, checked } = competitor;
  const [year, month, day] = checked.split("-").map(Number);
  const checkedOn = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  // Kept short so that even the longest competitor name plus the layout's " · DuoShot" suffix
  // stays within the 60-character rendered-title budget (the keyword "DuoShot vs <name>" leads).
  const title = locale === "fr"
    ? `DuoShot vs ${name} : captures`
    : `DuoShot vs ${name}: screenshots`;
  const description = locale === "fr"
    ? `Comparez DuoShot et ${name} : présentation sourcée, dimensions et tarifs DuoShot, export ZIP et points à vérifier avant de choisir.`
    : `Compare DuoShot and ${name}: sourced overview, DuoShot sizes and pricing, ZIP export and points to check before choosing.`;
  const link = (path: string) => localizedPath(locale, path);
  const related = COMPARISONS.filter((entry) => entry.slug !== slug)
    .map((entry) => `- [DuoShot vs ${entry.name}](${link(comparisonPath(entry.slug))})`).join("\n");
  // Link to the matching "alternative to <X>" landing page when one exists.
  const altSlug = slug.replace(/^duoshot-vs-/, "");
  const altLine = ALTERNATIVE_SLUGS.includes(altSlug)
    ? `\n- [${locale === "fr" ? `Alternative à ${name}` : `${name} alternative`}](${link(alternativePath(altSlug))})`
    : "";
  // Enriched, source-dated comparison for AppScreens (appscreens.com). Shared layout is unchanged
  // for every other competitor; this branch only adds optional sections and a FAQ for this one entry.
  if (slug === "duoshot-vs-appscreens") {
    const enriched = appScreensComparison(locale, { title, name, url, link, checkedOn, related, altLine });
    return { title, description, dateModified: checked, body: enriched.body, faq: enriched.faq };
  }
  const body = locale === "fr" ? `# ${title}

DuoShot (duoshot.site) est notre produit pour préparer les captures iPhone Duo (le téléphone pliable d'Apple). Ce comparatif décrit son fonctionnement et résume la présentation publique de [${name}](${url}), consultée le **${checkedOn}**. Il ne s’agit pas d’un test du service concurrent.

## Ce que présente ${name}

${summary.fr} Source : [site officiel de ${name}](${url}). Consultez ce site pour les tarifs et les conditions actuelles ; nous ne déduisons pas de fonctionnalités absentes d’une page publique.

## Comparer les approches

| Point de comparaison | DuoShot | ${name} |
|---|---|---|
| Présentation | Préparer et vérifier vos captures iPhone Duo, puis exporter un ZIP | ${focus.fr} ([source officielle](${url})) |
| Détails à consulter | [Dimensions](${link("/specs")}) et [tarifs](${link("/pricing")}) | [Fonctionnalités et conditions sur le site officiel](${url}) |

## Ce que DuoShot exporte

DuoShot compose vos vraies captures d’app en PNG ou JPEG opaque, sans coque d’appareil, puis les regroupe dans un ZIP organisé par écran.

- iPhone Duo **écran externe : 1398 × 2034** ; **écran interne : 2007 × 2853**.
- iPhone **6,3″ : 1206 × 2622**, inclus dans l’essai gratuit.
- iPhone **6,9″ : 1320 × 2868**, avec Pass, Indie et Studio.

L’outil vérifie les dimensions et le format, signale les vues similaires et propose un guide de pli simulé pour examiner la lisibilité. Ces contrôles ne garantissent pas l’acceptation par Apple. Voir les [dimensions et le guide du pli](${link("/specs")}).

## Tarifs DuoShot

- Essai gratuit : **2 ZIP HD** après inscription, sans carte.
- Pass 30 jours : **19 €**, paiement unique.
- Indie : **12 €/mois, ou 120 €/an payés en une fois**.
- Studio : **49 €/mois, ou 490 €/an payés en une fois**.

TVA non applicable (art. 293 B du CGI).

Les conditions et la disponibilité des offres figurent sur la page [tarifs DuoShot](${link("/pricing")}).

## Avant de choisir

Partez de votre besoin : composition visuelle, langues à traiter, dimensions de sortie et méthode de dépôt. Vérifiez les fonctionnalités et les offres de ${name} sur son [site officiel](${url}). Pour DuoShot, vous pouvez [ouvrir l’outil](${link("/tool")}) et examiner les aperçus et contrôles avant un export.

**DuoShot fournit un ZIP ; vous déposez les fichiers manuellement. Le dépôt iPhone Duo dans App Store Connect n’a pas été testé par DuoShot.**

## Autres comparatifs

- [Guide des générateurs de captures App Store](${link(COMPARISON_GUIDE_PATH)})${altLine}
${related}
` : `# ${title}

DuoShot (duoshot.site) is our product for preparing iPhone Duo (Apple's foldable iPhone) screenshots. This comparison describes its workflow and summarizes the public presentation of [${name}](${url}), checked on **${checkedOn}**. We have not tested the competing service.

## What ${name} presents

${summary.en} Source: [${name} official website](${url}). Check that site for current pricing and terms; we do not infer missing features from a public page.

## Comparing the approaches

| Comparison point | DuoShot | ${name} |
|---|---|---|
| Overview | Prepare and check iPhone Duo screenshots, then export a ZIP | ${focus.en} ([official source](${url})) |
| Details to consult | [Sizes](${link("/specs")}) and [pricing](${link("/pricing")}) | [Features and terms on the official website](${url}) |

## What DuoShot exports

DuoShot composes your real app captures as opaque PNG or JPEG images, without device frames, then packages them in a ZIP organized by screen.

- iPhone Duo **outer display: 1398 × 2034**; **inner display: 2007 × 2853**.
- iPhone **6.3″: 1206 × 2622**, included in the free trial.
- iPhone **6.9″: 1320 × 2868**, with Pass, Indie and Studio.

The tool checks dimensions and format, flags similar views and provides a simulated fold guide to review legibility. These checks do not guarantee Apple approval. See the [sizes and fold guide](${link("/specs")}).

## DuoShot pricing

- Free trial: **2 HD ZIPs** after signup, no card.
- 30-day Pass: **€19**, one-time payment.
- Indie: **€12/month, or €120/year paid upfront**.
- Studio: **€49/month, or €490/year paid upfront**.

VAT not applicable, art. 293 B of the French CGI.

Offer terms and availability are on the [DuoShot pricing page](${link("/pricing")}).

## Before choosing

Start with your needs: visual composition, languages, output dimensions and upload workflow. Check ${name} features and plans on its [official website](${url}). With DuoShot, you can [open the tool](${link("/tool")}) and inspect previews and checks before exporting.

**DuoShot provides a ZIP; you upload the files manually. DuoShot has not tested iPhone Duo uploads to App Store Connect.**

## Other comparisons

- [App Store screenshot generator guide](${link(COMPARISON_GUIDE_PATH)})${altLine}
${related}
`;
  return { title, description, dateModified: checked, body, faq: undefined as readonly FaqItem[] | undefined };
}

type EnrichedArgs = {
  title: string;
  name: string;
  url: string;
  link: (path: string) => string;
  checkedOn: string;
  related: string;
  altLine: string;
};

// AppScreens-specific body and FAQ. Every AppScreens fact comes from its public site reviewed
// 2026-11-13 (homepage, menu and pricing page); DuoShot facts mirror src/lib/plans and specs.
function appScreensComparison(locale: Locale, { title, name, url, link, checkedOn, related, altLine }: EnrichedArgs): { body: string; faq: readonly FaqItem[] } {
  const pricingUrl = "https://appscreens.com/pricing";
  if (locale === "fr") {
    const faq: readonly FaqItem[] = [
      {
        q: "Peut-on réutiliser 1206 × 2622 pour l’iPhone Duo ?",
        a: "Non, pas tel quel. 1206 × 2622 est la taille de l’iPhone 6,3″ et ses proportions diffèrent des écrans de l’iPhone Duo, qui sont 1398 × 2034 (externe) et 2007 × 2853 (interne). Exportez chaque écran à sa propre taille App Store Connect ; voyez le guide des tailles iPhone Duo indiqué ci-dessus.",
      },
      {
        q: "DuoShot dépose-t-il vers App Store Connect ?",
        a: "Non. DuoShot exporte un ZIP de fichiers PNG ou JPEG opaques que vous déposez vous-même dans App Store Connect. Le dépôt iPhone Duo n’a pas été testé par DuoShot.",
      },
      {
        q: "Avez-vous testé AppScreens ?",
        a: `Non. Cette page résume uniquement la présentation publique d’${name}, relue le ${checkedOn}. Consultez leur site officiel pour les fonctionnalités et les tarifs actuels.`,
      },
    ];
    const body = `# ${title}

DuoShot (duoshot.site) est notre produit pour préparer les captures iPhone Duo (le téléphone pliable d'Apple). Ce comparatif décrit son fonctionnement et résume la présentation publique de [${name}](${url}), consultée le **${checkedOn}**. Il ne s’agit pas d’un test du service concurrent.

## En bref

DuoShot part de vos captures réelles, les vérifie et exporte un ZIP aux tailles App Store Connect — dont l’iPhone Duo et l’emplacement requis « iPhone with Dynamic Island (medium display) ». ${name} se présente sur son site comme un éditeur visuel avec modèles, localisation et envoi direct vers les stores. Choisissez selon votre besoin : le contrôle des fichiers avec DuoShot, ou la composition visuelle avec ${name}. DuoShot est notre produit : considérez cette page comme un comparatif affilié, pas comme un test d’${name}.

## Ce que présente ${name}

${name} présente un éditeur visuel de captures App Store et Google Play, avec des modèles personnalisables et des outils de localisation. Son site indique aussi l'envoi direct vers App Store Connect et Google Play sur les offres payantes, et une API ainsi qu'un serveur MCP. Source : [site officiel de ${name}](${url}). Consultez ce site pour les tarifs et les conditions actuelles ; nous ne déduisons pas de fonctionnalités absentes d’une page publique.

## Comparer les approches, d’après leur site

| Point de comparaison | DuoShot | ${name} |
|---|---|---|
| Point de départ | Vos captures d’app réelles, vérifiées avant l’export | Modèle ou toile vierge, avec vos captures importées |
| Modèles et cadres | Pas de cadre d’appareil ; PNG ou JPEG opaque | 150+ ensembles de modèles ; cadres d'appareils (réels, clay, 3D) |
| Localisation | Non proposée — importez vos captures déjà localisées | 80+ langues, y compris de droite à gauche |
| iPhone Duo | Exporte 1398 × 2034 et 2007 × 2853 | Leur menu cite iPhone Duo ; leur tableau de tarifs le réserve aux abonnements |
| Envoi vers les stores | ZIP manuel ; pas d’envoi vers App Store Connect | Envoi direct vers les stores, indiqué pour les offres payantes |
| Plateformes | App Store iPhone et iPhone Duo ; pas d’iPad ni Google Play | App Store et Google Play, plus d’autres préréglages |
| Tarifs | [Tarifs DuoShot](${link("/pricing")}) | Free, Pro 99 $/an, Scale 180 $/an, affichés le ${checkedOn} ([leur page tarifs](${pricingUrl})) |

Ces lignes reflètent le site public d’${name} au ${checkedOn} ; vérifiez-y l’offre actuelle.

## Ce que DuoShot exporte

DuoShot compose vos vraies captures d’app en PNG ou JPEG opaque, sans coque d’appareil, puis les regroupe dans un ZIP organisé par écran.

- iPhone Duo **écran externe : 1398 × 2034** ; **écran interne : 2007 × 2853**.
- iPhone **6,3″ : 1206 × 2622**, l’emplacement requis « iPhone with Dynamic Island (medium display) », inclus dans l’essai gratuit.
- iPhone **6,9″ : 1320 × 2868**, avec Pass, Indie et Studio.

## Ce que DuoShot vérifie, et ce qu’il ne garantit pas

DuoShot vérifie les dimensions et le format opaque (il refuse l’alpha ou la transparence), signale les vues quasi identiques et propose un guide de pli simulé pour examiner la lisibilité sur l’écran interne.

Ces contrôles ne garantissent pas l’acceptation par Apple, DuoShot ne dépose pas vers App Store Connect, et le dépôt iPhone Duo n’a pas été testé par DuoShot.

- [Dimensions et guide du pli](${link("/specs")})
- [6,3″ · 1206 × 2622](${link("/1206x2622")})
- [iPhone Duo externe · 1398 × 2034](${link("/1398x2034")})
- [iPhone Duo interne · 2007 × 2853](${link("/2007x2853")})
- [Tailles des captures App Store](${link("/guides/app-store-screenshot-sizes")})
- [Guide des tailles iPhone Duo](${link("/guides/screenshot-size/iphone-duo")})
- [Vérificateur de captures iPhone Duo](${link("/tools/iphone-duo-screenshot-checker")})
- [Erreurs de rejet fréquentes](${rejectionPath(locale)})

## Tarifs DuoShot

- Essai gratuit : **2 ZIP HD** après inscription, sans carte.
- Pass 30 jours : **19 €**, paiement unique.
- Indie : **12 €/mois, ou 120 €/an payés en une fois**.
- Studio : **49 €/mois, ou 490 €/an payés en une fois**.

TVA non applicable (art. 293 B du CGI).

Les conditions et la disponibilité des offres figurent sur la page [tarifs DuoShot](${link("/pricing")}).

## Avant de choisir

Partez de votre besoin : contrôle des fichiers ou composition visuelle, langues à traiter, dimensions de sortie et méthode de dépôt. Vérifiez les fonctionnalités et les offres d’${name} sur son [site officiel](${url}). Pour DuoShot, vous pouvez [ouvrir l’outil](${link("/tool")}) et examiner les aperçus et contrôles avant un export.

**DuoShot fournit un ZIP ; vous déposez les fichiers manuellement. Le dépôt iPhone Duo dans App Store Connect n’a pas été testé par DuoShot.**

## Autres comparatifs

- [Guide des générateurs de captures App Store](${link(COMPARISON_GUIDE_PATH)})${altLine}
${related}
`;
    return { body, faq };
  }
  const faq: readonly FaqItem[] = [
    {
      q: "Can I reuse 1206 × 2622 for iPhone Duo?",
      a: "No, not as-is. 1206 × 2622 is the 6.3″ iPhone size and has different proportions from the iPhone Duo displays, which are 1398 × 2034 (outer) and 2007 × 2853 (inner). Export each display at its own App Store Connect size; see the iPhone Duo size guide linked above.",
    },
    {
      q: "Does DuoShot upload to App Store Connect?",
      a: "No. DuoShot exports a ZIP of opaque PNG or JPEG files that you upload yourself in App Store Connect. DuoShot has not tested iPhone Duo uploads.",
    },
    {
      q: "Have you tested AppScreens?",
      a: `No. This page only summarizes ${name}’ public presentation, last reviewed on ${checkedOn}. Check their official site for current features and pricing.`,
    },
  ];
  const body = `# ${title}

DuoShot (duoshot.site) is our product for preparing iPhone Duo (Apple's foldable iPhone) screenshots. This comparison describes its workflow and summarizes the public presentation of [${name}](${url}), checked on **${checkedOn}**. We have not tested the competing service.

## In short

DuoShot starts from your real screenshots, checks them and exports a ZIP at App Store Connect sizes — including iPhone Duo and the required “iPhone with Dynamic Island (medium display)” slot. ${name} presents itself on its site as a visual editor with templates, localization and direct upload to the stores. Choose by your need: file control with DuoShot, or visual composition with ${name}. DuoShot is our product, so treat this page as an affiliated comparison, not a test of ${name}.

## What ${name} presents

${name} presents a visual editor for App Store and Google Play screenshots, with customizable templates and localization tools. Its site also lists direct upload to App Store Connect and Google Play on paid plans, plus an API and an MCP server. Source: [${name} official website](${url}). Check that site for current pricing and terms; we do not infer missing features from a public page.

## Comparing the approaches, from their site

| Comparison point | DuoShot | ${name} |
|---|---|---|
| Starting point | Your real app screenshots, checked before export | A template or blank canvas, with your app screenshots imported |
| Templates and frames | No device frames; opaque PNG or JPEG | 150+ template sets; device frames (real, clay, 3D) |
| Localization | Not provided — bring your own localized captures | 80+ languages, including right-to-left |
| iPhone Duo | Exports 1398 × 2034 and 2007 × 2853 | Their menu lists iPhone Duo; their pricing table marks it as subscription-only |
| Store upload | Manual ZIP; no App Store Connect upload | Direct upload to the stores, stated for paid plans |
| Platforms | App Store iPhone and iPhone Duo; no iPad or Google Play | App Store and Google Play, plus other presets |
| Pricing | [DuoShot pricing](${link("/pricing")}) | Free, Pro $99/year, Scale $180/year, shown ${checkedOn} ([their pricing page](${pricingUrl})) |

These rows reflect ${name}’ public site on ${checkedOn}; check it for the current offer.

## What DuoShot exports

DuoShot composes your real app captures as opaque PNG or JPEG images, without device frames, then packages them in a ZIP organized by screen.

- iPhone Duo **outer display: 1398 × 2034**; **inner display: 2007 × 2853**.
- iPhone **6.3″: 1206 × 2622**, the required “iPhone with Dynamic Island (medium display)” slot, included in the free trial.
- iPhone **6.9″: 1320 × 2868**, with Pass, Indie and Studio.

## What DuoShot checks, and what it does not guarantee

DuoShot checks dimensions and the opaque format (it rejects alpha or transparency), flags near-duplicate views, and provides a simulated fold guide to review legibility on the inner display.

These checks do not guarantee Apple approval, DuoShot does not upload to App Store Connect, and iPhone Duo uploads have not been tested by DuoShot.

- [Sizes and fold guide](${link("/specs")})
- [6.3″ · 1206 × 2622](${link("/1206x2622")})
- [iPhone Duo outer · 1398 × 2034](${link("/1398x2034")})
- [iPhone Duo inner · 2007 × 2853](${link("/2007x2853")})
- [App Store screenshot sizes](${link("/guides/app-store-screenshot-sizes")})
- [iPhone Duo screenshot size guide](${link("/guides/screenshot-size/iphone-duo")})
- [iPhone Duo screenshot checker](${link("/tools/iphone-duo-screenshot-checker")})
- [Common rejection errors](${rejectionPath(locale)})

## DuoShot pricing

- Free trial: **2 HD ZIPs** after signup, no card.
- 30-day Pass: **€19**, one-time payment.
- Indie: **€12/month, or €120/year paid upfront**.
- Studio: **€49/month, or €490/year paid upfront**.

VAT not applicable, art. 293 B of the French CGI.

Offer terms and availability are on the [DuoShot pricing page](${link("/pricing")}).

## Before choosing

Start with your need: file control versus visual composition, languages, output dimensions and upload workflow. Check ${name} features and plans on its [official website](${url}). With DuoShot, you can [open the tool](${link("/tool")}) and inspect previews and checks before exporting.

**DuoShot provides a ZIP; you upload the files manually. DuoShot has not tested iPhone Duo uploads to App Store Connect.**

## Other comparisons

- [App Store screenshot generator guide](${link(COMPARISON_GUIDE_PATH)})${altLine}
${related}
`;
  return { body, faq };
}
