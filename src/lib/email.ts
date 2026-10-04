import { Resend } from "resend";
import { serverEnv } from "./env";

export function isResendConfigured(): boolean {
  return Boolean(serverEnv.email.resendApiKey);
}

// Only the recipient's domain is logged, never the address or the message.
function recipientDomain(to: string): string {
  return to.split("@")[1]?.toLowerCase() ?? "unknown";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

const URL_PATTERN = /https:\/\/[^\s<>"]+/g;

/**
 * Plain-text-only messages from a young domain are a strong junk signal for
 * iCloud and Outlook, so every message also goes out as a light HTML part built
 * from the same text: paragraphs, and links as readable anchors.
 */
export function textToHtml(text: string, lang: "fr" | "en" = "fr"): string {
  const paragraphs = text.trim().split(/\n{2,}/).map((block) => {
    const parts: string[] = [];
    let last = 0;
    for (const match of block.matchAll(URL_PATTERN)) {
      parts.push(escapeHtml(block.slice(last, match.index)));
      const url = escapeHtml(match[0]);
      parts.push(`<a href="${url}" style="color:#245765;word-break:break-all">${url}</a>`);
      last = (match.index ?? 0) + match[0].length;
    }
    parts.push(escapeHtml(block.slice(last)));
    return `<p style="margin:0 0 16px">${parts.join("").replace(/\n/g, "<br>")}</p>`;
  });
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>`
    + `<body style="margin:0;padding:24px;background:#f7f9fa;color:#172126;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">`
    + `<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d5dcdf;border-radius:16px;padding:28px">`
    + `<p style="margin:0 0 20px;font-weight:600;font-size:17px">DuoShot</p>${paragraphs.join("")}`
    + `</div></body></html>`;
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
  lang?: "fr" | "en";
  headers?: Record<string, string>;
}): Promise<{ sent: boolean; mocked: boolean }> {
  const key = serverEnv.email.resendApiKey;
  if (!key) {
    console.warn("email_not_configured", { domain: recipientDomain(options.to) });
    return { sent: false, mocked: true };
  }
  const resend = new Resend(key);
  const replyTo = serverEnv.email.replyTo;
  let result: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    result = await resend.emails.send({
      from: serverEnv.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: textToHtml(options.text, options.lang),
      ...(replyTo ? { replyTo } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
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
