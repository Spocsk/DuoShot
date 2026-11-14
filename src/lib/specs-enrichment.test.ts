import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpecsPage } from "@/components/specs-page";
import { SPECS_FAQ } from "./screenshot-copy";
import { SPECS_SOURCE_CHECKED_ON, formatCheckedOn } from "./specs-enrichment";
import { deviceGuidePath } from "./devices";
import { localizedPath, rejectionPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s specs enrichment", (locale) => {
  const html = renderToStaticMarkup(createElement(SpecsPage, { locale }));

  it("shows a source line with the formatted checked-on date", () => {
    const line = html.match(/data-testid="specs-source-line"[\s\S]*?<\/p>/)![0];
    expect(line).toContain(formatCheckedOn(locale, SPECS_SOURCE_CHECKED_ON));
  });

  it("shows the Duo badge paragraph", () => {
    expect(html).toContain('data-testid="specs-duo-badge"');
    expect(html).toContain(locale === "fr" ? "conçue pour l’iPhone Duo" : "made for iPhone Duo");
  });

  it("quotes Apple's required and Face ID rows in the scaling rule", () => {
    const rule = html.match(/data-testid="specs-scaling-rule"[\s\S]*?<\/p>/)![0];
    expect(rule).toContain("At least one screenshot for iPhone with Dynamic Island (medium display).");
    expect(rule).toContain("Required if app runs on iPhone");
  });

  it("lists exactly seven iPhone Duo mistakes", () => {
    const section = html.match(/<section[^>]*aria-labelledby="duo-mistakes"[^>]*>([\s\S]*?)<\/section>/)![1];
    expect((section.match(/<li/g) ?? []).length).toBe(7);
  });

  it("links the iPhone Duo device guide and the rejection page", () => {
    expect(html).toContain(`href="${localizedPath(locale, deviceGuidePath("iphone-duo"))}"`);
    expect(html).toContain(`href="${rejectionPath(locale)}"`);
  });

  it("adds the two new Duo FAQ entries", () => {
    const questions = SPECS_FAQ[locale].map((item) => item.q);
    expect(questions).toContain(locale === "fr" ? "Quelle est la taille des captures iPhone Duo ?" : "What is the iPhone Duo screenshot size?");
    expect(questions).toContain(locale === "fr" ? "Les captures iPhone Duo ajoutent-elles un badge sur l’App Store ?" : "Do iPhone Duo screenshots add a badge on the App Store?");
  });

  it("never claims both Duo sizes are required", () => {
    const lower = html.toLowerCase();
    expect(lower).not.toContain(locale === "fr" ? "les deux tailles sont requises" : "both sizes are required");
    expect(lower).not.toContain(locale === "fr" ? "les deux écrans sont requis" : "both displays are required");
  });

  it("never contains the banned direct-answer phrases", () => {
    for (const phrase of ["clear of the fold", "APP_IPHONE_DUO", "emplacement unique", "single slot", "5,4″", "7,6″", "5.4\"", "7.6\""]) {
      expect(html).not.toContain(phrase);
    }
  });
});
