import Link from "next/link";
import { AppleAvailability } from "./apple-availability";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { appStoreDisclaimer233, formatInches, SIZE_SPECS, SPECS_VERSION_DATE, specRowDetail, type Locale, type SizeSpec } from "@/lib/specs";
import { FaqList } from "@/components/faq-list";
import { APPLE_DEVICE_SOURCE, APPLE_SCREENSHOT_SOURCE } from "@/lib/apple-screenshot-status";
import { INNER_PORTRAIT, OUTER_PORTRAIT, screenshotDimensions, SPECS_FAQ } from "@/lib/screenshot-copy";
import { toolPath } from "@/lib/site";

function SpecsTable({ locale, specs, caption }: { locale: Locale; specs: SizeSpec[]; caption: string }) {
  const fr = locale === "fr";
  return <div className="mt-6 overflow-x-auto">
    <table className="w-full text-left text-sm tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <thead className="ds-spec-head">
        <tr>
          <th scope="col" className="py-3 pr-3 font-medium">{fr ? "Écran" : "Display"}</th>
          <th scope="col" className="px-2 py-3 font-medium">Orientation</th>
          <th scope="col" className="py-3 pl-2 font-medium">Pixels</th>
        </tr>
      </thead>
      <tbody>
        {specs.map((spec) => <tr key={spec.id} className="border-t border-[var(--line)]">
          <th scope="row" className="py-3 pr-3 font-normal">
            {spec.slot === "duo-outer" ? (fr ? "Écran externe" : "Outer display") : spec.slot === "duo-inner" ? (fr ? "Écran interne" : "Inner display") : "iPhone"}
            <span className="block text-[var(--muted)]">{specRowDetail(spec, locale)}</span>
          </th>
          <td className="px-2 py-3">{spec.orientation === "portrait" ? "Portrait" : (fr ? "Paysage" : "Landscape")}</td>
          <td className="py-3 pl-2 font-mono">{screenshotDimensions(spec)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export function SpecsPage({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const faq = SPECS_FAQ[locale];
  const outerSize = formatInches(SIZE_SPECS.find((spec) => spec.slot === "duo-outer")!.inches, locale);
  const innerSize = formatInches(SIZE_SPECS.find((spec) => spec.slot === "duo-inner")!.inches, locale);
  const size69 = formatInches(SIZE_SPECS.find((spec) => spec.slot === "iphone-69")!.inches, locale);
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} faq={faq} />
      <SiteHeader locale={locale} path="/specs" />
      <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
        <p className="ds-label">{fr ? "Version des dimensions" : "Dimensions version"} · {SPECS_VERSION_DATE}</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">{fr ? "Tailles des captures iPhone Duo pour App\u00a0Store Connect" : "iPhone Duo screenshot sizes for App\u00a0Store Connect"}</h1>
        <p className="mt-4 max-w-3xl text-lg">
          {fr
            ? `Pour App Store Connect, préparez des captures de ${OUTER_PORTRAIT} px pour l’écran externe (${outerSize}) et de ${INNER_PORTRAIT} px pour l’écran interne (${innerSize}) en portrait. En paysage, inversez la largeur et la hauteur.`
            : `For App Store Connect, prepare ${OUTER_PORTRAIT} px screenshots for the outer display (${outerSize}) and ${INNER_PORTRAIT} px screenshots for the inner display (${innerSize}) in portrait. Swap width and height for landscape.`}
        </p>
        <AppleAvailability locale={locale} />
        <section className="mt-10" aria-labelledby="duo-sizes">
          <h2 id="duo-sizes" className="font-display text-3xl">{fr ? "Dimensions des captures : externe et interne" : "Screenshot dimensions: outer and inner"}</h2>
          <SpecsTable locale={locale} specs={SIZE_SPECS.filter((spec) => spec.slot !== "iphone-69")} caption={fr ? "Dimensions iPhone Duo en portrait et paysage" : "iPhone Duo portrait and landscape screenshot sizes"} />
          <p className="mt-4 text-sm text-[var(--muted)]">{fr ? "PNG ou JPEG, sans canal alpha ni transparence. Apple autorise une à dix captures. DuoShot prépare une paire externe/interne par position, avec une seule orientation par set." : "PNG or JPEG, without alpha channels or transparency. Apple allows one to ten screenshots. DuoShot prepares an outer/inner pair for each position, with one orientation per set."}{" "}<a href={APPLE_SCREENSHOT_SOURCE} className="ds-link">{fr ? "Consulter les spécifications Connect" : "Read the Connect specifications"}</a></p>
        </section>
        <section className="mt-12" aria-labelledby="panel-vs-connect">
          <h2 id="panel-vs-connect" className="font-display text-3xl">{fr ? "Résolution de la dalle et dimensions Connect" : "Panel resolution vs App Store Connect dimensions"}</h2>
          <p className="mt-4">{fr ? `La dalle interne affiche 1878 × 2670 pixels. Pour une capture de fiche App Store en portrait, Apple publie ${INNER_PORTRAIT} pixels. Utilisez cette seconde valeur pour vos fichiers Connect.` : `The physical inner panel has a resolution of 1878 × 2670 pixels. For a portrait App Store listing screenshot, Apple specifies ${INNER_PORTRAIT} pixels. Use the latter for your Connect files.`}</p>
          <p className="mt-3 text-[var(--muted)]">{fr ? `Pour l’écran externe, la dalle et la capture en portrait partagent les mêmes dimensions : ${OUTER_PORTRAIT} pixels. Un redimensionnement ne crée pas une interface adaptée : vos captures doivent montrer votre app telle qu’elle s’affiche sur chaque écran.` : `For the outer display, the panel and portrait screenshot share the same dimensions: ${OUTER_PORTRAIT} pixels. Resizing does not create an adapted layout: your screenshots should show how your app actually looks on each display.`}</p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><a className="ds-link" href={APPLE_DEVICE_SOURCE}>{fr ? `Fiche technique Apple : écrans ${outerSize} et ${innerSize}` : `Apple tech specs: ${outerSize} and ${innerSize} displays`}</a><a className="ds-link" href={APPLE_SCREENSHOT_SOURCE}>{fr ? "Apple : dimensions des captures Connect" : "Apple: Connect screenshot dimensions"}</a></p>
        </section>
        <section className="mt-12" aria-labelledby="iphone-69-sizes">
          <h2 id="iphone-69-sizes" className="font-display text-3xl">{fr ? `Formats iPhone ${size69} supplémentaires` : `Additional iPhone ${size69} sizes`}</h2>
          <p className="mt-4 text-[var(--muted)]">{fr ? `Ces formats concernent l’emplacement iPhone ${size69} dans Connect. Ils ne sont pas les dimensions des captures Duo. Leur export supplémentaire dans DuoShot est disponible avec Indie et Studio.` : `These formats belong to the iPhone ${size69} slot in Connect. They are not Duo screenshot dimensions. Additional export of these sizes in DuoShot is available with Indie and Studio.`}</p>
          <SpecsTable locale={locale} specs={SIZE_SPECS.filter((spec) => spec.slot === "iphone-69")} caption={fr ? "Formats de l’emplacement iPhone 6,9 pouces" : "iPhone 6.9-inch slot screenshot sizes"} />
        </section>
        <section className="mt-12">
          <h2 className="font-display text-3xl">{fr ? "Questions sur les captures iPhone Duo" : "iPhone Duo screenshot questions"}</h2>
          <FaqList items={faq} />
        </section>
        <p className="mt-8 max-w-3xl text-sm text-[var(--muted)]">{appStoreDisclaimer233(locale)} {fr ? "DuoShot ne garantit pas l’approbation d’Apple." : "DuoShot does not guarantee Apple approval."}</p>
        <Link className="ds-cta mt-8" data-testid="specs-cta-tool" href={toolPath(locale)}>{fr ? "Préparer vos captures" : "Prepare your screenshots"}</Link>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
