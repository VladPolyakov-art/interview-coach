/* Feedback for one question thread (owner rule: one panel per thread): content / language / delivery blocks in the
 * configured order, flag actions, and the stronger answer. Used live in the session and read-only-ish in the debrief.
 * All model and user text is rendered as React text nodes (never as HTML). */
import { useId, useState, type ReactNode } from "react";
import { Badge, Button, Callout, Icon, Spinner } from "../ds";
import { t, tMaybe, tp } from "../i18n";
import { formatClock } from "../lib/format";
import type {
  ContentLayer, DeliveryLayer, FeedbackRecord, LanguageItem, LanguageLayer, LayerName, LayerOrder, LowConfWord,
} from "../lib/types";
import { languageCounts, type StrongerState, type Thread } from "../session/reducer";
import s from "./Feedback.module.css";

export type FlagAction = "confirm" | "dismiss" | "restore";

export interface ThreadFeedbackProps {
  thread: Thread;
  mode: "interview" | "english";
  layerOrder: LayerOrder;
  /** Live panel: shows "B1 grammar" level labels (owner rule: only in the live panel). */
  live: boolean;
  onFlag?: (feedbackId: string, flagId: string, action: FlagAction) => void;
  onStronger?: (feedbackId: string) => void;
  stronger?: Record<string, StrongerState>;
  headingRef?: React.Ref<HTMLHeadingElement>;
  headingLevel?: 2 | 3;
}

export function layerSequence(order: LayerOrder, mode: "interview" | "english"): LayerName[] {
  if (mode === "english") return ["language"];
  return order === "delivery-first" ? ["delivery", "language", "content"] : ["content", "language", "delivery"];
}

const ICON: Record<LayerName, "content" | "language" | "delivery"> = { content: "content", language: "language", delivery: "delivery" };

function isPending(record: FeedbackRecord, layer: LayerName) {
  return !record.layers[layer] && !record.complete;
}

function fixCount(records: FeedbackRecord[], layer: "content" | "delivery") {
  let fixes = 0;
  let pending = false;
  let any = false;
  for (const r of records) {
    const l = r.layers[layer];
    if (!l) { if (!r.complete) pending = true; continue; }
    if (l.status === "unavailable") continue;
    any = true;
    if (l.status === "fix") fixes++;
  }
  return { fixes, pending, any };
}

function SummaryRow({ records, mode, order }: { records: FeedbackRecord[]; mode: "interview" | "english"; order: LayerOrder }) {
  const items = layerSequence(order, mode).map((layer) => {
    let label: string;
    if (layer === "language") {
      const { counted, toCheck } = languageCounts(records);
      const pending = records.some((r) => isPending(r, "language"));
      label = pending && !counted ? t("feedback.count.pending")
        : counted ? tp("feedback.count.phrasings", counted) : t("feedback.count.good");
      if (toCheck) label += ` ${t("feedback.count.toCheck", { n: toCheck })}`;
    } else {
      const c = fixCount(records, layer);
      label = c.fixes ? tp("feedback.count.fix", c.fixes) : c.pending ? t("feedback.count.pending") : c.any ? t("feedback.count.good") : t("feedback.count.na");
    }
    return (
      <li key={layer}>
        <Badge tone={layer} icon={ICON[layer]}>{t(`feedback.layer.${layer}`)} · {label}</Badge>
      </li>
    );
  });
  return <ul className={s.summary} aria-label={t("feedback.summary")}>{items}</ul>;
}

/** The user's answer with low-confidence words underlined (when the recogniser gave word confidence). */
function AnswerText({ text, low }: { text: string; low?: LowConfWord[] }) {
  if (!low?.length) return <p>{text}</p>;
  const lowSet = new Set(low.map((w) => w.w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "")));
  const parts = text.split(/(\s+)/);
  return (
    <p>
      {parts.map((part, i) => {
        const bare = part.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
        return bare && lowSet.has(bare) ? <span key={i} className={s.lowConf} title={t("feedback.language.mayBeMisheard")}>{part}</span> : part;
      })}
    </p>
  );
}

function answerLabel(r: FeedbackRecord) {
  if (r.answer_kind === "follow_up") return t("feedback.followUpAnswer");
  if (r.answer_kind === "turn") return t("feedback.turnAnswer");
  return t("feedback.mainAnswer");
}

export function ThreadFeedback({ thread, mode, layerOrder, live, onFlag, onStronger, stronger, headingRef, headingLevel = 2 }: ThreadFeedbackProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const answersId = useId();
  const H = headingLevel === 2 ? "h2" : "h3";
  const records = thread.records;
  const followUps = records.filter((r) => r.answer_kind === "follow_up").length;
  const voiced = records.some((r) => r.source === "voice");
  const title = mode === "english" ? t("feedback.turn", { n: thread.number }) : t("feedback.question", { n: thread.number || "" });

  if (!records.length) {
    return (
      <div className={s.thread}>
        <div className={s.head}>
          <H className={s.headTitle} ref={headingRef} tabIndex={-1}>{title}</H>
          {thread.question ? <p className={s.question}>{thread.question}</p> : null}
        </div>
        {thread.pendingIds.length ? (
          <p className={s.pending} role="status">
            {mode === "english" ? t("feedback.p2English") : t("feedback.p2", { n: thread.number })}
          </p>
        ) : (
          <Callout tone="info">{t("feedback.p4")}</Callout>
        )}
      </div>
    );
  }

  const sub = mode === "english" ? "" : followUps === 0 ? tp("feedback.answers", 1) : followUps === 1 ? t("feedback.answersOneFollowUp") : tp("feedback.answers", followUps);
  const main = records.find((r) => r.answer_kind === "main") ?? records[0]!;

  return (
    <div className={s.thread}>
      <div className={s.head}>
        <H className={s.headTitle} ref={headingRef} tabIndex={-1}>{title}{sub ? <span className={s.headSub}> · {sub}</span> : null}</H>
        {thread.question ? <p className={s.question}>{thread.question}</p> : null}
      </div>
      <SummaryRow records={records} mode={mode} order={layerOrder} />
      <Button variant="link" size="sm" className={s.answerToggle} aria-expanded={showAnswer} aria-controls={answersId} onClick={() => setShowAnswer(!showAnswer)}>
        {showAnswer ? t("feedback.hideAnswer") : voiced ? t("feedback.showAnswer") : t("feedback.showTyped")}
      </Button>
      {showAnswer ? (
        <div id={answersId} className={s.answers}>
          {records.map((r) => (
            <div key={r.id}>
              <div className={s.answerLabel}>{answerLabel(r)}</div>
              <AnswerText text={r.answer} low={r.heard_as_words} />
            </div>
          ))}
        </div>
      ) : null}
      {layerSequence(layerOrder, mode).map((layer) => (
        <LayerBlock key={layer} layer={layer} records={records} live={live} onFlag={onFlag} />
      ))}
      {thread.unavailable.length ? <Callout tone="info">{t("feedback.p4")}</Callout> : null}
      {mode === "interview" && onStronger && main.complete ? (
        <Stronger record={main} state={stronger?.[main.id]} onRequest={() => onStronger(main.id)} />
      ) : null}
    </div>
  );
}

function LayerBlock({ layer, records, live, onFlag }: { layer: LayerName; records: FeedbackRecord[]; live: boolean; onFlag?: ThreadFeedbackProps["onFlag"] }) {
  const multi = records.length > 1;
  let count: ReactNode = null;
  if (layer === "language") {
    const { counted, toCheck } = languageCounts(records);
    count = counted || toCheck
      ? `${counted ? tp("feedback.count.phrasings", counted) : ""}${toCheck ? ` ${t("feedback.count.toCheck", { n: toCheck })}` : ""}`.trim()
      : null;
  } else {
    const c = fixCount(records, layer);
    count = c.fixes ? tp("feedback.count.fix", c.fixes) : null;
  }
  return (
    <section className={`${s.block} ${s[layer]}`} aria-label={t(`feedback.layer.${layer}`)}>
      <div className={s.blockHead}>
        <h4 className={s.blockTitle}><Icon name={ICON[layer]} size="sm" />{t(`feedback.layer.${layer}`)}{count ? ` · ${count}` : ""}</h4>
      </div>
      {records.map((r) => (
        <div key={r.id} className={s.sub}>
          {multi ? <span className={s.subLabel}>{answerLabel(r)}</span> : null}
          <LayerBody layer={layer} record={r} live={live} onFlag={onFlag} />
        </div>
      ))}
    </section>
  );
}

function LayerBody({ layer, record, live, onFlag }: { layer: LayerName; record: FeedbackRecord; live: boolean; onFlag?: ThreadFeedbackProps["onFlag"] }) {
  const data = record.layers[layer];
  if (!data) {
    return record.complete ? <p className={s.ok}>{t("feedback.layerUnavailable")}</p> : <p className={s.pending}>{t("feedback.stillChecking")}</p>;
  }
  if (data.status === "unavailable") return <p className={s.ok}>{t("feedback.layerUnavailable")}</p>;
  if (layer === "content") return <ContentBody data={data as ContentLayer} />;
  if (layer === "delivery") return <DeliveryBody data={data as DeliveryLayer} />;
  return <LanguageBody data={data as LanguageLayer} record={record} live={live} onFlag={onFlag} />;
}

function ContentBody({ data }: { data: ContentLayer }) {
  return (
    <>
      {data.status === "fix" && data.fix ? <p className={s.fix}>{data.fix}</p> : <p className={s.ok}>{t("feedback.content.nothing")}</p>}
      {data.missing?.length ? (
        <div className={s.chips}>
          <span className={s.subLabel}>{t("feedback.content.missing")}</span>
          {data.missing.map((m) => <Badge key={m} tone="outline">{tMaybe(`feedback.missing.${m}`, m.replace(/_/g, " "))}</Badge>)}
        </div>
      ) : null}
      {data.evidence ? <p className={s.quote}>“{data.evidence}”</p> : null}
      {data.praise ? (
        <div className={s.sub}>
          <span className={s.subLabel}>{t("feedback.content.praise")}</span>
          <p className={s.quote}>“{data.praise}”</p>
        </div>
      ) : null}
      {data.tips?.length ? (
        <div className={s.sub}>
          <span className={s.subLabel}>{t("feedback.content.tips")}</span>
          <ul className={s.list}>{data.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        </div>
      ) : null}
    </>
  );
}

/** Pace bands for interview English, words per minute (🟡 provisional, from the session wireframe). */
export function paceVerdict(wpm: number): "slow" | "comfortable" | "fast" {
  if (wpm < 110) return "slow";
  if (wpm > 160) return "fast";
  return "comfortable";
}

function DeliveryBody({ data }: { data: DeliveryLayer }) {
  const m = data.metrics ?? {};
  const words = tp("common.words", m.words ?? 0);
  const textMode = m.mode === "text";
  return (
    <>
      <ul className={s.metrics}>
        {textMode ? <li>{t("feedback.delivery.lengthText", { words })}</li> : (
          <>
            {m.fillers != null ? <li>{t("feedback.delivery.fillers", { n: m.fillers })}</li> : null}
            {m.seconds != null ? <li>{t("feedback.delivery.length", { time: formatClock(m.seconds), words })}</li> : null}
            {m.wpm ? <li>{t("feedback.delivery.pace", { wpm: m.wpm, verdict: t(`feedback.delivery.${paceVerdict(m.wpm)}`) })}</li> : null}
            {m.long_pauses ? <li>{t("feedback.delivery.pauses", { n: m.long_pauses })}</li> : null}
          </>
        )}
      </ul>
      {data.status === "fix" && data.fix ? <p className={s.fix}>{data.fix}</p> : null}
      {textMode ? <p className={s.note}>{t("feedback.delivery.textMode")}</p> : null}
      {!textMode && m.fillers_note ? <p className={s.note}>{m.fillers_note}</p> : null}
    </>
  );
}

const MAX_ITEMS = 3;

function LanguageBody({ data, record, live, onFlag }: { data: LanguageLayer; record: FeedbackRecord; live: boolean; onFlag?: ThreadFeedbackProps["onFlag"] }) {
  const [misheard, setMisheard] = useState<Record<string, true>>({});
  const voiced = record.source === "voice";
  const items = data.items ?? [];
  const visible = items.filter((i) => i.status !== "dismissed");
  // A check decides what counts, so it is never the item that collapses (wireframe rule).
  const ordered = [...visible.filter((i) => i.status === "unconfirmed"), ...visible.filter((i) => i.status !== "unconfirmed")];
  const shown = ordered.slice(0, Math.max(MAX_ITEMS, ordered.filter((i) => i.status === "unconfirmed").length));
  const hidden = ordered.length - shown.length;
  const dismissed = items.filter((i) => i.status === "dismissed");
  const act = (item: LanguageItem, action: FlagAction, asMisheard = false) => {
    if (asMisheard) setMisheard((m) => ({ ...m, [item.id]: true }));
    onFlag?.(record.id, item.id, action);
  };
  return (
    <>
      {voiced && items.length ? <p className={s.note}>{t("feedback.language.misheard")}</p> : null}
      {!items.length || (!visible.length && !dismissed.length) ? <p className={s.ok}>{t("feedback.language.nothing")}</p> : null}
      {shown.map((item) => (
        item.status === "unconfirmed" ? (
          <div key={item.id} className={`${s.item} ${s.check}`}>
            <span className={s.checkTitle}>{t("feedback.language.checkTitle")}</span>
            <dl className={s.grid}>
              <dt>{t("feedback.language.heardAs")}</dt>
              <dd>“{item.heard_as || item.original}” <span className={s.note}>{t("feedback.language.mayBeMisheard")}</span></dd>
              <dt>{t("feedback.language.say")}</dt>
              <dd>“{item.better[0] ?? ""}”</dd>
            </dl>
            {onFlag ? (
              <div className={s.itemFoot}>
                <span className={s.subLabel}>{t("feedback.language.didYouSay")}</span>
                <div className={s.itemActions}>
                  <Button size="sm" onClick={() => act(item, "confirm")}>{t("feedback.language.yesSaid")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(item, "dismiss", true)}>{t("feedback.language.noSaid")}</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div key={item.id} className={s.item}>
            <dl className={s.grid}>
              <dt>{voiced ? t("feedback.language.heardAs") : t("feedback.language.youTyped")}</dt>
              <dd>“{item.heard_as || item.original}”</dd>
              <dt>{t("feedback.language.say")}</dt>
              <dd>{item.better.map((b, i) => <span key={b}>{i ? " · " : ""}“{b}”</span>)}</dd>
              {item.reason ? (<><dt>{t("feedback.language.why")}</dt><dd>{item.reason}</dd></>) : null}
            </dl>
            <div className={s.itemFoot}>
              {live && item.level ? <Badge tone="language">{t("feedback.language.grammarLevel", { level: item.level })}</Badge> : <span />}
              {item.status === "confirmed" ? <span className={s.note}>{t("feedback.language.confirmed")}</span> : null}
            </div>
            {onFlag && item.status === "active" ? (
              <div className={s.itemActions}>
                <Button size="sm" variant="ghost" onClick={() => act(item, "dismiss")}>{t("feedback.language.saidRight")}</Button>
                <Button size="sm" variant="ghost" onClick={() => act(item, "dismiss")}>{t("feedback.language.nameOrTerm")}</Button>
                {voiced ? <Button size="sm" variant="ghost" onClick={() => act(item, "dismiss", true)}>{t("feedback.language.notWhatISaid")}</Button> : null}
              </div>
            ) : null}
          </div>
        )
      ))}
      {hidden > 0 ? <p className={s.note}>{tp("feedback.language.more", hidden)}</p> : null}
      {dismissed.map((item) => (
        <div key={item.id} className={s.removed}>
          <span>{misheard[item.id] ? t("feedback.language.removedMisheard", { text: item.heard_as || item.original }) : t("feedback.language.removed")}</span>
          {onFlag ? <Button size="sm" variant="link" onClick={() => act(item, "restore")}>{t("common.undo")}</Button> : null}
        </div>
      ))}
      {data.phrase_to_keep?.phrase ? (
        <div className={s.sub}>
          <span className={s.subLabel}>{t("feedback.language.phraseToKeep")}</span>
          <p className={s.fix}>“{data.phrase_to_keep.phrase}”</p>
          {data.phrase_to_keep.why ? <p className={s.note}>{data.phrase_to_keep.why}</p> : null}
        </div>
      ) : null}
    </>
  );
}

/** Highlight [placeholders] in the rewrite as text spans (no HTML parsing). */
function Rewrite({ text, placeholders }: { text: string; placeholders: string[] }) {
  if (!placeholders.length) return <p className={s.rewrite}>{text}</p>;
  const escaped = placeholders.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <p className={s.rewrite}>
      {parts.map((part, i) => (placeholders.includes(part) ? <mark key={i} className={s.placeholder}>{part}</mark> : part))}
    </p>
  );
}

function Stronger({ record, state, onRequest }: { record: FeedbackRecord; state?: StrongerState; onRequest: () => void }) {
  const [open, setOpen] = useState(false);
  const ready = state?.status === "ready" ? state : record.stronger ? { status: "ready" as const, ...record.stronger } : undefined;
  const toggle = () => {
    if (!open && !ready && state?.status !== "loading") onRequest();
    setOpen(!open);
  };
  return (
    <div className={s.stronger}>
      <Button variant="secondary" size="sm" icon="sparkle" aria-expanded={open} onClick={toggle}>
        {open ? t("feedback.stronger.hide") : t("feedback.stronger.show")}
      </Button>
      {open ? (
        state?.status === "loading" && !ready ? <Spinner label={t("feedback.stronger.loading")} /> :
        ready?.rewrite ? (
          <>
            <Rewrite text={ready.rewrite} placeholders={ready.placeholders ?? []} />
            {ready.placeholders?.length ? <p className={s.note}>{t("feedback.stronger.placeholders")}</p> : null}
          </>
        ) : state?.status === "unavailable" ? <p className={s.ok}>{state.message || t("feedback.stronger.unavailable")}</p> : null
      ) : null}
    </div>
  );
}
