import { NextResponse } from "next/server";
import { buildExampleZip } from "@/lib/pipeline/example-zip";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const zip = await buildExampleZip();
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="duoshot-example-inner-landscape.zip"',
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
