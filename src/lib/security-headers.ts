// Response headers for every route, wired in next.config.ts. Pages stay statically
// rendered, so scripts are allowed inline rather than by per-request nonce.
type Options = { supabaseUrl?: string; dev?: boolean };

function origin(url: string | undefined): string | null {
  try { return url ? new URL(url).origin : null; } catch { return null; }
}

export function contentSecurityPolicy({ supabaseUrl, dev = false }: Options): string {
  const supabase = origin(supabaseUrl);
  const supabaseSocket = supabase?.replace(/^http/, "ws");
  const list = (...sources: (string | null | undefined | false)[]) => sources.filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    // React dev tooling needs eval; the OCR core compiles WebAssembly.
    `script-src ${list("'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", dev && "'unsafe-eval'")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${list("'self'", "data:", "blob:", supabase)}`,
    `media-src ${list("'self'", "blob:", supabase)}`,
    "font-src 'self' data:",
    `connect-src ${list("'self'", supabase, supabaseSocket, "https://api-eu.mixpanel.com", dev && "ws:")}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function securityHeaders(options: Options): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    ...(options.dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
