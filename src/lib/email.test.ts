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

describe("email delivery logging", () => {
  it("logs the Resend error without the address and rejects", async () => {
    vi.resetModules();
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: async () => ({ data: null, error: { name: "validation_error", message: "domain not verified" } }) };
      },
    }));
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendTransactionalEmail: send } = await import("./email");
    await expect(send({ to: "someone@icloud.com", subject: "Hi", text: "Body" })).rejects.toThrow("EMAIL_DELIVERY_FAILED");
    expect(errorLog).toHaveBeenCalledWith("email_delivery_failed", {
      domain: "icloud.com",
      reason: "validation_error",
      message: "domain not verified",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("someone@");
    errorLog.mockRestore();
    vi.doUnmock("resend");
  });
});
