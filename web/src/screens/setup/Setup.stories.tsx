import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScaledStage } from "../debrief/frames";
import { SetupScene, type SetupSceneId } from "./frames";

/* Setup wizard (D81): AI engine → Check → About you. Fixtures: components/engine/fixtures.tsx, docs/ia.md §6. Each story
 * is a frame of a real width, scaled to fit. Light; dark with the toolbar. */
const meta: Meta = { title: "Screens/Setup", parameters: { layout: "padded" } };
export default meta;

const desktop = (id: SetupSceneId): StoryObj => ({
  render: () => <ScaledStage width={1440} height={900}><SetupScene id={id} /></ScaledStage>,
});
const mobile = (id: SetupSceneId): StoryObj => ({
  render: () => <ScaledStage width={375} height={812}><SetupScene id={id} /></ScaledStage>,
  parameters: { viewport: { defaultViewport: "mobile1" } },
});

/** Ollama is Ready: one row and Change; nothing to decide. */
export const EngineReady = desktop("engineReady");
export const EngineReadyMobile = mobile("engineReady");
/** After Change: the Settings → AI engine view. */
export const EngineChanging = desktop("engineChanging");
/** No engine is ready: setup in place, Continue waits. */
export const EngineNotReady = desktop("engineNotReady");
export const CheckIdle = desktop("checkIdle");
export const CheckIdleMobile = mobile("checkIdle");
export const CheckListening = desktop("checkListening");
export const CheckThinking = desktop("checkThinking");
/** One exchange done: what was heard, Mike's answer in the chosen voice, telemetry unticked, "It works". */
export const CheckDone = desktop("checkDone");
export const CheckDoneMobile = mobile("checkDone");
export const CheckMicDenied = desktop("checkMicDenied");
export const CheckNotHeard = desktop("checkNotHeard");
export const CheckEngineError = desktop("checkEngine");
export const About = desktop("about");
export const AboutFilled = desktop("aboutFilled");
export const AboutFilledMobile = mobile("aboutFilled");
