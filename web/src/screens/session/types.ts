/* Props of the pure Session view (ds/screens/session.md §0). The view renders from these only: no audio, no store,
 * no network. The live container (screens/Session.tsx) maps the reducer to them; the review page and the stories use
 * fixtures.ts. Handlers are all optional: an action is drawn only when its handler exists, so the live app never shows
 * a button the backend can't honour (e.g. "Edit what I said"). */
import type { CaptionTurn, IconName } from "../../ds";
import type { LayerOrder } from "../../lib/types";
import type { StrongerState, Thread } from "../../session/reducer";

export type SessionVariant = "interview" | "drill" | "english";
export type SessionInput = "voice" | "text";
export type SessionPhase =
  | "connecting" | "mike-speaking" | "your-turn" | "listening" | "thinking" | "between" | "preparing" | "feedback"
  | "unavailable" | "editing" | "rechecking" | "interrupted" | "saving";
export type SessionOverlay = "none" | "browser" | "storage" | "mic-help" | "interrupted-engine" | "interrupted-voice";
/** What the feedback panel shows. "auto" derives it from the phase (spec P0..P4). */
export type PanelMode = "auto" | "p0" | "p1" | "p2" | "p3" | "p4" | "edit" | "recheck";

/** One turn of the running transcript (session.md V2.1, D49): the whole dialogue, oldest first, newest last. */
export interface TranscriptTurn extends CaptionTurn {
  /** Mike's turn that opens question N: a "Question N" heading before it (interview, drill). */
  question?: number;
  /** Mike's follow-up question: a "Follow-up" badge. */
  followUp?: boolean;
}

export interface TopBadge { label: string; tone: "outline"; icon?: IconName }

export interface SessionSuggestion {
  status: "pending" | "ready" | "unavailable";
  story?: string;
  answer?: string;
  points?: string[];
  message?: string;
}

export interface SessionData {
  /** "Kestrel Pay · Senior Product Designer" */
  title: string;
  /** "Behavioural · Standard" (interview) */
  sub?: string;
  /** Drill and English: Badge `outline` chips next to the title. */
  badges?: TopBadge[];
  /** "Question 2 of 5" / "Turn 4": the island's aria-label and document.title. */
  progress: string;
  /** Interview / drill: the island's short form "2 of 5" (session.md §V2.1). */
  step?: { n: number; of: number };
  /** Seconds since the session went live. */
  elapsed: number;
  /** Main question text of the current thread (Mike's words on the stage). */
  question: string;
  /** Latest follow-up of this thread, when Mike asked one. */
  followUp?: string;
  /** The running transcript of the whole session (D49), newest last. The user's answer being recorded is the last turn,
   * with `interim` words. */
  transcript: TranscriptTurn[];
  /** The user has already answered at least once (panel P1 instead of P0). */
  answered: boolean;
  /** Feedback of the current thread (null before the first answer). */
  thread: Thread | null;
  /** Earlier threads, newest first. */
  earlier: Thread[];
  /** Question number the next press of "Next question" starts; null = this was the last one. */
  nextNumber: number | null;
  /** Edit what I said: texts to prefill. */
  edit?: { answer: string; followUp?: string };
  suggestion?: SessionSuggestion;
  /** The suggester toggle starts on (default true). */
  suggestOn?: boolean;
  stronger?: Record<string, StrongerState>;
  /** Seconds of quiet that end a voice answer; 0 = manual. */
  pauseSec: number;
  /** Notices from the app that don't change the layout (live container only). */
  notices?: { id: string; tone: "info" | "warning" | "error"; text: string; title?: string; onDismiss?: () => void; action?: { label: string; onClick: () => void } }[];
  /** The round is over: Mike said goodbye. */
  closing?: boolean;
}

export interface SessionHandlers {
  onEnd?: () => void;
  onToggleMute?: () => void;
  onInterrupt?: () => void;
  onSendNow?: () => void;
  onRedo?: () => void;
  onTypeInstead?: () => void;
  /** Returns true when the text was accepted (the composer then clears). */
  onSendText?: (text: string) => boolean;
  onNext?: () => void;
  onSeeDebrief?: () => void;
  onFlag?: (feedbackId: string, flagId: string, action: "confirm" | "dismiss" | "restore") => void;
  onSaveHeard?: (feedbackId: string, flagId: string, said: string) => void;
  onStronger?: (feedbackId: string) => void;
  onEdit?: () => void;
  onSaveEdit?: (answer: string, followUp: string) => void;
  onCancelEdit?: () => void;
  onSetSuggest?: (on: boolean) => void;
  onDismissBanner?: () => void;
  onUseText?: () => void;
  onFixSettings?: () => void;
  onResume?: () => void;
  onEndAndDebrief?: () => void;
  onTryAgain?: () => void;
  onCloseMicHelp?: () => void;
}

export interface SessionViewProps {
  variant: SessionVariant;
  input: SessionInput;
  phase: SessionPhase;
  overlay: SessionOverlay;
  firstTime: boolean;
  muted: boolean;
  /** Static mic level 0..1 (review frames); the live container passes `getMicLevel` instead. */
  micLevel: number;
  /** Static playback level 0..1 of Mike's voice for the Presence glow. Omitted (and no `getVoiceLevel`) = a
   * speech-like envelope while Mike speaks (the live app until the playback level is wired, stage 12d). */
  voiceLevel?: number;
  layerOrder: LayerOrder;
  /** The recogniser gave word confidence: checks and the "words we weren't sure about" line exist. */
  withChecks: boolean;
  suggester: "off" | "on";
  data: SessionData;
  handlers?: SessionHandlers;
  /** Override the panel mode (the live container keeps showing the latest feedback while Mike speaks). */
  panel?: PanelMode;
  getMicLevel?: () => number;
  getVoiceLevel?: () => number;
  /** Play the session entrance (the island docks in). Live only. */
  entering?: boolean;
  /** Review states: which flag starts with its "What did you say?" field open. */
  initialOpenHeard?: string;
  /** Review states: answers / stronger answer start open. */
  defaultShowAnswer?: boolean;
  defaultStrongerOpen?: boolean;
  /** The feedback panel (wide: floating panel; mid / narrow: drawer / sheet). Undefined = automatic: it opens on its
   * own when feedback is ready and closes when Mike asks the next question (session.md §V2.4). The user's toggle wins. */
  panelOpen?: boolean;
  /** Review states: an overlay of the island starts open. */
  initialOverlay?: "more" | "shortcuts";
  /** Review states: the transcript starts scrolled up to the beginning ("reading": "Jump to latest" shows). */
  initialFollow?: "latest" | "reading";
  /** Force reduced motion for the Presence glow (review, stories); otherwise the OS setting. */
  reducedMotion?: boolean;
  /** Force the island layout (review); otherwise from the container width (< 560 = stacked). */
  island?: "inline" | "stacked";
  /** Listen to the keyboard shortcuts on the window (the live app). Otherwise only while focus is inside the view. */
  globalKeys?: boolean;
  /** Keep the dock's text-mode draft (live container owns the Composer value only inside the view). */
  autoFocusComposer?: boolean;
}
