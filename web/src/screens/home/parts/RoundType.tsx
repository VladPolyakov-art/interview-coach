/* Round type chips (US-12 AC1: four, AC4: the last used is preselected) + the one-line helper for the chosen type. */
import { Chip, ChipGroup } from "../../../ds";
import { t } from "../../../i18n";
import type { RoundType as Round } from "../types";
import s from "./parts.module.css";

const ROUNDS: Round[] = ["hr", "behavioural", "technical", "mix"];

export function RoundType({ value, disabled, onChange }: { value: Round; disabled?: boolean; onChange?: (r: Round) => void }) {
  return (
    <div className={s.round} data-review-id="Home/RoundType">
      <ChipGroup label={t("home.round.type")} hideLabel role="radio" align="center">
        {ROUNDS.map((r) => (
          <Chip key={r} role="radio" selected={value === r} disabled={disabled} onClick={() => onChange?.(r)}>
            {t(`home.round.${r}`)}
          </Chip>
        ))}
      </ChipGroup>
      <p className={s.helper} aria-live="polite">{t(`home.round.${value}Hint`)}</p>
    </div>
  );
}
