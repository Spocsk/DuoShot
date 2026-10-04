import { NextResponse } from "next/server";
import { AscError, createAscClient } from "@/lib/asc/client";
import { readMasterKey, sealSecret } from "@/lib/asc/crypto";
import { isIssuerId, isKeyId, parseAscPrivateKey } from "@/lib/asc/jwt";
import { ascContext, ascFailure, maskIssuerId, NO_STORE } from "@/lib/asc/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;

/** Status only: the private key never leaves the server. Any member may read it; members cannot change it. */
export async function GET() {
  const gate = await ascContext({ paid: false });
  if (!gate.ok) return gate.response;
  const { admin, workspaceId, role, paid } = gate.context;
  const { data, error } = await admin.from("asc_connections")
    .select("issuer_id, key_id, created_at, last_verified_at").eq("workspace_id", workspaceId).maybeSingle();
  if (error) return NextResponse.json({ error: "ASC_UNAVAILABLE" }, { status: 503, headers: NO_STORE });
  return NextResponse.json({
    enabled: true, owner: role === "owner", paid, connected: Boolean(data),
    keyId: data?.key_id ?? null, issuerId: data ? maskIssuerId(data.issuer_id) : null,
    createdAt: data?.created_at ?? null, lastVerifiedAt: data?.last_verified_at ?? null,
  }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const gate = await ascContext({ owner: true });
  if (!gate.ok) return gate.response;
  const { admin, workspaceId, userId } = gate.context;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "INPUT_TOO_LARGE" }, { status: 413, headers: NO_STORE });
  let body: { issuerId?: unknown; keyId?: unknown; privateKey?: unknown };
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: NO_STORE }); }
  const issuerId = typeof body.issuerId === "string" ? body.issuerId.trim().toLowerCase() : "";
  const keyId = typeof body.keyId === "string" ? body.keyId.trim().toUpperCase() : "";
  if (!isIssuerId(issuerId)) return NextResponse.json({ error: "ASC_ISSUER_INVALID" }, { status: 400, headers: NO_STORE });
  if (!isKeyId(keyId)) return NextResponse.json({ error: "ASC_KEY_ID_INVALID" }, { status: 400, headers: NO_STORE });
  let privateKey: string;
  try { parseAscPrivateKey(body.privateKey); privateKey = (body.privateKey as string).trim(); } catch {
    return NextResponse.json({ error: "ASC_KEY_INVALID" }, { status: 400, headers: NO_STORE });
  }
  const master = readMasterKey();
  if (!master) return NextResponse.json({ error: "ASC_UNAVAILABLE" }, { status: 503, headers: NO_STORE });

  try {
    await createAscClient({ issuerId, keyId, privateKey }).verify();
  } catch (error) {
    if (error instanceof AscError && (error.code === "ASC_UNAUTHORIZED" || error.code === "ASC_FORBIDDEN")) {
      return NextResponse.json({ error: "ASC_CREDENTIALS_REJECTED" }, { status: 422, headers: NO_STORE });
    }
    return ascFailure(error);
  }

  const sealed = sealSecret(privateKey, master, workspaceId);
  const verifiedAt = new Date().toISOString();
  const { error } = await admin.from("asc_connections").upsert({
    workspace_id: workspaceId, issuer_id: issuerId, key_id: keyId,
    encrypted_private_key: sealed.ciphertext, iv: sealed.iv, auth_tag: sealed.authTag,
    created_by: userId, created_at: verifiedAt, last_verified_at: verifiedAt,
  }, { onConflict: "workspace_id" });
  if (error) {
    console.error("asc_connection_store_failed", { message: error.message });
    return NextResponse.json({ error: "ASC_UNAVAILABLE" }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({
    enabled: true, owner: true, paid: true, connected: true, keyId,
    issuerId: maskIssuerId(issuerId), createdAt: verifiedAt, lastVerifiedAt: verifiedAt,
  }, { status: 201, headers: NO_STORE });
}

/** Revoking works on any plan so a lapsed workspace can always remove its key. */
export async function DELETE() {
  const gate = await ascContext({ owner: true, paid: false });
  if (!gate.ok) return gate.response;
  const { admin, workspaceId } = gate.context;
  const { error } = await admin.from("asc_connections").delete().eq("workspace_id", workspaceId);
  if (error) return NextResponse.json({ error: "ASC_UNAVAILABLE" }, { status: 503, headers: NO_STORE });
  return NextResponse.json({ ok: true, connected: false }, { headers: NO_STORE });
}
