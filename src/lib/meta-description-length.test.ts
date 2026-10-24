import { afterEach, describe, expect, it, vi } from "vitest";
import { HOME_PAGE_COPY, pricingPageCopy } from "./marketing-copy";
import { generateMetadata as iphone63Metadata } from "@/app/[locale]/1206x2622/page";

// Google truncates meta descriptions past ~160 characters, so every indexed
// page's description must stay within that budget in both locales. Count code
// points (not UTF-16 units) because the copy includes "″", "€" and curly
// quotes that otherwise undercount.
const LIMIT = 160;

function expectWithinBudget(label: string, description: string) {
  const length = [...description].length;
  expect(length, `${label}: ${description}`).toBeLessThanOrEqual(LIMIT);
}

afterEach(() => vi.unstubAllEnvs());

describe.each(["fr", "en"] as const)("meta description length in %s", (locale) => {
  it("keeps the home description within 160 characters", () => {
    expectWithinBudget(`home.${locale}`, HOME_PAGE_COPY[locale].description);
  });

  it("keeps the pricing description within 160 characters without the Pass", () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "");
    expectWithinBudget(`pricing-no-pass.${locale}`, pricingPageCopy(locale).description);
  });

  it("keeps the pricing description within 160 characters with the Pass", () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    expectWithinBudget(`pricing-pass.${locale}`, pricingPageCopy(locale).description);
  });

  it("keeps the required 1206x2622 size description within 160 characters", async () => {
    const metadata = await iphone63Metadata({ params: Promise.resolve({ locale }) });
    expect(metadata.description).toBeTruthy();
    expectWithinBudget(`1206x2622.${locale}`, metadata.description!);
  });
});
