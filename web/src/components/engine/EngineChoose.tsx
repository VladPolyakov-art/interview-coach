/* Step A: a short list of options (a radio group of rows). D59: no radio mark: the chosen row is outlined and says
 * "Selected" on the right; the status word sits under the name. Choosing alone does not switch the engine (D54). */
import { EngineLogo } from "./EngineLogo";
import { Badge, Button, Icon, SelectableCard, SelectableCardGroup } from "../../ds";
import { t } from "../../i18n";
import type { EngineInfo, EngineId } from "../../lib/types";
import { RECOMMENDED, engineLine, engineName } from "./meta";
import { engineStatusWord } from "./EngineStatus";
import s from "./engine.module.css";

export interface EngineChooseProps {
  engines: EngineInfo[];
  value: EngineId;
  onChange: (id: EngineId) => void;
  /** Setup: "Continue" · Settings: "Connect". */
  mode: "setup" | "settings";
  onNext: () => void;
  /** Settings only: leave without changing anything. */
  onCancel?: () => void;
}

export function EngineChoose({ engines, value, onChange, mode, onNext, onCancel }: EngineChooseProps) {
  return (
    <>
      <div data-review-id="Engine/Options" data-review-section="AI engine · Options" data-comment-target>
      <SelectableCardGroup label={t("engines.flow.chooseLabel")} hideLabel columns={1}>
        {engines.map((e) => {
          const on = e.id === value;
          return (
            <SelectableCard key={e.id} role="radio" check={false} padding="sm" selected={on} onSelect={() => onChange(e.id)} className={s.option}>
              <span className={s.optIcon}><EngineLogo id={e.id} /></span>
              <span className={s.optText}>
                <span className={s.optName}>
                  {engineName(e)}
                  {e.id === RECOMMENDED ? <Badge>{t("engines.recommended")}</Badge> : null}
                </span>
                <span className={s.optLine}>{engineLine(e.id)}</span>
                <span className={`${s.status} ${e.status.ready ? s.statusReady : ""}`}>
                  {e.status.ready ? <Icon name="check" size="sm" /> : null}
                  {engineStatusWord(e)}
                </span>
              </span>
              {on ? <span className={s.selectedMark}><Badge tone="outline" icon="check">{t("engines.flow.selected")}</Badge></span> : null}
            </SelectableCard>
          );
        })}
      </SelectableCardGroup>
      </div>
      <div className={s.footer} data-review-id="Engine/Action" data-review-section="AI engine · Action" data-comment-target>
        {onCancel ? <Button variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button> : <span />}
        <Button variant="primary" iconRight={mode === "setup" ? "arrowRight" : undefined} onClick={onNext}>
          {mode === "setup" ? t("common.continue") : t("engines.flow.connect")}
        </Button>
      </div>
    </>
  );
}
