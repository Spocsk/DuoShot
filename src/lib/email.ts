import { Resend } from "resend";
import { serverEnv } from "./env";

export function isResendConfigured(): boolean {
  return Boolean(serverEnv.email.resendApiKey);
}

// Only the recipient's domain is logged, never the address or the message.
function recipientDomain(to: string): string {
  return to.split("@")[1]?.toLowerCase() ?? "unknown";
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; mocked: boolean }> {
  const key = serverEnv.email.resendApiKey;
  if (!key) {
    console.warn("email_not_configured", { domain: recipientDomain(options.to) });
    return { sent: false, mocked: true };
  }
  const resend = new Resend(key);
  let result: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    result = await resend.emails.send({
      from: serverEnv.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  } catch (cause) {
    console.error("email_delivery_failed", {
      domain: recipientDomain(options.to),
      reason: cause instanceof Error ? cause.name : "unknown",
    });
    throw new Error("EMAIL_DELIVERY_FAILED");
  }
  if (result.error) {
    console.error("email_delivery_failed", {
      domain: recipientDomain(options.to),
      reason: result.error.name,
      message: result.error.message,
    });
    throw new Error("EMAIL_DELIVERY_FAILED");
  }
  console.info("email_sent", { domain: recipientDomain(options.to), id: result.data?.id });
  return { sent: true, mocked: false };
}
