import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DevicePage } from "@/components/device-page";
import { deviceBySlug } from "./devices";
import { devicePageCopy } from "./device-page-copy";
import { iphoneDuoGuideExtra } from "./iphone-duo-guide";
import { localizedPath, rejectionPath } from "./site";
import { SCREENSHOT_CHECKER_PATH } from "./screenshot-checker";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

const duo = deviceBySlug("iphone-duo")!;

describe("iPhone Duo device guide extra", () => {
  it.each(["fr", "en"] as const)("renders the separate required slot, reuse table and computed ratios in %s", (locale) => {
    const extra = iphoneDuoGuideExtra(locale);
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    expect(html).toContain(extra.separate.heading);
    expect(html).toContain(extra.reuse.heading);
    // The keep / recrop / redo decisions are all present.
    for (const row of extra.reuse.table.rows) for (const cell of row) expect(html).toContain(cell);
    expect(html).toContain(extra.reuse.flatten);
    // Ratios are stated as computed from Apple's sizes, not published by Apple.
    expect(html).toContain(extra.ratios.note);
    expect(extra.ratios.note.toLowerCase()).toMatch(locale === "fr" ? /calculés/ : /computed/);
    for (const row of extra.ratios.rows) {
      expect(html).toContain(row.size);
      expect(html).toContain(`≈ ${row.ratio}`);
    }
    // The outer/inner Duo ratios, rounded from Apple's pixel sizes.
    expect(html).toContain(locale === "fr" ? "0,687" : "0.687");
    expect(html).toContain(locale === "fr" ? "0,703" : "0.703");
  });

  it.each(["fr", "en"] as const)("quotes both April 2027 wordings verbatim and lists DuoShot's honest limits in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    expect(html).toContain("Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.");
    expect(html).toContain("Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.");
    // Honest limits: ZIP output, uploaded by the user, upload untested.
    expect(html).toContain(locale === "fr" ? "que vous déposez vous-même" : "that you upload yourself");
    expect(html).toMatch(locale === "fr" ? /n’a pas testé le dépôt Duo/ : /has not tested the Duo upload/);
    // The limits never claim DuoShot sends nothing to App Store Connect.
    const limitsText = iphoneDuoGuideExtra(locale).limits.items.join(" ");
    expect(limitsText).not.toContain("n’envoie rien");
    expect(limitsText).not.toContain("does not send anything");
  });

  it.each(["fr", "en"] as const)("links to the Duo size shortcuts, specs, the checker and the rejection page in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    for (const path of ["/specs", "/1398x2034", "/2007x2853", "/1206x2622", "/1320x2868"]) {
      expect(html).toContain(`href="${localizedPath(locale, path)}"`);
    }
    expect(html).toContain(`href="${localizedPath(locale, SCREENSHOT_CHECKER_PATH)}"`);
    expect(html).toContain(`href="${rejectionPath(locale)}"`);
  });

  it("ships the extra only on the iPhone Duo guide, and never says both Duo sizes are required", () => {
    for (const locale of ["fr", "en"] as const) {
      const other = deviceBySlug("iphone-16")!;
      const otherHtml = renderToStaticMarkup(createElement(DevicePage, { locale, device: other }));
      expect(otherHtml).not.toContain(iphoneDuoGuideExtra(locale).reuse.heading);
      const duoHtml = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo })).toLowerCase();
      expect(duoHtml).not.toMatch(/both (iphone )?duo (sizes|screens|displays) (are )?required/);
      expect(duoHtml).not.toMatch(/les deux (tailles|écrans) duo (sont )?(requis|obligatoires)/);
    }
  });

  it("keeps the iphone-duo device guide title within the 60-char budget with the brand suffix", () => {
    for (const locale of ["fr", "en"] as const) {
      const title = `${devicePageCopy(locale, duo).title} · DuoShot`;
      expect(title.length, title).toBeLessThanOrEqual(60);
    }
    // FR keeps "générateur"; neither title doubles the brand.
    expect(devicePageCopy("fr", duo).title).toContain("générateur");
    expect(`${devicePageCopy("en", duo).title} · DuoShot`).not.toContain("DuoShot · DuoShot");
  });
});
