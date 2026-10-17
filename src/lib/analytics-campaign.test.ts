import { describe, expect, it } from "vitest";
import { sanitizedCampaignQuery } from "./analytics-campaign";

describe("analytics campaign labels", () => {
  it("keeps only the six campaign keys and reuses attribution normalization", () => {
    const query = sanitizedCampaignQuery(`?utm_source=X!&utm_medium=Paid+Social&utm_campaign=${"A".repeat(80)}&utm_term=Fold_1.2-test&utm_content=Hero&ref=Partner&session_id=secret&invite=token&review_id=private&email=a@example.com&gclid=click`);
    expect(query).toBe(`utm_source=x&utm_medium=paidsocial&utm_campaign=${"a".repeat(64)}&utm_term=fold_1.2-test&utm_content=hero&ref=partner`);
  });

  it.each(["a@example.com", "a%40example.com", "https://example.com/private", "https%3A%2F%2Fexample.com/private"])("rejects recognizable emails and URLs in every label (%s)", (value) => {
    const input = new URLSearchParams();
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"]) input.set(key, value);
    expect(sanitizedCampaignQuery(input.toString())).toBe("");
  });

  it.each(["", "?session_id=secret", "?utm_source=&ref=+!&utm_campaign=!!!"])("keeps absent or empty campaigns query-free (%s)", (search) => {
    expect(sanitizedCampaignQuery(search)).toBe("");
  });

  it("uses the first duplicate value and ignores differently cased keys", () => {
    expect(sanitizedCampaignQuery("?utm_source=First&utm_source=Second&ref=a%40example.com&ref=partner&UTM_CAMPAIGN=other"))
      .toBe("utm_source=first");
  });
});
