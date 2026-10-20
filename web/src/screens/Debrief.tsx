/* Debrief of a saved session (REST): verdict, weak spots, per-thread feedback (no level labels: live panel only), transcript. */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Callout, Card, EmptyState, Icon, Spinner } from "../ds";
import { t, tMaybe, tp } from "../i18n";
import { ThreadFeedback, type FlagAction } from "../components/Feedback";
import { Page, Section } from "../components/Page";
import { api } from "../lib/api";
import { formatDateTime, formatDuration } from "../lib/format";
import { useInterval, useLoad } from "../lib/hooks";
import { errorMessage, useApp } from "../lib/store";
import type { FeedbackRecord, SessionRecord } from "../lib/types";
import type { StrongerState, Thread } from "../session/reducer";
import s from "./Debrief.module.css";

/** Group saved feedback the same way the live panel does: one thread per main question (English: per turn). */
export function threadsFromRecord(record: SessionRecord): Thread[] {
  const map = new Map<string, Thread>();
  const order: string[] = [];
  const qIndex = (id: string) => record.questions.findIndex((q) => q.id === id);
  for (const fb of record.feedback) {
    const key = record.mode === "english" ? `t:${fb.id}` : fb.question_id || "general";
    let th = map.get(key);
    if (!th) {
      const q = record.questions.find((x) => x.id === key);
      th = { key, number: 0, question: q?.text ?? fb.question, records: [], pendingIds: [], unavailable: [] };
      map.set(key, th);
      order.push(key);
    }
    th.records.push(fb);
  }
  const threads = order.map((k) => map.get(k)!);
  threads.forEach((th, i) => {
    const idx = record.mode === "english" ? -1 : qIndex(th.key);
    th.number = idx >= 0 ? idx + 1 : i + 1;
  });
  return threads;
}

/** Server evidence refers to answers as "q1", "q2"…; show them as "Question 1". */
function evidenceLabel(ref: string) {
  const m = /^q(\d+)$/i.exec(ref);
  return m ? t("feedback.question", { n: Number(m[1]) }) : ref;
}

export function DebriefScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { settings } = useApp();
  const session = useLoad(() => api.session(id), [id]);
  const [stronger, setStronger] = useState<Record<string, StrongerState>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [actionError, setActionError] = useState("");
  const [polls, setPolls] = useState(0);
  const record = session.data;

  // The debrief may still be being written right after a session: poll for up to a minute.
  const waiting = Boolean(record && !record.debrief && record.feedback.length && polls < 20);
  useInterval(() => {
    setPolls((n) => n + 1);
    api.session(id).then((r) => session.setData(r)).catch(() => {});
  }, 3000, waiting);
  useEffect(() => { setPolls(0); }, [id]);

  const threads = useMemo(() => (record ? threadsFromRecord(record) : []), [record]);

  if (session.loading && !record) return <Page title={t("debrief.title")}><Spinner label={t("debrief.loading")} /></Page>;
  if (session.error || !record) {
    return (
      <Page title={t("debrief.title")}>
        <EmptyState icon="info" title={t("debrief.notFound")} actions={<Link to="/history">{t("debrief.history")}</Link>} />
      </Page>
    );
  }

  const replaceFeedback = (fb: FeedbackRecord) =>
    session.setData({ ...record, feedback: record.feedback.map((x) => (x.id === fb.id ? fb : x)) });

  const onFlag = (feedbackId: string, flagId: string, action: FlagAction) => {
    setActionError("");
    api.sessionFlag(record.id, flagId, feedbackId, action)
      .then(({ language }) => {
        const fb = record.feedback.find((x) => x.id === feedbackId);
        if (fb) replaceFeedback({ ...fb, layers: { ...fb.layers, language } });
      })
      .catch((e: unknown) => setActionError(errorMessage(e)));
  };
  const onStronger = (feedbackId: string) => {
    setStronger((m) => ({ ...m, [feedbackId]: { status: "loading" } }));
    api.sessionStronger(record.id, feedbackId)
      .then((v) => setStronger((m) => ({ ...m, [feedbackId]: { status: "ready", ...v } })))
      .catch((e: unknown) => setStronger((m) => ({ ...m, [feedbackId]: { status: "unavailable", message: errorMessage(e) } })));
  };
  const rerun = () => {
    setRerunning(true);
    setActionError("");
    api.rerunDebrief(record.id)
      .then((debrief) => session.setData({ ...record, debrief }))
      .catch((e: unknown) => setActionError(errorMessage(e)))
      .finally(() => setRerunning(false));
  };
  const remove = async () => {
    try {
      await api.deleteSession(record.id);
      navigate("/history", { replace: true, state: { notice: t("debrief.deleted") } });
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const answers = record.stats?.answers ?? record.feedback.filter((f) => f.answer_kind !== "follow_up").length;
  const meta = t("debrief.meta", {
    date: formatDateTime(record.started_at),
    duration: formatDuration(record.duration_s),
    answers: tp("debrief.answers", answers),
  });
  const d = record.debrief;
  const layerOrder = settings?.layer_order ?? "content-first";

  return (
    <Page
      title={record.title || t("debrief.title")}
      sub={meta}
      actions={
        <>
          <Button variant="primary" icon="practice" onClick={() => navigate(record.mode === "english" ? "/?track=english" : "/")}>
            {t("debrief.practiceAgain")}
          </Button>
          <a href={api.sessionMarkdownUrl(record.id)} download>
            <Icon name="download" size="sm" /> {t("debrief.download")}
          </a>
        </>
      }
    >
      {actionError ? <Callout tone="error" live="alert">{actionError}</Callout> : null}

      <Section title={t("debrief.verdict")} id="verdict">
        {d ? (
          <Card className={s.block}>
            <p className={s.verdict}>{d.verdict}</p>
            {d.too_short && !d.verdict ? <Callout tone="info">{t("debrief.tooShort")}</Callout> : null}
            {d.source === "template" && !d.too_short ? (
              <Callout tone="warning" actions={<Button size="sm" variant="secondary" icon="refresh" loading={rerunning} onClick={rerun}>{rerunning ? t("debrief.rerunning") : t("debrief.rerun")}</Button>}>
                {t("debrief.template")}
              </Callout>
            ) : null}
          </Card>
        ) : waiting ? (
          <Spinner label={t("debrief.pending")} />
        ) : record.feedback.length ? (
          <Button variant="secondary" icon="refresh" loading={rerunning} onClick={rerun}>{t("debrief.rerun")}</Button>
        ) : (
          <p className={s.meta}>{t("debrief.noFeedback")}</p>
        )}
      </Section>

      {d ? (
        <div className={s.grid}>
          <Card className={s.block}>
            <h3 className={s.blockTitle}><Icon name="alert" size="sm" />{t("debrief.weakSpots")}</h3>
            <ul className={s.spots}>
              {d.weak_spots.map((w) => (
                <li key={`${w.layer}-${w.tag}`} className={s.spot}>
                  <span className={s.spotHead}>
                    <Badge tone={w.layer} icon={w.layer}>{t(`feedback.layer.${w.layer}`)}</Badge>
                    <span>{w.text || tMaybe(`feedback.tag.${w.tag}`, w.tag.replace(/_/g, " "))}</span>
                  </span>
                  {w.evidence?.length ? <span className={s.evidence}>{t("debrief.evidence", { list: w.evidence.map(evidenceLabel).join(", ") })}</span> : null}
                </li>
              ))}
            </ul>
          </Card>
          <Card className={s.block}>
            {d.strength ? (
              <>
                <h3 className={s.blockTitle}><Icon name="check" size="sm" />{t("debrief.strength")}</h3>
                <p>{d.strength}</p>
              </>
            ) : null}
            <h3 className={s.blockTitle}><Icon name="arrowRight" size="sm" />{t("debrief.nextStep")}</h3>
            <p>{d.next_step}</p>
          </Card>
        </div>
      ) : null}

      <Section title={t("debrief.answers")} id="answers">
        {threads.length ? (
          <div className={s.threads}>
            {threads.map((th) => (
              <Card key={th.key}>
                <ThreadFeedback thread={th} mode={record.mode} layerOrder={layerOrder} live={false}
                  onFlag={onFlag} onStronger={onStronger} stronger={stronger} headingLevel={3} />
              </Card>
            ))}
          </div>
        ) : (
          <p className={s.meta}>{t("debrief.noFeedback")}</p>
        )}
      </Section>

      <Section
        title={t("debrief.transcript")}
        id="transcript"
        action={
          <Button variant="link" size="sm" aria-expanded={showTranscript} aria-controls="transcript-list" onClick={() => setShowTranscript(!showTranscript)}>
            {showTranscript ? t("debrief.hideTranscript") : t("debrief.showTranscript")}
          </Button>
        }
      >
        {showTranscript ? (
          <ol className={s.transcript} id="transcript-list">
            {record.transcript.map((turn, i) => (
              <li key={i} className={s.turn}>
                <span className={s.who}>{turn.role === "user" ? t("session.you") : t("session.interviewer")}</span>
                <span className={s.text}>{turn.text}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>

      <div className={s.actions}>
        <Link to="/history">{t("debrief.history")}</Link>
        <Button variant="ghost" icon="trash" onClick={() => void remove()}>{t("debrief.delete")}</Button>
      </div>
    </Page>
  );
}
