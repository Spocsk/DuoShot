import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { GuideMarkdown } from "@/components/guide-markdown";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { sizesGuide, SIZES_GUIDE_PATH } from "@/lib/guides";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { sizesGuideCopy } from "@/lib/sizes-guide-copy";
import { localizedPath } from "@/lib/site";
import { deviceDisplayName, deviceGuidePath, devicesByPlatform } from "@/lib/devices";
import { pageLocale, type LocaleParams } from "../../params";

const DEVICE_INDEX_HEADING = {
  fr: "Tailles de captures par appareil",
  en: "Screenshot sizes by device",
} as const;

const DEVICE_INDEX_INTRO = {
  fr: "Une page dédiée par appareil, avec les tailles acceptées par App Store Connect pour son groupe d’affichage, l’obligation et les erreurs de rejet fréquentes.",
  en: "A dedicated page per device, with the sizes App Store Connect accepts for its display group, the requirement and the common rejection errors.",
} as const;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: SIZES_GUIDE_PATH, ...sizesGuide(locale) });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const guide = sizesGuide(locale);
  const copy = sizesGuideCopy(locale);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={SIZES_GUIDE_PATH} article={{ ...guide, author: "person" }} faq={copy.faq} />
    <SiteHeader locale={locale} path={SIZES_GUIDE_PATH} />
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
      <article>
        <GuideMarkdown body={guide.body} />
        <section className="mt-12" aria-labelledby="device-index" data-testid="device-index">
          <h2 id="device-index" className="font-display text-3xl">{DEVICE_INDEX_HEADING[locale]}</h2>
          <p className="mt-4">{DEVICE_INDEX_INTRO[locale]}</p>
          {devicesByPlatform(locale).map((group) => (
            <div key={group.platform} className="mt-6">
              <h3 className="font-display text-xl">{group.label}</h3>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {group.devices.map((device) => (
                  <li key={device.slug}>
                    <Link href={localizedPath(locale, deviceGuidePath(device.slug))} className="ds-link">{deviceDisplayName(device)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <section className="mt-12" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-3xl">{copy.faqHeading}</h2>
          <FaqList items={copy.faq} />
        </section>
      </article>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
