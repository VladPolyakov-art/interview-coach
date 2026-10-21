/* Step A: a short list of options, one radio per engine. Choosing alone does not switch the engine (D54). */
import { Badge, Button, Icon, SelectableCard, SelectableCardGroup } from "../../ds";
import { t } from "../../i18n";
import type { EngineInfo, EngineId } from "../../lib/types";
import { ENGINE_ICONS, RECOMMENDED, engineLine, engineName } from "./meta";
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
              <span className={`${s.radio} ${on ? s.radioOn : ""}`} aria-hidden="true">{on ? <Icon name="check" size="sm" /> : null}</span>
              <span className={s.optIcon}><Icon name={ENGINE_ICONS[e.id]} /></span>
              <span className={s.optText}>
                <span className={s.optName}>
                  {engineName(e)}
                  {e.id === RECOMMENDED ? <Badge>{t("engines.recommended")}</Badge> : null}
                </span>
                <span className={s.optLine}>{engineLine(e.id)}</span>
              </span>
              <span className={`${s.status} ${e.status.ready ? s.statusReady : ""}`}>
                {e.status.ready ? <Icon name="check" size="sm" /> : null}
                {engineStatusWord(e)}
              </span>
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
