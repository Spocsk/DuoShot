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
    expect(localizedPath("en", "/pricing")).toBe("/en/pricing");
    expect(localizedPath("fr", "/en/pricing")).toBe("/pricing");
    expect(localizedPath("en", "/r/harbor")).toBe("/r/harbor");
    expect(localizedPath("fr", "/r/harbor")).toBe("/r/harbor");
  });
});
