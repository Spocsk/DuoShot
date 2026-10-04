import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./database.types";

/** Every Supabase client in the app (browser, SSR, admin, worker) is typed by the migration schema. */
export type DbClient = SupabaseClient<Database>;
