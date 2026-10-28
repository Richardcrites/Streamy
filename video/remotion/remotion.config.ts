import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Remotion normally downloads its own Chrome Headless Shell. Where that download is blocked
// (e.g. sandboxed CI), point this at any compatible chrome-headless-shell binary instead.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
