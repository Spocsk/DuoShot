import { renderSlots } from "@/lib/pipeline/render-slots";
import { parseRenderBody, renderErrorStatus, type RenderBody } from "@/lib/pipeline/request";
import { readRenderBody } from "./read-body";

/** Shared first steps of the export and review renders: a body, then a render slot. */
export type Admission<T> = { ok: true; value: T } | { ok: false; response: Response };

/** Reads and validates the render body. Malformed JSON answers `invalidJsonCode` (each route keeps its own). */
export async function admitRenderBody(request: Request, userId: string, invalidJsonCode: "INVALID_JSON" | "INVALID_REQUEST"): Promise<Admission<RenderBody>> {
  try {
    return { ok: true, value: parseRenderBody(await readRenderBody(request), userId) };
  } catch (error) {
    const code = error instanceof SyntaxError ? invalidJsonCode : error instanceof Error ? error.message : "INVALID_REQUEST";
    return { ok: false, response: Response.json({ error: code }, { status: renderErrorStatus(code) }) };
  }
}

/** Waits for a render slot; busy or aborted requests get a retryable error. */
export async function admitRenderSlot(signal: AbortSignal): Promise<Admission<() => void>> {
  try {
    return { ok: true, value: await renderSlots.acquire(signal) };
  } catch (error) {
    const code = error instanceof Error ? error.message : "RENDER_BUSY";
    return { ok: false, response: Response.json({ error: code }, { status: renderErrorStatus(code), headers: { "Retry-After": "5" } }) };
  }
}
