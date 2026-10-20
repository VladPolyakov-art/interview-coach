/* Home screen model (ds/screens/home.md). The pure `HomeView` takes all of this by props; the live `HomeScreen`
 * container feeds it from the store and the API. Nothing here knows about the network. */
import type { ReactNode } from "react";
import type { WeakSpotLayer } from "../../ds";
import type { Level } from "../../lib/types";

export type Track = "interview" | "english";
/** Round type chips (US-12 AC1: four). */
export type RoundType = "hr" | "behavioural" | "technical" | "mix";
export type Strictness = 1 | 2 | 3;
export type EnglishTopic = "free" | "work" | "small";
export type { Level };

/** A saved job (vacancy) as the picker and the attachment show it. Dates arrive formatted ("Oct 18"). */
export interface JobItem {
  id: string;
  company: string;
  role: string;
  /** "Oct 18" */
  added: string;
  /** First line of the description, shown (clamped) in the attachment. */
  preview?: string;
  questions: number;
  /** `ready`: "N questions from this job" · `preparing`: shimmer · `short`: too little text · `link`: added from a link. */
  state: "ready" | "preparing" | "short" | "link";
}

export interface WeakItem {
  id: string;
  layer: WeakSpotLayer;
  title: string;
  /** Short form for the "+ N more" line and the Drill scope line ("No result"). */
  short?: string;
  /** "4 answers in 2 sessions" */
  count: string;
}

export interface WeakSpotsModel {
  items: WeakItem[];
  /** Interviews the memory looked at ("From your last 2 interviews"). */
  sessions: number;
  last?: { id: string; title: string; date: string };
  loading?: boolean;
  focus: "all" | WeakSpotLayer;
  /** Start the strip with every row visible (review state). */
  expanded?: boolean;
}

export interface Phrase { id: string; from: string; to: string; wrong: string; right: string; times: number }

export interface InterviewModel {
  /** No sessions yet: example panel, no strip, "Saved jobs" hidden while the library is empty. */
  firstVisit: boolean;
  round: RoundType;
  strictness: Strictness;
  jobs: JobItem[];
  jobsLoading?: boolean;
  selectedJobId: string | null;
  /** Text typed or pasted into the composer. */
  pasted: string;
  hasCv: boolean;
  /** Questions in a session (fixed, O-4). */
  questions: number;
  weak: WeakSpotsModel | null;
  /** Settings: the order of the three layers in the example panel (GR8). */
  layerOrder?: "content-first" | "delivery-first";
  /** Review states: open the picker or the Strictness menu at first render. */
  initialOverlay?: "picker" | "strictness";
}

export interface EnglishModel {
  firstVisit: boolean;
  level: Level | null;
  /** The level was chosen in an earlier session (returning). */
  levelRemembered?: boolean;
  topic: EnglishTopic;
  phrases: Phrase[];
  /** Phrases list starts with every row shown (review state). */
  phrasesExpanded?: boolean;
}

export interface EngineBannerModel {
  body: string;
  /** Command to copy (CopyField). */
  command?: string;
}

export interface HomeViewProps {
  track: Track;
  /** "Good evening" (the container picks it by time of day). */
  greeting: string;
  /** Profile name: the H1 becomes "Good evening, Alex" (US-08 AC3). */
  name?: string;
  loading?: boolean;
  /** Mike's engine can start. false: banner, offline orb, disabled Start and Drill. */
  engineReady: boolean;
  engineBanner?: EngineBannerModel | null;
  /** US-06: the browser can't recognise speech. */
  browserBanner?: boolean;
  /** The user chose to answer by typing: Start shows the keyboard icon, "Type instead" goes away. */
  textMode?: boolean;
  /** US-23: saved sessions can't be read. */
  storageError?: boolean;
  /** Start was pressed: the button turns into the connecting pill. */
  starting?: boolean;
  /** Motion: build-up on first load, soft-out while leaving to the session. */
  buildUp?: boolean;
  leaving?: boolean;
  interview: InterviewModel;
  english: EnglishModel;
  /** Rendered after the column (VacancyEditor dialog). */
  overlay?: ReactNode;
  onTrackChange?: (track: Track) => void;
  onRoundChange?: (round: RoundType) => void;
  onStrictnessChange?: (s: Strictness) => void;
  onSelectJob?: (id: string | null) => void;
  onEditJob?: (id: string) => void;
  onDeleteJob?: (id: string) => void;
  /** "Add a job" (empty editor) and "File" (editor on the File tab). */
  onAddJob?: () => void;
  onPickFile?: () => void;
  onPastedChange?: (text: string) => void;
  /** Pasted text or a link goes to the editor (O-3). */
  onAddPasted?: () => void;
  onFocusChange?: (focus: "all" | WeakSpotLayer) => void;
  onDrill?: () => void;
  onStart?: () => void;
  onTypeInstead?: () => void;
  onUseTextMode?: () => void;
  onDismissBrowser?: () => void;
  onRetryEngine?: () => void;
  onLevelChange?: (level: Level) => void;
  onTopicChange?: (topic: EnglishTopic) => void;
  onStartEnglish?: () => void;
  onPractisePhrases?: () => void;
}
