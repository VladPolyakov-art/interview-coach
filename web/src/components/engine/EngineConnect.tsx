/* Step B: only the chosen engine's connection (its form or install steps, its model choice, Test).
 * Cost and data sit in a closed "Cost and your data" disclosure. The primary action appears once the engine is ready. */
import { Button, Callout, Card, Disclosure, Icon, IconButton } from "../../ds";
import { t } from "../../i18n";
import type { EngineInfo } from "../../lib/types";
import { ClaudeBody, GeminiBody, OllamaBody, OpenAiBody } from "./bodies";
import { EngineStatus } from "./EngineStatus";
import { EngineTest } from "./EngineTest";
import { ENGINE_ICONS, engineName } from "./meta";
import s from "./engine.module.css";

export interface EngineConnectProps {
  engine: EngineInfo;
  mode: "setup" | "settings";
  /** The primary action is switching the engine. */
  switching: boolean;
  checking: boolean;
  onRecheck: () => void;
  onUse: () => void;
}

export function EngineConnect({ engine, mode, switching, checking, onRecheck, onUse }: EngineConnectProps) {
  const name = engineName(engine);
  const ready = engine.status.ready;
  // The server repeats terms/privacy notes in status.warnings; show each text once.
  const warnings = engine.status.warnings.filter((w) => w !== engine.terms_note && w !== engine.privacy_note);
  return (
    <>
      <Card className={s.card} as="section" aria-label={name} data-review-id="Engine/Connection" data-review-section="AI engine · Connection" data-comment-target>
        <div className={s.cardHead}>
          <span className={s.optIcon}><Icon name={ENGINE_ICONS[engine.id]} /></span>
          <div className={s.cardTitle}>
            <span className={s.name}>{name}</span>
            <EngineStatus engine={engine} />
          </div>
          <IconButton icon="refresh" size="sm" label={t("common.checkAgain")} disabled={checking} onClick={onRecheck} />
        </div>
        <div className={s.body}>
          {engine.id === "ollama" ? <OllamaBody engine={engine} /> : null}
          {engine.id === "openai_compatible" ? <OpenAiBody engine={engine} /> : null}
          {engine.id === "claude_cli" ? <ClaudeBody engine={engine} /> : null}
          {engine.id === "gemini_live" ? <GeminiBody engine={engine} /> : null}
          {warnings.length ? <Callout tone="warning">{warnings.map((w) => <p key={w}>{w}</p>)}</Callout> : null}
          {ready ? <EngineTest id={engine.id} /> : null}
        </div>
        {!ready && engine.status.code !== "not_configured" ? <span className={s.note} aria-live="polite">{t("engines.recheckNote")}</span> : null}
      </Card>
      <div data-review-id="Engine/CostData" data-review-section="AI engine · Cost and data" data-comment-target>
      <Disclosure surface="plain" title={t("engines.flow.costData")}>
        <dl className={s.facts}>
          <dt>{t("engines.cost")}</dt>
          <dd>{engine.cost}</dd>
          <dt>{t("engines.data")}</dt>
          <dd>{engine.data_line}</dd>
          <dt>{t("engines.runs")}</dt>
          <dd>{engine.local ? t("engines.local") : t("engines.online")}</dd>
        </dl>
      </Disclosure>
      </div>
      <div className={s.footer} data-review-id="Engine/Action" data-review-section="AI engine · Action" data-comment-target>
        <div className={s.footerEnd}>
          {!ready ? <span className={s.note}>{t("engines.flow.useNote", { name })}</span> : null}
          <Button variant="primary" iconRight={mode === "setup" ? "arrowRight" : undefined} disabled={!ready} loading={switching} onClick={onUse}>
            {mode === "setup" ? t("common.continue") : t("engines.flow.use", { name })}
          </Button>
        </div>
      </div>
    </>
  );
}
