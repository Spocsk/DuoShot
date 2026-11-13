import { describe, expect, it } from "vitest";
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";
import { SCREENSHOT_SIZES } from "./screenshot-pages";
import { sizeFaq } from "./size-faq";
import { SPECS_FAQ } from "./screenshot-copy";
import { directAnswer, type DirectAnswerPage } from "./direct-answers";
import type { Locale } from "./specs";

const LOCALES: Locale[] = ["fr", "en"];
const DIRECT_ANSWER_PAGES: DirectAnswerPage[] = [
  "1398x2034",
  "2007x2853",
  "1206x2622",
  "1320x2868",
  "specs",
  "rejection",
];

// "optional/optionnel" must never qualify the 6.9″ slot. Flag any copy that
// mentions a 6.9-inch diagonal within 60 characters of an optional wording.
const DIAGONALS = ["6.9″", "6,9″", "6.9-inch", "6,9 pouces"];
const OPTIONAL = ["optional", "optionnel"];
const PROXIMITY = 60;

// Handled by a separate PR; its copy still pairs 6.9″ with "optional".
// legal_terms_service: texte légal (CGU) — inchangé sans validation explicite
// de Dylan, exclu volontairement de cette PR.
const IGNORED_I18N_KEYS = new Set(["specs_iphone_63_body", "legal_terms_service"]);

function optionalNear69(text: string): boolean {
  const haystack = text.toLowerCase();
  const diagonalHits: Array<[number, number]> = [];
  for (const diagonal of DIAGONALS) {
    let from = haystack.indexOf(diagonal.toLowerCase());
    while (from !== -1) {
      diagonalHits.push([from, from + diagonal.length]);
      from = haystack.indexOf(diagonal.toLowerCase(), from + 1);
    }
  }
  if (diagonalHits.length === 0) return false;
  for (const word of OPTIONAL) {
    let from = haystack.indexOf(word);
    while (from !== -1) {
      const wordEnd = from + word.length;
      for (const [start, end] of diagonalHits) {
        const gap = start >= wordEnd ? start - wordEnd : from >= end ? from - end : 0;
        if (gap < PROXIMITY) return true;
      }
      from = haystack.indexOf(word, from + 1);
    }
  }
  return false;
}

function collectCopy(): Array<{ label: string; text: string }> {
  const entries: Array<{ label: string; text: string }> = [];
  for (const [locale, dict] of [["en", en], ["fr", fr]] as const) {
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== "string") continue;
      if (IGNORED_I18N_KEYS.has(key)) continue;
      entries.push({ label: `i18n ${locale}.${key}`, text: value });
    }
  }
  for (const locale of LOCALES) {
    for (const size of SCREENSHOT_SIZES) {
      for (const item of sizeFaq(locale, size)) {
        entries.push({ label: `sizeFaq ${locale}/${size} q`, text: item.q });
        entries.push({ label: `sizeFaq ${locale}/${size} a`, text: item.a });
      }
    }
    for (const item of SPECS_FAQ[locale]) {
      entries.push({ label: `SPECS_FAQ ${locale} q`, text: item.q });
      entries.push({ label: `SPECS_FAQ ${locale} a`, text: item.a });
    }
    for (const page of DIRECT_ANSWER_PAGES) {
      entries.push({ label: `directAnswer ${locale}/${page}`, text: directAnswer(locale, page).text });
    }
  }
  return entries;
}

describe("no optional 6.9″ nuance", () => {
  it.each(collectCopy())("$label never calls the 6.9″ slot optional", ({ label, text }) => {
    expect(optionalNear69(text), `${label}: ${text}`).toBe(false);
  });

  it.each(LOCALES)("size_69_title fits in the 60-char <title> budget in %s", (locale) => {
    const dict = locale === "en" ? en : fr;
    const title = `${dict.size_69_title} · DuoShot`;
    expect(title.length, title).toBeLessThanOrEqual(60);
  });
});
