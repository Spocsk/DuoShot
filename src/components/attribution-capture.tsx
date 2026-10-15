"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttribution } from "@/lib/attribution-client";

export function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    captureAttribution();
  }, [pathname, searchParams]);
  return null;
}
