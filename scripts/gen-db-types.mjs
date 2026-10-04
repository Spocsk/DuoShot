#!/usr/bin/env node
/**
 * Generates src/lib/supabase/database.types.ts from the migration chain.
 *
 * The migrations are applied to an in-memory PGlite (same platform stubs as
 * the migration contract tests), then the `public` schema is introspected from
 * pg_catalog and emitted in the shape `supabase gen types typescript` produces,
 * so swapping to the CLI later is close to a no-op.
 *
 *   node scripts/gen-db-types.mjs          rewrite the file
 *   node scripts/gen-db-types.mjs --check  fail when the committed file is stale
 */
import { PGlite } from "@electric-sql/pglite";
import { readFile, writeFile } from "node:fs/promises";
import { applyMigrations } from "./lib/pglite-migrate.mjs";

const OUTPUT = "src/lib/supabase/database.types.ts";
const SCHEMA = "public";

const SCALARS = new Map([
  ["bool", "boolean"],
  ["int2", "number"], ["int4", "number"], ["int8", "number"],
  ["float4", "number"], ["float8", "number"], ["numeric", "number"], ["oid", "number"],
  ["json", "Json"], ["jsonb", "Json"],
  ["text", "string"], ["varchar", "string"], ["bpchar", "string"], ["char", "string"], ["name", "string"],
  ["citext", "string"], ["uuid", "string"], ["bytea", "string"], ["inet", "string"], ["cidr", "string"],
  ["date", "string"], ["time", "string"], ["timetz", "string"], ["timestamp", "string"],
  ["timestamptz", "string"], ["interval", "string"],
  ["void", "undefined"], ["record", "Record<string, unknown>"],
]);

async function introspect(db) {
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  const types = new Map((await q(`select t.oid, t.typname, t.typtype, t.typelem, t.typbasetype, t.typcategory, t.typrelid, n.nspname
    from pg_type t join pg_namespace n on n.oid = t.typnamespace`)).map((row) => [row.oid, row]));
  const relations = await q(`select c.oid, c.relname, c.relkind from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = $1 and c.relkind in ('r','p','v','m','f') order by c.relname`, [SCHEMA]);
  const columns = await q(`select a.attrelid, a.attname, a.attnum, a.atttypid, a.attnotnull, a.atthasdef,
      a.attidentity, a.attgenerated
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = $1 and a.attnum > 0 and not a.attisdropped order by a.attrelid, a.attname`, [SCHEMA]);
  const foreignKeys = await q(`select con.conname, con.conrelid, con.confrelid, con.conkey, con.confkey,
      rc.relname as ref_name, rn.nspname as ref_schema
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace
    join pg_class rc on rc.oid = con.confrelid join pg_namespace rn on rn.oid = rc.relnamespace
    where con.contype = 'f' and n.nspname = $1`, [SCHEMA]);
  const uniques = await q(`select i.indrelid, i.indkey::int2[] as keys from pg_index i
    join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = $1 and i.indisunique and i.indpred is null`, [SCHEMA]);
  const functions = await q(`select p.proname, p.prorettype, p.proretset, p.pronargdefaults, p.proargnames,
      p.proargmodes::text[] as modes, coalesce(p.proallargtypes, p.proargtypes::oid[]) as argtypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = $1 and p.prokind = 'f' order by p.proname`, [SCHEMA]);
  const enums = await q(`select t.typname, e.enumlabel from pg_enum e
    join pg_type t on t.oid = e.enumtypid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = $1 order by t.typname, e.enumsortorder`, [SCHEMA]);
  const composites = await q(`select t.typname, t.typrelid from pg_type t
    join pg_namespace n on n.oid = t.typnamespace join pg_class c on c.oid = t.typrelid
    where n.nspname = $1 and t.typtype = 'c' and c.relkind = 'c' order by t.typname`, [SCHEMA]);
  return { types, relations, columns, foreignKeys, uniques, functions, enums, composites };
}

function render(meta) {
  const columnsOf = (relid) => meta.columns.filter((column) => column.attrelid === relid);
  const relationById = new Map(meta.relations.map((relation) => [relation.oid, relation]));

  const tsType = (oid) => {
    const type = meta.types.get(oid);
    if (!type) throw new Error(`Unknown type oid ${oid}`);
    if (type.typtype === "d") return tsType(type.typbasetype);
    if (type.typcategory === "A" && type.typelem) return `${tsType(type.typelem)}[]`;
    if (type.typtype === "e") {
      return type.nspname === SCHEMA ? `Database["${SCHEMA}"]["Enums"]["${type.typname}"]` : "string";
    }
    if (type.typtype === "c" && type.nspname === SCHEMA) {
      const relation = relationById.get(type.typrelid);
      if (relation) return objectType(columnsOf(relation.oid).map((c) => [c.attname, rowType(c)]));
      return `Database["${SCHEMA}"]["CompositeTypes"]["${type.typname}"]`;
    }
    const scalar = SCALARS.get(type.typname);
    if (!scalar) throw new Error(`No TypeScript mapping for PostgreSQL type ${type.typname}`);
    return scalar;
  };
  const rowType = (column) => (column.attnotnull ? tsType(column.atttypid) : `${tsType(column.atttypid)} | null`);
  const objectType = (entries) => (entries.length
    ? `{ ${entries.map(([name, type]) => `${name}: ${type}`).join("; ")} }`
    : "Record<string, never>");

  const lines = [];
  const out = (depth, text) => lines.push(`${"  ".repeat(depth)}${text}`);
  const emptySection = (depth, name) => {
    out(depth, `${name}: {`);
    out(depth + 1, "[_ in never]: never");
    out(depth, "}");
  };

  const relationshipsOf = (relation) => meta.foreignKeys
    .filter((fk) => fk.conrelid === relation.oid && fk.ref_schema === SCHEMA)
    .sort((a, b) => (a.conname < b.conname ? -1 : 1))
    .map((fk) => {
      const own = columnsOf(fk.conrelid);
      const referenced = columnsOf(fk.confrelid);
      const name = (list, attnum) => list.find((column) => column.attnum === attnum).attname;
      const key = [...fk.conkey].sort().join(",");
      return {
        foreignKeyName: fk.conname,
        columns: fk.conkey.map((attnum) => name(own, attnum)),
        isOneToOne: meta.uniques.some((u) => u.indrelid === fk.conrelid && [...u.keys].sort().join(",") === key),
        referencedRelation: fk.ref_name,
        referencedColumns: fk.confkey.map((attnum) => name(referenced, attnum)),
      };
    });

  const emitRelationships = (depth, relation) => {
    const relationships = relationshipsOf(relation);
    if (!relationships.length) {
      out(depth, "Relationships: []");
      return;
    }
    out(depth, "Relationships: [");
    for (const r of relationships) {
      out(depth + 1, "{");
      out(depth + 2, `foreignKeyName: "${r.foreignKeyName}"`);
      out(depth + 2, `columns: [${r.columns.map((c) => `"${c}"`).join(", ")}]`);
      out(depth + 2, `isOneToOne: ${r.isOneToOne}`);
      out(depth + 2, `referencedRelation: "${r.referencedRelation}"`);
      out(depth + 2, `referencedColumns: [${r.referencedColumns.map((c) => `"${c}"`).join(", ")}]`);
      out(depth + 1, "},");
    }
    out(depth, "]");
  };

  const tables = meta.relations.filter((r) => ["r", "p", "f"].includes(r.relkind));
  const views = meta.relations.filter((r) => ["v", "m"].includes(r.relkind));

  out(0, "export type Json =");
  out(1, "| string");
  out(1, "| number");
  out(1, "| boolean");
  out(1, "| null");
  out(1, "| { [key: string]: Json | undefined }");
  out(1, "| Json[]");
  out(0, "");
  out(0, "export type Database = {");
  out(1, `${SCHEMA}: {`);

  if (!tables.length) emptySection(2, "Tables");
  else {
    out(2, "Tables: {");
    for (const table of tables) {
      const columns = columnsOf(table.oid);
      out(3, `${table.relname}: {`);
      out(4, "Row: {");
      for (const c of columns) out(5, `${c.attname}: ${rowType(c)}`);
      out(4, "}");
      for (const kind of ["Insert", "Update"]) {
        out(4, `${kind}: {`);
        for (const c of columns) {
          if (c.attgenerated) {
            out(5, `${c.attname}?: never`);
            continue;
          }
          const optional = kind === "Update" || !c.attnotnull || c.atthasdef || c.attidentity;
          out(5, `${c.attname}${optional ? "?" : ""}: ${rowType(c)}`);
        }
        out(4, "}");
      }
      emitRelationships(4, table);
      out(3, "}");
    }
    out(2, "}");
  }

  if (!views.length) emptySection(2, "Views");
  else {
    out(2, "Views: {");
    for (const view of views) {
      out(3, `${view.relname}: {`);
      out(4, "Row: {");
      for (const c of columnsOf(view.oid)) out(5, `${c.attname}: ${tsType(c.atttypid)} | null`);
      out(4, "}");
      emitRelationships(4, view);
      out(3, "}");
    }
    out(2, "}");
  }

  const exposed = meta.functions.filter((fn) => meta.types.get(fn.prorettype)?.typname !== "trigger");
  const names = exposed.map((fn) => fn.proname);
  const overloaded = names.filter((name, index) => names.indexOf(name) !== index);
  if (overloaded.length) {
    throw new Error(`Overloaded functions are not supported by this generator: ${[...new Set(overloaded)].join(", ")}`);
  }
  if (!exposed.length) emptySection(2, "Functions");
  else {
    out(2, "Functions: {");
    for (const fn of exposed) {
      const argTypes = fn.argtypes ?? [];
      const modes = fn.modes ?? argTypes.map(() => "i");
      const argNames = fn.proargnames ?? [];
      const params = argTypes.map((oid, index) => ({ oid, mode: modes[index], name: argNames[index] }));
      const inputs = params.filter((p) => ["i", "b", "v"].includes(p.mode));
      const outputs = params.filter((p) => ["o", "b", "t"].includes(p.mode));
      if (inputs.some((p) => !p.name)) throw new Error(`Function ${fn.proname} has unnamed arguments`);
      const firstDefault = inputs.length - fn.pronargdefaults;

      let returns;
      if (outputs.length) {
        returns = objectType(outputs.map((p) => [p.name, tsType(p.oid)]));
      } else {
        returns = tsType(fn.prorettype);
      }
      if (fn.proretset) returns = `${returns}[]`;

      out(3, `${fn.proname}: {`);
      if (!inputs.length) out(4, "Args: never");
      else {
        out(4, "Args: {");
        inputs.forEach((p, index) => out(5, `${p.name}${index >= firstDefault ? "?" : ""}: ${tsType(p.oid)}`));
        out(4, "}");
      }
      out(4, `Returns: ${returns}`);
      out(3, "}");
    }
    out(2, "}");
  }

  const enumNames = [...new Set(meta.enums.map((e) => e.typname))];
  if (!enumNames.length) emptySection(2, "Enums");
  else {
    out(2, "Enums: {");
    for (const name of enumNames) {
      out(3, `${name}: ${meta.enums.filter((e) => e.typname === name).map((e) => `"${e.enumlabel}"`).join(" | ")}`);
    }
    out(2, "}");
  }

  if (!meta.composites.length) emptySection(2, "CompositeTypes");
  else {
    out(2, "CompositeTypes: {");
    for (const composite of meta.composites) {
      out(3, `${composite.typname}: {`);
      for (const c of columnsOf(composite.typrelid)) out(4, `${c.attname}: ${tsType(c.atttypid)} | null`);
      out(3, "}");
    }
    out(2, "}");
  }

  out(1, "}");
  out(0, "}");

  const header = [
    "// Generated by scripts/gen-db-types.mjs from supabase/migrations. Do not edit.",
    "// Regenerate with `npm run db:types` after adding a migration.",
    "",
  ];
  const helpers = `
type PublicSchema = Database["${SCHEMA}"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type CompositeTypes<T extends keyof PublicSchema["CompositeTypes"]> = PublicSchema["CompositeTypes"][T]
`;
  return `${header.join("\n")}${lines.join("\n")}\n${helpers}`;
}

async function main() {
  const db = new PGlite();
  try {
    await applyMigrations(db);
    const generated = render(await introspect(db));
    if (process.argv.includes("--check")) {
      const committed = await readFile(OUTPUT, "utf8").catch(() => "");
      if (committed !== generated) {
        console.error(`${OUTPUT} is out of date with supabase/migrations. Run \`npm run db:types\` and commit the result.`);
        process.exitCode = 1;
        return;
      }
      console.log(`${OUTPUT} is up to date.`);
      return;
    }
    await writeFile(OUTPUT, generated);
    console.log(`Wrote ${OUTPUT}`);
  } finally {
    await db.close();
  }
}

await main();
