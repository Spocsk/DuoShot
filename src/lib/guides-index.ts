import { ALTERNATIVES_BASE_PATH, ALTERNATIVES_HUB_COPY } from "./alternatives";
import { SCREENSHOT_SIZE_HUB } from "./devices";
import { listGuides } from "./guides";
import { SCREENSHOT_SIZE_HUB_COPY } from "./screenshot-size-hub-copy";
import type { Locale } from "./specs";

export type GuideLink = { path: string; title: string; description: string };

/**
 * Hub pages listed alongside the markdown guides in the /guides index "Guides" section.
 * Each entry resolves its localized title and description from the hub's own page copy, so
 * adding a future hub guide to the index is a single entry here. The markdown content guides
 * come from listGuides(); together they make up the registry of index guide/hub entries.
 */
export const GUIDE_HUBS: readonly { path: string; copy: (locale: Locale) => GuideLink }[] = [
  {
    path: SCREENSHOT_SIZE_HUB.path,
    copy: (locale) => ({
      path: SCREENSHOT_SIZE_HUB.path,
      title: SCREENSHOT_SIZE_HUB_COPY[locale].h1,
      description: SCREENSHOT_SIZE_HUB_COPY[locale].description,
    }),
  },
  {
    path: ALTERNATIVES_BASE_PATH,
    copy: (locale) => ({
      path: ALTERNATIVES_BASE_PATH,
      title: ALTERNATIVES_HUB_COPY[locale].h1,
      description: ALTERNATIVES_HUB_COPY[locale].description,
    }),
  },
];

/** Every entry in the /guides "Guides" section: the markdown content guides plus the hub pages, sorted by title. */
export function guideIndexEntries(locale: Locale): GuideLink[] {
  const markdown = listGuides(locale).map(({ path, title, description }) => ({ path, title, description }));
  const hubs = GUIDE_HUBS.map((hub) => hub.copy(locale));
  return [...markdown, ...hubs].sort((a, b) => a.title.localeCompare(b.title, locale));
}
