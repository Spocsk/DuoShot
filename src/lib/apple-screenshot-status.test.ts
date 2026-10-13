import { describe, expect, it } from "vitest";
import { GET } from "@/app/llms.txt/route";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppleAvailability } from "@/components/apple-availability";
import { APPLE_UPLOAD_NEWS_SOURCE, DUO_SLOT_SOURCE, APPLE_UPLOAD_STATE, APPLE_UPLOAD_STATUS_CHECKED_AT, appleUploadStatus } from "./apple-screenshot-status";
import { getTranslator } from "./i18n";

describe("Apple upload status", () => {
  it("qualifies the deadline in the crawler reference", async () => {
    const body = await GET().text();
    expect(body).toMatch(/April 2027[^\n]+for apps built with the iOS 27\.1 SDK or later/);
    expect(body).toContain("single iPhone Duo slot, with up to 10 screenshots per locale");
  });
  it("defaults to the configured open state and check date", () => {
    expect(appleUploadStatus("fr")).toBe(appleUploadStatus("fr", APPLE_UPLOAD_STATE));
    expect(APPLE_UPLOAD_STATUS_CHECKED_AT).toBe("2026-10-13");
    expect(APPLE_UPLOAD_STATE).toBe("open");
    expect(APPLE_UPLOAD_NEWS_SOURCE).toBe("https://developer.apple.com/news/?id=kkphp5qo");
  });

  it("preserves the dated pending state in both locales", () => {
    expect(appleUploadStatus("fr", "pending")).toContain("Vérifié le 13 octobre 2026 : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année.");
    expect(appleUploadStatus("en", "pending")).toContain("Checked October 13, 2026: Apple says Duo screenshot uploads will open later this year.");
  });

  it("preserves main's dated opening announcement and submission deadline", () => {
    const fr = appleUploadStatus("fr", "open");
    expect(fr).toContain("Vérifié le 13 octobre 2026 : le dépôt des captures d’écran iPhone Duo est ouvert dans App Store Connect depuis le 5 octobre 2026.");
    expect(fr).toContain("Ces captures seront exigées pour toute soumission à partir d’avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur.");
    expect(fr).not.toContain("plus tard");
    const en = appleUploadStatus("en", "open");
    expect(en).toContain("Checked October 13, 2026: iPhone Duo screenshot uploads have been open in App Store Connect since October 5, 2026.");
    expect(en).toContain("Duo screenshots become required for every submission from April 2027 for apps built with the iOS 27.1 SDK or later.");
    expect(en).not.toContain("later this year");
  });

  it.each(["fr", "en"] as const)("describes one shared slot without claiming tested uploads (%s)", (locale) => {
    const status = appleUploadStatus(locale);
    expect(status).toContain("APP_IPHONE_DUO");
    expect(status).toContain("10");
    expect(status).toContain("1398 × 2034");
    expect(status).toContain("2007 × 2853");
    expect(status).toContain(locale === "fr" ? "pas encore été testé" : "not yet been tested");
    const { t } = getTranslator(locale);
    for (const key of ["specs_png_jpeg_without_alpha", "tool_unzip_archive_get_both", "asc_duo_note"] as const) {
      expect(t(key)).toContain("APP_IPHONE_DUO");
      expect(t(key)).toContain("10");
      expect(t(key)).not.toMatch(/April 2027|avril 2027|two.*sets|deux séries/);
    }
  });

  it.each(["fr", "en"] as const)("renders both sources with the merged status (%s)", (locale) => {
    const html = renderToStaticMarkup(createElement(AppleAvailability, { locale }));
    expect(html).toContain(`href="${APPLE_UPLOAD_NEWS_SOURCE}"`);
    expect(html).toContain(`href="${DUO_SLOT_SOURCE}"`);
    expect(html).toContain("APP_IPHONE_DUO");
    expect(html).toContain('data-state="open"');
    expect(html).not.toContain("<form");
  });
});
