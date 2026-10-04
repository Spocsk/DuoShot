"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseKind } from "@/lib/plans";
import { startCheckout } from "@/lib/checkout";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { toolPath } from "@/lib/site";
import type { Locale } from "@/lib/specs";

export function PricingCta({
  locale,
  kind,
  label,
  className = "ds-cta",
  initialAvailable,
}: {
  locale: Locale;
  kind: PurchaseKind;
  label: string;
  className?: string;
  /** Server-rendered checkout availability; when omitted the button asks the API after mount. */
  initialAvailable?: boolean;
}) {
  const router = useRouter();
  const dest = `${toolPath(locale)}?upgrade=1&plan=${kind}`;
  const [available, setAvailable] = useState(initialAvailable ?? false);
  useEffect(() => {
    if (initialAvailable !== undefined) return;
    const field = kind === "pass30" ? "passAvailable" : "checkoutAvailable";
    void fetch("/api/billing/availability").then((r) => r.ok ? r.json() : null).then((data) => setAvailable(data?.[field] === true)).catch(() => setAvailable(false));
  }, [initialAvailable, kind]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpgrade() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push(dest);
        return;
      }
      await startCheckout(kind, toolPath(locale));
    } catch {
      setError(
        locale === "fr"
          ? "Le paiement est momentanément indisponible. Réessayez plus tard."
          : "Checkout is temporarily unavailable. Please try again later.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" data-testid={`pricing-cta-${kind}`} onClick={() => void onUpgrade()} className={className} disabled={busy || !available}>
        {!available ? (locale === "fr" ? "Paiements bientôt ouverts" : "Payments opening soon") : busy ? (locale === "fr" ? "Ouverture…" : "Opening…") : label}
      </button>
      {error ? (
        <p className="ds-warn mt-2 text-sm" role="alert" data-testid={`pricing-error-${kind}`}>{error}</p>
      ) : null}
    </>
  );
}
