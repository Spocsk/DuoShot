import { describe, expect, it } from "vitest";
import { landingAttribution, readAttribution } from "./attribution";

const landing = (query = "", referrer: string | null = null) =>
  landingAttribution(new URL(`https://duoshot.site/${query}`), referrer);
const cookie = (value: unknown) => `other=1; ds_attr=${encodeURIComponent(JSON.stringify(value))}; session=2`;

describe("landing attribution", () => {
  it("collects only supported campaign fields, lowercases, filters and caps them", () => {
    expect(landing(`?utm_source=Google!&utm_medium=Paid+Social&utm_campaign=${"A".repeat(80)}&utm_content=Hero_V2.0-test&utm_term=private&email=a@example.com`)).toEqual({
      utm_source: "google", utm_medium: "paidsocial", utm_campaign: "a".repeat(64), utm_content: "hero_v2.0-test",
    });
  });

  it("keeps only the external referrer hostname, excluding credentials, port, path and query", () => {
    expect(landing("", "https://user:secret@NEWS.Example:8080/person/private?email=a@example.com#secret"))
      .toEqual({ referrer: "news.example" });
  });

  it.each([null, "broken", "/relative", "javascript:alert(1)", "ftp://external.example/file", "https://duoshot.site/path", "http://DUOSHOT.SITE:8080/path", "https://www.duoshot.site./path"])("ignores absent, invalid or internal referrer %s", (referrer) => {
    expect(landing("", referrer)).toEqual({});
  });

  it("omits empty values and recognizable email/URL payloads", () => {
    expect(landing("?utm_source=%20%21&utm_medium=&utm_campaign=a%40example.com&utm_content=https%3A%2F%2Fexample.com%2Fprivate"))
      .toEqual({});
    expect(landing("?utm_source=a%2540example.com")).toEqual({});
  });
});

describe("checkout attribution", () => {
  it("re-sanitizes an untrusted cookie and ignores non-attribution keys", () => {
    expect(readAttribution(cookie({
      utm_source: "GOOGLE!", utm_medium: "Paid Social", utm_campaign: "X".repeat(100), utm_content: "HERO_1.2-a",
      referrer: "NEWS.EXAMPLE", kind: "pass30", workspace_id: "other", email: "a@example.com",
    }), "duoshot.site")).toEqual({
      utm_source: "google", utm_medium: "paidsocial", utm_campaign: "x".repeat(64), utm_content: "hero_1.2-a", referrer: "news.example",
    });
  });

  it.each([null, "", "other=1", "ds_attr=", "ds_attr=%E0%A4%A", "ds_attr={broken", ...[null, [], "text", 42, true].map(cookie)])("ignores malformed or absent cookie %s", (header) => {
    expect(readAttribution(header, "duoshot.site")).toEqual({});
  });

  it("omits nonstrings, empty values and email values without discarding valid keys", () => {
    expect(readAttribution(cookie({ utm_source: "Valid", utm_medium: 123, utm_campaign: { private: true }, utm_content: "a@example.com", referrer: "https://news.example/private" }), "duoshot.site"))
      .toEqual({ utm_source: "valid" });
  });

  it.each(["duoshot.site", "www.duoshot.site", "news.example/path", "user@news.example", "news.example:8080", "news.example?email=a@example.com"])("rejects internal or non-host referrer %s", (referrer) => {
    expect(readAttribution(cookie({ referrer }), "duoshot.site")).toEqual({});
  });

  it("caps referrer hostnames at 64 characters", () => {
    const host = `${"a".repeat(50)}.${"b".repeat(30)}.example`;
    expect(landing("", `https://${host}/`)).toEqual({ referrer: host.slice(0, 64) });
    expect(readAttribution(cookie({ referrer: host }), "duoshot.site")).toEqual({ referrer: host.slice(0, 64) });
  });
});
