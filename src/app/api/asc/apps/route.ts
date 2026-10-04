import { withAscClient } from "@/lib/asc/server";

export const runtime = "nodejs";

export async function GET() {
  return withAscClient(async (client) => ({ apps: await client.listApps() }));
}
