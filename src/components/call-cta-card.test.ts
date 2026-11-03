import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTranslator } from "@/lib/i18n";
import { DEFAULT_CALL_BOOKING_URL } from "@/lib/call-offer";
import type { Locale } from "@/lib/specs";

// CALL_BOOKING_URL is read at module load, so each case stubs the env var and re-imports
// the card through a reset module registry. Pass undefined to leave the env var unset.
async function render(locale: Locale, url: string | undefined) {
  vi.resetModules();
  if (url === undefined) vi.stubEnv("NEXT_PUBLIC_CALL_BOOKING_URL", undefined);
  else vi.stubEnv("NEXT_PUBLIC_CALL_BOOKING_URL", url);
  const { CallCtaCard } = await import("./call-cta-card");
  return renderToStaticMarkup(createElement(CallCtaCard, { locale }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("CallCtaCard", () => {
  it.each([undefined, "", "   "])(
    "renders the default booking URL when the env var is blank or unset (%j)",
    async (url) => {
      expect(await render("fr", url)).toContain(`href="${DEFAULT_CALL_BOOKING_URL}"`);
      expect(await render("en", url)).toContain(`href="${DEFAULT_CALL_BOOKING_URL}"`);
    },
  );

  it.each(["http://insecure.example.com/book", "ftp://example.com/book", "not a url", "javascript:alert(1)"])(
    "renders nothing for a non-https URL (%j)",
    async (url) => {
      expect(await render("fr", url)).toBe("");
      expect(await render("en", url)).toBe("");
    },
  );

  describe.each(["fr", "en"] as const)("%s with a configured https URL", (locale) => {
    const url = "https://cal.example.com/duoshot/intro";

    it("renders a new-tab link with the booking href and localized copy", async () => {
      const { t } = getTranslator(locale);
      const html = await render(locale, url);

      expect(html).toContain(`href="${url}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain(t("call_offer_title"));
      expect(html).toContain(t("call_offer_body"));
      expect(html).toContain(t("call_offer_cta"));
    });
  });
});
