/* Settings → AI engine (D78): one view, no inner steps. The engine in use on top (status; its models or connection
 * under a disclosure, or its setup in place while it is not ready), the other engines under it. A ready engine
 * switches with "Use"; one that needs setup opens its connection right in its row ("Set up"), and "Use <name>"
 * appears once it is ready. No "Test" button: the status is the check, and it re-checks every 5 s while not ready. */
import { useEffect, useState } from "react";
import { EngineLogo } from "./EngineLogo";
import { Badge, Button, Callout, Disclosure, Icon, IconButton, SettingGroup, Skeleton } from "../../ds";
import { t } from "../../i18n";
import { useInterval } from "../../lib/hooks";
import { errorMessage, useApp } from "../../lib/store";
import type { EngineId, EngineInfo } from "../../lib/types";
import { ClaudeBody, GeminiBody, OllamaBody, OllamaModelPicker, OpenAiBody } from "./bodies";
import { EngineStatus, engineStatusWord } from "./EngineStatus";
import { RECOMMENDED, engineLine, engineModel, engineName } from "./meta";
import s from "./engine.module.css";

export interface EngineSettingsProps {
  /** Review and stories: open with this engine's setup expanded. */
  initialOpen?: EngineId;
}

export function EngineSettings({ initialOpen }: EngineSettingsProps) {
  const { engines, settings, refreshEngines, enginesLoading, updateSettings } = useApp();
  const [open, setOpen] = useState<EngineId | null>(initialOpen ?? null);
  const [switching, setSwitching] = useState<EngineId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { void refreshEngines(); }, [refreshEngines]);
  const selected = engines?.engines.find((e) => e.id === engines.selected) ?? null;
  const opened = engines?.engines.find((e) => e.id === open) ?? null;
  const waiting = Boolean(selected && !selected.status.ready) || Boolean(opened && !opened.status.ready);
  useInterval(() => { void refreshEngines(); }, 5000, waiting);

  if (!engines) {
    return enginesLoading ? <Skeleton variant="row" rows={3} label={t("common.checking")} /> : (
      <Callout tone="error" title={t("errors.server_unreachable")} actions={<Button size="sm" onClick={() => void refreshEngines()}>{t("common.tryAgain")}</Button>} />
    );
  }

  const use = async (engine: EngineInfo) => {
    setError("");
    setSwitching(engine.id);
    try {
      await updateSettings({ engine: engine.id });
      setOpen(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSwitching(null);
    }
  };

  const recheck = <IconButton icon="refresh" size="sm" label={t("common.checkAgain")} disabled={enginesLoading} onClick={() => void refreshEngines()} />;
  const others = engines.engines.filter((e) => e.id !== selected?.id);

  return (
    <div className={s.settings}>
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {selected ? (
        <div data-review-id="Engine/InUse" data-review-section="AI engine · In use" data-comment-target>
          <SettingGroup title={t("engines.settings.inUse")} id="engine-in-use" action={recheck} flush>
            <div className={s.item}>
              <div className={s.itemHead}>
                <span className={s.optIcon}><EngineLogo id={selected.id} /></span>
                <span className={s.optText}>
                  <span className={s.optName}>{engineName(selected)}</span>
                  <span className={s.optLine}>{engineModel(selected, settings) || engineLine(selected.id)}</span>
                </span>
                <EngineStatus engine={selected} />
              </div>
              {selected.status.ready ? (
                <Disclosure surface="plain" title={selected.id === "ollama" ? t("engines.flow.models") : t("engines.settings.connection")}>
                  <div className={s.itemBody}>
                    {selected.id === "ollama" ? <OllamaModelPicker /> : <EngineBody engine={selected} />}
                    <Facts engine={selected} />
                  </div>
                </Disclosure>
              ) : (
                <div className={s.itemBody}>
                  <EngineBody engine={selected} />
                  {selected.status.code !== "not_configured" ? <span className={s.note} aria-live="polite">{t("engines.recheckNote")}</span> : null}
                </div>
              )}
            </div>
          </SettingGroup>
        </div>
      ) : null}
      <div data-review-id="Engine/Others" data-review-section="AI engine · Other engines" data-comment-target>
        <SettingGroup title={t("engines.settings.others")} description={t("engines.settings.othersHint")} id="engine-others" action={selected ? undefined : recheck} flush>
          {others.map((e) => {
            const expanded = open === e.id;
            const bodyId = `engine-setup-${e.id}`;
            return (
              <div key={e.id} className={s.item}>
                <div className={s.itemHead}>
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
                  {e.status.ready && !expanded ? (
                    <Button size="sm" loading={switching === e.id} disabled={switching !== null} onClick={() => void use(e)}>{t("engines.settings.use")}</Button>
                  ) : (
                    <Button size="sm" variant={expanded ? "ghost" : "secondary"} aria-expanded={expanded} aria-controls={bodyId} onClick={() => setOpen(expanded ? null : e.id)}>
                      {expanded ? t("engines.settings.hide") : t("engines.settings.setUp")}
                    </Button>
                  )}
                </div>
                {expanded ? (
                  <div className={s.itemBody} id={bodyId}>
                    <EngineBody engine={e} />
                    <Facts engine={e} />
                    <div className={s.footerEnd}>
                      {!e.status.ready ? <span className={s.note} aria-live="polite">{t("engines.flow.useNote", { name: engineName(e) })}</span> : null}
                      <Button variant="primary" size="sm" disabled={!e.status.ready || switching !== null} loading={switching === e.id} onClick={() => void use(e)}>
                        {t("engines.flow.use", { name: engineName(e) })}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </SettingGroup>
      </div>
    </div>
  );
}

/** The engine's own connection UI (install steps, form, key) and any warnings the server adds. */
function EngineBody({ engine }: { engine: EngineInfo }) {
  // The server repeats terms/privacy notes in status.warnings; show each text once.
  const warnings = engine.status.warnings.filter((w) => w !== engine.terms_note && w !== engine.privacy_note);
  return (
    <>
      {engine.id === "ollama" ? <OllamaBody engine={engine} /> : null}
      {engine.id === "openai_compatible" ? <OpenAiBody engine={engine} /> : null}
      {engine.id === "claude_cli" ? <ClaudeBody engine={engine} /> : null}
      {engine.id === "gemini_live" ? <GeminiBody engine={engine} /> : null}
      {warnings.length ? <Callout tone="warning">{warnings.map((w) => <p key={w}>{w}</p>)}</Callout> : null}
    </>
  );
}

function Facts({ engine }: { engine: EngineInfo }) {
  return (
    <dl className={s.facts}>
      <dt>{t("engines.cost")}</dt>
      <dd>{engine.cost}</dd>
      <dt>{t("engines.data")}</dt>
      <dd>{engine.data_line}</dd>
      <dt>{t("engines.runs")}</dt>
      <dd>{engine.local ? t("engines.local") : t("engines.online")}</dd>
    </dl>
  );
}
