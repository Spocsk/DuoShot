import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("leaves legal pages out", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/specs");
    for (const path of ["/privacy", "/terms", "/cookies", "/legal", "/legal/subprocessors"]) {
      expect(urls).not.toContain(path);
      expect(urls).not.toContain(`/en${path}`);
    }
  });
});
