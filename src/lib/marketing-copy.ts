import { PASS30, PLANS, pass30PriceId } from "./plans";
import type { Locale } from "./specs";

export const HOME_PAGE_COPY = {
  fr: { title: "Générateur de captures App Store pour iPhone Duo | DuoShot", description: "Générateur de captures App Store pour iPhone Duo à partir de vos vraies captures : cadrage aux formats Apple, vérifications et export PNG/JPEG en ZIP." },
  en: { title: "iPhone Duo App Store Screenshot Generator | DuoShot", description: "App Store screenshot generator for iPhone Duo, built from your real screenshots: framed to Apple's sizes, checked, and exported as PNG/JPEG in a ZIP." },
};

export const PRICING_PAGE_COPY = {
  fr: {
    title: "Tarifs des captures App Store",
    description: `Essai gratuit : ${PLANS.free.freeExports} exports, iPhone Dynamic Island 6,3″ requis. Indie ${PLANS.indie.monthlyEur} €/mois, Studio ${PLANS.studio.monthlyEur} €/mois : 6,9″ optionnel ; validation client Studio.`,
  },
  en: {
    title: "App Store screenshot plans & pricing",
    description: `Free trial: ${PLANS.free.freeExports} exports, Dynamic Island 6.3″ iPhone required. Indie €${PLANS.indie.monthlyEur}/month, Studio €${PLANS.studio.monthlyEur}/month: optional 6.9″; Studio client reviews.`,
  },
};

/** As with structured offers, omit the Pass when its Stripe price is absent. */
export function pricingPageCopy(locale: Locale) {
  const copy = PRICING_PAGE_COPY[locale];
  if (!pass30PriceId()?.trim()) return copy;
  return {
    ...copy,
    description: locale === "fr"
      ? `Essai gratuit : ${PLANS.free.freeExports} exports, iPhone Dynamic Island 6,3″ requis. Pass ${PASS30.priceEur} €/${PASS30.days} j, Indie ${PLANS.indie.monthlyEur} €/mois, Studio ${PLANS.studio.monthlyEur} €/mois : 6,9″ optionnel ; revue client Studio.`
      : `Free trial: ${PLANS.free.freeExports} exports, Dynamic Island 6.3″ iPhone required. Pass €${PASS30.priceEur}/${PASS30.days} days, Indie €${PLANS.indie.monthlyEur}/month, Studio €${PLANS.studio.monthlyEur}/month: optional 6.9″; Studio client reviews.`,
  };
}

export const TOOL_PAGE_COPY = {
  fr: {
    title: "Outil de captures App Store : votre espace",
    description: "Importez vos captures, ajustez le cadrage et comparez les écrans iPhone Duo dans l’outil DuoShot. Exportez un ZIP de PNG/JPEG opaques.",
  },
  en: {
    title: "App Store screenshot tool: your workspace",
    description: "Import app captures, adjust framing and preview both iPhone Duo screens in the DuoShot screenshot tool. Export a ZIP of opaque PNG/JPEG files.",
  },
};

export const WHY_NOT_AI_PAGE_COPY = {
  fr: {
    title: "Captures App Store : IA ou captures réelles ?",
    description: "Les captures App Store créées avec une IA doivent montrer votre app. Comparez transparence, cadrage, pli et contrôles de DuoShot avant l’export.",
  },
  en: {
    title: "AI or real app captures for App Store screenshots?",
    description: "AI-assisted App Store screenshots still need real app content. Review alpha channels, fold guides and DuoShot’s checks before export.",
  },
};

export const REJECTION_PAGE_COPY = {
  fr: {
    title: "App Store Connect : erreurs de captures iPhone Duo",
    description: "Captures iPhone Duo dans App Store Connect : vérifiez dimensions, canal alpha et nombre de captures. Dépôt manuel ; pas encore testé par DuoShot.",
  },
  en: {
    title: "App Store Connect iPhone Duo screenshot errors",
    description: "Troubleshoot foldable iPhone screenshots in App Store Connect: dimensions, alpha and screenshot count. Manual upload; not yet tested by DuoShot.",
  },
};
