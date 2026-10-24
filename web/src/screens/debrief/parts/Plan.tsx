/* Plan for the next session (D98, US-20 AC8, rubric §9.3). Up to three steps, one per weak spot, in the same order; no
 * filler steps. The first step carries "Drill these weak spots" (the same action and data-track as the Actions block,
 * which then drops its own button). In the example debrief the button is off and says why. */
import { Button, Icon } from "../../../ds";
import { t } from "../../../i18n";
import type { DebriefModel, PlanStepModel } from "../types";
import { drillHintText } from "./drillHint";
import { SectionHead } from "./Sections";
import s from "./plan.module.css";

export interface PlanProps {
  steps: PlanStepModel[];
  id: string;
  drill?: DebriefModel["drill"];
  /** The example debrief: the drill is not available, the hint says it is in the user's own debrief. */
  example?: boolean;
  /** The storage is not writable: Download is the page's primary, so the drill is secondary. */
  storageError?: boolean;
  onDrill?: () => void;
}

export function Plan({ steps, id, drill, example, storageError, onDrill }: PlanProps) {
  return (
    <section className={s.block} aria-labelledby={id} data-review-id="Debrief/Plan" data-review-section="Debrief · Plan" data-comment-target="">
      <SectionHead id={id} title={t("debrief.plan.title")} />
      <ol className={s.steps}>
        {steps.map((step) => (
          <li key={step.id} className={s.step}>
            <div className={s.body}>
              <p className={s.text}>{step.text}</p>
              <span className={s.layer}><Icon name={step.layer} size="sm" />{t(`feedback.layer.${step.layer}`)}</span>
              {step.drill ? (
                <div className={s.drill}>
                  <Button variant={storageError ? "secondary" : "primary"} icon="play" data-track="drill-start" disabled={example} onClick={onDrill}>{t("debrief.drill")}</Button>
                  {example ? <p className={s.hint}>{t("debrief.example.own")}</p> : drill ? <p className={s.hint}>{drillHintText(drill)}</p> : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
