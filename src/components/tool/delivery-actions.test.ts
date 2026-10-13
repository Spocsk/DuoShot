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
      expect(html).toContain("APP_IPHONE_DUO");
      expect(html).toContain(locale === "fr" ? "emplacement iPhone Duo unique" : "single iPhone Duo slot");
      expect(html).toContain(locale === "fr" ? "captures sélectionnées dans l’ordre" : "selected screenshots in order");
      expect(html).toContain(locale === "fr" ? "10 maximum" : "at most 10");
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
