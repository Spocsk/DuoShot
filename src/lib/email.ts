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
  await resend.emails.send({
    from: "DuoShot <noreply@duoshot.app>",
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
  return { sent: true, mocked: false };
}
