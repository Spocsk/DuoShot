// Gate for /api/internal/*, applied in src/proxy.ts before the route's own bearer check.
// The proxy cannot see the TCP peer, so it reasons about who can have set each header:
// - Traefik always sets X-Real-Ip (overwriting any client value) and routes on the public
//   host name, so a proxied request carries X-Real-Ip and a public Host.
// - Next fills X-Forwarded-For with the socket peer when it is absent, so a direct call from
//   the container loopback or the private Docker network shows only internal addresses.
// Internal callers must therefore address the server by IP literal or `localhost`
// (the render worker uses http://127.0.0.1:3000); a Docker DNS name is refused.

function ipv4Internal(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Loopback or private (RFC 1918 / IPv6 ULA) address, including IPv4-mapped IPv6. */
export function isInternalAddress(raw: string): boolean {
  const address = raw.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!address) return false;
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Internal(mapped[1]);
  if (address.includes(":")) return address === "::1" || /^f[cd][0-9a-f]{2}:/.test(address);
  return ipv4Internal(address);
}

function hostName(host: string) {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[")) return value.slice(1, value.indexOf("]"));
  // A bare IPv6 literal has several colons; otherwise strip an optional port.
  return value.split(":").length > 2 ? value : value.replace(/:\d+$/, "");
}

export function isInternalRequest(headers: Headers): boolean {
  if (headers.has("x-real-ip")) return false;
  const host = hostName(headers.get("host") ?? "");
  if (host !== "localhost" && !isInternalAddress(host)) return false;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded !== null && !forwarded.split(",").every((hop) => isInternalAddress(hop))) return false;
  return true;
}
