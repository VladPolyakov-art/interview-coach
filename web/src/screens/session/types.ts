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
  /** "Question 2 of 5" / "Turn 4" */
  progress: string;
  /** Seconds since the session went live. */
  elapsed: number;
  /** Main question text of the current thread (Mike's words on the stage). */
  question: string;
  /** Latest follow-up of this thread, when Mike asked one. */
  followUp?: string;
  /** Captions turns: the latest one is shown in voice mode, all of this question's in text mode. */
  captions: CaptionTurn[];
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
  /** Segmented switch. Only "text" is reachable from voice (the backend can't switch back mid-session). */
  onMode?: (mode: SessionInput) => void;
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
  /** Static playback level 0..1 for Mike's orb (review frames). */
  voiceLevel: number;
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
  /** Play the session entrance (orb grows into place, top bar meta drops in). Live only. */
  entering?: boolean;
  /** Review states: which flag starts with its "What did you say?" field open. */
  initialOpenHeard?: string;
  /** Review states: answers / stronger answer start open. */
  defaultShowAnswer?: boolean;
  defaultStrongerOpen?: boolean;
  /** Review states: the feedback sheet starts closed (mid / narrow). Default open for the feedback phases. */
  sheetClosed?: boolean;
  /** Keep the dock's text-mode draft (live container owns the Composer value only inside the view). */
  autoFocusComposer?: boolean;
}
