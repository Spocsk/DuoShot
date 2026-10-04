import { NextResponse } from "next/server";
import { isAscId } from "@/lib/asc/client";
import { withAscClient } from "@/lib/asc/server";

export const runtime = "nodejs";

/** Only versions whose screenshots can still change (see ASC_EDITABLE_VERSION_STATES). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAscId(id)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  return withAscClient(async (client) => ({ versions: await client.listEditableVersions(id) }));
}
