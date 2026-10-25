import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { getMessages } from "@/lib/i18n";
import { duoSpec, type Locale } from "@/lib/specs";
import { ReadinessReport } from "./check-panel";
import { ExportPanel } from "./delivery-actions";

function render(locale: Locale, children: ReactElement) {
  return renderToStaticMarkup(createElement(I18nProvider, { locale, messages: getMessages(locale) } as ComponentProps<typeof I18nProvider>, children));
}

describe("export guidance", () => {
  it.each(["fr", "en"] as const)("lists 6.3-inch files with their own pixels and localized size in %s", (locale) => {
    const html = render(locale, createElement(ExportPanel, {
      locale, prefix: "", zipUrl: "https://storage.example/app.zip", session: "in", orientation: "portrait", demo: false,
      jobs: { exportImages: [{ slot: "iphone-63", index: 1, width: 1206, height: 2622, format: "png" }] } as unknown as ComponentProps<typeof ExportPanel>["jobs"],
    }));
    expect(html).toContain("iphone-63-portrait/1206x2622/01.png");
    expect(html).toContain(locale === "fr" ? "6,3″" : "6.3&quot;");
    expect(html).toContain("1206 × 2622");
  });
  it.each(["fr", "en"] as const)("explains the manual Duo delivery for example and user exports in %s", (locale) => {
    for (const demo of [true, false]) {
      const html = render(locale, createElement(ExportPanel, {
        locale,
        prefix: locale === "en" ? "/en" : "",
        zipUrl: null,
        session: "out",
        orientation: "portrait",
        demo,
        jobs: { exportImages: [] } as unknown as ComponentProps<typeof ExportPanel>["jobs"],
      }));
      expect(html).toContain("App Store Connect");
      expect(html).not.toContain("APP_IPHONE_DUO");
      expect(html).toContain(locale === "fr" ? "App Store Connect pour iPhone Duo (jusqu’à 10 captures par taille d’appareil)" : "App Store Connect for iPhone Duo (up to 10 screenshots per device size)");
      expect(html).toContain(locale === "fr" ? "captures sélectionnées dans l’ordre" : "selected screenshots in order");
      expect(html).toContain(locale === "fr" ? "10 captures Duo maximum" : "up to 10 Duo screenshots in your selection");
      expect(html).toContain(`href="${locale === "en" ? "/en" : ""}/specs"`);
    }
  });
});

describe("human confirmation", () => {
  const props: ComponentProps<typeof ReadinessReport> = {
    preparationChecks: [true, true, true, true, false, false],
    slideIndex: 0,
    outerInspect: null,
    innerInspect: null,
    outerSpec: duoSpec("duo-outer", "portrait"),
    innerSpec: duoSpec("duo-inner", "portrait"),
    qualityItems: [],
    effectiveInner: [],
    foldChecks: {},
    clones: [],
    appUsageConfirmed: false,
    setAppUsageConfirmed: () => {},
    cloneAlert: false,
    severeQualityCount: 0,
    foldWarningCount: 0,
  };

  it.each(["fr", "en"] as const)("omits the fictional demo confirmation but still requires it for user sets in %s", (locale) => {
    const demo = render(locale, createElement(ReadinessReport, { ...props, demo: true }));
    expect(demo).not.toContain('data-testid="confirm-app-usage"');

    const userSet = render(locale, createElement(ReadinessReport, { ...props, demo: false }));
    expect(userSet).toContain('type="checkbox"');
    expect(userSet).toContain('data-testid="confirm-app-usage"');
    expect(userSet).not.toContain('checked=""');
  });
});
