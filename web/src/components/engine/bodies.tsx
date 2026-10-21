/* The connection UI of each engine (step B, and the "Models" disclosure in the summary card).
 * Moved as is from the old EnginePanel: same forms, same calls, same copy. */
import { useEffect, useState } from "react";
import { Button, Callout, Chip, CopyField, Icon, IconButton, Input, Select, SettingRow } from "../../ds";
import { t } from "../../i18n";
import { api } from "../../lib/api";
import { formatBytes } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import { errorMessage, useApp } from "../../lib/store";
import type { EngineId, EngineInfo } from "../../lib/types";
import { DEFAULT_PULL, PRESETS } from "./meta";
import s from "./engine.module.css";

export function StatusHint({ engine }: { engine: EngineInfo }) {
  if (engine.status.ready || (!engine.status.message && !engine.status.hint)) return null;
  return (
    <Callout tone={engine.status.code === "not_configured" ? "info" : "warning"} title={engine.status.message || undefined}>
      {engine.status.hint || null}
    </Callout>
  );
}

/** "Connect" (D83): the server looks for the engine the user already installed (outside PATH too) and starts
 * Ollama when it is installed but not running. `failed` once a press found nothing. */
function useConnect(id: EngineId) {
  const { refreshEngines } = useApp();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const connect = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setFailed(!(await api.connectEngine(id)).status.ready);
    } catch {
      setFailed(true);
    }
    await refreshEngines();
    setBusy(false);
  };
  return { connect: () => void connect(), busy, failed };
}

function ConnectButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return <Button variant="primary" size="sm" loading={busy} onClick={onClick}>{t("engines.connect")}</Button>;
}

export function OllamaBody({ engine }: { engine: EngineInfo }) {
  const code = engine.status.code;
  const { connect, busy, failed } = useConnect("ollama");
  if (code === "not_installed") {
    return (
      <Callout tone="warning" title={t("engines.ollama.notInstalled")} live={failed ? "status" : undefined}
        actions={(
          <>
            <ConnectButton busy={busy} onClick={connect} />
            <Button variant="secondary" size="sm" iconRight="external" onClick={() => window.open(engine.setup_url || "https://ollama.com/download", "_blank", "noopener")}>{t("engines.ollama.download")}</Button>
          </>
        )}>
        {failed ? t("engines.ollama.stillMissing") : t("engines.ollama.afterInstall")}
      </Callout>
    );
  }
  if (code === "not_running") {
    return (
      <Callout tone="warning" title={t("engines.ollama.notRunning")} live={failed ? "status" : undefined}
        actions={<ConnectButton busy={busy} onClick={connect} />}>
        {failed ? (
          <>
            <p>{t("engines.ollama.connectFailed")}</p>
            <CopyField value={engine.status.hint_command || "ollama serve"} copyLabel={t("common.copyCommand")} copiedLabel={t("common.copied")} label={t("common.command")} />
          </>
        ) : t("engines.ollama.startIt")}
      </Callout>
    );
  }
  if (code === "no_model") {
    return (
      <Callout tone="warning" title={t("engines.ollama.noModel")}>
        <p>{t("engines.ollama.pullHint")}</p>
        <CopyField value={engine.status.hint_command || DEFAULT_PULL} copyLabel={t("common.copyCommand")} copiedLabel={t("common.copied")} label={t("common.command")} />
      </Callout>
    );
  }
  if (code === "ready") return <OllamaModelPicker />;
  return <StatusHint engine={engine} />;
}

export function OllamaModelPicker() {
  const { settings, updateSettings } = useApp();
  const { data } = useLoad(() => api.ollamaModels());
  if (!data) return null;
  if (!data.models.length) return <p className={s.note}>{t("engines.ollama.noModels")}</p>;
  const options = (auto: string) => [
    { value: "", label: t("engines.ollama.auto", { model: auto }) },
    ...data.models.map((m) => ({
      value: m.name,
      label: [m.name, formatBytes(m.size), m.thinking_only ? t("engines.ollama.thinkingOnly") : "",
        m.name === auto ? t("engines.ollama.recommended") : ""].filter(Boolean).join(" · "),
    })),
  ];
  const save = async (patch: { model?: string; voice_model?: string }) => {
    await updateSettings({ ollama: patch });
  };
  // D79: one row per model choice — name and hint left, the dropdown right (like every other setting).
  return (
    <div className={s.modelRows}>
      <SettingRow label={t("engines.ollama.modelLabel")}
        description={[t("engines.ollama.modelHint", { model: data.recommended }), data.ram_gb ? t("engines.ollama.ram", { gb: data.ram_gb }) : ""].filter(Boolean).join(" ")}>
        <Select label={t("engines.ollama.modelLabel")} hideLabel width="content" value={settings?.ollama.model ?? ""}
          options={options(data.recommended)} onChange={(v) => void save({ model: v })} />
      </SettingRow>
      <SettingRow label={t("engines.ollama.voiceModelLabel")} description={t("engines.ollama.voiceModelHint", { model: data.recommended_voice })}>
        <Select label={t("engines.ollama.voiceModelLabel")} hideLabel width="content" value={settings?.ollama.voice_model ?? ""}
          options={options(data.recommended_voice)} onChange={(v) => void save({ voice_model: v })} />
      </SettingRow>
    </div>
  );
}

export function OpenAiBody({ engine }: { engine: EngineInfo }) {
  const { settings, updateSettings, refreshEngines } = useApp();
  const cfg = settings?.openai_compatible;
  const [baseUrl, setBaseUrl] = useState(cfg?.base_url ?? "");
  const [model, setModel] = useState(cfg?.model ?? "");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (cfg) { setBaseUrl(cfg.base_url); setModel(cfg.model); }
  }, [cfg]);
  const save = async (clearKey = false) => {
    setBusy(true);
    setMsg("");
    try {
      const patch: { base_url: string; model: string; api_key?: string } = { base_url: baseUrl.trim(), model: model.trim() };
      if (clearKey) patch.api_key = "";
      else if (key.trim()) patch.api_key = key.trim();
      await updateSettings({ openai_compatible: patch });
      setKey("");
      await refreshEngines();
      setMsg(t("engines.openai.saved"));
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <StatusHint engine={engine} />
      <div className={s.body}>
        <span className={s.note} id="oa-presets">{t("engines.openai.presets")}</span>
        <div className={s.presets} role="group" aria-labelledby="oa-presets">
          {PRESETS.map((p) => (
            <Chip key={p.id} selected={baseUrl === p.url} onClick={() => setBaseUrl(p.url)}>{t(`engines.openai.preset.${p.id}`)}</Chip>
          ))}
        </div>
      </div>
      <Input label={t("engines.openai.baseUrl")} hint={t("engines.openai.baseUrlHint")} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
        placeholder="http://localhost:1234/v1" inputMode="url" autoComplete="off" spellCheck={false} />
      <Input
        label={t("engines.openai.apiKey")}
        optionalText={t("common.optional")}
        hint={cfg?.has_api_key ? t("engines.openai.apiKeySet") : t("engines.openai.apiKeyHint")}
        type={showKey ? "text" : "password"}
        value={key}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setKey(e.target.value)}
        adornment={<IconButton icon="eye" size="sm" pressed={showKey} label={showKey ? t("engines.openai.hideKey") : t("engines.openai.showKey")} onClick={() => setShowKey(!showKey)} />}
      />
      <Input label={t("engines.openai.model")} hint={t("engines.openai.modelHint")} value={model} onChange={(e) => setModel(e.target.value)} autoComplete="off" spellCheck={false} />
      {!baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1") && baseUrl ? <Callout tone="info">{t("engines.openai.paidNote")}</Callout> : null}
      <div className={s.actions}>
        <Button type="submit" variant="secondary" loading={busy}>{t("engines.openai.save")}</Button>
        {cfg?.has_api_key ? <Button variant="ghost" size="sm" onClick={() => void save(true)}>{t("engines.openai.clearKey")}</Button> : null}
        <span className={s.result} aria-live="polite">{msg}</span>
      </div>
    </form>
  );
}

export function ClaudeBody({ engine }: { engine: EngineInfo }) {
  const found = engine.status.code !== "not_installed";
  const { connect, busy, failed } = useConnect("claude_cli");
  return (
    <>
      <Callout tone={found ? "success" : "warning"} title={found ? t("engines.claude.detected") : t("engines.claude.notFound")}
        live={failed ? "status" : undefined}
        actions={!found ? (
          <>
            <ConnectButton busy={busy} onClick={connect} />
            {engine.setup_url ? <Button variant="secondary" size="sm" iconRight="external" onClick={() => window.open(engine.setup_url, "_blank", "noopener")}>{t("engines.claude.install")}</Button> : null}
          </>
        ) : undefined}>
        {!found ? (failed ? t("engines.claude.stillMissing") : t("engines.claude.connectHint"))
          : !engine.status.ready ? engine.status.hint || engine.status.message : null}
      </Callout>
      {engine.terms_note ? <p className={s.note}><Icon name="info" size="sm" /> {engine.terms_note}</p> : null}
    </>
  );
}

export function GeminiBody({ engine }: { engine: EngineInfo }) {
  const { settings, updateSettings, refreshEngines } = useApp();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await updateSettings({ gemini_live: { api_key: key.trim() } });
      setKey("");
      await refreshEngines();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {engine.privacy_note ? <Callout tone="info" icon="eye">{engine.privacy_note}</Callout> : null}
      <StatusHint engine={engine} />
      <Input
        label={t("engines.gemini.apiKey")}
        hint={settings?.gemini_live.has_api_key ? t("engines.openai.apiKeySet") : t("engines.gemini.apiKeyHint")}
        type={show ? "text" : "password"}
        value={key}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setKey(e.target.value)}
        adornment={<IconButton icon="eye" size="sm" pressed={show} label={show ? t("engines.openai.hideKey") : t("engines.openai.showKey")} onClick={() => setShow(!show)} />}
      />
      <div className={s.actions}>
        <Button type="submit" loading={busy} disabled={!key.trim()}>{t("engines.gemini.save")}</Button>
        {engine.setup_url ? (
          <Button variant="link" iconRight="external" onClick={() => window.open(engine.setup_url, "_blank", "noopener")}>{t("engines.gemini.getKey")}</Button>
        ) : null}
        <span className={s.result} aria-live="polite">{msg}</span>
      </div>
    </form>
  );
}
