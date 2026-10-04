import { describe, expect, it } from "vitest";
import { safeNextPath } from "./auth-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths with their query", () => {
    expect(safeNextPath("/tool?upgrade=1&plan=pass30")).toBe("/tool?upgrade=1&plan=pass30");
    expect(safeNextPath("/en/tool?upgrade=1&plan=indie_yearly")).toBe("/en/tool?upgrade=1&plan=indie_yearly");
  });

  it.each([
    undefined, "", "tool", "https://evil.example/tool", "//evil.example", "/\\evil.example",
    " /tool", "/tool\n", "/auth/callback?next=/tool", "/api/stripe/checkout", "javascript:alert(1)", `/${"a".repeat(400)}`,
  ])("rejects %j", (value) => {
    expect(safeNextPath(value)).toBeUndefined();
  });
});
