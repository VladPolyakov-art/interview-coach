import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeScene, ScaledStage } from "./frames";
import type { HomeSceneId } from "./states";

/* Fixture: docs/ia.md §6 (Alex Morgan, Product Designer; Kestrel Pay / Lumen Health / Fieldnote). Each story is a
 * frame of a real width, scaled to fit, with its own OverlayRoot — the same set-up as the review page. Light; dark
 * with the toolbar. Spec: ds/screens/home.md §4. */
const meta: Meta = { title: "Screens/Home", parameters: { layout: "padded" } };
export default meta;

const desktop = (id: HomeSceneId): StoryObj => ({
  render: () => <ScaledStage width={1440} height={900}><HomeScene id={id} /></ScaledStage>,
});
const mobile = (id: HomeSceneId): StoryObj => ({
  render: () => <ScaledStage width={375} height={812}><HomeScene id={id} /></ScaledStage>,
  parameters: { viewport: { defaultViewport: "mobile1" } },
});

/** §3.2 default: strip, round chips, composer with the Kestrel Pay job attached, Start. */
export const Returning = desktop("returning");
export const ReturningMobile = mobile("returning");
/** §3.3: no strip, no Recent, the example panel under Start. */
export const FirstVisit = desktop("firstVisit");
export const FirstVisitMobile = mobile("firstVisit");
/** Skeletons for the strip, the attachment and Recent; chips and Strictness disabled; Start disabled with a shimmer reason. */
export const Loading = desktop("loading");
export const LoadingMobile = mobile("loading");
/** Banner before the orb; orb offline; Start and Drill disabled with the reason under Start. */
export const EngineNotRunning = desktop("engineDown");
export const EngineNotRunningMobile = mobile("engineDown");
export const BrowserUnsupported = desktop("browserUnsupported");
export const BrowserTextMode = desktop("browserTextMode");
export const StorageUnreadable = desktop("storageError");
export const PastedText = desktop("pastedText");
export const PickerOpen = desktop("pickerOpen");
export const PickerOpenMobile = mobile("pickerOpen");
export const StrictnessMenu = desktop("strictnessMenu");
export const StripExpanded = desktop("stripExpanded");
export const StartConnecting = desktop("startConnecting");
export const DeleteJob = desktop("deleteJob");
export const VacancyEditorOpen = desktop("editorAdd");
/** Stress fixture: +30% text, 7 jobs in the picker. */
export const Overflow = desktop("overflow");
export const OverflowMobile = mobile("overflow");
