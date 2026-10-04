import { useEffect, useRef, useState } from "react";
import type { Worker as OcrWorker } from "tesseract.js";
import { normalizeCropTransform, type CropTransform, type FitMode, type Locale, type Orientation, type SizeSpec } from "@/lib/specs";
import { checkFoldImage } from "@/lib/fold-ocr-browser";
import type { FoldCheckStatus } from "@/lib/fold-detection";

export type FoldCheck = { key: string; status: FoldCheckStatus; count: number };

export function foldStatusText(locale: Locale, check?: FoldCheck): string {
  if (!check || check.status === "checking") return locale === "fr" ? "Analyse en cours…" : "Checking…";
  if (check.status === "error") return locale === "fr" ? "Analyse indisponible : vérifiez visuellement le pli." : "Check unavailable: inspect the fold visually.";
  if (check.status === "warning") return locale === "fr" ? "Texte possiblement sous le pli : vérifiez la lisibilité." : "Possible text beneath the fold: check legibility.";
  return locale === "fr" ? "Aucun chevauchement détecté ; vérifiez le rendu final." : "No overlap detected; review the final image.";
}

/**
 * OCR scan of each open-view capture for text that would sit under the hinge.
 * One lazily created tesseract worker is shared by every scan and terminated on unmount.
 */
export function useFoldChecks({
  activeId,
  effectiveInner,
  innerSpec,
  innerTransforms,
  globalFit,
  solidColor,
  orientation,
}: {
  activeId: string;
  effectiveInner: File[];
  innerSpec: SizeSpec;
  innerTransforms: CropTransform[];
  globalFit: FitMode;
  solidColor: string;
  orientation: Orientation;
}) {
  const [foldChecks, setFoldChecks] = useState<Record<number, FoldCheck>>({});
  const foldCacheRef = useRef(new Map<string, FoldCheck>());
  const foldFileIdsRef = useRef(new WeakMap<File, number>());
  const nextFoldFileIdRef = useRef(1);
  const ocrWorkerRef = useRef<Promise<OcrWorker> | null>(null);
  const ocrQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const jobs = effectiveInner.map((file, index) => {
      let fileId = foldFileIdsRef.current.get(file);
      if (!fileId) {
        fileId = nextFoldFileIdRef.current++;
        foldFileIdsRef.current.set(file, fileId);
      }
      const transform = normalizeCropTransform(innerTransforms[index], globalFit);
      return { file, index, transform, key: [activeId, fileId, orientation, solidColor, transform.fit, transform.x, transform.y, transform.zoom].join(":") };
    });
    setFoldChecks((previous) => Object.fromEntries(jobs.map((job) => [job.index,
      foldCacheRef.current.get(job.key) ?? (previous[job.index]?.key === job.key ? previous[job.index] : { key: job.key, status: "checking", count: 0 }),
    ])));
    const timer = window.setTimeout(() => { void (async () => {
      for (const job of jobs) {
        if (cancelled) return;
        if (foldCacheRef.current.has(job.key)) continue;
        try {
          ocrWorkerRef.current ??= import("tesseract.js").then(async ({ createWorker, PSM }) => {
            // Assets are served from public/ocr (scripts/copy-ocr-assets.mjs), not a CDN.
            const worker = await createWorker(["eng", "fra"], undefined, {
              workerPath: "/ocr/worker.min.js", corePath: "/ocr", langPath: "/ocr/lang", workerBlobURL: false,
            });
            await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
            return worker;
          });
          const worker = await ocrWorkerRef.current;
          if (cancelled) return;
          const scan = ocrQueueRef.current.then(() => cancelled ? null : checkFoldImage(job.file, innerSpec, job.transform, worker, solidColor));
          ocrQueueRef.current = scan.then(() => undefined, () => undefined);
          const count = await scan;
          if (count === null) return;
          if (cancelled) return;
          const result: FoldCheck = { key: job.key, status: count > 0 ? "warning" : "clear", count };
          foldCacheRef.current.set(job.key, result);
          setFoldChecks((previous) => previous[job.index]?.key === job.key ? { ...previous, [job.index]: result } : previous);
        } catch {
          if (cancelled) return;
          const result: FoldCheck = { key: job.key, status: "error", count: 0 };
          setFoldChecks((previous) => previous[job.index]?.key === job.key ? { ...previous, [job.index]: result } : previous);
        }
      }
    })(); }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeId, effectiveInner, innerSpec, innerTransforms, globalFit, solidColor, orientation]);

  useEffect(() => () => {
    void ocrWorkerRef.current?.then((worker) => worker.terminate()).catch(() => {});
  }, []);

  return foldChecks;
}
