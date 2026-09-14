"use client";

import { useRouter } from "next/navigation";
import type { CheckoutKind } from "@/lib/plans";
import { startCheckout } from "@/lib/checkout";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { toolPath } from "@/lib/site";
import type { Locale } from "@/lib/specs";

export function PricingCta({
  locale,
  kind,
  label,
  className = "ds-cta",
}: {
  locale: Locale;
  kind: CheckoutKind;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const dest = `${toolPath(locale)}?upgrade=1`;

  async function onUpgrade() {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push(dest);
      return;
    }
    try {
      await startCheckout(kind, toolPath(locale));
    } catch {
      router.push(dest);
    }
  }

  return (
    <button type="button" data-testid={`pricing-cta-${kind}`} onClick={() => void onUpgrade()} className={className}>
      {label}
    </button>
  );
}
