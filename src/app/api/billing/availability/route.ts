import { NextResponse } from "next/server";
import { checkoutAvailable } from "@/lib/billing-availability";

export function GET() {
  return NextResponse.json({ checkoutAvailable: checkoutAvailable() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
