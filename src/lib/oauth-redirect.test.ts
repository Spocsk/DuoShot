import { describe, expect, it } from "vitest";
import { isLocalhostOAuthRedirectFromRemote, requestHostname } from "./oauth-redirect";

describe("oauth-redirect", () => {
  it("blocks a localhost redirect_to when the app host is production", () => {
    const authorize = new URL(
      "https://jvhqcmqwrihbtwrggwuq.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%3Fnext%3D%2Ftool",
    );
    expect(isLocalhostOAuthRedirectFromRemote(authorize, "duoshot.vercel.app")).toBe(true);
  });

  it("allows a localhost redirect_to from local development", () => {
    const authorize = new URL(
      "https://jvhqcmqwrihbtwrggwuq.supabase.co/auth/v1/authorize?redirect_to=http://127.0.0.1:3000/auth/callback",
    );
    expect(isLocalhostOAuthRedirectFromRemote(authorize, "localhost")).toBe(false);
    expect(isLocalhostOAuthRedirectFromRemote(authorize, "127.0.0.1")).toBe(false);
  });

  it("allows a production redirect_to from production", () => {
    const authorize = new URL("https://jvhqcmqwrihbtwrggwuq.supabase.co/auth/v1/authorize");
    authorize.searchParams.set("redirect_to", "https://duoshot.vercel.app/auth/callback?next=/tool");
    expect(isLocalhostOAuthRedirectFromRemote(authorize, "duoshot.vercel.app")).toBe(false);
  });

  it("reads the app hostname from forwarded headers", () => {
    const request = new Request("http://localhost/api/auth/oauth-check", {
      headers: { "x-forwarded-host": "duoshot.vercel.app, duoshot.vercel.app" },
    });
    expect(requestHostname(request)).toBe("duoshot.vercel.app");
  });
});
