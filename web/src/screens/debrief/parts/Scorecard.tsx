/* Scorecard (D98, US-20 AC6, rubric §9.1). Seven rows in a fixed order; each is a practice score 1–5 with a small meter
 * (five segments, the same grammar as the verdict's mini scale), and the questions that lost points as links to their
 * cards. A row with nothing to judge is not a row (D98 r2): one muted line at the end names them ("Not asked this time:
 * Lessons learned"), and with no scored row the section is hidden. A footnote under the caption says that possibly
 * misheard words are not counted (GR9). The meter is decoration: a row reads
 * as "Result, 3 out of 5". No status colours, no grade (D98). */
import { t, tp } from "../../../i18n";
import type { ScoreRowModel } from "../types";
import { QuestionLinks } from "./QuestionLinks";
import { SectionHead } from "./Sections";
import s from "./scorecard.module.css";

const SEGMENTS = [1, 2, 3, 4, 5];

export function Scorecard({ rows, id, onJump }: { rows: ScoreRowModel[]; id: string; onJump: (n: number) => void }) {
  const scored = rows.filter((row): row is ScoreRowModel & { score: number } => row.score !== null);
  if (!scored.length) return null;
  const skipped = rows.filter((row) => row.score === null).map((row) => t(`debrief.score.row.${row.key}`));
  return (
    <section className={s.block} aria-labelledby={id} data-review-id="Debrief/Scorecard" data-review-section="Debrief · Scorecard" data-comment-target="">
      <SectionHead id={id} title={t("debrief.score.title")} sub={t("debrief.score.sub")} note={t("debrief.misheard.note")} />
      <ul className={s.list} aria-label={t("debrief.score.list")}>
        {scored.map((row) => (
          <li key={row.key} className={s.row} data-score-key={row.key}>
            <span className={s.label}>{t(`debrief.score.row.${row.key}`)}</span>
            <span className={s.score}>
              <span className={s.meter} aria-hidden="true">
                {SEGMENTS.map((n) => <span key={n} className={n <= row.score ? `${s.seg} ${s.on}` : s.seg} />)}
              </span>
              <span className={s.num} aria-hidden="true">{t("debrief.score.value", { score: row.score })}</span>
              <span className="visually-hidden">, {t("debrief.score.sr", { score: row.score })}</span>
            </span>
            {row.lost.length ? (
              <span className={s.lost}>
                {tp("debrief.score.lost", row.lost.length)}
                <QuestionLinks ids={row.lost} onJump={onJump} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {skipped.length ? <p className={s.notAsked}>{t("debrief.score.notAsked", { labels: skipped.join(", ") })}</p> : null}
    </section>
  );
}
