import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SpecsPage from "@/app/[locale]/specs/page";
import RejetPage from "@/app/[locale]/rejet/page";
import RejectionPage from "@/app/[locale]/rejection/page";
import CheckerPage from "@/app/[locale]/tools/iphone-duo-screenshot-checker/page";
import GuidePage from "@/app/[locale]/guides/best-app-store-screenshot-generator/page";
import { I18nProvider } from "@/components/i18n-provider";
import { HomePage } from "@/components/home-page";
import { DuoSlotChoice } from "@/components/tool/duo-slot-choice";
import { ExportPanel } from "@/components/tool/delivery-actions";
import { APPLE_SCREENSHOT_SOURCE, DUO_SLOT_COPY } from "./apple-screenshot-status";
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";
import { HOME_PAGE_COPY, REJECTION_PAGE_COPY } from "./marketing-copy";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Assemble this so the repository scan also covers this test without matching itself.
const oldAppleUrl = ["reference", "screenshot-specifications"].join("/");
const unsupportedSlotClaim = /emplacement[^.]*\bunique\b|\bunique\b[^.]*emplacement|seul emplacement|\bsingle\b[^.]*slot|\bone\b[^.]*Duo slot/i;
const localeLimit = /par (?:emplacement et )?langue|per (?:(?:slot and )?locale|language|localization)|pour cette langue|for this locale/i;
const duoDiagonals = /5[.,]4\s*(?:″|"|in)|7[.,]6\s*(?:″|"|in)/i;

function expectPublicCopy(text: string, context: string) {
  // Include encoded quotes from rendered HTML and normalize markup for slot context.
  const plain = text.replace(/&quot;|&#34;/g, '"').replace(/<[^>]*>/g, " ");
  expect(plain, context).not.toContain("APP_IPHONE_DUO");
  expect(plain, context).not.toMatch(unsupportedSlotClaim);
  expect(plain, context).not.toMatch(duoDiagonals);
  expect(plain, context).not.toMatch(/prêts? pour App Store Connect|ready for App Store Connect|en 2 minutes/i);
  expect(text, context).not.toContain(oldAppleUrl);
  if (/Duo|slot|emplacement/i.test(`${context} ${plain}`)) expect(plain, context).not.toMatch(localeLimit);
}

describe.each(["fr", "en"] as const)("%s public Duo copy", (locale) => {
  const messages = locale === "fr" ? fr : en;
  const limit = locale === "fr" ? /jusqu’à 10 captures (?:iPhone Duo )?par taille d’appareil/ : /up to 10 (?:iPhone Duo )?screenshots per device size/;

  it.each([true, false])("renders the approved home hero and first H2 with preserved details below the buttons (pass: %s)", (passAvailable) => {
    const heading = locale === "fr"
      ? "Vos captures App Store, prêtes pour l’iPhone Duo."
      : "Your App Store screenshots, ready for iPhone Duo.";
    const subtitle = locale === "fr"
      ? "Importez les captures de votre app : DuoShot les met aux formats Duo acceptés par Apple (1398×2034 et 2007×2853) et vous les exporte en un ZIP."
      : "Upload your app's screenshots: DuoShot fits them to the Duo sizes Apple accepts (1398×2034 and 2007×2853) and exports them as a ZIP.";
    const h2 = locale === "fr"
      ? "Un générateur de captures App Store qui part de votre vraie app"
      : "An App Store screenshot generator that starts from your real app";
    const html = renderToStaticMarkup(createElement(I18nProvider,
      { locale, messages } as ComponentProps<typeof I18nProvider>,
      createElement(HomePage, { locale, checkoutAvailable: true, passAvailable }),
    ));
    const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(headings).toHaveLength(1);
    expect(headings[0][1].replace(/<[^>]*>/g, "")).toBe(renderToStaticMarkup(heading));
    expect(html.match(/class="studio-hero-lead">([\s\S]*?)<\/p>/)?.[1]).toBe(renderToStaticMarkup(subtitle));
    expect(html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1]).toBe(h2);
    expect(h2).toContain(locale === "fr" ? "générateur" : "generator");
    const previousLead = messages[passAvailable ? "home_import_closed_open_captures" : "home_import_closed_open_captures_without_pass"];
    const details = previousLead.slice(previousLead.indexOf(". ") + 2);
    expect(html.match(/class="studio-hero-footnote mt-4">([\s\S]*?)<\/p>/)?.[1]).toBe(renderToStaticMarkup(details));
    expect(html).toMatch(/class="studio-hero-actions"[\s\S]*?<\/div><p class="studio-hero-footnote mt-4">/);
    expectPublicCopy(html, `${locale}/home`);
    expectPublicCopy(JSON.stringify(HOME_PAGE_COPY[locale]), `${locale}/home metadata`);
  });

  it("keeps every message free of unsupported slot claims and Duo diagonals", () => {
    for (const [key, value] of Object.entries(messages)) expectPublicCopy(value, `${locale}.${key}`);
    expect(messages.tool_duo_slot_hint).toBe(DUO_SLOT_COPY[locale]);
    expect(messages.asc_duo_note).toBe(DUO_SLOT_COPY[locale]);
  });

  it("keeps home, size, specs and rejection copy free of Duo slot wording", () => {
    const homeKeys = ["home_hero_details", "home_hero_details_without_pass", "home_import_closed_open_captures", "home_import_closed_open_captures_without_pass"] as const;
    const pageKeys = ["tool_duo_empty", "tool_duo_content", "specs_single_slot", "size_slot_heading", "tool_duo_slot_hint", "asc_duo_note"] as const;
    const entries = Object.entries(messages);
    const copy = [
      ...entries.filter(([key]) => /^(home_|size_|specs_|reject_)/.test(key)),
      ...pageKeys.map((key) => [key, messages[key]]),
      ...Object.entries(REJECTION_PAGE_COPY[locale]),
      ["DUO_SLOT_COPY", DUO_SLOT_COPY[locale]],
    ];
    for (const [key, value] of copy) {
      expect(value, `${locale}.${key}`).not.toMatch(/emplacement Duo|emplacement iPhone Duo|(?:iPhone )?Duo slot|single slot|combined cap/i);
    }
    for (const [key, value] of entries.filter(([key]) => key.startsWith("reject_") || key === "specs_single_slot" || key === "size_slot_heading")) {
      expect(value, `${locale}.${key}`).not.toMatch(/\bslots?\b|emplacements?/i);
    }
    const approved = locale === "fr"
      ? "Choisissez externe uniquement, interne uniquement ou un mix : 10 fichiers PNG/JPEG opaques maximum au total, une règle de DuoShot (Apple accepte jusqu’à 10 captures par taille d’appareil)."
      : "Choose outer only, inner only, or a mix: up to 10 opaque PNG/JPEG files in total, a DuoShot rule (Apple accepts up to 10 screenshots per device size).";
    for (const key of homeKeys) expect(messages[key], `${locale}.${key}`).toContain(approved);
  });

  it("uses the official per-device-size limit in the comparison guide and FAQ", () => {
    const file = `content/guides/best-app-store-screenshot-generator.${locale}.md`;
    const markdown = readFileSync(path.resolve(file), "utf8");
    expectPublicCopy(markdown, file);
    expect(markdown.match(new RegExp(limit, "g"))).toHaveLength(2);
  });

  it("renders specs, rejection, checker and comparison pages with consistent public copy", async () => {
    const props = { params: Promise.resolve({ locale }) };
    const pages = [
      ["specs", await SpecsPage(props)],
      [locale === "fr" ? "rejet" : "rejection", await (locale === "fr" ? RejetPage : RejectionPage)(props)],
      ["checker", await CheckerPage(props)],
      ["guide", await GuidePage(props)],
    ] as const;
    for (const [name, page] of pages) {
      const html = renderToStaticMarkup(page);
      expectPublicCopy(html, `${locale}/${name}`);
      expect(html).toMatch(limit);
    }
  });

  it("renders tool selection and delivery guidance with a separate ten-image selection cap", () => {
    function render(child: ReactElement) {
      return renderToStaticMarkup(createElement(I18nProvider, { locale, messages } as ComponentProps<typeof I18nProvider>, child));
    }
    const selection = render(createElement(DuoSlotChoice, {
      value: { mode: "mix", picks: [] }, outerFiles: [], innerFiles: [], onChange: () => {},
    }));
    expectPublicCopy(selection, `${locale}/tool selection`);
    expect(selection).toMatch(limit);
    for (const demo of [true, false]) {
      const delivery = render(createElement(ExportPanel, {
        locale, prefix: locale === "en" ? "/en" : "", zipUrl: "/example.zip",
        session: "in", orientation: "portrait", demo,
        jobs: { exportImages: [
          { slot: "duo-outer", index: 1, width: 1398, height: 2034, format: "png" },
          { slot: "duo-inner", index: 2, width: 2007, height: 2853, format: "png" },
        ] } as unknown as ComponentProps<typeof ExportPanel>["jobs"],
      }));
      expectPublicCopy(delivery, `${locale}/tool delivery`);
      expect(delivery).toMatch(limit);
      expect(delivery).toContain(locale === "fr" ? "10 captures Duo maximum" : "up to 10 Duo screenshots in your selection");
    }
  });
});

it("uses the canonical Apple screenshot URL and removes the old path from all source, content and Cypress files", () => {
  expect(APPLE_SCREENSHOT_SOURCE).toBe("https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/");
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) expect(readFileSync(file, "utf8"), file).not.toContain(oldAppleUrl);
    }
  }
  for (const directory of ["src", "content", "cypress"]) walk(path.resolve(directory));
});
