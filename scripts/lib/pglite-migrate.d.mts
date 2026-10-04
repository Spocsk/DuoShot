import type { PGlite } from "@electric-sql/pglite";

export const PLATFORM_STUBS: string;
export function applyMigrations(db: PGlite, dir?: string): Promise<string[]>;
