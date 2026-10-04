import { SpecsPage } from "@/components/specs-page";
import { pageMetadata } from "@/lib/seo";
import { duoSpec, specPixels } from "@/lib/specs";
import { OUTER_PORTRAIT, INNER_PORTRAIT } from "@/lib/screenshot-copy";
import { pageLocale, type LocaleParams } from "../params";

const outer = specPixels(duoSpec("duo-outer", "portrait")).replace("x", "×");
const inner = specPixels(duoSpec("duo-inner", "portrait")).replace("x", "×");

const COPY = {
  fr: {
    title: `Tailles des captures iPhone Duo : ${outer} et ${inner}`,
    description: `Dimensions App Store Connect : écran externe ${OUTER_PORTRAIT}, interne ${INNER_PORTRAIT} px. Portrait, paysage, PNG/JPEG et disponibilité du dépôt.`,
  },
  en: {
    title: `iPhone Duo Screenshot Sizes: ${outer} & ${inner}`,
    description: `App Store Connect screenshot dimensions: outer ${OUTER_PORTRAIT}, inner ${INNER_PORTRAIT} px. Portrait, landscape, PNG/JPEG and upload availability.`,
  },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/specs", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  return <SpecsPage locale={await pageLocale(params)} />;
}
