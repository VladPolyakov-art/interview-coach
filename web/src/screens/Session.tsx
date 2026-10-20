/* Live interview / English session: Mike's stage on the left, one feedback panel per question thread on the right. */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Badge, Button, Callout, Card, EmptyState, Icon, IconButton, Orb, Segmented, Spinner, Textarea, Toggle, type OrbState,
} from "../ds";
import { t, tMaybe } from "../i18n";
import { ThreadFeedback } from "../components/Feedback";
import { formatClock } from "../lib/format";
import { useElapsed } from "../lib/hooks";
import { useApp } from "../lib/store";
import { selectOrb, selectThreads, type OrbView, type SessionState } from "../session/reducer";
import { useSession, type SessionConfig } from "../session/useSession";
import s from "./Session.module.css";

interface LocationState { config?: SessionConfig; title?: string }

export function SessionScreen() {
  const location = useLocation();
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

const ORB_STATE: Record<OrbView, OrbState> = {
  connecting: "idle", preparing: "thinking", listening: "listening", speaking: "speaking",
  thinking: "thinking", muted: "muted", your_turn: "idle", ended: "offline",
};

const ENGINE_CODES = new Set(["not_installed", "not_running", "no_model", "not_configured", "unreachable", "unauthorized", "billing_required"]);

function orbLabel(view: OrbView, input: SessionState["input"]) {
  switch (view) {
    case "connecting": return t("session.orb.connecting");
    case "preparing": return t("session.orb.preparing");
    case "listening": return t("session.orb.listening");
    case "speaking": return t("session.orb.speaking");
    case "thinking": return t("session.orb.thinking");
    case "muted": return t("session.orb.muted");
    case "ended": return t("session.orb.ended");
    default: return input === "text" ? t("session.orb.yourTurnText") : t("session.orb.yourTurnVoice");
  }
}

function LiveSession({ config, title }: { config: SessionConfig; title: string }) {
  const navigate = useNavigate();
  const { settings } = useApp();
  const { state, playing, muted, micError, actions } = useSession(config);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [readyMsg, setReadyMsg] = useState("");
  const live = state.phase === "live";
  const voice = state.input !== "text";

  useEffect(() => {
    if (live && startedAt === null) setStartedAt(Date.now());
  }, [live, startedAt]);
  const elapsed = useElapsed(startedAt, live || state.phase === "connecting");

  /* Done and saved: go to the debrief. */
  useEffect(() => {
    if (state.phase === "done" && state.savedSessionId) navigate(`/sessions/${state.savedSessionId}`, { replace: true });
  }, [state.phase, state.savedSessionId, navigate]);

  const threads = useMemo(() => selectThreads(state), [state]);
  const view = selectOrb(state, { playing, muted });
  const userTurns = state.transcript.filter((x) => x.speaker === "user").length;
  const questionIndex = state.threadOrder.indexOf(state.currentThreadId);
  const total = state.questions.length;

  /* Announce when a thread's feedback is complete (polite live region, not while the user talks). */
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const th of threads) {
      if (th.records.length && !th.pendingIds.length && th.records.every((r) => r.complete) && !announced.current.has(th.key)) {
        announced.current.add(th.key);
        if (!state.recording) setReadyMsg(state.mode === "english" ? t("feedback.turn", { n: th.number }) : t("feedback.ready", { n: th.number }));
      }
    }
  }, [threads, state.recording, state.mode]);

  /* Keyboard: M mutes, Enter sends a voice answer now (outside text fields). */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)) return;
      if (!live || !voice) return;
      if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); actions.toggleMute(); }
      else if (e.key === "Enter" && state.recording && target?.tagName !== "BUTTON") { e.preventDefault(); actions.sendNow(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, voice, state.recording, actions]);

  const sendDraft = () => {
    if (actions.sendText(draft)) setDraft("");
  };
  const onDraftKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) sendDraft();
    }
  };
  const busy = state.awaitingReply || state.mikeTurnOpen;
  const canSend = live && !state.closing && !busy && draft.trim().length > 0;

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
          actions={<><Button variant="primary" onClick={() => navigate("/")}>{t("session.backHome")}</Button></>}
        >
          {state.saveError ? t("session.errors.saveFailed") + " " + state.saveError : t("session.notSaved")}
        </EmptyState>
      </main>
    );
  }
  if (state.phase === "ending" || state.phase === "saving" || state.phase === "debrief_pending" || state.phase === "done") {
    return (
      <main className={s.center} id="main">
        <Spinner size="lg" label={state.phase === "debrief_pending" || state.phase === "done" ? t("session.debriefPending") : t("session.saving")} />
        {state.saveError ? <Callout tone="error">{t("session.errors.saveFailed")} {state.saveError}</Callout> : null}
      </main>
    );
  }

  /* ---------- live ---------- */
  const progress = state.mode === "english"
    ? t("session.turn", { n: userTurns + 1 })
    : total && questionIndex >= 0 ? t("session.progress", { n: questionIndex + 1, total }) : "";
  const showSuggester = state.mode === "interview" && state.suggesterAvailable && settings?.answer_suggester !== false;

  return (
    <div className={s.screen}>
      <header className={s.topbar}>
        <div className={s.titleBlock}>
          <span className={s.title}>{title}</span>
          {progress ? <span className={s.progress}>{progress}</span> : null}
        </div>
        <span className={s.timer} aria-label={`${t("session.elapsed")}: ${formatClock(elapsed)}`} role="timer">
          <Icon name="clock" size="sm" />
          <span aria-hidden="true">{formatClock(elapsed)}</span>
        </span>
        <div className={s.modeSwitch}>
          <Segmented
            label={t("session.modeSwitch")}
            hideLabel
            value={voice ? "voice" : "text"}
            onChange={(v) => { if (v === "text" && voice) actions.switchToText(); }}
            options={[
              { value: "voice", label: t("session.voice"), icon: "mic", disabled: !voice, title: !voice ? t("session.voiceNeedsNew") : undefined },
              { value: "text", label: t("session.text"), icon: "keyboard" },
            ]}
          />
        </div>
        <div className={s.topActions}>
          <Button variant="secondary" icon="stop" onClick={actions.end} disabled={!live && state.phase !== "connecting"}>
            {state.mode === "english" ? t("session.endPractice") : t("session.end")}
          </Button>
        </div>
      </header>

      <div className={s.body}>
        <main className={s.stage} id="main">
          <div className={s.orbArea}>
            <Orb
              state={ORB_STATE[view]}
              size={voice ? "md" : "sm"}
              label={orbLabel(view, state.input)}
              sub={muted && voice ? <Badge tone="warning" icon="micOff">{t("session.controls.unmute")} · M</Badge> : undefined}
            />
            {state.currentQuestionText ? (
              <>
                <div className={s.questionLabel}>
                  <Badge tone="live" dot>{t("session.interviewer")}</Badge>
                  {state.followUps.length ? <Badge tone="outline">{t("session.followUp")}</Badge> : null}
                </div>
                <p className={s.question}>{state.followUps.at(-1) || state.currentQuestionText}</p>
              </>
            ) : null}
          </div>

          <Alerts state={state} micError={micError} onDismissNotice={actions.dismissNotice} onDismissError={actions.dismissError} />

          {state.closing ? (
            <Callout
              tone="success"
              title={t("session.closing.title")}
              actions={<Button variant="primary" iconRight="arrowRight" onClick={actions.end}>{t("session.closing.debrief")}</Button>}
            >
              {t("session.closing.body")}
            </Callout>
          ) : null}

          {userTurns === 0 && !state.closing ? <FirstTime voice={voice} /> : null}

          <Transcript state={state} />

          {!state.closing ? (
            voice ? (
              <VoiceControls
                state={state}
                muted={muted}
                playing={playing}
                pauseSec={config.pauseSec}
                onMute={actions.toggleMute}
                onRedo={actions.redo}
                onSendNow={actions.sendNow}
                onInterrupt={actions.interrupt}
                onTypeInstead={actions.switchToText}
              />
            ) : (
              <div className={s.composer}>
                <div className={s.composerRow}>
                  <Textarea
                    label={t("session.input.label")}
                    hideLabel
                    placeholder={t("session.input.placeholder")}
                    value={draft}
                    rows={3}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onDraftKey}
                    disabled={!live}
                    autoFocus
                  />
                  <Button variant="primary" icon="send" onClick={sendDraft} disabled={!canSend}>{t("session.input.send")}</Button>
                </div>
                <span className={s.hint}>{t("session.input.hint")}</span>
              </div>
            )
          ) : null}

          {showSuggester ? (
            <Suggester state={state} onToggle={actions.setSuggest} />
          ) : null}

          {state.warnings.length ? (
            <details className={s.warnings}>
              <summary>{t("session.warnings")}</summary>
              <ul>{state.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </details>
          ) : null}
        </main>

        <aside className={s.panel} aria-labelledby="feedback-title">
          <div className={s.panelInner}>
            <h2 id="feedback-title" className={s.panelTitle}>{t("feedback.panel")}</h2>
            <span className="visually-hidden" role="status" aria-live="polite">{readyMsg}</span>
            <FeedbackPanel state={state} threads={threads} layerOrder={settings?.layer_order ?? "content-first"}
              onFlag={actions.flag} onStronger={actions.stronger} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Alerts({ state, micError, onDismissNotice, onDismissError }: {
  state: SessionState; micError: string | null; onDismissNotice: () => void; onDismissError: () => void;
}) {
  const items = [];
  if (micError) {
    items.push(<Callout key="mic" tone="warning" live="status">{tMaybe(`session.mic.${micError}`, t("session.mic.failed"))}</Callout>);
  }
  if (state.notice) {
    items.push(
      <Callout key="notice" tone="info" live="status"
        actions={<Button variant="ghost" size="sm" onClick={onDismissNotice}>{t("session.errors.dismiss")}</Button>}>
        {state.notice.message}
      </Callout>,
    );
  }
  if (state.error) {
    items.push(
      <Callout key="error" tone="error" live="alert"
        actions={<Button variant="ghost" size="sm" onClick={onDismissError}>{t("session.errors.dismiss")}</Button>}>
        {[state.error.message, state.error.hint].filter(Boolean).join(" ")}
      </Callout>,
    );
  }
  return items.length ? <div className={s.alerts}>{items}</div> : null;
}

function FirstTime({ voice }: { voice: boolean }) {
  return (
    <Card tone="subtle" padding="sm" className={s.firstTime}>
      <strong>{t("session.firstTime.title")}</strong>
      <ol>
        {voice ? (
          <><li>{t("session.firstTime.voice1")}</li><li>{t("session.firstTime.voice2")}</li><li>{t("session.firstTime.voice3")}</li></>
        ) : (
          <><li>{t("session.firstTime.text1")}</li><li>{t("session.firstTime.text2")}</li><li>{t("session.firstTime.text3")}</li></>
        )}
      </ol>
    </Card>
  );
}

function Transcript({ state }: { state: SessionState }) {
  const ref = useRef<HTMLOListElement>(null);
  const count = state.transcript.length;
  const last = state.transcript.at(-1)?.text.length ?? 0;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, last, state.preview]);
  const hasLines = count > 0;
  // Keep the newest line in view when the layout reflows (rotation, window resize).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { el.scrollTop = el.scrollHeight; });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasLines]);
  if (!count && !state.preview) return null;
  return (
    <section aria-labelledby="transcript-title">
      <h2 id="transcript-title" className="visually-hidden">{t("session.transcript")}</h2>
      <ol className={s.log} ref={ref}>
        {state.transcript.map((x) => (
          <li key={x.key} className={`${s.line} ${x.speaker === "user" ? s.lineUser : s.lineModel}`}>
            <span className={s.speaker}>
              {x.speaker === "user" ? t("session.you") : t("session.interviewer")}
              {x.kind === "follow_up" ? <Badge tone="outline">{t("session.followUp")}</Badge> : null}
            </span>
            <span className={s.bubble}>
              {x.text}
              {x.interrupted ? <span className={s.cut}> {t("session.cutOff")}</span> : null}
            </span>
          </li>
        ))}
        {state.recording && state.preview ? (
          <li className={`${s.line} ${s.lineUser}`}>
            <span className={s.speaker}>{t("session.you")}</span>
            <span className={`${s.bubble} ${s.preview}`}>{state.preview}</span>
            <span className={s.previewHint}>{t("session.heard")}</span>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

function VoiceControls({ state, muted, playing, pauseSec, onMute, onRedo, onSendNow, onInterrupt, onTypeInstead }: {
  state: SessionState; muted: boolean; playing: boolean; pauseSec: number;
  onMute: () => void; onRedo: () => void; onSendNow: () => void; onInterrupt: () => void; onTypeInstead: () => void;
}) {
  const mikeTalking = playing || state.mikeTurnOpen;
  const answered = state.transcript.some((x) => x.speaker === "user");
  return (
    <div className={s.controls} role="group" aria-label={t("session.controls.label")}>
      <div className={s.controlRow}>
        <IconButton
          icon={muted ? "micOff" : "mic"}
          label={muted ? t("session.controls.unmute") : t("session.controls.mute")}
          pressed={muted}
          outlined
          onClick={onMute}
        />
        {mikeTalking ? (
          <Button variant="secondary" icon="hand" onClick={onInterrupt}>{t("session.controls.interrupt")}</Button>
        ) : state.recording ? (
          <Button variant="primary" icon="send" onClick={onSendNow}>{t("session.controls.sendNow")}</Button>
        ) : (
          <Button variant="secondary" icon="mic" onClick={onInterrupt} disabled={muted}>{t("session.controls.talk")}</Button>
        )}
        <Button variant="ghost" icon="redo" onClick={onRedo} disabled={!answered && !state.recording}>{t("session.controls.redo")}</Button>
        <Button variant="ghost" icon="keyboard" onClick={onTypeInstead}>{t("session.controls.typeInstead")}</Button>
      </div>
      <p className={s.help}>
        {pauseSec > 0 ? t("session.controls.pauseHelp", { sec: pauseSec }) : t("session.controls.manualHelp")}
      </p>
    </div>
  );
}

function Suggester({ state, onToggle }: { state: SessionState; onToggle: (on: boolean) => void }) {
  const sug = state.suggestion;
  return (
    <Card tone="subtle" padding="sm" className={s.suggest}>
      <Toggle label={t("session.suggest.toggle")} description={t("session.suggest.practiceOnly")} checked={state.suggestOn} onChange={onToggle} />
      {state.suggestOn && sug ? (
        <div className={s.suggestBody} aria-live="polite">
          <strong>{t("session.suggest.title")}</strong>
          {sug.status === "pending" ? <Spinner size="sm" label={t("session.suggest.pending")} /> : null}
          {sug.status === "unavailable" ? <span>{sug.message}</span> : null}
          {sug.status === "ready" ? (
            <>
              {sug.story ? <span>{t("session.suggest.story", { story: sug.story })}</span> : null}
              {sug.answer ? <p>{sug.answer}</p> : null}
              {sug.points?.length ? (
                <>
                  <span>{t("session.suggest.points")}</span>
                  <ul>{sug.points.map((p) => <li key={p}>{p}</li>)}</ul>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function FeedbackPanel({ state, threads, layerOrder, onFlag, onStronger }: {
  state: SessionState;
  threads: ReturnType<typeof selectThreads>;
  layerOrder: "content-first" | "delivery-first";
  onFlag: (feedbackId: string, flagId: string, action: "confirm" | "dismiss" | "restore") => void;
  onStronger: (feedbackId: string) => void;
}) {
  // Calm rule: nothing new appears while the user is speaking.
  if (state.recording) return <p className={s.panelEmpty} role="status">{t("feedback.p1")}</p>;
  if (!threads.length) {
    return <p className={s.panelEmpty}>{state.mode === "english" ? t("feedback.p0English") : t("feedback.p0")}</p>;
  }
  const current = threads[threads.length - 1]!;
  const earlier = threads.slice(0, -1).reverse();
  return (
    <>
      <ThreadFeedback thread={current} mode={state.mode} layerOrder={layerOrder} live
        onFlag={onFlag} onStronger={onStronger} stronger={state.stronger} headingLevel={3} />
      {earlier.length ? (
        <details className={s.earlier}>
          <summary>{state.mode === "english" ? t("feedback.earlierEnglish") : t("feedback.earlier")} ({earlier.length})</summary>
          <div className={s.earlierList}>
            {earlier.map((th) => (
              <ThreadFeedback key={th.key} thread={th} mode={state.mode} layerOrder={layerOrder} live
                onFlag={onFlag} onStronger={onStronger} stronger={state.stronger} headingLevel={3} />
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
