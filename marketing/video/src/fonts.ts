import { loadFont } from "@remotion/fonts";
import { useEffect, useLayoutEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

export const sans = "Geist";
export const mono = "IBM Plex Mono";
let loading: Promise<unknown> | undefined;

function ensureFonts(): Promise<unknown> {
  loading ??= Promise.all([
    ...[500, 600, 700].map((weight) => loadFont({ family: sans, url: staticFile(`fonts/geist-${weight}.ttf`), weight: String(weight) })),
    loadFont({ family: mono, url: staticFile("fonts/plex-mono-500.ttf"), weight: "500" }),
  ]);
  return loading;
}

export function useFonts(): boolean {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Load local DuoShot fonts"));
  useEffect(() => {
    let active = true;
    ensureFonts().then(() => { if (active) setReady(true); }).catch((error: unknown) => cancelRender(error instanceof Error ? error : new Error(String(error))));
    return () => { active = false; };
  }, []);
  // Commit text measured with the loaded fonts before releasing the frame.
  useLayoutEffect(() => { if (ready) continueRender(handle); }, [ready, handle]);
  return ready;
}
