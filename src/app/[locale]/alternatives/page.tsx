import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { localizedPath } from "@/lib/site";
import { ALTERNATIVES, ALTERNATIVES_BASE_PATH, alternativePage, alternativePath } from "@/lib/alternatives";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: {
    h1: "DuoShot et ses alternatives pour les captures App Store",
    intro: "Comparez DuoShot aux générateurs de captures App Store. Chaque page met en regard les prix, le filigrane, la prise en charge de l’iPhone Duo et l’export multilingue, à partir de données publiques vérifiées.",
    title: "Alternatives à DuoShot : générateurs de captures App Store",
    description: "Comparez DuoShot aux alternatives pour vos captures App Store iPhone Duo : AppScreens, AppLaunchpad, Screenshots.pro, AppMockUp et Hotpot.",
    home: "Accueil",
    hub: "Alternatives",
  },
  en: {
    h1: "DuoShot and its alternatives for App Store screenshots",
    intro: "Compare DuoShot with App Store screenshot generators. Each page lines up price, watermark, iPhone Duo support and multi-language export, all from verified public data.",
    title: "DuoShot alternatives: App Store screenshot generators",
    description: "Compare DuoShot with alternatives for your iPhone Duo App Store screenshots: AppScreens, AppLaunchpad, Screenshots.pro, AppMockUp and Hotpot.",
    home: "Home",
    hub: "Alternatives",
  },
} as const;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const copy = COPY[locale];
  return pageMetadata({ locale, path: ALTERNATIVES_BASE_PATH, title: copy.title, description: copy.description });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const copy = COPY[locale];
  const views = ALTERNATIVES.map((entry) => alternativePage(locale, entry.slug)!);
  const breadcrumb = [
    { name: copy.home, path: "/" },
    { name: copy.hub, path: ALTERNATIVES_BASE_PATH },
  ];
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={ALTERNATIVES_BASE_PATH} breadcrumb={breadcrumb} />
    <SiteHeader locale={locale} path={ALTERNATIVES_BASE_PATH} />
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
      <ul className="mt-10 space-y-6">
        {views.map((view) => (
          <li key={view.slug}>
            <Link href={localizedPath(locale, alternativePath(view.slug))} className="ds-link text-lg">
              {view.breadcrumb.at(-1)!.name}
            </Link>
            <p className="mt-1 text-[var(--muted)]">{view.description}</p>
          </li>
        ))}
      </ul>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
