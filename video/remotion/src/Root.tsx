import { Composition } from "remotion";
import { StreamyIntro } from "./StreamyIntro";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="StreamyIntro"
    component={StreamyIntro}
    durationInFrames={240}
    fps={30}
    width={1920}
    height={1080}
  />
);
