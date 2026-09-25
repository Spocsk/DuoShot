import { Resend } from "resend";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; mocked: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, mocked: true };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "DuoShot <noreply@duoshot.site>",
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
  if (error) throw new Error("EMAIL_DELIVERY_FAILED");
  return { sent: true, mocked: false };
}
