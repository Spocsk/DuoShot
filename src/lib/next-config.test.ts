import { describe, expect, it } from "vitest";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import nextConfig from "../../next.config";

describe("www canonical redirect", () => {
  it.each(["/", "/en/tool?next=%2Faccount&x=1", "/xyz-nope"])("returns 301 and preserves %s", async (path) => {
    const response = await unstable_getResponseFromNextConfig({
      nextConfig,
      url: `https://www.duoshot.site${path}`,
      headers: { host: "www.duoshot.site" },
    });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`https://duoshot.site${path}`);
  });

  it.each(["duoshot.site", "wwwXduoshot.site", "www.duoshotXsite", "www.duoshot.site.example"])("does not redirect other hosts: %s", async (host) => {
    const response = await unstable_getResponseFromNextConfig({
      nextConfig,
      url: `https://${host}/en/tool`,
      headers: { host },
    });
    expect(response.headers.get("location")).toBeNull();
  });
});
