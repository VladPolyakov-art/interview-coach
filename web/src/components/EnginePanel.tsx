/* AI engine chooser: first-run step 1 and Settings → AI engine. Status comes from GET /api/engines;
 * every not-ready state has a concrete way forward (download link, a command to copy, a form). */
import { useEffect, useState } from "react";
import { Badge, Button, Callout, Card, Chip, CopyField, Icon, IconButton, Input, Select, Skeleton, type IconName } from "../ds";
import { t, tMaybe } from "../i18n";
import { api } from "../lib/api";
import { formatBytes } from "../lib/format";
import { useInterval, useLoad } from "../lib/hooks";
import { errorMessage, useApp } from "../lib/store";
import type { EngineId, EngineInfo, EngineTestResult } from "../lib/types";
import s from "./EnginePanel.module.css";

const ICONS: Record<EngineId, IconName> = { ollama: "cpu", openai_compatible: "globe", claude_cli: "terminal", gemini_live: "sparkle" };
const DEFAULT_PULL = "ollama pull qwen3:4b-instruct";
const PRESETS = [
  { id: "lmstudio", url: "http://localhost:1234/v1" },
  { id: "jan", url: "http://localhost:1337/v1" },
  { id: "openrouter", url: "https://openrouter.ai/api/v1" },
  { id: "openai", url: "https://api.openai.com/v1" },
] as const;

function statusTone(e: EngineInfo) {
  if (e.status.ready) return "success" as const;
  if (e.status.code === "not_configured") return "neutral" as const;
  return "warning" as const;
}

export function EngineStatus({ engine }: { engine: EngineInfo }) {
  return (
    <Badge tone={statusTone(engine)} icon={engine.status.ready ? "check" : engine.status.code === "not_configured" ? undefined : "alert"}>
      {tMaybe(`engines.status.${engine.status.code}`, engine.status.code)}
    </Badge>
  );
}

export function EnginePanel({ onReadyChange }: { onReadyChange?: (ready: boolean) => void }) {
  const { engines, refreshEngines, enginesLoading, updateSettings } = useApp();
  const [switching, setSwitching] = useState<EngineId | null>(null);
  const [error, setError] = useState("");
  const selected = engines?.engines.find((e) => e.id === engines.selected) ?? null;

  useEffect(() => { void refreshEngines(); }, [refreshEngines]);
  useEffect(() => { onReadyChange?.(Boolean(selected?.status.ready)); }, [selected?.status.ready, onReadyChange]);
  // Re-check every 5 s while the chosen engine is not ready (the card turns Ready by itself).
  useInterval(() => { void refreshEngines(); }, 5000, Boolean(engines) && !selected?.status.ready);

  const choose = async (id: EngineId) => {
    setSwitching(id);
    setError("");
    try {
      await updateSettings({ engine: id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSwitching(null);
    }
  };

  if (!engines) {
    return enginesLoading ? <Skeleton variant="row" rows={3} label={t("common.checking")} /> : (
      <Callout tone="error" title={t("errors.server_unreachable")} actions={<Button size="sm" onClick={() => void refreshEngines()}>{t("common.tryAgain")}</Button>} />
    );
  }

  return (
    <div className={s.list}>
      <div className={s.toolbar}>
        <span className={s.note} aria-live="polite">{!selected?.status.ready ? t("engines.recheckNote") : ""}</span>
        <Button size="sm" icon="refresh" loading={enginesLoading} onClick={() => void refreshEngines()}>{t("common.checkAgain")}</Button>
      </div>
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {engines.engines.map((engine) => (
        <EngineCard
          key={engine.id}
          engine={engine}
          selected={engine.id === engines.selected}
          switching={switching === engine.id}
          onChoose={() => void choose(engine.id)}
        />
      ))}
    </div>
  );
}

function EngineCard({ engine, selected, switching, onChoose }: {
  engine: EngineInfo; selected: boolean; switching: boolean; onChoose: () => void;
}) {
  const headingId = `engine-${engine.id}`;
  // The server repeats terms/privacy notes in status.warnings; show each text once.
  const warnings = engine.status.warnings.filter((w) => w !== engine.terms_note && w !== engine.privacy_note);
  return (
    <Card as="section" className={`${s.card} ${selected ? s.selected : ""}`} aria-labelledby={headingId}>
      <div className={s.head}>
        <div className={s.titleBlock}>
          <span className={s.icon}><Icon name={ICONS[engine.id]} /></span>
          <div>
            <h3 id={headingId} className={s.name}>{tMaybe(`engines.${engineKey(engine.id)}.name`, engine.name)}</h3>
            <p className={s.tagline}>{tMaybe(`engines.${engineKey(engine.id)}.tagline`, "")}</p>
          </div>
        </div>
        <div className={s.badges}>
          <Badge tone="outline" icon={engine.local ? "lock" : "globe"}>{engine.local ? t("engines.local") : t("engines.online")}</Badge>
          <EngineStatus engine={engine} />
          {selected ? (
            <Badge tone="live" icon="check">{t("engines.selected")}</Badge>
          ) : (
            <Button size="sm" onClick={onChoose} loading={switching}>{t("engines.use")}</Button>
          )}
        </div>
      </div>
      <dl className={s.facts}>
        <dt>{t("engines.cost")}</dt>
        <dd>{engine.cost}</dd>
        <dt>{t("engines.data")}</dt>
        <dd>{engine.data_line}</dd>
        {engine.status.ready && engine.status.model ? (<><dt>{t("engines.model")}</dt><dd>{engine.status.model}</dd></>) : null}
      </dl>
      <div className={s.body}>
        {engine.id === "ollama" ? <OllamaBody engine={engine} /> : null}
        {engine.id === "openai_compatible" ? <OpenAiBody engine={engine} /> : null}
        {engine.id === "claude_cli" ? <ClaudeBody engine={engine} /> : null}
        {engine.id === "gemini_live" ? <GeminiBody engine={engine} /> : null}
        {warnings.length ? (
          <Callout tone="warning">{warnings.map((w) => <p key={w}>{w}</p>)}</Callout>
        ) : null}
        {selected && engine.status.ready ? <EngineTest id={engine.id} /> : null}
      </div>
    </Card>
  );
}

function engineKey(id: EngineId) {
  return id === "openai_compatible" ? "openai" : id === "claude_cli" ? "claude" : id === "gemini_live" ? "gemini" : "ollama";
}

function StatusHint({ engine }: { engine: EngineInfo }) {
  if (engine.status.ready || (!engine.status.message && !engine.status.hint)) return null;
  return (
    <Callout tone={engine.status.code === "not_configured" ? "info" : "warning"} title={engine.status.message || undefined}>
      {engine.status.hint || null}
    </Callout>
  );
}

function OllamaBody({ engine }: { engine: EngineInfo }) {
  const code = engine.status.code;
  if (code === "not_installed") {
    return (
      <Callout tone="warning" title={t("engines.ollama.notInstalled")}
        actions={<Button variant="primary" size="sm" iconRight="external" onClick={() => window.open(engine.setup_url || "https://ollama.com/download", "_blank", "noopener")}>{t("engines.ollama.download")}</Button>}>
        {t("engines.ollama.afterInstall")}
      </Callout>
    );
  }
  if (code === "not_running") {
    return (
      <Callout tone="warning" title={t("engines.ollama.notRunning")}>
        <p>{t("engines.ollama.startIt")}</p>
        <ol className={s.steps}>
          <li>{t("engines.ollama.openApp")}</li>
          <li>
            {t("engines.ollama.pasteCommand")}
            <CopyField value={engine.status.hint_command || "ollama serve"} copyLabel={t("common.copyCommand")} copiedLabel={t("common.copied")} label={t("common.command")} />
          </li>
        </ol>
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

function OllamaModelPicker() {
  const { settings, updateSettings } = useApp();
  const { data } = useLoad(() => api.ollamaModels());
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
    await updateSettings({ ollama: patch });
    setSaved(true);
  };
  return (
    <div className={s.form}>
      <Select
        label={t("engines.ollama.modelLabel")}
        value={settings?.ollama.model ?? ""}
        options={options(data.recommended)}
        hint={[t("engines.ollama.modelHint", { model: data.recommended }), data.ram_gb ? t("engines.ollama.ram", { gb: data.ram_gb }) : ""].filter(Boolean).join(" ")}
        onChange={(e) => save({ model: e.target.value })}
      />
      <Select
        label={t("engines.ollama.voiceModelLabel")}
        value={settings?.ollama.voice_model ?? ""}
        options={options(data.recommended_voice)}
        hint={t("engines.ollama.voiceModelHint", { model: data.recommended_voice })}
        onChange={(e) => save({ voice_model: e.target.value })}
      />
      <span className={s.note} aria-live="polite">{saved ? t("engines.ollama.modelSaved") : ""}</span>
    </div>
  );
}

function OpenAiBody({ engine }: { engine: EngineInfo }) {
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

function ClaudeBody({ engine }: { engine: EngineInfo }) {
  const found = engine.status.code !== "not_installed";
  return (
    <>
      <Callout tone={found ? "success" : "info"} title={found ? t("engines.claude.detected") : t("engines.claude.notFound")}
        actions={!found && engine.setup_url ? (
          <Button size="sm" iconRight="external" onClick={() => window.open(engine.setup_url, "_blank", "noopener")}>{t("engines.claude.install")}</Button>
        ) : undefined}>
        {!engine.status.ready && found ? engine.status.hint || engine.status.message : null}
      </Callout>
      {engine.terms_note ? <p className={s.note}><Icon name="info" size="sm" /> {engine.terms_note}</p> : null}
    </>
  );
}

function GeminiBody({ engine }: { engine: EngineInfo }) {
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

export function EngineTest({ id }: { id: EngineId }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EngineTestResult | null>(null);
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      setResult(await api.testEngine(id));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.actions}>
      <Button size="sm" icon="play" loading={busy} onClick={() => void run()}>{t("engines.test")}</Button>
      <span className={s.result} role="status">
        {busy ? t("engines.testing") : null}
        {result?.ok ? t("engines.testOk", { ms: result.latency_ms ?? 0 }) : null}
        {result && !result.ok ? `${t("engines.testFailed")} ${result.message ?? result.status.message}` : null}
        {err}
      </span>
    </div>
  );
}
