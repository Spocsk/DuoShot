import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";

/**
 * Server clients only use REST/RPC. supabase-js still constructs RealtimeClient,
 * which throws on Node < 22 unless a WebSocket transport is supplied.
 */
class ClosedRealtimeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readonly readyState = 3;
  readonly protocol = "";
  readonly url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(address: string | URL) {
    this.url = String(address);
  }

  close(): void {}
  send(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

const SERVER_CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ClosedRealtimeSocket },
};

export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — review routes use the user/anon client",
      );
    }
    return null;
  }
  return createClient(getSupabaseUrl(), key, SERVER_CLIENT_OPTIONS);
}

export function createPublicSupabase() {
  return createClient(getSupabaseUrl(), getSupabasePublicKey(), SERVER_CLIENT_OPTIONS);
}

/** Admin when configured, otherwise the anon client (RPCs + public storage). */
export function createReviewReader() {
  return createAdminSupabase() ?? createPublicSupabase();
}

/** Admin when configured, otherwise the authenticated user client (RLS). */
export function createReviewWriter(userClient: SupabaseClient) {
  return createAdminSupabase() ?? userClient;
}
