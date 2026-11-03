import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { localizedPath } from "@/lib/site";
import { SIZES_GUIDE_PATH } from "@/lib/guides";
import {
  SCREENSHOT_SIZE_HUB,
  deviceDisplayName,
  deviceGuidePath,
  devicesByGroup,
} from "@/lib/devices";
import { screenshotDimensions } from "@/lib/screenshot-copy";
import { pageLocale, type LocaleParams } from "../../params";

const COPY = {
  fr: {
    h1: "Taille de capture App Store par appareil (2026)",
    intro: "Trouvez la taille de capture App Store de votre appareil Apple. Les appareils sont réunis par groupe d’affichage ; ouvrez une page pour les tailles acceptées, l’obligation et les erreurs de rejet fréquentes.",
    title: "Tailles de captures App Store par appareil (2026) | DuoShot",
    description: "Tailles de captures App Store 2026 par appareil Apple : iPhone, iPhone Duo, iPad, Mac, Apple TV, Vision Pro et Apple Watch, par groupe d’affichage.",
    sizes: "Tailles acceptées",
    platformHub: "Toutes les tailles de captures App Store, par plateforme",
    home: "Accueil",
    guides: "Guides",
  },
  en: {
    h1: "App Store screenshot size by device (2026)",
    intro: "Find the App Store screenshot size for your Apple device. Devices are grouped by display group; open a page for the accepted sizes, the requirement and the common rejection errors.",
    title: "App Store screenshot sizes by device (2026) | DuoShot",
    description: "App Store screenshot sizes 2026 for every Apple device (iPhone, iPhone Duo, iPad, Mac, Apple TV, Vision Pro, Apple Watch), grouped by display group.",
    sizes: "Accepted sizes",
    platformHub: "All App Store screenshot sizes, by platform",
    home: "Home",
    guides: "Guides",
  },
} as const;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const copy = COPY[locale];
  return pageMetadata({ locale, path: SCREENSHOT_SIZE_HUB.path, title: copy.title, description: copy.description });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const copy = COPY[locale];
  const groups = devicesByGroup(locale);
  const breadcrumb = [
    { name: copy.home, path: "/" },
    { name: copy.guides, path: "/guides" },
    { name: SCREENSHOT_SIZE_HUB.label[locale], path: SCREENSHOT_SIZE_HUB.path },
  ];
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={SCREENSHOT_SIZE_HUB.path} breadcrumb={breadcrumb} />
    <SiteHeader locale={locale} path={SCREENSHOT_SIZE_HUB.path} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)]">
        <ol className="flex flex-wrap gap-2">
          {breadcrumb.map((crumb, index) => (
            <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === breadcrumb.length - 1
                ? <span aria-current="page">{crumb.name}</span>
                : <Link href={localizedPath(locale, crumb.path)} className="ds-link">{crumb.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">{copy.h1}</h1>
      <p className="mt-4 text-lg">{copy.intro}</p>
      <p className="mt-6">
        <Link href={localizedPath(locale, SIZES_GUIDE_PATH)} className="ds-link">{copy.platformHub}</Link>
      </p>
      <div className="mt-10 space-y-10" data-testid="screenshot-size-index">
        {groups.map((group) => (
          <section key={group.group} aria-label={group.group}>
            <h2 className="font-display text-2xl">{group.group}</h2>
            <p className="ds-label mt-2">
              {copy.sizes} : {group.sizes.map((size) => {
                const dimensions = screenshotDimensions(size);
                return size.note ? `${dimensions} (${size.note[locale]})` : dimensions;
              }).join(" · ")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {group.devices.map((device) => (
                <li key={device.slug}>
                  <Link href={localizedPath(locale, deviceGuidePath(device.slug))} className="ds-link">{deviceDisplayName(device)}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
