/* The Session screen as a pure view (ds/screens/session.md §0): everything comes from props, nothing from audio, the
 * store or the network. The live container (screens/Session.tsx) maps the reducer to these props; the review page and
 * the stories pass fixtures.
 * Layout: the root is a size container named `session`. Wide (>= 1024): stage + a 440 feedback column. Mid (768-1023):
 * the panel becomes a right Drawer. Narrow (< 768): bottom sheet, compact top bar, sticky dock. Only the swap
 * column -> Drawer is done in JS (the Drawer is a portal); every other rule is a CSS container query. */
import { useEffect, useRef, useState } from "react";
import { Button, Drawer, Orb, Panel, scrollBehavior, StatusPill, TextShimmer, type OrbState, type StatusPillState } from "../../ds";
import { Captions } from "../../ds";
import { t } from "../../i18n";
import { Banners } from "./parts/Banners";
import { Dock } from "./parts/Dock";
import { FirstTime } from "./parts/FirstTime";
import { Interrupted } from "./parts/Interrupted";
import { MicHelpDialog } from "./parts/MicHelpDialog";
import { PanelBody, type ConcretePanel } from "./parts/PanelBody";
import { QuestionBlock } from "./parts/QuestionBlock";
import { Suggester } from "./parts/Suggester";
import { TopBar } from "./parts/TopBar";
import type { SessionViewProps } from "./types";
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

const SHEET_MODES = new Set<ConcretePanel>(["p3", "p4", "edit", "recheck"]);

export function SessionView(props: SessionViewProps) {
  const { variant, input, phase, overlay, muted, data, handlers, entering } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const layout = useSessionLayout(rootRef);
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

  /* Mid / narrow: the panel is a Drawer. It opens for the feedback phases and closes with the X; a new mode reopens it. */
  const sheetKey = `${data.thread?.number ?? 0}:${panelMode}`;
  const [closedKey, setClosedKey] = useState<string | null>(null);
  const sheetOpen = !props.sheetClosed && SHEET_MODES.has(panelMode) && closedKey !== sheetKey;

  const label = variant === "english"
    ? t("feedback.turn", { n: data.thread?.number ?? 0 })
    : t("session.panel.feedbackFor", { n: data.thread?.number ?? 0 });

  const footer = (() => {
    if (variant === "english" || !["p3", "p4", "edit"].includes(panelMode)) return null;
    const last = data.nextNumber === null;
    const onClick = last ? handlers?.onSeeDebrief : handlers?.onNext;
    if (!onClick) return null;
    return (
      <Button
        variant={panelMode === "edit" ? "secondary" : "primary"}
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
  const canRedo = data.answered || phase === "listening";
  const showSuggester = props.suggester === "on" && variant === "interview";
  /* Voice: Mike's own words are already the big question above, so subtitles only appear for the user's answer (and the thinking dots). */
  const afterAnswer = ["between", "feedback", "preparing", "unavailable", "editing", "rechecking"].includes(phase);
  const showCaptions = phase !== "connecting" && phase !== "saving" && (data.captions.length > 0 || thinking) && !(voice && (afterAnswer || (lastTurn?.speaker === "mike" && phase !== "thinking")));
  const showTips = props.firstTime && !interrupted && phase !== "saving";
  const showCaptionFooter = voice && (phase === "listening" || lastTurn?.speaker === "user");
  const reopen = layout !== "wide" && !sheetOpen && SHEET_MODES.has(panelMode) && !interrupted;
  const waiting = layout !== "wide" && (panelMode === "p2" || (panelMode === "recheck" && !sheetOpen));

  return (
    <div
      ref={rootRef}
      className={s.root}
      data-layout={layout}
      data-motion-quiet={phase === "listening" ? "true" : undefined}
      data-review-id="Session"
    >
      <TopBar variant={variant} input={input} data={data} handlers={handlers} compact={compact} entering={entering} voiceLocked />
      <Banners overlay={overlay} notices={data.notices} handlers={handlers} />
      <div className={s.body}>
        <main className={s.stage} id="main" data-review-id="Session/Stage" data-review-section="Session · Stage" data-comment-target>
          <div className={s.scroll} ref={scrollRef}>
            <div className={s.flow}>
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
                            label={variant === "english" ? t("session.captions.transcriptEnglish") : t("session.captions.transcript", { n: data.thread?.number ?? 1 })}
                            pending={thinking ? { name: t("session.interviewer"), label: t("session.captions.thinking") } : undefined}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                  {showTips ? <FirstTime input={input} pauseSec={data.pauseSec} /> : null}
                  {showSuggester ? <Suggester suggestion={data.suggestion} handlers={handlers} defaultOn={data.suggestOn ?? true} /> : null}
                </>
              )}
            </div>
          </div>
          {!interrupted && phase !== "saving" && !data.closing ? (
            <div className={s.dockWrap}>
              {reopen ? (
                <Button
                  className={s.reopen}
                  variant="secondary"
                  size="sm"
                  iconRight="chevronDown"
                  onClick={() => setClosedKey(null)}
                >
                  {label}
                </Button>
              ) : null}
              {waiting ? <TextShimmer as="p" status className={s.waiting}>{variant === "english" ? t("feedback.p2English") : t("feedback.p2", { n: data.thread?.number ?? 0 })}</TextShimmer> : null}
              <Dock
                input={input}
                phase={phase}
                muted={muted}
                micLevel={props.micLevel}
                getMicLevel={props.getMicLevel}
                canRedo={canRedo}
                micLive={voice && phase !== "connecting"}
                pauseSec={data.pauseSec}
                handlers={handlers}
                compact={compact}
                sendLocked={sendLocked}
                autoFocus={props.autoFocusComposer}
              />
            </div>
          ) : null}
        </main>
        {layout === "wide" ? (
          <div className={s.panelCol} data-review-id="Session/Panel" data-review-section="Session · Feedback panel" data-comment-target>
            <Panel as="aside" title={t("feedback.panel")} labelId="session-feedback-title" footer={footer} className={s.panel}>
              {body}
            </Panel>
          </div>
        ) : null}
      </div>
      {layout !== "wide" ? (
        <Drawer
          open={sheetOpen}
          onClose={() => setClosedKey(sheetKey)}
          side={layout === "mid" ? "right" : "bottom"}
          label={label}
          title={t("feedback.panel")}
          closeLabel={t("session.panel.hide")}
          footer={footer}
          duration="slower"
        >
          <div data-review-id="Session/Panel" data-review-section="Session · Feedback panel" data-comment-target>{body}</div>
        </Drawer>
      ) : null}
      <MicHelpDialog open={overlay === "mic-help"} handlers={handlers} />
    </div>
  );
}
