/* Interviewer block: who is asking, the question, and the follow-up added below it (never replaces it). US-14. */
import { Badge } from "../../../ds";
import { t } from "../../../i18n";
import type { SessionVariant } from "../types";
import s from "./parts.module.css";

export function QuestionBlock({ variant, question, followUp }: { variant: SessionVariant; question: string; followUp?: string }) {
  return (
    <section className={s.question} aria-label={t("session.stageLabel")} data-review-id="Session/Question" data-review-section="Session · Question" data-comment-target>
      <p className={s.who}>
        <span className={s.whoName}>{t("session.interviewer")}</span>
        <span className={s.whoRole}>{variant === "english" ? t("session.coachRole") : t("session.interviewerRole")}</span>
      </p>
      {question ? <p className={`${s.questionText} ${followUp ? s.questionDim : ""}`}>{question}</p> : null}
      {followUp ? (
        <div className={`${s.follow} motion-rise`}>
          <Badge tone="outline">{t("session.followUp")}</Badge>
          <p className={s.followText}>{followUp}</p>
        </div>
      ) : null}
    </section>
  );
}
