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
import { DuoSlotChoice } from "@/components/tool/duo-slot-choice";
import { ExportPanel } from "@/components/tool/delivery-actions";
import { APPLE_SCREENSHOT_SOURCE, DUO_SLOT_COPY } from "./apple-screenshot-status";
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

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
  expect(text, context).not.toContain(oldAppleUrl);
  if (/Duo|slot|emplacement/i.test(`${context} ${plain}`)) expect(plain, context).not.toMatch(localeLimit);
}

describe.each(["fr", "en"] as const)("%s public Duo copy", (locale) => {
  const messages = locale === "fr" ? fr : en;
  const limit = locale === "fr" ? "jusqu’à 10 captures par taille d’appareil" : "up to 10 screenshots per device size";

  it("keeps every message free of unsupported slot claims and Duo diagonals", () => {
    for (const [key, value] of Object.entries(messages)) expectPublicCopy(value, `${locale}.${key}`);
    expect(messages.tool_duo_slot_hint).toBe(DUO_SLOT_COPY[locale]);
    expect(messages.asc_duo_note).toBe(DUO_SLOT_COPY[locale]);
  });

  it("uses the official per-device-size limit in the comparison guide and FAQ", () => {
    const file = `content/guides/best-app-store-screenshot-generator.${locale}.md`;
    const markdown = readFileSync(path.resolve(file), "utf8");
    expectPublicCopy(markdown, file);
    expect(markdown.split(limit)).toHaveLength(3);
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
      expect(html).toContain(limit);
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
    expect(selection).toContain(limit);
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
      expect(delivery).toContain(limit);
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
