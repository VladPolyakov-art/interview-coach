/* "What moves the verdict" (D98 r2, rubric §9.4). One line under the verdict's scale, built in code, never by the model.
 *
 * The scale step is not computed by any rule: the server saves a verdict sentence and no step (`mapRecord` leaves
 * `step` out), and only the example debrief carries one, by hand. So the line says what is true without a rule:
 * "The main thing between you and “Ready”: <the first weak spot's fix, as written>". It does not claim that the fix
 * is enough to reach the next step. If a rule is ever added (a function of counted weak spots), this is the place
 * to make the line say exactly that rule.
 * - Not ready yet / Getting there: the next step's name + the fix of the first weak spot (in the order shown on the page).
 * - Ready: "Keep it: <strength>" when the debrief has one, else no line.
 * - No step, or no weak spot with a fix: no line. */
import { t } from "../../../i18n";
import type { VerdictModel, WeakSpotModel } from "../types";

const STEP_KEY = ["scale.notReady", "scale.gettingThere", "scale.ready"] as const;

/** The text ends with a full stop, a question or exclamation mark, or an ellipsis, optionally followed by a closing quote. */
const ENDS = /[.!?…]["”’)]*$/;

export function verdictLine(verdict: VerdictModel, spots: readonly WeakSpotModel[]): string | null {
  const step = verdict.step;
  if (step === undefined) return null;
  if (step === 2) {
    const strength = verdict.strength?.trim();
    return strength ? t("debrief.verdictLine.keep", { strength }) : null;
  }
  const fix = spots.find((w) => w.fix?.trim())?.fix?.trim();
  if (!fix) return null;
  const line = t("debrief.verdictLine.next", { next: t(`debrief.${STEP_KEY[step + 1]!}`), fix });
  return ENDS.test(line) ? line : `${line}.`;
}
