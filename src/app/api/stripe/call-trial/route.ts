import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { checkoutAvailable } from "@/lib/billing-availability";
import { getStripe } from "@/lib/stripe";
import { linkWorkspaceCustomer } from "@/lib/stripe-customer";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { serverEnv } from "@/lib/env";
import { getSiteUrl, localePrefix, pricingPath, toolPath } from "@/lib/site";
import type { Locale } from "@/lib/specs";

export const runtime = "nodejs";

type TrialReason = "invalid" | "used" | "exists" | "unavailable";

/**
 * Gated "call7d" trial. The link (path + base64url token, optional &locale=en) is emailed
 * after a call; no public button points here. It opens a 7-day Pro trial Checkout with no
 * payment method required, once per account and per Stripe customer (claim_call_trial).
 */
async function callTrial(request: Request) {
  const url = new URL(request.url);
  const locale: Locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
  const origin = getSiteUrl();
  const trialRedirect = (reason: TrialReason) => NextResponse.redirect(`${origin}${pricingPath(locale)}?trial=${reason}`, 303);

  const token = url.searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{16,}$/.test(token)) return trialRedirect("invalid");

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL(`${localePrefix(locale)}/login`, origin);
    login.searchParams.set("next", `/api/stripe/call-trial?token=${token}${locale === "en" ? "&locale=en" : ""}`);
    return NextResponse.redirect(login, 303);
  }

  if (!checkoutAvailable(user.id)) return trialRedirect("unavailable");
  const priceId = serverEnv.stripe.prices.indieMonthly;
  const stripe = getStripe();
  const admin = createAdminSupabase();
  if (!stripe || !admin || !priceId) return trialRedirect("unavailable");

  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok || context.membership.role !== "owner") return trialRedirect("unavailable");
  const { membership, workspace } = context;

  const customerId = await linkWorkspaceCustomer({
    stripe, admin, workspaceId: membership.workspace_id,
    customerId: workspace.stripe_customer_id, email: user.email,
  });
  if (!customerId) return trialRedirect("unavailable");

  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  if (workspace.stripe_subscription_id || subscriptions.data.some((s) => !["canceled", "incomplete_expired"].includes(s.status))) {
    return trialRedirect("exists");
  }
  // A trial is offered once: never to a customer that already trialed or took this offer.
  if (subscriptions.data.some((s) => s.trial_start || s.metadata?.offer === "call7d")) return trialRedirect("used");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: claimJson, error: claimError } = await admin.rpc("claim_call_trial", {
    p_token_hash: tokenHash, p_workspace_id: membership.workspace_id, p_customer_id: customerId,
  });
  if (claimError) return trialRedirect(claimError.message?.includes("TRIAL_ALREADY_USED") ? "used" : "invalid");
  const claim = claimJson as Tables<"call_trial_tokens"> | null;
  if (!claim) return trialRedirect("invalid");

  // A retry reuses the session already opened for this token while it stays open.
  if (claim.session_id) {
    const existing = await stripe.checkout.sessions.retrieve(claim.session_id);
    if (existing.status === "open" && existing.url) return NextResponse.redirect(existing.url, 303);
  }

  const nextPath = toolPath(locale);
  const metadata = { offer: "call7d", kind: "indie_monthly", workspace_id: membership.workspace_id };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    client_reference_id: membership.workspace_id,
    payment_method_collection: "if_required",
    subscription_data: {
      trial_period_days: 7,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      metadata,
    },
    success_url: `${origin}${nextPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${nextPath}?checkout=cancel`,
    metadata,
  }, { idempotencyKey: `duoshot-call7d-${tokenHash.slice(0, 16)}` });

  await admin.rpc("save_call_trial_session", { p_token_hash: tokenHash, p_session_id: session.id });
  if (!session.url) return trialRedirect("unavailable");
  return NextResponse.redirect(session.url, 303);
}

export async function GET(request: Request) {
  try { return await callTrial(request); }
  catch {
    const locale: Locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
    return NextResponse.redirect(`${getSiteUrl()}${pricingPath(locale)}?trial=unavailable`, 303);
  }
}
