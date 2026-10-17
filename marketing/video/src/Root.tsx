import { Composition } from "remotion";
import example from "../scripts/v1-accepts.json";
import { validateScript } from "./schema";
import { SocialVideo } from "./SocialVideo";
import { FPS, sceneTiming } from "./timing";

export function Root() {
  return <Composition id="SocialVideo" component={SocialVideo} width={1080} height={1920} fps={FPS}
    durationInFrames={540} defaultProps={validateScript(example)}
    calculateMetadata={({ props }) => {
      const script = validateScript(props);
      sceneTiming(script);
      return { durationInFrames: Math.round(script.durationSec * FPS), props: script };
    }} />;
}
