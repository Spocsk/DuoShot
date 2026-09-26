/** Liveness only: avoids provider requests on every container health check. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
