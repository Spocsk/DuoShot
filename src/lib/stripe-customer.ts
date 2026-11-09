import type Stripe from "stripe";
import type { DbClient } from "@/lib/supabase/types";

/**
 * Returns the workspace's Stripe customer id, creating and linking one on first use.
 * The create is idempotent on the workspace id and a lost link is re-read, so concurrent
 * checkouts converge on a single customer. Null means the link could not be persisted.
 */
export async function linkWorkspaceCustomer(options: {
  stripe: Stripe;
  admin: DbClient;
  workspaceId: string;
  customerId: string | null;
  email?: string | null;
}): Promise<string | null> {
  let customerId = options.customerId;
  if (!customerId) {
    const customer = await options.stripe.customers.create({
      email: options.email ?? undefined,
      metadata: { workspace_id: options.workspaceId },
    }, { idempotencyKey: `duoshot-customer-${options.workspaceId}` });
    customerId = customer.id;
    const { data: linked, error } = await options.admin.from("workspaces").update({ stripe_customer_id: customerId })
      .eq("id", options.workspaceId).is("stripe_customer_id", null).select("stripe_customer_id").maybeSingle();
    if (error) return null;
    if (!linked) {
      const { data: current } = await options.admin.from("workspaces").select("stripe_customer_id")
        .eq("id", options.workspaceId).single();
      if (!current?.stripe_customer_id) return null;
      customerId = current.stripe_customer_id;
    }
  }
  return customerId;
}
