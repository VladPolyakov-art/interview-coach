/* The Session screen as a pure view (ds/screens/session.md §0): everything comes from props, nothing from audio, the
 * store or the network. The live container (screens/Session.tsx) maps the reducer to these props; the review page and
 * the stories pass fixtures.
 * v2 (§V2, D47c): no top bar and no dock. Every control lives in one floating island at the bottom centre of the stage;
 * the context (title, round) moved into the island's More menu. The feedback panel is opened from the island:
 * wide (>= 1024) a floating panel on the right (the stage shifts left to stay centred), mid (768-1023) a right Drawer,
 * narrow (< 768) a bottom sheet. Only the panel swap and the island's two rows (< 560) are done in JS (the Drawer is a
 * portal); every other rule is a CSS container query on the root (`session`). */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button, Drawer, IconButton, Orb, Panel, scrollBehavior, StatusPill, usePresence, type OrbState, type StatusPillState } from "../../ds";
import { Captions } from "../../ds";
import { t } from "../../i18n";
import { Banners } from "./parts/Banners";
import { FirstTime } from "./parts/FirstTime";
import { Interrupted } from "./parts/Interrupted";
import { islandModel, SessionIsland } from "./parts/Island";
import { MicHelpDialog } from "./parts/MicHelpDialog";
import { PanelBody, type ConcretePanel } from "./parts/PanelBody";
import { QuestionBlock } from "./parts/QuestionBlock";
import { ShortcutsDialog } from "./parts/ShortcutsDialog";
import { Suggester } from "./parts/Suggester";
import type { SessionPhase, SessionViewProps } from "./types";
import { useSessionLayout } from "./useSessionLayout";
import s from "./SessionView.module.css";

interface Stage { orb: OrbState; pill: StatusPillState; label: string; sub?: string; live: boolean }

/** One state text under the orb (O5): the orb, the pill and the sub line, from the phase. */
function stageFor(p: SessionViewProps): Stage {
  const { phase, input, muted, variant, data } = p;
  const voice = input === "voice";
  // English has no "Next question": after the feedback the conversation goes on, so it is the user's turn again.
  const effective = variant === "english" && (phase === "feedback" || phase === "between" || phase === "preparing") ? "your-turn" : phase;
  const sec = data.pauseSec;
  switch (effective) {
    case "connecting":
      return { orb: "idle", pill: "connecting", label: t("session.status.connecting"), sub: t("session.sub.connecting"), live: false };
    case "mike-speaking":
      return { orb: "speaking", pill: "speaking", label: t("session.status.speaking"), sub: voice ? t("session.sub.speaking") : undefined, live: false };
    case "thinking":
      return { orb: "thinking", pill: "thinking", label: t("session.status.thinking"), live: false };
    case "listening":
      return muted
        ? { orb: "muted", pill: "muted", label: t("session.status.muted"), sub: t("session.sub.muted"), live: false }
        : { orb: "listening", pill: "listening", label: t("session.status.listening"), sub: sec > 0 ? t("session.sub.listening", { sec }) : t("session.sub.listeningManual"), live: true };
    case "your-turn":
      if (!voice) return { orb: "idle", pill: "your-turn", label: t("session.status.yourTurn"), sub: t("session.sub.yourTurnText"), live: false };
      return muted
        ? { orb: "muted", pill: "muted", label: t("session.status.muted"), sub: t("session.sub.muted"), live: false }
        : { orb: "listening", pill: "your-turn", label: t("session.status.yourTurn"), sub: t("session.sub.yourTurn"), live: true };
    case "preparing":
    case "rechecking":
      return { orb: "idle", pill: "between", label: t("session.status.preparingFeedback"), live: false };
    case "unavailable":
      return { orb: "idle", pill: "between", label: t("session.status.saved"), sub: betweenLine(p), live: false };
    case "interrupted":
      return { orb: "offline", pill: "paused", label: t("session.status.paused"), sub: t("session.sub.paused"), live: false };
    case "saving":
      return { orb: "idle", pill: "between", label: t("session.saving"), live: false };
    default: // between · feedback · editing
      return { orb: "idle", pill: "between", label: t("session.status.between"), sub: betweenLine(p), live: false };
  }
}

function betweenLine(p: SessionViewProps): string | undefined {
  if (p.variant === "english") return undefined;
  return p.data.nextNumber ? t("session.sub.between", { n: p.data.nextNumber }) : t("session.sub.betweenLast");
}

/** Spec P0..P4 from the phase, unless the caller (the live container) says what to show. */
function resolvePanel(p: SessionViewProps): ConcretePanel {
  if (p.panel && p.panel !== "auto") return p.panel;
  switch (p.phase) {
    case "editing": return "edit";
    case "rechecking": return "recheck";
    case "preparing": return "p2";
    case "unavailable": return "p4";
    case "feedback":
    case "between": return "p3";
    case "interrupted":
    case "saving": return p.data.thread?.records.length ? "p3" : p.data.answered ? "p1" : "p0";
    default: return p.data.answered ? "p1" : "p0";
  }
}

/** Panel modes that open the panel on their own (feedback is there or on its way). */
const OPEN_MODES = new Set<ConcretePanel>(["p2", "p3", "p4", "edit", "recheck"]);
/** Phases in which the panel never opens on its own: Mike asks, the user answers (GR6), the session starts. */
const QUIET = new Set<SessionPhase>(["connecting", "mike-speaking", "your-turn", "listening", "thinking"]);

function inTextField(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  return Boolean(node && (node.tagName === "TEXTAREA" || node.tagName === "INPUT" || node.tagName === "SELECT" || node.isContentEditable));
}

export function SessionView(props: SessionViewProps) {
  const { variant, input, phase, overlay, muted, data, handlers, entering } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLButtonElement>(null);
  const { layout, stacked: narrowIsland } = useSessionLayout(rootRef);
  const wide = layout === "wide";
  const compact = layout === "narrow";
  const voice = input === "voice";
  const interrupted = phase === "interrupted" || overlay === "interrupted-engine" || overlay === "interrupted-voice";
  const stage = stageFor({ ...props, phase: interrupted ? "interrupted" : phase });
  const panelMode = resolvePanel(props);
  const thinking = phase === "thinking";
  const lastTurn = data.captions.at(-1);
  const lastLen = lastTurn?.text.length ?? 0;
  /* The newest line stays in view: smooth (C11), instant while the user talks (rule 3) and under reduced motion. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: phase === "listening" ? "auto" : scrollBehavior() });
  }, [data.captions.length, lastLen, lastTurn?.interim, phase]);
  /* Text mode: the transcript is the record of the answers; Mike's current question and follow-up are already above. */
  const transcriptTurns = data.captions.filter((c) => {
    const text = Array.isArray(c.text) ? c.text.join("") : c.text;
    return !(c.speaker === "mike" && (text === data.question || text === data.followUp));
  });

  /* ---------- island model (also drives the keyboard) ---------- */
  const th = data.thread;
  const hasFeedback = Boolean(data.answered || th?.records.length || th?.pendingIds.length || th?.unavailable.length || data.earlier.length);
  const model = islandModel({ variant, input, phase, muted, interrupted, data, handlers, hasFeedback });

  /* ---------- feedback panel: opens on its own when feedback is ready, closes when Mike asks the next question;
   * the user's toggle (F, the island button, X, Esc) wins until the panel's mode changes. ---------- */
  const autoOpen = OPEN_MODES.has(panelMode) && !QUIET.has(phase) && !(interrupted && !wide);
  const autoKey = `${th?.number ?? 0}:${panelMode}:${autoOpen}`;
  const [manual, setManual] = useState<{ key: string; open: boolean } | null>(null);
  const wanted = manual?.key === autoKey ? manual.open : props.panelOpen ?? autoOpen;
  const panelOpen = model.feedback.enabled && wanted;
  const setPanel = (open: boolean, returnFocus = false) => {
    setManual({ key: autoKey, open });
    if (!open && returnFocus) feedbackRef.current?.focus({ preventScroll: true });
  };
  const floating = usePresence(wide && panelOpen);

  /* ---------- island overlays ---------- */
  const [shortcuts, setShortcuts] = useState(props.initialOverlay === "shortcuts");
  const [micHelp, setMicHelp] = useState(false);
  const [suggestOn, setSuggestOn] = useState(data.suggestOn ?? true);
  const showSuggester = props.suggester === "on" && variant === "interview";

  /* Text mode morph: the island turns from pill into box once, when the input switches during the session. */
  const [prevInput, setPrevInput] = useState(input);
  const [morph, setMorph] = useState(false);
  if (prevInput !== input) {
    setPrevInput(input);
    setMorph(true);
  }

  /* The stage keeps room for the island (captions and the follow-up are never under it): its height as a variable. */
  const [islandH, setIslandH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = islandRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setIslandH(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- keyboard (V2.8) ---------- */
  const onKey = (e: KeyboardEvent | ReactKeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (e.key === "Escape") {
      if (wide && panelOpen) { e.preventDefault(); setPanel(false, true); }
      return;
    }
    if (inTextField(target)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const onButton = target?.tagName === "BUTTON";
    const live = !interrupted && phase !== "connecting" && phase !== "saving";
    const run = (fn?: () => void) => { if (fn) { e.preventDefault(); fn(); } };
    if (key === "?") run(() => setShortcuts(true));
    else if (key === "f" && model.feedback.enabled) run(() => setPanel(!panelOpen));
    else if (key === "n" && model.main?.kind === "button" && (model.main.id === "next" || model.main.id === "debrief") && !model.main.disabled) run(model.main.onClick);
    else if (!live || !voice) {
      if (key === "r" && model.canRedo) run(handlers?.onRedo);
    } else if (key === "m") run(handlers?.onToggleMute);
    else if (key === "r" && model.canRedo) run(handlers?.onRedo);
    else if (key === "t") run(handlers?.onTypeInstead);
    else if (key === " " && !onButton && (phase === "mike-speaking" || phase === "your-turn")) run(handlers?.onInterrupt);
    else if (key === "Enter" && !onButton && phase === "listening") run(handlers?.onSendNow);
  };
  const keyRef = useRef(onKey);
  useLayoutEffect(() => { keyRef.current = onKey; });
  useEffect(() => {
    if (!props.globalKeys) return;
    const listener = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [props.globalKeys]);

  const label = variant === "english"
    ? t("feedback.turn", { n: th?.number ?? 0 })
    : t("session.panel.feedbackFor", { n: th?.number ?? 0 });

  /* Panel footer: Next question again (two ways to one action). On wide the island's is the primary, so this one is
   * secondary (one primary per view, V2.4 🟡); the sheet covers the island on mid / narrow, so there it is primary. */
  const footer = (() => {
    if (variant === "english" || !["p3", "p4", "edit"].includes(panelMode)) return null;
    const last = data.nextNumber === null;
    const onClick = last ? handlers?.onSeeDebrief : handlers?.onNext;
    if (!onClick) return null;
    return (
      <Button
        variant={wide || panelMode === "edit" ? "secondary" : "primary"}
        size={compact ? "lg" : "md"}
        fullWidth
        iconRight="arrowRight"
        disabled={interrupted}
        onClick={onClick}
      >
        {last ? t("session.panel.seeDebrief") : t("session.panel.nextQuestion")}
      </Button>
    );
  })();

  const body = (
    <PanelBody
      mode={panelMode}
      variant={variant}
      input={input}
      data={data}
      layerOrder={props.layerOrder}
      withChecks={props.withChecks}
      handlers={handlers}
      initialOpenHeard={props.initialOpenHeard}
      defaultShowAnswer={props.defaultShowAnswer}
      defaultStrongerOpen={props.defaultStrongerOpen}
    />
  );

  const sendLocked = Boolean(handlers?.onNext) && (phase === "between" || phase === "feedback" || phase === "editing" || phase === "rechecking" || phase === "preparing" || phase === "unavailable");
  /* Voice: Mike's own words are already the big question above, so subtitles only appear for the user's answer (and the thinking dots). */
  const afterAnswer = ["between", "feedback", "preparing", "unavailable", "editing", "rechecking"].includes(phase);
  const showCaptions = phase !== "connecting" && phase !== "saving" && (data.captions.length > 0 || thinking) && !(voice && (afterAnswer || (lastTurn?.speaker === "mike" && phase !== "thinking")));
  const showTips = props.firstTime && !interrupted && phase !== "saving";
  const showCaptionFooter = voice && (phase === "listening" || lastTurn?.speaker === "user");
  const showIsland = phase !== "saving" && !data.closing;
  const shifted = wide && panelOpen;

  return (
    <div
      ref={rootRef}
      className={s.root}
      data-layout={layout}
      data-panel={shifted ? "open" : undefined}
      data-motion-quiet={phase === "listening" ? "true" : undefined}
      data-review-id="Session"
      style={islandH ? ({ "--island-h": `${islandH}px` } as CSSProperties) : undefined}
      onKeyDown={props.globalKeys ? undefined : onKey}
    >
      <Banners overlay={overlay} notices={data.notices} handlers={handlers} />
      <div className={s.body}>
        <main className={s.stage} id="main" data-review-id="Session/Stage" data-review-section="Session · Stage" data-comment-target>
          <div className={s.scroll} ref={scrollRef}>
            <div className={`${s.flow} ${s.shift}`}>
              {interrupted ? (
                <Interrupted kind={overlay === "interrupted-voice" ? "voice" : "engine"} handlers={handlers} />
              ) : (
                <>
                  {phase === "connecting" && !data.question ? null : <QuestionBlock variant={variant} question={data.question} followUp={data.followUp} />}
                  <section className={s.orbBlock} aria-label={stage.label} data-review-id="Session/Orb" data-review-section="Session · Orb and status" data-comment-target>
                    <div className={s.orbBox}>
                      <Orb
                        state={stage.orb}
                        size={voice ? "md" : "sm"}
                        label={null}
                        hideLabel
                        level={props.voiceLevel}
                        getLevel={props.getVoiceLevel}
                        entering={entering}
                      />
                    </div>
                    <StatusPill state={stage.pill} label={stage.label} live={stage.live} sub={stage.sub} />
                  </section>
                  {showCaptions ? (
                    <div className={s.captionsBox} data-review-id="Session/Captions" data-review-section="Session · Captions" data-comment-target>
                      {voice ? (
                        <Captions
                          mode="subtitles"
                          turns={data.captions}
                          label={t("session.captions.subtitles")}
                          pending={thinking ? { name: t("session.interviewer"), label: t("session.captions.thinking") } : undefined}
                          footer={showCaptionFooter ? t("session.heard") : undefined}
                        />
                      ) : (
                        <div className={s.transcriptBox}>
                          <Captions
                            mode="transcript"
                            turns={transcriptTurns}
                            label={variant === "english" ? t("session.captions.transcriptEnglish") : t("session.captions.transcript", { n: th?.number ?? 1 })}
                            pending={thinking ? { name: t("session.interviewer"), label: t("session.captions.thinking") } : undefined}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                  {showTips ? <FirstTime input={input} pauseSec={data.pauseSec} /> : null}
                  {showSuggester && suggestOn ? <Suggester suggestion={data.suggestion} /> : null}
                </>
              )}
            </div>
          </div>
          {showIsland ? (
            <div className={`${s.islandWrap} ${s.shift}`} data-input={input}>
              <div ref={islandRef} className={s.islandBox} data-input={input} data-stacked={(props.island ?? (narrowIsland ? "stacked" : "inline")) === "stacked" || undefined}>
                <SessionIsland
                  key={input}
                  variant={variant}
                  input={input}
                  phase={phase}
                  muted={muted}
                  micLevel={props.micLevel}
                  getMicLevel={props.getMicLevel}
                  data={data}
                  handlers={handlers}
                  model={model}
                  interrupted={interrupted}
                  voiceDown={overlay === "interrupted-voice"}
                  noSpeech={overlay === "browser"}
                  layout={props.island ?? (narrowIsland ? "stacked" : "inline")}
                  panelOpen={panelOpen}
                  onToggleFeedback={() => setPanel(!panelOpen)}
                  feedbackRef={feedbackRef}
                  moreOpen={props.initialOverlay === "more"}
                  showSuggester={showSuggester}
                  suggestOn={suggestOn}
                  onSuggest={(on) => { setSuggestOn(on); handlers?.onSetSuggest?.(on); }}
                  onShortcuts={() => setShortcuts(true)}
                  onMicHelp={() => setMicHelp(true)}
                  sendLocked={sendLocked}
                  autoFocus={props.autoFocusComposer}
                  entering={entering && !morph}
                  morph={morph}
                />
              </div>
            </div>
          ) : null}
        </main>
        {wide && floating.mounted ? (
          <div
            className={`${s.float} ${floating.leaving ? s.floatOut : s.floatIn}`}
            data-review-id="Session/Panel"
            data-review-section="Session · Feedback panel"
            data-comment-target
          >
            <Panel
              as="aside"
              title={t("feedback.panel")}
              labelId="session-feedback-title"
              footer={footer}
              className={s.panel}
              actions={<IconButton icon="x" size="sm" label={t("session.island.feedbackHide")} onClick={() => setPanel(false, true)} />}
            >
              {body}
            </Panel>
          </div>
        ) : null}
      </div>
      {!wide ? (
        <Drawer
          open={panelOpen}
          onClose={() => setPanel(false, true)}
          side={layout === "mid" ? "right" : "bottom"}
          label={label}
          title={t("feedback.panel")}
          closeLabel={t("session.island.feedbackHide")}
          footer={footer}
          duration="slower"
        >
          <div data-review-id="Session/Panel" data-review-section="Session · Feedback panel" data-comment-target>{body}</div>
        </Drawer>
      ) : null}
      <MicHelpDialog open={overlay === "mic-help" || micHelp} handlers={{ ...handlers, onCloseMicHelp: () => { setMicHelp(false); handlers?.onCloseMicHelp?.(); } }} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} input={input} variant={variant} />
    </div>
  );
}
