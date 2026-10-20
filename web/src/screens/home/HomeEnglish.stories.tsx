import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeScene, ScaledStage } from "./frames";
import type { HomeSceneId } from "./states";

/* English practice track of Home (`?track=english`, home.md §3.4). No composer (O-5). */
const meta: Meta = { title: "Screens/HomeEnglish", parameters: { layout: "padded" } };
export default meta;

const desktop = (id: HomeSceneId): StoryObj => ({
  render: () => <ScaledStage width={1440} height={900}><HomeScene id={id} /></ScaledStage>,
});
const mobile = (id: HomeSceneId): StoryObj => ({
  render: () => <ScaledStage width={375} height={812}><HomeScene id={id} /></ScaledStage>,
  parameters: { viewport: { defaultViewport: "mobile1" } },
});

/** Nothing selected, Start disabled with the visible reason, phrases line. */
export const FirstVisit = desktop("englishFirst");
export const FirstVisitMobile = mobile("englishFirst");
/** B1 preselected ("your last choice"), the phrases card. */
export const Returning = desktop("englishReturning");
export const ReturningMobile = mobile("englishReturning");
export const EngineNotRunning = desktop("englishEngineDown");
/** Six phrases: three shown, "Show all (6)". */
export const Overflow = desktop("englishOverflow");
export const OverflowMobile = mobile("englishOverflow");
