import { renderSlots } from "@/lib/pipeline/render-slots";
import { NextResponse } from "next/server";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { loadSources } from "@/lib/pipeline/sources";
import { parseRenderBody, renderErrorStatus, type RenderBody } from "@/lib/pipeline/request";
import { mapLimit } from "@/lib/map-limit";
import { hashFromBuffer } from "@/lib/pipeline/clone-hash";
import { scorePair, type CloneLabel } from "@/lib/pipeline/clone-score";
import { reviewPairJpegs } from "@/lib/pipeline/compose";
import { createReviewWriter } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics-server";
import { reviewPath } from "@/lib/site";
import { DEFAULT_RENDER_OPTIONS, type Locale, type RenderOptions } from "@/lib/specs";
import { reviewExpiresAt, reviewState } from "@/lib/reviews";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { membership, entitlements } = context;
  if (entitlements.plan !== "studio") {
    return NextResponse.json({ error: "STUDIO_REQUIRED" }, { status: 403 });
  }

  const writer = createReviewWriter(supabase);

  let body: RenderBody;
  try { body = parseRenderBody(await request.json(), user.id); } catch (error) {
    const code = error instanceof SyntaxError ? "INVALID_JSON" : error instanceof Error ? error.message : "INVALID_REQUEST";
    return NextResponse.json({ error: code }, { status: renderErrorStatus(code) });
  }
  const sameSet = Boolean(body.sameSet);
  const outerPaths = body.outerPaths ?? [];
  const innerPaths = sameSet ? outerPaths : (body.innerPaths ?? []);
  if (outerPaths.length === 0 || innerPaths.length === 0) {
    return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
  }
  if (!Array.isArray(outerPaths) || !Array.isArray(innerPaths) || outerPaths.length > 10 || innerPaths.length > 10 || outerPaths.length !== innerPaths.length) {
    return NextResponse.json({ error: "INVALID_PAIRS" }, { status: 400 });
  }
  if ([...outerPaths, ...innerPaths].some((path) => typeof path !== "string" || !path.startsWith(`${user.id}/`))) {
    return NextResponse.json({ error: "PATH_FORBIDDEN" }, { status: 403 });
  }
  const orientation = body.options?.orientation ?? body.orientation;
  const options: RenderOptions = {
    ...DEFAULT_RENDER_OPTIONS,
    ...body.options,
    orientation: orientation === "landscape" ? "landscape" : "portrait",
    format: "jpeg",
    burnHinge: Boolean(body.options?.burnHinge),
  };

  let release: () => void;
  try { release = await renderSlots.acquire(request.signal); } catch (error) {
    const code = error instanceof Error ? error.message : "RENDER_BUSY";
    return NextResponse.json({ error: code }, { status: renderErrorStatus(code), headers: { "Retry-After": "5" } });
  }
  try {
    let sources: Map<string, Buffer>;
    try { sources = await loadSources(supabase, user.id, [...outerPaths, ...innerPaths]); } catch (error) {
      const code = error instanceof Error ? error.message : "UPLOAD_MISSING";
      return NextResponse.json({ error: code }, { status: renderErrorStatus(code) });
    }

    const publicId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const expiresAt = reviewExpiresAt();
    const setName = body.appName?.trim() || "App";
    const { data: review, error: reviewError } = await writer
      .from("review_links")
      .insert({
        public_id: publicId,
        workspace_id: membership.workspace_id,
        set_name: setName,
        client_name: body.clientName?.trim() || null,
        orientation: options.orientation,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("id, public_id")
      .single();
    if (reviewError || !review) {
      return NextResponse.json({ error: "REVIEW_CREATE_FAILED" }, { status: 500 });
    }

    const pairCount = Math.min(outerPaths.length, innerPaths.length);
    if (pairCount === 0) {
      return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
    }

    const locale: Locale = body.locale === "en" ? "en" : "fr";
    const slides = await mapLimit(Array.from({ length: pairCount }, (_, index) => index), 2, async (index) => {
      const outerPath = outerPaths[index]!;
      const innerPath = innerPaths[index]!;
      if (!outerPath.startsWith(`${user.id}/`) || !innerPath.startsWith(`${user.id}/`)) {
        throw new Error("PATH_FORBIDDEN");
      }
      const outerBuf = sources.get(outerPath)!;
      const innerBuf = sources.get(innerPath)!;
      const clone = scorePair(await hashFromBuffer(outerBuf), await hashFromBuffer(innerBuf), index, sameSet);
      const seq = String(index + 1).padStart(2, "0");
      const outKey = `${publicId}/${seq}-outer.jpg`;
      const inKey = `${publicId}/${seq}-inner.jpg`;
      const composed = await reviewPairJpegs({
        outer: outerBuf,
        inner: innerBuf,
        options,
        plan: entitlements.plan,
        transforms: {
          outer: body.transforms?.outer?.[index],
          inner: body.transforms?.inner?.[index],
        },
      });
      const [upOuter, upInner] = await Promise.all([
        writer.storage.from("reviews").upload(outKey, composed.outer, {
          contentType: "image/jpeg",
          upsert: true,
        }),
        writer.storage.from("reviews").upload(inKey, composed.inner, {
          contentType: "image/jpeg",
          upsert: true,
        }),
      ]);
      if (upOuter.error || upInner.error) {
        throw new Error("REVIEW_UPLOAD_FAILED");
      }
      return {
        review_id: review.id,
        slide_index: index,
        outer_path: outKey,
        inner_path: inKey,
        clone_label: clone.label as CloneLabel,
      };
    }).catch((error: unknown) => {
      const code = error instanceof Error ? error.message : "REVIEW_UPLOAD_FAILED";
      return code;
    });
    const createdReviewId = review.id;
    async function revokeIncompleteReview() {
      const { error } = await writer.from("review_links").update({ revoked_at: new Date().toISOString(), status: "revoked" }).eq("id", createdReviewId);
      if (error) console.error("review_cleanup_failed", { reviewId: createdReviewId });
    }
    if (typeof slides === "string") {
      await revokeIncompleteReview();
      const status = slides === "PATH_FORBIDDEN" ? 403 : slides === "UPLOAD_MISSING" ? 400 : 500;
      return NextResponse.json({ error: slides }, { status });
    }
    const { error: slideError } = await writer.from("review_slides").insert(slides);
    if (slideError) {
      await revokeIncompleteReview();
      return NextResponse.json({ error: "REVIEW_CREATE_FAILED" }, { status: 500 });
    }

    await trackServerEvent(supabase, user.id, "review_created", review.id, { slide_count: pairCount });

    return NextResponse.json({ id: publicId, url: reviewPath(locale, publicId), expiresAt });
  } finally {
    release();
  }
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { membership } = context;
  const writer = createReviewWriter(supabase);
  const { data, error } = await writer
    .from("review_links")
    .select("public_id, set_name, client_name, status, comment, created_at, expires_at, revoked_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "REVIEWS_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({
    reviews: (data ?? []).map((review) => ({ ...review, ...reviewState(review) })),
  });
}
