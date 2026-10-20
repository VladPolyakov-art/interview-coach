import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScaledStage } from "../debrief/frames";
import { HistoryScene, type HistorySceneId } from "./frames";

/* Fixture: docs/ia.md §6 (Alex Morgan; sessions S1–S3). Spec: ds/screens/debrief.md §4. Each story is a frame of a real
 * width, scaled to fit, with its own OverlayRoot. Light; dark with the toolbar. */
const meta: Meta = { title: "Screens/History", parameters: { layout: "padded" } };
export default meta;

const desktop = (id: HistorySceneId): StoryObj => ({
  render: () => <ScaledStage width={1440} height={900}><HistoryScene id={id} /></ScaledStage>,
});
const mobile = (id: HistorySceneId): StoryObj => ({
  render: () => <ScaledStage width={375} height={812}><HistoryScene id={id} /></ScaledStage>,
  parameters: { viewport: { defaultViewport: "mobile1" } },
});

/** Three sessions in two week groups (invariant 1). */
export const Data = desktop("data");
export const DataMobile = mobile("data");
/** The Lumen row is being renamed in place. */
export const Renaming = desktop("renaming");
/** Narrow: one "more" button opens the row menu (Rename, Move to Trash). */
export const RowMenuMobile = mobile("menuOpen");
/** Seven rows, +30% text, one truncated title with its tooltip. */
export const Overflow = desktop("overflow");
export const OverflowMobile = mobile("overflow");
/** `?track=english` with no English sessions. */
export const FilteredEmpty = desktop("filteredEmpty");
export const Empty = desktop("empty");
export const EmptyMobile = mobile("empty");
export const Loading = desktop("loading");
export const LoadingMobile = mobile("loading");
export const Error = desktop("error");
/** After Move to Trash: the row has gone, the toast offers Undo (never a green callout). */
export const Toast = desktop("toast");
/** A rename or trash call failed: an error callout above the list, the old title is back. */
export const ActionFailed = desktop("failed");
