import { afterEach, describe, expect, it, vi } from "vitest";
import { isResendConfigured, sendTransactionalEmail } from "./email";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email", () => {
  it("treats a missing Resend key as mocked", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isResendConfigured()).toBe(false);
    await expect(
      sendTransactionalEmail({ to: "a@example.com", subject: "Hi", text: "Body" }),
    ).resolves.toEqual({ sent: false, mocked: true });
  });
});
