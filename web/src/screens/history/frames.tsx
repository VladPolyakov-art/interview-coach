/* Scenes of the History list for stories and the review page: the list inside the full shell, every state from props. */
import { MemoryRouter } from "react-router-dom";
import { AppShellView } from "../../components/AppShell";
import { SHELL_ENGINE, SHELL_RECENT } from "../debrief/frames";
import { HISTORY_NOW, RENAMING_ID, RENAMING_VALUE, historyData, historyOverflow, LONG_TITLE } from "./fixtures";
import { HistoryView } from "./HistoryView";
import type { HistoryRowModel, HistoryUi, HistoryViewProps, TrackFilter } from "./types";

export interface HistorySceneSpec extends Partial<Omit<HistoryViewProps, "rows" | "now" | "trashCount">> {
  rows: HistoryRowModel[];
  trashCount?: number;
  track?: TrackFilter;
  ui?: HistoryUi;
  route?: string;
}

export const HISTORY_SCENES = {
  data: { rows: historyData, trashCount: 1 },
  renaming: {
    rows: historyData.map((r) => (r.id === RENAMING_ID ? { ...r, title: RENAMING_VALUE } : r)),
    trashCount: 1,
    ui: { renaming: RENAMING_ID },
  },
  overflow: { rows: historyOverflow, trashCount: 1, ui: { tooltipOpen: "o3" } },
  /** 375 only: the narrow "more" menu of one row, open. */
  menuOpen: { rows: historyData, trashCount: 1, ui: { menuOpen: "s3" } },
  filteredEmpty: { rows: historyData.filter((r) => r.track === "interview"), trashCount: 1, track: "english", route: "/history?track=english" },
  empty: { rows: [] },
  loading: { rows: [], state: "loading" },
  error: { rows: [], state: "error" },
  /** After Move to Trash: the row is gone, the toast offers Undo. */
  toast: { rows: historyData.filter((r) => r.id !== "s1"), trashCount: 2, toast: { message: "Moved to Trash.", undoLabel: "Undo" } },
  failed: { rows: historyData, trashCount: 1, notice: "Couldn't rename this session. Try again." },
} satisfies Record<string, HistorySceneSpec>;
export type HistorySceneId = keyof typeof HISTORY_SCENES;

export function HistoryScene({ id }: { id: HistorySceneId }) {
  const spec: HistorySceneSpec = HISTORY_SCENES[id];
  const { rows, trashCount = 0, route, ...rest } = spec;
  return (
    <MemoryRouter initialEntries={[route ?? "/history"]}>
      <AppShellView current="history" recent={SHELL_RECENT} engine={SHELL_ENGINE}>
        <HistoryView state="ready" now={HISTORY_NOW} rows={rows} trashCount={trashCount} {...rest} />
      </AppShellView>
    </MemoryRouter>
  );
}

export { LONG_TITLE };
