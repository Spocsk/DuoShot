import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { fr } from "@/lib/i18n/fr";
import { en } from "@/lib/i18n/en";
import { DuoSlotChoice } from "./duo-slot-choice";

describe("Duo slot choice UI", () => {
  it.each(["fr", "en"] as const)("warns clearly when a mix exceeds ten (%s)", (locale) => {
    const files = Array.from({ length: 6 }, (_, i) => ({ name: `shot-${i}.png` } as File));
    const picks = files.flatMap((_, index) => [{ side: "outer" as const, index }, { side: "inner" as const, index }]);
    const children = createElement(DuoSlotChoice, { value: { mode: "mix", picks }, outerFiles: files, innerFiles: files, onChange: () => {} });
    const props = { locale, messages: locale === "fr" ? fr : en, children };
    const html = renderToStaticMarkup(createElement(I18nProvider, props));
    expect(html).toContain('role="alert"');
    expect(html).toContain(locale === "fr" ? "Plus de 10" : "More than 10");
    expect(html).not.toContain("APP_IPHONE_DUO");
    expect(html).toContain(locale === "fr" ? "10 captures iPhone Duo par taille d’appareil" : "10 iPhone Duo screenshots per device size");
    expect(html.match(/type="checkbox"/g)).toHaveLength(12);
  });
});
