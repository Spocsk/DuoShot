import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Supabase platform objects the migrations rely on, and nothing more: roles,
 * auth.users/auth.uid() and the storage tables. Shared by the migration
 * contract tests and the database type generator so both see one schema.
 */
export const PLATFORM_STUBS = `create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());`;

/** Applies the platform stubs, then every migration in filename order. */
export async function applyMigrations(db, dir = "supabase/migrations") {
  await db.exec(PLATFORM_STUBS);
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(path.join(dir, file), "utf8"));
  }
  return files;
}
