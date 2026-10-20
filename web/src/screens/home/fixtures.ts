/* Home fixture: docs/ia.md §6 (Alex Morgan, Product Designer; Kestrel Pay / Lumen Health / Fieldnote). All fictional.
 * The stress fixture (+30% text) lives apart, as the shared rules ask (ds/screens/_index.md §2). */
import type { EnglishModel, InterviewModel, JobItem, Phrase, WeakItem } from "./types";

export const KESTREL: JobItem = {
  id: "v1",
  company: "Kestrel Pay",
  role: "Senior Product Designer",
  added: "Oct 18",
  preview: "Own the end-to-end checkout experience for small merchants on web and mobile.",
  questions: 12,
  state: "ready",
};
export const LUMEN: JobItem = {
  id: "v2",
  company: "Lumen Health",
  role: "Product Designer, Design Systems",
  added: "Oct 15",
  preview: "Grow the design system that three clinical product teams build on.",
  questions: 8,
  state: "ready",
};
export const FIELDNOTE: JobItem = {
  id: "v3",
  company: "Fieldnote",
  role: "Lead UX Designer",
  added: "Oct 9",
  preview: "Lead research and design for a note-taking tool used by field teams.",
  questions: 0,
  state: "preparing",
};
export const JOBS: JobItem[] = [KESTREL, LUMEN, FIELDNOTE];

export const WEAK: WeakItem[] = [
  { id: "w1", layer: "content", title: "No result in your answers", short: "No result", count: "4 answers in 2 sessions" },
  { id: "w2", layer: "content", title: "“we” instead of “I”", short: "“we” instead of “I”", count: "3 answers" },
  { id: "w3", layer: "language", title: "“I have led” for finished projects", short: "“I have led”", count: "2 times" },
  { id: "w4", layer: "delivery", title: "About 9 fillers per answer", short: "fillers", count: "5 answers" },
];

export const RETURNING: InterviewModel = {
  firstVisit: false,
  round: "behavioural",
  strictness: 2,
  jobs: JOBS,
  selectedJobId: KESTREL.id,
  pasted: "",
  hasCv: true,
  questions: 5,
  weak: {
    items: WEAK,
    sessions: 2,
    last: { id: "s2", title: "Kestrel Pay", date: "Oct 19" },
    focus: "all",
  },
};

export const FIRST_VISIT: InterviewModel = {
  firstVisit: true,
  round: "behavioural",
  strictness: 2,
  jobs: [],
  selectedJobId: null,
  pasted: "",
  hasCv: false,
  questions: 5,
  weak: null,
};

export const PASTED_TEXT = [
  "Senior Product Designer at Kestrel Pay",
  "",
  "Kestrel Pay builds payments for small merchants. You will own the end-to-end checkout experience on web and mobile.",
  "You will lead research, shape the design system and work with two engineering squads and a product manager.",
  "We expect six or more years in product design, a portfolio with shipped payment or commerce flows, and clear writing.",
].join("\n");

export const PHRASES: Phrase[] = [
  { id: "p1", from: "discuss about the plan", to: "discuss the plan", wrong: "about", right: "", times: 2 },
  { id: "p2", from: "since three years", to: "for three years", wrong: "since", right: "for", times: 2 },
];

export const ENGLISH_FIRST: EnglishModel = {
  firstVisit: true,
  level: null,
  topic: "free",
  phrases: [],
};
export const ENGLISH_RETURNING: EnglishModel = {
  firstVisit: false,
  level: "B1",
  levelRemembered: true,
  topic: "free",
  phrases: PHRASES,
};

/* ---------- stress fixture (+30%): long names, 7 jobs, 6 phrases ---------- */

export const LONG_NAME = "Alexandra-Marie Okonkwo-Lindqvist";

export const KESTREL_LONG: JobItem = {
  ...KESTREL,
  company: "Kestrel Payments International Holdings",
  role: "Senior Staff Product Designer, Platform Experience and Growth",
  preview: "Own the end-to-end checkout experience for small and mid-size merchants across web, mobile and in-store terminals.",
};
export const JOBS_MANY: JobItem[] = [
  KESTREL_LONG,
  LUMEN,
  { ...FIELDNOTE, state: "preparing" },
  { id: "v4", company: "Brightline", role: "Product Designer, Growth", added: "Oct 8", preview: "Run experiments on onboarding.", questions: 10, state: "link" },
  { id: "v5", company: "Northwind Labs", role: "Design Lead", added: "Oct 6", preview: "Short post.", questions: 3, state: "short" },
  { id: "v6", company: "Paperplane", role: "UX Researcher", added: "Oct 3", preview: "Interview customers every week.", questions: 9, state: "ready" },
  { id: "v7", company: "Tidewater Logistics", role: "Senior Designer, Dispatch Tools", added: "Sep 28", preview: "Tools for dispatchers.", questions: 7, state: "ready" },
];

export const WEAK_LONG: WeakItem[] = [
  { id: "w1", layer: "content", title: "No measurable result or outcome in most of your answers", short: "No result", count: "4 answers in 2 sessions" },
  { id: "w2", layer: "content", title: "“we” instead of “I” when you describe your own part of the work", short: "“we” instead of “I”", count: "3 answers" },
  ...WEAK.slice(2),
];

export const PHRASES_MANY: Phrase[] = [
  ...PHRASES,
  { id: "p3", from: "I am agree with this", to: "I agree with this", wrong: "am agree", right: "agree", times: 3 },
  { id: "p4", from: "she suggested me to wait", to: "she suggested that I wait", wrong: "me to wait", right: "that I wait", times: 2 },
  { id: "p5", from: "depends of the budget", to: "depends on the budget", wrong: "of", right: "on", times: 2 },
  { id: "p6", from: "a lot of informations", to: "a lot of information", wrong: "informations", right: "information", times: 2 },
];
