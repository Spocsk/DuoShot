import { describe, expect, it } from "vitest";
import { isInternalAddress, isInternalRequest } from "./internal-request";

describe("isInternalAddress", () => {
  it("accepts loopback and private addresses", () => {
    for (const address of ["127.0.0.1", "127.8.9.10", "10.0.1.4", "172.16.0.1", "172.31.255.255", "192.168.1.20", "::1", "[::1]", "::ffff:127.0.0.1", "::ffff:10.0.0.3", "fd12:3456::1", "fc00::2"]) {
      expect(isInternalAddress(address), address).toBe(true);
    }
  });

  it("refuses public and malformed addresses", () => {
    for (const address of ["8.8.8.8", "172.32.0.1", "172.15.0.1", "192.169.0.1", "2001:db8::1", "::ffff:8.8.8.8", "127.0.0", "999.0.0.1", "duoshot.site", "", "unknown"]) {
      expect(isInternalAddress(address), address).toBe(false);
    }
  });
});

describe("isInternalRequest", () => {
  const request = (headers: Record<string, string>) => isInternalRequest(new Headers(headers));

  it("accepts the worker calling its own container loopback", () => {
    expect(request({ host: "127.0.0.1:3000" })).toBe(true);
    expect(request({ host: "127.0.0.1:3000", "x-forwarded-for": "127.0.0.1" })).toBe(true);
    expect(request({ host: "localhost:3000", "x-forwarded-for": "::ffff:127.0.0.1" })).toBe(true);
    expect(request({ host: "[::1]:3000", "x-forwarded-for": "::1" })).toBe(true);
    expect(request({ host: "172.18.0.5:3000", "x-forwarded-for": "172.18.0.1" })).toBe(true);
  });

  it("refuses anything that went through Traefik", () => {
    expect(request({ host: "127.0.0.1:3000", "x-real-ip": "127.0.0.1" })).toBe(false);
    expect(request({ host: "duoshot.site", "x-real-ip": "203.0.113.9", "x-forwarded-for": "203.0.113.9" })).toBe(false);
  });

  it("refuses a public host or any public forwarding hop", () => {
    expect(request({ host: "duoshot.site" })).toBe(false);
    expect(request({ host: "web-i9qtpe5bpyig86s1aljxr5gv:3000" })).toBe(false);
    expect(request({ host: "127.0.0.1:3000", "x-forwarded-for": "127.0.0.1, 203.0.113.9" })).toBe(false);
    expect(request({ host: "127.0.0.1:3000", "x-forwarded-for": "" })).toBe(false);
    expect(request({})).toBe(false);
  });
});
