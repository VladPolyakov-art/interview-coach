/* Session route: the live container. It owns the socket / audio (useSession) and maps the reducer to the pure
 * SessionView (screens/session/SessionView.tsx); the review page and Storybook render the same view from fixtures.
 * Terminal states (failed, saving, not started from Practice) stay here as centred messages. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Callout, EmptyState, motionMemory } from "../ds";
import { t, tMaybe } from "../i18n";
import { useElapsed } from "../lib/hooks";
import { useApp } from "../lib/store";
import { selectThreads, type SessionState } from "../session/reducer";
import { useSession, type SessionConfig } from "../session/useSession";
import { SessionView } from "./session/SessionView";
import type { PanelMode, SessionData, SessionHandlers, SessionPhase, TranscriptTurn } from "./session/types";
import s from "./Session.module.css";

interface LocationState { config?: SessionConfig; title?: string }

export function SessionScreen() {
  const location = useLocation();
  // Coming back Home after a session replays the Home build-up (docs/motion.md 3.1).
  useEffect(() => () => { motionMemory.returnFromSession = true; }, []);
  const st = (location.state ?? {}) as LocationState;
  if (!st.config) {
    return (
      <main className={s.center} id="main">
        <EmptyState icon="info" title={t("session.missing")} actions={<Link to="/">{t("session.backHome")}</Link>} />
      </main>
    );
  }
  return <LiveSession config={st.config} title={st.title || t("session.title")} />;
}

const ENGINE_CODES = new Set(["not_installed", "not_running", "no_model", "not_configured", "unreachable", "unauthorized", "billing_required"]);
const STRICT = { 1: "gentle", 2: "standard", 3: "tough" } as const;

/** The reducer's flags -> the view's phase (ds/screens/session.md §4). The live app never shows "between": Mike goes on
 * by himself after an answer, so the feedback panel simply updates beside the stage. */
function phaseOf(state: SessionState, playing: boolean): SessionPhase {
  if (state.phase === "connecting" || (!state.ready && !state.transcript.length)) return "connecting";
  if (state.closing) return "between";
  if (state.recording) return "listening";
  if (playing || state.mikeTurnOpen) return "mike-speaking";
  if (state.awaitingReply) return "thinking";
  return "your-turn";
}

function LiveSession({ config, title }: { config: SessionConfig; title: string }) {
  const navigate = useNavigate();
  const { settings } = useApp();
  const { state, playing, muted, micError, actions, getLevel } = useSession(config);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [readyMsg, setReadyMsg] = useState("");
  const live = state.phase === "live";
  const voice = state.input !== "text";
  const english = state.mode === "english";

  useEffect(() => {
    if (live && startedAt === null) setStartedAt(Date.now());
  }, [live, startedAt]);
  const elapsed = useElapsed(startedAt, live || state.phase === "connecting");

  /* Done and saved: go to the debrief. */
  useEffect(() => {
    if (state.phase === "done" && state.savedSessionId) navigate(`/sessions/${state.savedSessionId}`, { replace: true });
  }, [state.phase, state.savedSessionId, navigate]);

  const threads = useMemo(() => selectThreads(state), [state]);
  const userTurns = state.transcript.filter((x) => x.speaker === "user").length;
  const questionIndex = state.threadOrder.indexOf(state.currentThreadId);
  const total = state.questions.length;
  const phase = phaseOf(state, playing);

  /* Announce when a thread's feedback is complete (polite live region, not while the user talks). */
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const th of threads) {
      if (th.records.length && !th.pendingIds.length && th.records.every((r) => r.complete) && !announced.current.has(th.key)) {
        announced.current.add(th.key);
        if (!state.recording) setReadyMsg(english ? t("feedback.turn", { n: th.number }) : t("feedback.ready", { n: th.number }));
      }
    }
  }, [threads, state.recording, english]);

  /* The tab says where you are (session.md §V2.3: the title left the screen for the More menu). */
  useEffect(() => {
    if (!live) return;
    const prev = document.title;
    const company = title.split(" · ")[0];
    const where = english ? t("session.turn", { n: userTurns + 1 }) : total && questionIndex >= 0 ? t("session.progress", { n: questionIndex + 1, total }) : "";
    document.title = [where, company].filter(Boolean).join(" · ");
    return () => { document.title = prev; };
  }, [live, title, english, userTurns, total, questionIndex]);

  /* ---------- terminal states ---------- */
  if (state.phase === "failed") {
    const code = state.fatal?.code ?? "session_failed";
    const engine = ENGINE_CODES.has(code);
    return (
      <main className={s.center} id="main">
        <Callout
          tone="error"
          live="alert"
          title={engine ? t("session.errors.engineTitle") : t("session.errors.title")}
          actions={engine ? <Link to="/settings/engine">{t("session.errors.fixEngine")}</Link> : <Link to="/">{t("session.backHome")}</Link>}
        >
          {engine
            ? [state.fatal?.message, state.fatal?.hint].filter(Boolean).join(" ")
            : code === "bad_start"
              ? t("session.errors.bad_start", { message: state.fatal?.message ?? "" })
              : tMaybe(`session.errors.${code}`, state.fatal?.message || t("session.errors.session_failed"))}
        </Callout>
        {engine ? <Link to="/">{t("session.backHome")}</Link> : null}
      </main>
    );
  }
  if (state.phase === "done" && !state.savedSessionId) {
    return (
      <main className={s.center} id="main">
        <EmptyState
          icon="info"
          title={t("session.orb.ended")}
          actions={<Button variant="primary" onClick={() => navigate("/")}>{t("session.backHome")}</Button>}
        >
          {state.saveError ? t("session.errors.saveFailed") + " " + state.saveError : t("session.notSaved")}
        </EmptyState>
      </main>
    );
  }
  if (state.phase === "ending" || state.phase === "saving" || state.phase === "debrief_pending" || state.phase === "done") {
    return (
      <main className={s.center} id="main">
        <p className="shimmer-text" role="status" aria-busy="true">
          {state.phase === "debrief_pending" || state.phase === "done" ? t("session.debriefPending") : t("session.saving")}
        </p>
        {state.saveError ? <Callout tone="error">{t("session.errors.saveFailed")} {state.saveError}</Callout> : null}
      </main>
    );
  }

  /* ---------- live: reducer -> view props ---------- */
  const start = config.start;
  const current = threads.at(-1) ?? null;
  const progress = english
    ? t("session.turn", { n: userTurns + 1 })
    : total && questionIndex >= 0 ? t("session.progress", { n: questionIndex + 1, total }) : "";
  const roundLabel = start.round_type ? t(`session.round.${start.round_type}`) : "";
  const strictLabel = start.strictness && STRICT[start.strictness as 1 | 2 | 3] ? t(`session.strict.${STRICT[start.strictness as 1 | 2 | 3]}`) : "";
  const sub = english ? undefined : [roundLabel, strictLabel].filter(Boolean).join(" · ") || undefined;

  /* The running transcript (D49): the whole dialogue, newest last. Mike's first line of each thread opens "Question N";
   * follow-ups get their badge. The interim words of the answer being recorded ride on a last user line. */
  const opened = new Set<string>();
  const transcript: TranscriptTurn[] = state.transcript.map((x) => {
    const mike = x.speaker !== "user";
    let question: number | undefined;
    if (mike && !english && x.kind === "question" && x.threadId && !opened.has(x.threadId)) {
      opened.add(x.threadId);
      const n = state.threadOrder.indexOf(x.threadId);
      question = n >= 0 ? n + 1 : undefined;
    }
    return {
      id: x.key,
      speaker: mike ? "mike" : "user",
      name: mike ? t("session.interviewer") : voice ? t("session.you") : t("session.captions.youTyped"),
      text: x.text,
      question,
      followUp: mike && x.kind === "follow_up" ? true : undefined,
    };
  });
  if (state.recording && state.preview) transcript.push({ id: "interim", speaker: "user", name: t("session.you"), text: "", interim: state.preview });

  const notices: NonNullable<SessionData["notices"]> = [];
  if (!state.recording) {
    if (micError) notices.push({ id: "mic", tone: "warning", text: tMaybe(`session.mic.${micError}`, t("session.mic.failed")) });
    if (state.notice) notices.push({ id: "notice", tone: "info", text: state.notice.message, onDismiss: actions.dismissNotice });
    if (state.error) notices.push({ id: "error", tone: "error", text: [state.error.message, state.error.hint].filter(Boolean).join(" "), onDismiss: actions.dismissError });
    if (state.closing) notices.push({ id: "closing", tone: "info", title: t("session.closing.title"), text: t("session.closing.body"), action: { label: t("session.closing.debrief"), onClick: actions.end } });
  }

  const suggestion = state.suggestion
    ? { status: state.suggestion.status, story: state.suggestion.story, answer: state.suggestion.answer, points: state.suggestion.points, message: state.suggestion.message }
    : undefined;

  const data: SessionData = {
    title,
    sub,
    badges: english && start.level ? [{ label: start.level, tone: "outline", icon: "language" }] : undefined,
    progress,
    step: !english && total && questionIndex >= 0 ? { n: questionIndex + 1, of: total } : undefined,
    elapsed,
    question: state.currentQuestionText,
    followUp: state.followUps.at(-1),
    transcript,
    answered: userTurns > 0,
    thread: current,
    earlier: threads.slice(0, -1).reverse(),
    nextNumber: null,
    suggestion,
    suggestOn: state.suggestOn,
    stronger: state.stronger,
    pauseSec: config.pauseSec,
    notices,
    closing: state.closing,
  };

  /* The panel keeps the latest feedback while Mike asks the next question; nothing new appears while the user speaks. */
  const panel: PanelMode = state.recording ? "p1"
    : !current ? (userTurns > 0 ? "p1" : "p0")
    : current.records.length ? "p3"
    : current.pendingIds.length ? "p2"
    : current.unavailable.length ? "p4" : "p0";

  const handlers: SessionHandlers = {
    onEnd: actions.end,
    onToggleMute: actions.toggleMute,
    onInterrupt: actions.interrupt,
    onSendNow: actions.sendNow,
    onRedo: actions.redo,
    onTypeInstead: actions.switchToText,
    onUseVoice: actions.switchToVoice,
    onSendText: actions.sendText,
    onFlag: actions.flag,
    onStronger: actions.stronger,
    onSetSuggest: actions.setSuggest,
    onSeeDebrief: actions.end,
  };

  return (
    <div className={s.screen}>
      <span className="visually-hidden" role="status" aria-live="polite">{readyMsg}</span>
      <SessionView
        variant={english ? "english" : "interview"}
        input={voice ? "voice" : "text"}
        phase={phase}
        overlay="none"
        firstTime={userTurns === 0 && !state.closing}
        muted={muted}
        micLevel={0}
        getMicLevel={getLevel}
        layerOrder={settings?.layer_order ?? "content-first"}
        withChecks={Boolean(state.stt?.word_confidence)}
        suggester={!english && state.suggesterAvailable && settings?.answer_suggester !== false ? "on" : "off"}
        data={data}
        handlers={handlers}
        panel={panel}
        entering
        autoFocusComposer
        globalKeys
      />
    </div>
  );
}
