import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/lib/json-ld";
import type { Locale } from "@/lib/specs";
import { localizedPath, toolPath } from "@/lib/site";
import { SIZES_GUIDE_PATH } from "@/lib/guides";
import { APPLE_SCREENSHOT_SOURCE } from "@/lib/apple-screenshot-status";
import { screenshotDimensions } from "@/lib/screenshot-copy";
import {
  DEVICE_VERIFIED_ON,
  type Device,
  deviceBySlug,
  deviceDisplayName,
  deviceGuidePath,
} from "@/lib/devices";
import { devicePageCopy, orientationLabel } from "@/lib/device-page-copy";

const LABELS = {
  fr: {
    verified: `Vérifié le ${DEVICE_VERIFIED_ON}`,
    group: "Groupe d’affichage",
    sizes: "Tailles acceptées",
    colSize: "Taille (pixels)",
    colOrientation: "Orientation",
    requirement: "Obligation et notes",
    errors: "Erreurs de rejet fréquentes",
    errorsIntro: "Avant de déposer vos captures, écartez ces causes fréquentes de rejet :",
    faq: "FAQ",
    related: "Pages liées",
    hub: "Toutes les tailles de captures App Store",
    source: "Lire les spécifications App Store Connect",
    cta: "Préparer vos captures",
    generator: (size: string) => `Ouvrir la page de taille ${size}`,
  },
  en: {
    verified: `Verified on ${DEVICE_VERIFIED_ON}`,
    group: "Display group",
    sizes: "Accepted sizes",
    colSize: "Size (pixels)",
    colOrientation: "Orientation",
    requirement: "Requirement and notes",
    errors: "Common rejection errors",
    errorsIntro: "Before you upload your screenshots, rule out these common rejection causes:",
    faq: "FAQ",
    related: "Related pages",
    hub: "All App Store screenshot sizes",
    source: "Read the App Store Connect specifications",
    cta: "Prepare your screenshots",
    generator: (size: string) => `Open the ${size} size page`,
  },
} as const;

export function DevicePage({ locale, device }: { locale: Locale; device: Device }) {
  const l = LABELS[locale];
  const copy = devicePageCopy(locale, device);
  const path = deviceGuidePath(device.slug);
  const neighbors = device.neighbors.map(deviceBySlug).filter((entry): entry is Device => Boolean(entry));
  return <div className="flex min-h-full flex-col">
    <JsonLd
      locale={locale}
      path={path}
      faq={copy.faq}
      breadcrumb={copy.breadcrumb}
      article={{ title: copy.h1, description: copy.description, dateModified: DEVICE_VERIFIED_ON, abstract: copy.answer }}
    />
    <SiteHeader locale={locale} path={path} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <p className="ds-label">{l.verified}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{copy.h1}</h1>
      <p className="mt-4 text-lg">{copy.answer}</p>
      <p className="ds-label mt-6">{l.group} : {device.group[locale]}</p>

      <section className="mt-10" aria-labelledby="device-sizes">
        <h2 id="device-sizes" className="font-display text-3xl">{l.sizes}</h2>
        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th scope="col" className="py-2 pr-4 font-medium">{l.colSize}</th>
              <th scope="col" className="py-2 font-medium">{l.colOrientation}</th>
            </tr>
          </thead>
          <tbody>
            {device.sizes.map((size) => (
              <tr key={`${size.width}x${size.height}-${size.orientation}`} className="border-b border-[var(--line)]">
                <td className="py-2 pr-4 font-mono">
                  {screenshotDimensions(size)}
                  {size.note && <span className="ds-label ml-2">{size.note[locale]}</span>}
                </td>
                <td className="py-2">{orientationLabel(locale, size.orientation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <a href={APPLE_SCREENSHOT_SOURCE} className="ds-link mt-4 inline-block">{l.source}</a>
      </section>

      <section className="mt-10" aria-labelledby="device-requirement">
        <h2 id="device-requirement" className="font-display text-3xl">{l.requirement}</h2>
        <p className="mt-4">{device.requirement[locale]}</p>
      </section>

      <section className="mt-10" aria-labelledby="device-errors">
        <h2 id="device-errors" className="font-display text-3xl">{l.errors}</h2>
        <p className="mt-4">{l.errorsIntro}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {device.commonErrors[locale].map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="device-faq">
        <h2 id="device-faq" className="font-display text-3xl">{l.faq}</h2>
        <FaqList items={copy.faq} />
      </section>

      <section className="mt-10" aria-labelledby="device-related">
        <h2 id="device-related" className="font-display text-3xl">{l.related}</h2>
        <ul className="mt-4 space-y-3">
          {device.generatorSize && (
            <li><Link href={localizedPath(locale, `/${device.generatorSize}`)} className="ds-link">{l.generator(device.generatorSize)}</Link></li>
          )}
          {neighbors.map((neighbor) => (
            <li key={neighbor.slug}>
              <Link href={localizedPath(locale, deviceGuidePath(neighbor.slug))} className="ds-link">{deviceDisplayName(neighbor)}</Link>
            </li>
          ))}
          <li><Link href={localizedPath(locale, SIZES_GUIDE_PATH)} className="ds-link">{l.hub}</Link></li>
        </ul>
      </section>

      <Button as="link" variant="primary" href={toolPath(locale)} className="mt-8">{l.cta}</Button>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
