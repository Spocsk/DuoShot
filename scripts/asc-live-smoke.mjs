// Live smoke test for the App Asset Library upload path (PR #85).
//
// Exercises the REAL App Store Connect API end to end against ONE app, using the
// exact PR code (src/lib/asc) bundled on the fly with esbuild — no reimplemented
// HTTP or JWT. It reserves a single Duo screenshot, uploads it, places it in the
// IPHONE_DUO_PROFILE group of a localization that has no Duo placement yet, polls
// until the asset is ready or failed, re-reads the placement, then (default)
// deletes ONLY the placement and image it created and confirms they are gone.
//
// Secrets never touch stdout: ASC_ISSUER_ID / ASC_KEY_ID / ASC_PRIVATE_KEY and
// the signed JWT (which lives in the Authorization header, never logged) are
// never printed. The fetch log shows method + host + path + HTTP status only.
//
// Hard-coded safety rails:
//   * only bundleId com.spocsk.PoseLock is allowed;
//   * the target version MUST be PREPARE_FOR_SUBMISSION;
//   * it never creates a version, never submits, never deletes anything it did
//     not create itself.
//
// Usage:
//   node scripts/asc-live-smoke.mjs --dry-run              # read-only, no writes
//   node scripts/asc-live-smoke.mjs                        # full run + cleanup
//   node scripts/asc-live-smoke.mjs --no-cleanup           # leave what it created
//   node scripts/asc-live-smoke.mjs --locale=en-US         # force a localization
//
// Env: ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY (a .p8; if it arrives without
// line breaks, the PEM is rebuilt in 64-char lines).

import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import process from "node:process";
import sharp from "sharp";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- hard-coded guards ------------------------------------------------------
const ALLOWED_BUNDLE_ID = "com.spocsk.PoseLock";
const REQUIRED_VERSION_STATE = "PREPARE_FOR_SUBMISSION";
const DUO_WIDTH = 2007;
const DUO_HEIGHT = 2853; // Duo inner, portrait: an exact (min==max) Duo spec.

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log("node scripts/asc-live-smoke.mjs [--dry-run] [--no-cleanup] [--locale=xx-YY]");
  process.exit(0);
}
const DRY_RUN = argv.includes("--dry-run");
const CLEANUP = !argv.includes("--no-cleanup");
const FORCED_LOCALE = (argv.find((a) => a.startsWith("--locale=")) ?? "").split("=")[1] || null;

// ---- logging (never prints secrets) ----------------------------------------
const started = Date.now();
const stamp = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;
const log = (msg) => console.log(`[${stamp()}] ${msg}`);
const fail = (msg) => { console.error(`[${stamp()}] ABORT: ${msg}`); process.exit(1); };

/** Wraps fetch to log method + host + path + status. Query, headers and body
 *  (which carry the JWT and upload tokens) are never logged. */
function loggingFetch(realFetch = globalThis.fetch) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    const response = await realFetch(input, init);
    log(`  → ${method} ${url.host}${url.pathname} ⇒ ${response.status}`);
    return response;
  };
}

// ---- PEM reconstruction -----------------------------------------------------
function buildPem(raw) {
  let s = String(raw).trim();
  if (s.includes("\\n")) s = s.replace(/\\n/g, "\n");
  // Trust it only when it already carries REAL line breaks: OpenSSL needs the
  // BEGIN/END boundaries on their own lines. A key whose header is glued onto a
  // single line (no newlines at all) parses as garbage, so rebuild it below.
  if (s.includes("\n")) return s;
  const body = s.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
}

// ---- bundle the PR's ASC client (reuse, don't reimplement) ------------------
async function loadAscModule() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "asc-smoke-"));
  const outfile = path.join(dir, "asc.mjs");
  const forbidNext = {
    name: "forbid-next",
    setup(ctx) {
      ctx.onResolve({ filter: /^(next|next\/.*|server-only)$/ }, (a) => ({
        errors: [{ text: `${a.path} must not be imported by the ASC client` }],
      }));
    },
  };
  await build({
    stdin: {
      contents: [
        'export { createAscClient, AscError } from "./client";',
        'export { createAssetLibraryClient } from "./asset-library";',
        'export { resolveDuoGroup, expectedImageSpec } from "./asset-library-refdata";',
        'export { parseAscPrivateKey } from "./jwt";',
      ].join("\n"),
      resolveDir: path.join(ROOT, "src/lib/asc"),
      loader: "ts",
    },
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    tsconfig: path.join(ROOT, "tsconfig.json"),
    plugins: [forbidNext],
    logLevel: "warning",
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { mod, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

async function main() {
  const issuerId = process.env.ASC_ISSUER_ID?.trim();
  const keyId = process.env.ASC_KEY_ID?.trim();
  const rawKey = process.env.ASC_PRIVATE_KEY;
  if (!issuerId || !keyId || !rawKey) fail("set ASC_ISSUER_ID, ASC_KEY_ID and ASC_PRIVATE_KEY");

  log(`mode: ${DRY_RUN ? "DRY-RUN (read-only)" : "WRITE"}${DRY_RUN ? "" : CLEANUP ? " + cleanup" : " + NO cleanup"}`);
  log("bundling the PR App Asset Library client with esbuild…");
  const { mod, cleanup: dropBundle } = await loadAscModule();
  const { createAscClient, createAssetLibraryClient, resolveDuoGroup, expectedImageSpec, parseAscPrivateKey, AscError } = mod;

  const credentials = { issuerId, keyId, privateKey: buildPem(rawKey) };
  try { parseAscPrivateKey(credentials.privateKey); } catch { await dropBundle(); fail("ASC_PRIVATE_KEY is not a valid PKCS#8 P-256 .p8"); }

  const fetchImpl = loggingFetch();
  const read = createAscClient(credentials, { fetch: fetchImpl });
  const lib = createAssetLibraryClient(credentials, { fetch: fetchImpl });

  let createdImageId = null;
  let createdPlacementId = null;
  let duoGroup = null;

  try {
    // 1) App — only com.spocsk.PoseLock is permitted.
    log("resolving app…");
    const apps = await read.listApps();
    const app = apps.find((a) => a.bundleId === ALLOWED_BUNDLE_ID);
    if (!app) fail(`app ${ALLOWED_BUNDLE_ID} not visible to this key`);
    log(`app: ${app.id} (${app.bundleId})`);

    // 2) Version — must be PREPARE_FOR_SUBMISSION. Never created here.
    log("resolving an editable iOS version…");
    const versions = await read.listEditableVersions(app.id);
    const version = versions.find((v) => v.state === REQUIRED_VERSION_STATE && v.platform === "IOS");
    if (!version) fail(`no ${REQUIRED_VERSION_STATE} iOS version found (this script never creates one)`);
    log(`version: ${version.id} ${version.versionString} state=${version.state}`);

    // 3) Reference data + Duo group/spec.
    log("reading reference data…");
    const refData = await lib.getRefData();
    duoGroup = resolveDuoGroup(refData);
    const expectedSpec = expectedImageSpec(refData, duoGroup, DUO_WIDTH, DUO_HEIGHT);
    log(`duo group: ${duoGroup}  spec: ${expectedSpec.specId} (${DUO_WIDTH}×${DUO_HEIGHT})`);

    // 4) Localizations — pick one with no Duo placement yet.
    log("resolving target localization (no existing Duo placement)…");
    const localizations = await read.listLocalizations(version.id);
    const candidates = FORCED_LOCALE ? localizations.filter((l) => l.locale === FORCED_LOCALE) : localizations;
    if (!candidates.length) fail(FORCED_LOCALE ? `locale ${FORCED_LOCALE} not found` : "no localizations");
    let target = null;
    for (const loc of candidates) {
      const existing = await lib.listPlacements(loc.id, duoGroup);
      if (existing.length === 0) { target = loc; break; }
      if (FORCED_LOCALE) fail(`locale ${FORCED_LOCALE} already has ${existing.length} Duo placement(s); refusing to touch it`);
    }
    if (!target) fail("no localization without an existing Duo placement; refusing to touch existing ones");
    log(`localization: ${target.id} (${target.locale})`);

    // 5) Library id + version-editable guard (PR code double-checks the state).
    const libraryId = await lib.getAssetLibraryId(app.id);
    log(`asset library: ${libraryId}`);
    await lib.ensureVersionEditable(target.id);
    log("version confirmed editable (PREPARE_FOR_SUBMISSION)");

    // 6) Generate a pixel-exact, alpha-free PNG and validate before any write.
    log(`generating ${DUO_WIDTH}×${DUO_HEIGHT} PNG (no alpha)…`);
    const bytes = new Uint8Array(await sharp({ create: { width: DUO_WIDTH, height: DUO_HEIGHT, channels: 3, background: { r: 10, g: 80, b: 160 } } }).png().toBuffer());
    const meta = await sharp(bytes).metadata();
    if (meta.width !== DUO_WIDTH || meta.height !== DUO_HEIGHT || meta.hasAlpha) fail("generated PNG failed its own pixel/alpha check");

    if (DRY_RUN) {
      log("DRY-RUN complete — resolved everything above, performed no reservation, upload, placement or deletion.");
      return;
    }

    // 7) Reserve → upload parts → commit uploaded:true → poll to ready/FAILED.
    log("uploading image via the PR asset-library client…");
    const image = await lib.uploadImage({
      libraryId, fileName: "duoshot-smoke-duo-inner-portrait-01.png", bytes, refData,
      group: duoGroup, expectedSpec, referenceName: "DuoShot live smoke",
      onReserved: (id) => { createdImageId = id; log(`  reserved image ${id}`); },
      onProcessing: () => log("  committed (uploaded:true); polling processing state…"),
    });
    createdImageId = image.id;
    log(`image ready: ${image.id} state=${image.attributes?.state} spec=${image.attributes?.specId}`);

    // 8) Placement in the Duo group of the chosen localization.
    log("creating placement…");
    createdPlacementId = await lib.createPlacement(target.id, duoGroup, image.id);
    log(`placement created: ${createdPlacementId}`);

    // 9) Re-read the placement list.
    const after = await lib.listPlacements(target.id, duoGroup);
    log(`placements now in ${duoGroup}: [${after.join(", ")}] (contains ours: ${after.includes(createdPlacementId)})`);
    if (!after.includes(createdPlacementId)) fail("created placement not found on re-read");

    // 10) Cleanup — delete ONLY what this run created, then confirm removal.
    if (!CLEANUP) {
      log(`--no-cleanup: left placement ${createdPlacementId} and image ${createdImageId} in place. Remove them manually.`);
      return;
    }
    log("cleanup: deleting the placement and image this run created…");
    await lib.deletePlacement(createdPlacementId);
    const afterPlacementDelete = await lib.listPlacements(target.id, duoGroup);
    if (afterPlacementDelete.includes(createdPlacementId)) fail("placement still present after delete");
    log(`placement ${createdPlacementId} gone`);
    createdPlacementId = null;
    await lib.deleteImage(createdImageId); // 204 is Apple's confirmation of deletion
    log(`image ${createdImageId} deleted (204)`);
    createdImageId = null;
    log("SUCCESS — upload, placement and cleanup all verified against the live API.");
  } catch (error) {
    const code = error instanceof AscError ? `${error.code}${error.status ? ` (HTTP ${error.status})` : ""}${error.appleCode ? ` apple=${error.appleCode}` : ""}` : (error?.message ?? String(error));
    console.error(`[${stamp()}] FAILED: ${code}`);
    // Best-effort rollback of anything THIS run created.
    if (!DRY_RUN && CLEANUP && (createdPlacementId || createdImageId)) {
      log("rolling back resources created by this run…");
      try { if (createdPlacementId) await lib.deletePlacement(createdPlacementId); } catch { log("  placement rollback failed; remove it manually"); }
      try { if (createdImageId) await lib.deleteImage(createdImageId); } catch { log("  image rollback failed; remove it manually"); }
    } else if (createdPlacementId || createdImageId) {
      log(`leftover resources (remove manually): placement=${createdPlacementId ?? "none"} image=${createdImageId ?? "none"}`);
    }
    process.exitCode = 1;
  } finally {
    await dropBundle();
  }
}

await main();
