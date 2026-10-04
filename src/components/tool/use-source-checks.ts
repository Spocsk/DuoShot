import { useEffect, useState } from "react";
import { hashFromFile } from "@/lib/pipeline/clone-hash-browser";
import { inspectFile, type SourceInspect } from "@/lib/pipeline/source-inspect";
import { scorePair, type CloneResult } from "@/lib/pipeline/clone-score";

/** Source metadata (size, alpha, colour space) and closed/open similarity scores for every capture. */
export function useSourceChecks(outerFiles: File[], innerFiles: File[], effectiveInner: File[], cloneForced: boolean) {
  const [outerInspects, setOuterInspects] = useState<SourceInspect[]>([]);
  const [innerInspects, setInnerInspects] = useState<SourceInspect[]>([]);
  const [clones, setClones] = useState<CloneResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [outer, inner] = await Promise.all([
        Promise.all(outerFiles.map(inspectFile)),
        Promise.all(innerFiles.map(inspectFile)),
      ]);
      if (!cancelled) {
        setOuterInspects(outer);
        setInnerInspects(inner);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outerFiles, innerFiles]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const count = Math.min(outerFiles.length, effectiveInner.length);
      const next: CloneResult[] = [];
      for (let index = 0; index < count; index += 1) {
        const outerHash = await hashFromFile(outerFiles[index]!);
        const innerHash = await hashFromFile(effectiveInner[index]!);
        next.push(scorePair(outerHash, innerHash, index, cloneForced));
      }
      if (!cancelled) setClones(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [outerFiles, effectiveInner, cloneForced]);

  return { outerInspects, innerInspects, clones };
}
