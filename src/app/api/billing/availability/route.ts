import { NextResponse } from "next/server";
import { checkoutAvailable, passCheckoutAvailable } from "@/lib/billing-availability";

export function GET() {
  return NextResponse.json({ checkoutAvailable: checkoutAvailable(), passAvailable: passCheckoutAvailable() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
