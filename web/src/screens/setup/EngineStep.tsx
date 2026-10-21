/* Setup → AI engine (D81). A ready engine is one row ("Ollama · qwen3:8b · Ready", Change): nothing to decide.
 * "Change", or an engine that isn't ready, opens the same view as Settings → AI engine (D78): the engine in use with
 * its setup in place (which prerequisite failed, how to fix it, Check again — US-02 AC5), the others under it.
 * Continue waits for Ready; there is no text-mode way out here (the engine writes Mike's questions). */
import { useEffect, useState } from "react";
import { Button, SettingGroup, Skeleton } from "../../ds";
import { t } from "../../i18n";
import { EngineHead, EngineSettings } from "../../components/engine/EngineSettings";
import { engineName } from "../../components/engine/meta";
import { useApp } from "../../lib/store";
import type { EngineId } from "../../lib/types";
import { StepFooter, StepHead, type HeadingRef } from "./SetupFrame";
import s from "./Setup.module.css";

export interface EngineStepProps {
  headingRef?: HeadingRef;
  onNext: () => void;
  /** Review and stories: start with the full list open (as after "Change"), or one engine's setup open. */
  initialChanging?: boolean;
  initialOpen?: EngineId;
}

export function EngineStep({ headingRef, onNext, initialChanging = false, initialOpen }: EngineStepProps) {
  const { engines, refreshEngines } = useApp();
  const [changing, setChanging] = useState(initialChanging || Boolean(initialOpen));
  useEffect(() => { void refreshEngines(); }, [refreshEngines]);
  const selected = engines?.engines.find((e) => e.id === engines.selected) ?? null;
  const ready = Boolean(selected?.status.ready);

  return (
    <>
      <StepHead headingRef={headingRef} title={t("setup.engine.title")} sub={t("setup.engine.subtitle")} />
      {!engines ? <Skeleton variant="row" rows={2} label={t("common.checking")} /> : ready && !changing && selected ? (
        <div data-review-id="Setup/Engine" data-review-section="Setup · AI engine" data-comment-target>
          <SettingGroup title={t("setup.engine.group")} description={t("setup.engine.later")} flush>
            <div className={s.engineRow}>
              <EngineHead engine={selected} action={<Button size="sm" variant="secondary" onClick={() => setChanging(true)}>{t("setup.engine.change")}</Button>} />
            </div>
          </SettingGroup>
        </div>
      ) : <EngineSettings initialOpen={initialOpen} />}
      <StepFooter>
        {!ready && selected ? <span className={s.note} aria-live="polite">{t("setup.engine.waiting", { name: engineName(selected) })}</span> : null}
        <Button variant="primary" iconRight="arrowRight" disabled={!ready} onClick={onNext}>{t("common.continue")}</Button>
      </StepFooter>
    </>
  );
}
