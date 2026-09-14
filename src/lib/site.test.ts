import { describe, expect, it } from "vitest";
import { localePrefix, localizedPath, toolPath } from "./site";

describe("site", () => {
  it("prefixes English paths", () => {
    expect(localePrefix("fr")).toBe("");
    expect(localePrefix("en")).toBe("/en");
    expect(toolPath("fr")).toBe("/tool");
    expect(toolPath("en")).toBe("/en/tool");
  });

  it("mirrors a path into the other locale", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("en", "/tool")).toBe("/en/tool");
    expect(localizedPath("fr", "/en")).toBe("/");
    expect(localizedPath("fr", "/en/tool")).toBe("/tool");
    expect(localizedPath("en", "/en/specs")).toBe("/en/specs");
  });
});
