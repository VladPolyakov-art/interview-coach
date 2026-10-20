/* Every Home v2 state of ds/screens/home.md §5 as data: a script context + the inputs replayed through the setup
 * script (script.ts) + view flags + what the shell around it shows. Stories, the review entry and the screenshots all
 * read this one table, so a state is reachable by props and still playable (frames.tsx keeps it live). */
import type { RecentState, ShellEngine } from "../../components/AppShell";
import {
  CTX_ENGLISH, CTX_ENGLISH_FIRST, CTX_FIRST, CTX_NO_CV, CTX_OVERFLOW, CTX_RETURNING, JOB_FILE, JOB_LINK, KESTREL_LONG,
  KESTREL_PASTED, LONG_NAME, PASTED_LONG, PASTED_TEXT,
} from "./fixtures";
import { suggestionsFor, type JobResult, type ScriptContext, type StartInput } from "./script";
import type { HomeViewProps, JobItem, PlanRow } from "./types";

/** One step replayed through the script. `pick` answers the last open question with that reply id. */
export type SceneInput =
  | { do: "begin"; input: StartInput }
  | { do: "pick"; reply: string }
  | { do: "say"; text: string }
  | { do: "resolve"; result: JobResult }
  | { do: "update"; job: JobItem }
  | { do: "skip" }
  | { do: "change"; row: PlanRow; value: string };

export interface HomeScene {
  label: string;
  note?: string;
  ctx: ScriptContext;
  /** No inputs: the start screen. */
  inputs?: SceneInput[];
  /** View flags (name, banners, text mode, starting, an open menu, the composer…). */
  props?: Partial<HomeViewProps>;
  recent: RecentState;
  engine: ShellEngine;
  /** Keep a pending read pending (the "Reading the job…" states); otherwise the harness resolves it after a pause. */
  hold?: boolean;
  /** How a pending read resolves when played live. */
  resolveWith?: JobResult;
}

export const ENGINE_READY: ShellEngine = { name: "Ollama · qwen3:4b", status: "ready" };
export const ENGINE_DOWN: ShellEngine = { name: "Ollama · qwen3:4b", status: "notReady" };

export const RECENT_READY: RecentState = {
  status: "ready",
  items: [
    { id: "s3", title: "Kestrel Pay · Senior Product Designer", track: "interview", when: "Oct 19" },
    { id: "s2", title: "English practice", track: "english", when: "Oct 17" },
    { id: "s1", title: "Lumen Health · Product Designer, Design Systems", track: "interview", when: "Oct 14" },
  ],
};
export const RECENT_EMPTY: RecentState = { status: "ready", items: [] };
export const RECENT_LONG: RecentState = {
  status: "ready",
  items: [
    { id: "s3", title: "Kestrel Payments International Holdings · Senior Staff Product Designer, Platform Experience and Growth", track: "interview", when: "10:42 AM" },
    { id: "s2", title: "English · Talk about your work and the projects you are most proud of this year", track: "english", when: "Oct 17" },
    { id: "s1", title: "Lumen Health · Product Designer, Design Systems", track: "interview", when: "Oct 14, 2025" },
  ],
};

const ENGINE_BANNER = { body: "The AI model (Ollama) isn't running. Open the Ollama app, or paste this into Terminal:", command: "ollama serve" };
const engineDown: Partial<HomeViewProps> = { engineReady: false, engineBanner: ENGINE_BANNER };

const ret = { ctx: CTX_RETURNING, recent: RECENT_READY, engine: ENGINE_READY, props: { name: "Alex" } };
const first = { ctx: CTX_FIRST, recent: RECENT_EMPTY, engine: ENGINE_READY };

/* Paths through the script, reused by several states. */
const ASK_JOB: SceneInput[] = [{ do: "begin", input: { kind: "text", text: "I want to practise for an interview" } }];
const SAVED_PICKED: SceneInput[] = [...ASK_JOB, { do: "pick", reply: "job:v2" }];
const ASK_ANYTHING: SceneInput[] = [...SAVED_PICKED, { do: "pick", reply: "round:behavioural" }];
const PLAN: SceneInput[] = [
  { do: "begin", input: { kind: "text", text: "I have a behavioural round with Kestrel Pay" } },
  { do: "pick", reply: "anything:none" },
];
const PASTED: SceneInput[] = [
  { do: "begin", input: { kind: "text", text: PASTED_TEXT } },
  { do: "resolve", result: { ok: true, job: KESTREL_PASTED } },
];
const PASTED_PLAN: SceneInput[] = [...PASTED, { do: "pick", reply: "round:behavioural" }, { do: "pick", reply: "anything:none" }];
const NOTE = "I freeze when they ask about salary.";
const NOTE_LONG = "I freeze when they ask about salary, and I tend to ramble when they ask why I want to leave my current team. Please ask me both, and stop me if an answer runs past two minutes. Also ask one question about working with engineers who disagree with a design decision.";

export const SCENES = {
  /* ---------- start screen ---------- */
  returning: { ...ret, label: "Returning user" },
  firstVisit: { ...first, label: "First visit", props: { name: "Alex" } },
  noName: { ...first, label: "No profile name" },
  english: { ...ret, ctx: CTX_ENGLISH, label: "English practice" },
  modeMenu: { ...ret, label: "Practice type menu open", props: { name: "Alex", initialOverlay: "mode" } },
  typed: { ...ret, label: "Typed a message", props: { name: "Alex", composer: { text: "I have an HR screen with Lumen tomorrow" } } },
  pasted: { ...ret, label: "Pasted a job", props: { name: "Alex", composer: { text: PASTED_TEXT } } },
  fileAttached: { ...ret, label: "Job file attached", props: { name: "Alex", composer: { text: "", file: JOB_FILE } } },
  loading: { ...ret, label: "Loading", props: { name: "Alex", loading: true, suggestions: [] }, recent: { status: "loading" }, engine: { name: "Ollama · qwen3:4b", status: "checking" } },
  engineDown: { ...ret, label: "Engine not running", props: { name: "Alex", ...engineDown }, engine: ENGINE_DOWN },
  browserUnsupported: { ...ret, label: "Browser can't recognise speech", props: { name: "Alex", browserBanner: true } },
  storageError: {
    ...first,
    label: "Saved sessions unreadable",
    props: { name: "Alex", storageError: true, suggestions: suggestionsFor(CTX_FIRST).filter((x) => x.id !== "example") },
    recent: { status: "error" },
  },
  overflowStart: { ...ret, ctx: CTX_OVERFLOW, label: "Overflow, text +30%", props: { name: LONG_NAME }, recent: RECENT_LONG },
  quickTextMode: { ...ret, label: "Quick start, answering by typing", props: { name: "Alex", textMode: true } },
  quickStarting: { ...ret, label: "Start mic pressed", props: { name: "Alex", starting: true } },

  /* ---------- setup chat ---------- */
  jobReading: { ...ret, label: "Reading a pasted job", inputs: [{ do: "begin", input: { kind: "text", text: PASTED_TEXT } }], hold: true },
  jobPasted: { ...ret, label: "Job read", inputs: PASTED },
  linkFetching: { ...ret, label: "Opening a link", inputs: [{ do: "begin", input: { kind: "text", text: JOB_LINK } }], hold: true },
  linkError: { ...ret, label: "Link needs a login", inputs: [{ do: "begin", input: { kind: "text", text: JOB_LINK } }, { do: "resolve", result: { ok: false } }] },
  fileReading: { ...ret, label: "Reading a file", inputs: [{ do: "begin", input: { kind: "file", ...JOB_FILE } }], hold: true },
  fileError: { ...ret, label: "File can't be read", inputs: [{ do: "begin", input: { kind: "file", ...JOB_FILE } }, { do: "resolve", result: { ok: false } }] },
  askJob: { ...ret, label: "T1: which job", inputs: ASK_JOB },
  savedJobPicked: { ...ret, label: "Saved job picked → T2", inputs: SAVED_PICKED },
  keywordMatch: { ...ret, label: "Keywords matched → T3", inputs: [{ do: "begin", input: { kind: "text", text: "I have an HR screen with Lumen tomorrow" } }] },
  askRound: { ...first, label: "T2: which round (first visit)", inputs: [{ do: "begin", input: { kind: "suggestion", id: "general" } }] },
  askAnything: { ...ret, label: "T3: anything else", inputs: ASK_ANYTHING },
  roundNotCaught: { ...first, label: "Round not caught", inputs: [{ do: "begin", input: { kind: "suggestion", id: "general" } }, { do: "say", text: "not sure honestly" }] },
  freeTextNote: { ...ret, label: "T3 answered in words", inputs: [...ASK_ANYTHING, { do: "say", text: NOTE }] },
  plan: { ...ret, label: "Plan", inputs: PLAN },
  planPreparing: { ...ret, label: "Plan, questions preparing", inputs: PASTED_PLAN },
  planPrepError: { ...ret, label: "Plan, questions failed", inputs: [...PASTED_PLAN, { do: "update", job: { ...KESTREL_PASTED, state: "error" } }] },
  planNoCv: { ...ret, ctx: CTX_NO_CV, label: "Plan without a CV", inputs: PLAN },
  planEngineDown: { ...ret, label: "Plan, engine not running", inputs: PLAN, props: { name: "Alex", ...engineDown }, engine: ENGINE_DOWN },
  planTextMode: { ...ret, label: "Plan, answering by typing", inputs: PLAN, props: { name: "Alex", textMode: true, browserBanner: true } },
  planChangeOpen: { ...ret, label: "Plan, Change round open", inputs: PLAN, props: { name: "Alex", initialOverlay: "change-round" } },
  skipped: { ...ret, label: "Skip questions at T2", inputs: [...SAVED_PICKED, { do: "skip" }] },
  again: { ...ret, label: "Kestrel Pay again", inputs: [{ do: "begin", input: { kind: "suggestion", id: "again" } }] },
  drill: { ...ret, label: "Drill my weak spots", inputs: [{ do: "begin", input: { kind: "suggestion", id: "drill" } }] },
  drillPlan: { ...ret, label: "Drill plan", inputs: [{ do: "begin", input: { kind: "suggestion", id: "drill" } }, { do: "pick", reply: "focus:content" }] },
  example: { ...first, label: "Show me an example", inputs: [{ do: "begin", input: { kind: "suggestion", id: "example" } }] },
  englishLevel: { ...first, ctx: CTX_ENGLISH_FIRST, label: "English, level (first visit)", inputs: [{ do: "begin", input: { kind: "suggestion", id: "en-free" } }] },
  englishPhrases: {
    ...ret,
    ctx: CTX_ENGLISH,
    label: "English, phrases question",
    inputs: [{ do: "begin", input: { kind: "suggestion", id: "en-work" } }, { do: "pick", reply: "level:B2" }],
  },
  englishPlan: {
    ...ret,
    ctx: CTX_ENGLISH,
    label: "English plan",
    inputs: [{ do: "begin", input: { kind: "suggestion", id: "en-work" } }, { do: "pick", reply: "level:B2" }, { do: "pick", reply: "phrases:yes" }],
  },
  starting: { ...ret, label: "Start pressed, connecting", inputs: PLAN, props: { name: "Alex", starting: true } },
  overflowSetup: {
    ...ret,
    ctx: CTX_OVERFLOW,
    label: "Setup overflow, text +30%",
    note: "Длинная вакансия (40 строк, свёрнута до 3), длинные компания и роль, заметка 300 символов, 7 вакансий в Change job.",
    props: { name: LONG_NAME, initialOverlay: "change-job" },
    recent: RECENT_LONG,
    inputs: [
      { do: "begin", input: { kind: "text", text: PASTED_LONG } },
      { do: "resolve", result: { ok: true, job: { ...KESTREL_LONG, questions: 12, state: "ready" } } },
      { do: "pick", reply: "round:behavioural" },
      { do: "say", text: NOTE_LONG },
    ],
  },
} satisfies Record<string, HomeScene>;

export type HomeSceneId = keyof typeof SCENES;
