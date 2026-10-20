/* One question card (debrief.md §3.5; G19 Disclosure as an <li> card, headingLevel 3). Collapsed: number, question,
 * summary badges per layer, facts (length, start time, follow-ups). Expanded: follow-up, your answer (clamped to 6
 * lines), layer blocks in the configured order, a stronger answer. Local state lives in DebriefView; this part is pure. */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Badge, Button, Callout, Disclosure, Icon, Skeleton, TextShimmer } from "../../../ds";
import { t, tp } from "../../../i18n";
import type { Layer, QuestionModel } from "../types";
import { Editor } from "./Correction";
import { ContentLayer, DeliveryLayer, LanguageLayer, type RowContext } from "./Layers";
import { Marked, plain } from "./Marked";
import s from "./card.module.css";

export interface QuestionCardProps {
  q: QuestionModel;
  order: Layer[];
  headerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strongerOpen: boolean;
  onStrongerOpenChange: (open: boolean) => void;
  rows: RowContext;
  rechecking: boolean;
  /** The answer itself is being edited. */
  answerEditing: boolean;
  onEditAnswer?: () => void;
  onSaveAnswer?: (text: string) => void;
  onCancelAnswer?: () => void;
  focusEditor: boolean;
}

/** True when the text is cut by the line clamp (measured while collapsed, so "Show full answer" appears only when needed). */
function useClamped(ref: RefObject<HTMLElement | null>, expanded: boolean): boolean {
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOver(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, expanded]);
  return over;
}

function Answer({ q, answerEditing, onEditAnswer, onSaveAnswer, onCancelAnswer, focusEditor }: Pick<QuestionCardProps, "q" | "answerEditing" | "onEditAnswer" | "onSaveAnswer" | "onCancelAnswer" | "focusEditor">) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const clamped = useClamped(ref, expanded);
  return (
    <section className={s.part} data-review-id="Debrief/Answer">
      <h4 className={s.label}>
        {t("debrief.q.yourAnswer")}
        {q.edited ? <Badge icon="edit">{t("debrief.q.edited")}</Badge> : null}
      </h4>
      {answerEditing ? (
        <Editor start={plain(q.answer)} label={t("debrief.lang.editorLabel")} focus={focusEditor} onSave={onSaveAnswer} onCancel={onCancelAnswer} />
      ) : (
        <>
          <p ref={ref} className={`${s.answer} ${expanded ? "" : s.clamp}`}><Marked parts={q.answer} /></p>
          {clamped || expanded || onEditAnswer ? (
            <div className={s.answerActions}>
              {clamped || expanded ? (
                <Button variant="link" size="sm" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
                  {expanded ? t("debrief.q.showLess") : t("debrief.q.showFull")}
                </Button>
              ) : null}
              {onEditAnswer ? <Button variant="ghost" size="sm" icon="edit" onClick={onEditAnswer}>{t("debrief.q.edit")}</Button> : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function Stronger({ q, open, onOpenChange }: { q: QuestionModel; open: boolean; onOpenChange: (open: boolean) => void }) {
  const st = q.stronger;
  if (!st) return null;
  return (
    <Disclosure
      surface="plain"
      open={open}
      onOpenChange={onOpenChange}
      leading={<Icon name="sparkle" size="sm" />}
      title={open ? t("feedback.stronger.hide") : t("feedback.stronger.show")}
      className={s.stronger}
    >
      {st.status === "loading" || st.status === "idle" ? (
        <div className={s.part}>
          <TextShimmer as="p" status>{t("feedback.stronger.loading")}</TextShimmer>
          <Skeleton lines={3} label={t("feedback.stronger.loading")} />
        </div>
      ) : st.status === "unavailable" ? (
        <p className={s.muted}>{t("feedback.stronger.unavailable")}</p>
      ) : (
        <div className={s.part} data-review-id="Debrief/Stronger">
          <p className={s.rewrite}><Marked parts={st.text ?? []} /></p>
          {st.placeholders ? <p className={s.muted}><Icon name="info" size="sm" />{t("debrief.stronger.note")}</p> : null}
        </div>
      )}
    </Disclosure>
  );
}

export function QuestionCard(p: QuestionCardProps) {
  const { q, order, headerId, open, onOpenChange } = p;
  const sum = q.summary;
  const meta = (
    <>
      {q.unavailable ? <Badge>{t("debrief.sum.noFeedback")}</Badge> : null}
      {!q.unavailable && sum.content ? <Badge tone="content" tinted icon="content">{sum.content}</Badge> : null}
      {!q.unavailable && sum.language ? <Badge tone="language" tinted icon="language">{sum.language}</Badge> : null}
      {!q.unavailable && sum.delivery ? <Badge tone="delivery" tinted icon="delivery">{sum.delivery}</Badge> : null}
      {q.suggestion ? <Badge icon="sparkle">{t("debrief.q.suggestion")}</Badge> : null}
      {q.duration ? <span className={s.fact}><Icon name="clock" size="sm" />{q.duration}</span> : null}
      {q.startsAt ? <span className={s.fact}>{t("debrief.q.startsAt", { time: q.startsAt })}</span> : null}
      <span className={s.fact}>{q.followUps ? tp("debrief.q.followUps", q.followUps) : t("debrief.q.noFollowUp")}</span>
      {q.misheard ? <span className={s.fact}>{t("debrief.q.misheard", { n: q.misheard })}</span> : null}
    </>
  );

  const layerBlock = (layer: Layer) => {
    const b = q.layers[layer];
    if (!b) return null;
    if (layer === "content") return <ContentLayer key={layer} block={q.layers.content!} />;
    if (layer === "language") return <LanguageLayer key={layer} block={q.layers.language!} ctx={p.rows} />;
    return <DeliveryLayer key={layer} block={q.layers.delivery!} />;
  };

  return (
    <Disclosure
      as="li"
      headingLevel={3}
      id={headerId}
      open={open}
      onOpenChange={onOpenChange}
      leading={<span className={s.num} aria-hidden="true">{q.n}</span>}
      title={<><span className="visually-hidden">{t("debrief.q.number", { n: q.n })}: </span>{q.question}</>}
      meta={meta}
    >
      <div className={s.body} data-review-id="Debrief/QuestionBody">
        {q.followUp ? <p className={s.followUp}><span className={s.lead}>{t("debrief.q.followUp")}</span> {q.followUp}</p> : null}
        <Answer q={q} answerEditing={p.answerEditing} onEditAnswer={p.onEditAnswer} onSaveAnswer={p.onSaveAnswer} onCancelAnswer={p.onCancelAnswer} focusEditor={p.focusEditor} />
        {q.followUpAnswer ? (
          <section className={s.part}>
            <h4 className={s.label}>{t("debrief.q.yourFollowUp")}</h4>
            <p className={s.answer}>{q.followUpAnswer}</p>
          </section>
        ) : null}
        {q.unavailable ? (
          <Callout tone="info">{t("debrief.q.unavailable")}</Callout>
        ) : p.rechecking ? (
          <div className={s.part} data-review-id="Debrief/Rechecking">
            <TextShimmer as="p" status>{t("debrief.q.rechecking")}</TextShimmer>
            <Skeleton variant="card" lines={3} label={t("debrief.q.rechecking")} />
          </div>
        ) : (
          <div className={s.layers}>{order.map(layerBlock)}</div>
        )}
        {!q.unavailable && !p.rechecking ? <Stronger q={q} open={p.strongerOpen} onOpenChange={p.onStrongerOpenChange} /> : null}
      </div>
    </Disclosure>
  );
}
