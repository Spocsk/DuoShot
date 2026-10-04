import { Resend } from "resend";
import { serverEnv } from "./env";

export function isResendConfigured(): boolean {
  return Boolean(serverEnv.email.resendApiKey);
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; mocked: boolean }> {
  const key = serverEnv.email.resendApiKey;
  if (!key) {
    return { sent: false, mocked: true };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: serverEnv.email.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
  if (error) throw new Error("EMAIL_DELIVERY_FAILED");
  return { sent: true, mocked: false };
}
