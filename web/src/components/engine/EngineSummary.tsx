/* C: Settings → AI engine, the default view. One compact card for the engine in use: name · model · status,
 * "Test the engine" and "Change engine"; the Ollama model selects stay reachable under "Models". */
import { Button, Card, Disclosure, Icon, IconButton } from "../../ds";
import { t } from "../../i18n";
import type { EngineInfo } from "../../lib/types";
import { OllamaModelPicker, StatusHint } from "./bodies";
import { EngineStatus } from "./EngineStatus";
import { EngineTest } from "./EngineTest";
import { ENGINE_ICONS, engineName } from "./meta";
import s from "./engine.module.css";

export interface EngineSummaryProps {
  engine: EngineInfo;
  model: string;
  checking: boolean;
  onRecheck: () => void;
  onChange: () => void;
  /** Not ready: opens the connection view (B) for this engine. */
  onFinish: () => void;
}

export function EngineSummary({ engine, model, checking, onRecheck, onChange, onFinish }: EngineSummaryProps) {
  const ready = engine.status.ready;
  return (
    <Card className={s.card} as="section" aria-label={t("engines.flow.chooseLabel")} data-review-id="Engine/Summary" data-review-section="AI engine · Summary" data-comment-target>
      <div className={s.cardHead}>
        <span className={s.optIcon}><Icon name={ENGINE_ICONS[engine.id]} /></span>
        <div className={s.cardTitle}>
          <span className={s.name}>{[engineName(engine), model].filter(Boolean).join(" · ")}</span>
          <EngineStatus engine={engine} />
        </div>
        <IconButton icon="refresh" size="sm" label={t("common.checkAgain")} disabled={checking} onClick={onRecheck} />
      </div>
      {!ready ? <StatusHint engine={engine} /> : null}
      {ready ? (
        <EngineTest id={engine.id}>
          <Button size="sm" onClick={onChange}>{t("engines.flow.change")}</Button>
        </EngineTest>
      ) : (
        <div className={s.actions}>
          <Button variant="primary" size="sm" onClick={onFinish}>{t("engines.flow.finish")}</Button>
          <Button size="sm" onClick={onChange}>{t("engines.flow.change")}</Button>
          {engine.status.code !== "not_configured" ? <span className={s.note} aria-live="polite">{t("engines.recheckNote")}</span> : null}
        </div>
      )}
      {ready && engine.id === "ollama" ? (
        <Disclosure surface="plain" title={t("engines.flow.models")}>
          <OllamaModelPicker />
        </Disclosure>
      ) : null}
    </Card>
  );
}
