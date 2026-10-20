/* Every Home state of ds/screens/home.md §4 as data: view props + what the shell around it shows.
 * Stories, the review entry and the screenshots all read this one table. */
import type { RecentState, ShellEngine } from "../../components/AppShell";
import type { VacancyEditorViewProps } from "../../components/VacancyEditor";
import {
  ENGLISH_FIRST, ENGLISH_RETURNING, FIRST_VISIT, JOBS_MANY, KESTREL_LONG, LONG_NAME, PASTED_TEXT, PHRASES_MANY,
  RETURNING, WEAK_LONG,
} from "./fixtures";
import type { EnglishModel, HomeViewProps, InterviewModel } from "./types";

export type HomeSceneId =
  | "returning" | "firstVisit" | "loading" | "engineDown" | "browserUnsupported" | "browserTextMode" | "storageError"
  | "pastedText" | "pickerOpen" | "strictnessMenu" | "stripExpanded" | "startConnecting" | "deleteJob" | "overflow"
  | "englishFirst" | "englishReturning" | "englishEngineDown" | "englishOverflow"
  | "editorAdd";

export interface HomeScene {
  label: string;
  note?: string;
  props: HomeViewProps;
  recent: RecentState;
  engine: ShellEngine;
  /** Open this dialog over the screen. */
  dialog?: "editor" | "delete";
  editor?: Partial<VacancyEditorViewProps>;
}

export const ENGINE_READY: ShellEngine = { name: "Ollama · qwen3:4b", status: "ready" };
export const ENGINE_DOWN: ShellEngine = { name: "Ollama · qwen3:4b", status: "notReady" };

export const RECENT_READY: RecentState = {
  status: "ready",
  items: [
    { id: "s3", title: "Kestrel Pay · Senior Product Designer", track: "interview" },
    { id: "s2", title: "English · Talk about your work", track: "english" },
    { id: "s1", title: "Lumen Health · Product Designer, Design Systems", track: "interview" },
  ],
};
export const RECENT_EMPTY: RecentState = { status: "ready", items: [] };
export const RECENT_LONG: RecentState = {
  status: "ready",
  items: [
    { id: "s3", title: "Kestrel Payments International Holdings · Senior Staff Product Designer, Platform Experience and Growth", track: "interview" },
    { id: "s2", title: "English · Talk about your work and the projects you are most proud of this year", track: "english" },
    { id: "s1", title: "Lumen Health · Product Designer, Design Systems", track: "interview" },
  ],
};

const base: HomeViewProps = {
  track: "interview",
  greeting: "Good evening",
  name: "Alex",
  engineReady: true,
  interview: RETURNING,
  english: ENGLISH_RETURNING,
};

const withInterview = (patch: Partial<InterviewModel>): InterviewModel => ({ ...RETURNING, ...patch });
const withEnglish = (patch: Partial<EnglishModel>): EnglishModel => ({ ...ENGLISH_RETURNING, ...patch });

const ENGINE_BANNER = { body: "The AI model (Ollama) isn't running. Open the Ollama app, or paste this into Terminal:", command: "ollama serve" };

/** Same banner copy for both tracks; i18n has it, the body line comes from the engine status in the live app. */
const engineDown: Partial<HomeViewProps> = { engineReady: false, engineBanner: ENGINE_BANNER };

export const SCENES: Record<HomeSceneId, HomeScene> = {
  returning: { label: "Returning user", props: base, recent: RECENT_READY, engine: ENGINE_READY },
  firstVisit: {
    label: "First visit",
    props: { ...base, name: undefined, interview: FIRST_VISIT, english: ENGLISH_FIRST },
    recent: RECENT_EMPTY,
    engine: ENGINE_READY,
  },
  loading: {
    label: "Loading",
    props: {
      ...base,
      loading: true,
      interview: withInterview({ jobsLoading: true, weak: { items: [], sessions: 0, loading: true, focus: "all" } }),
    },
    recent: { status: "loading" },
    engine: { name: "Ollama · qwen3:4b", status: "checking" },
  },
  engineDown: { label: "Engine not running", props: { ...base, ...engineDown }, recent: RECENT_READY, engine: ENGINE_DOWN },
  browserUnsupported: { label: "Browser can't recognise speech", props: { ...base, browserBanner: true }, recent: RECENT_READY, engine: ENGINE_READY },
  browserTextMode: { label: "Text mode chosen", props: { ...base, textMode: true }, recent: RECENT_READY, engine: ENGINE_READY },
  storageError: { label: "Saved sessions unreadable", props: { ...base, storageError: true }, recent: { status: "error" }, engine: ENGINE_READY },
  pastedText: {
    label: "Text pasted into the composer",
    props: { ...base, interview: withInterview({ pasted: PASTED_TEXT }) },
    recent: RECENT_READY,
    engine: ENGINE_READY,
  },
  pickerOpen: {
    label: "Saved jobs picker open",
    props: { ...base, interview: withInterview({ initialOverlay: "picker" }) },
    recent: RECENT_READY,
    engine: ENGINE_READY,
  },
  strictnessMenu: {
    label: "Strictness menu open",
    props: { ...base, interview: withInterview({ initialOverlay: "strictness" }) },
    recent: RECENT_READY,
    engine: ENGINE_READY,
  },
  stripExpanded: {
    label: "What to work on, all rows",
    props: { ...base, interview: withInterview({ weak: { ...RETURNING.weak!, expanded: true } }) },
    recent: RECENT_READY,
    engine: ENGINE_READY,
  },
  startConnecting: { label: "Start pressed, connecting", props: { ...base, starting: true }, recent: RECENT_READY, engine: ENGINE_READY },
  deleteJob: { label: "Delete job, confirm", props: base, recent: RECENT_READY, engine: ENGINE_READY, dialog: "delete" },
  overflow: {
    label: "Overflow, text +30%",
    note: "Длинное имя, длинные названия вакансии и компании, 7 вакансий в списке, длинные пункты в «What to work on».",
    props: {
      ...base,
      name: LONG_NAME,
      interview: withInterview({
        jobs: JOBS_MANY,
        selectedJobId: KESTREL_LONG.id,
        weak: { ...RETURNING.weak!, items: WEAK_LONG, last: { id: "s2", title: "Kestrel Payments International Holdings", date: "Oct 19" }, expanded: false },
        initialOverlay: "picker",
      }),
    },
    recent: RECENT_LONG,
    engine: ENGINE_READY,
  },
  englishFirst: {
    label: "English, first visit",
    props: { ...base, track: "english", name: undefined, interview: FIRST_VISIT, english: ENGLISH_FIRST },
    recent: RECENT_EMPTY,
    engine: ENGINE_READY,
  },
  englishReturning: { label: "English, returning", props: { ...base, track: "english" }, recent: RECENT_READY, engine: ENGINE_READY },
  englishEngineDown: { label: "English, engine not running", props: { ...base, ...engineDown, track: "english" }, recent: RECENT_READY, engine: ENGINE_DOWN },
  englishOverflow: {
    label: "English, overflow (6 phrases)",
    props: { ...base, track: "english", name: LONG_NAME, english: withEnglish({ level: "C1", phrases: PHRASES_MANY }) },
    recent: RECENT_LONG,
    engine: ENGINE_READY,
  },
  editorAdd: { label: "Add a job", props: base, recent: RECENT_READY, engine: ENGINE_READY, dialog: "editor", editor: { source: "paste" } },
};
