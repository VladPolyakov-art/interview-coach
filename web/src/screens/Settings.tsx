/* Settings: engine (same panel as the setup wizard), voice and speech, practice, CV, appearance, privacy and data. */
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button, Callout, Card, CopyField, Icon, Segmented, Select, Skeleton, Textarea, Toggle, Input, type IconName } from "../ds";
import { t, tp } from "../i18n";
import { EnginePanel } from "../components/EnginePanel";
import { Page, Section } from "../components/Page";
import { browserSttSupported } from "../audio/browserStt";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { prefs, type PausePref } from "../lib/prefs";
import { errorMessage, useApp } from "../lib/store";
import { useTheme } from "../lib/theme";
import type { Level, SettingsPatch } from "../lib/types";
import s from "./Settings.module.css";

const SECTIONS: { id: string; icon: IconName }[] = [
  { id: "engine", icon: "cpu" },
  { id: "voice", icon: "mic" },
  { id: "practice", icon: "practice" },
  { id: "profile", icon: "user" },
  { id: "appearance", icon: "sun" },
  { id: "privacy", icon: "lock" },
];
type SectionId = "engine" | "voice" | "practice" | "profile" | "appearance" | "privacy";

export function SettingsScreen() {
  const { section = "engine" } = useParams();
  if (!SECTIONS.some((x) => x.id === section)) return <Navigate to="/settings/engine" replace />;
  const id = section as SectionId;
  return <SettingsLayout id={id} />;
}

function SettingsLayout({ id }: { id: SectionId }) {
  // Switching sections swaps the content with a short rise; the first section arrives with the page itself.
  const firstId = useRef(id);
  return (
    <Page title={t("settings.title")}>
      <div className={s.layout}>
        <nav aria-label={t("settings.sections")}>
          <ul className={s.nav}>
            {SECTIONS.map((x) => (
              <li key={x.id}>
                <Link className={s.navLink} to={`/settings/${x.id}`} aria-current={x.id === id ? "page" : undefined}>
                  <Icon name={x.icon} size="sm" />{t(`settings.section.${x.id as SectionId}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div key={id} className={`${s.content} ${id !== firstId.current ? "motion-rise-base" : ""}`}>
          {id === "engine" ? <EnginePanel /> : null}
          {id === "voice" ? <VoiceSection /> : null}
          {id === "practice" ? <PracticeSection /> : null}
          {id === "profile" ? <ProfileSection /> : null}
          {id === "appearance" ? <AppearanceSection /> : null}
          {id === "privacy" ? <PrivacySection /> : null}
        </div>
      </div>
    </Page>
  );
}

/** Saves a settings patch and reports the result in a small status line. */
function useSave() {
  const { updateSettings } = useApp();
  const [state, setState] = useState<{ status: "idle" | "saving" | "saved" | "error"; message?: string }>({ status: "idle" });
  const save = async (patch: SettingsPatch) => {
    setState({ status: "saving" });
    try {
      await updateSettings(patch);
      setState({ status: "saved" });
    } catch (e) {
      setState({ status: "error", message: errorMessage(e) });
    }
  };
  const view = state.status === "saved"
    ? <span className={s.status} role="status"><Icon name="check" size="sm" />{t("settings.saved")}</span>
    : state.status === "error"
      ? <Callout tone="error" live="alert">{t("settings.saveError", { message: state.message ?? "" })}</Callout>
      : <span role="status" />;
  return { save, view };
}

function VoiceSection() {
  const { settings } = useApp();
  const voices = useLoad(() => api.voices());
  const stt = useLoad(() => api.stt());
  const { save, view } = useSave();
  const [speak, setSpeak] = useState(prefs.speak());
  const [sttPref, setSttPref] = useState(prefs.stt());
  const [pause, setPause] = useState<PausePref>(prefs.pause());
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  if (!settings) return <Skeleton lines={4} />;
  const ttsOk = voices.data?.tts.available !== false;
  const voice = settings.voice || voices.data?.default || "";
  const play = () => {
    audio.current?.pause();
    audio.current = new Audio(api.voiceSampleUrl(voice));
    void audio.current.play().catch(() => {});
  };
  const browserOk = browserSttSupported();
  return (
    <>
      <Section title={t("settings.voice.title")} id="voice-title">
        <Card className={s.stack}>
          {!ttsOk ? <Callout tone="info">{t("settings.voice.unavailable")}</Callout> : null}
          <div className={s.row}>
            <div className={s.grow}>
              <Select
                label={t("settings.voice.voice")}
                value={voice}
                disabled={!ttsOk || !voices.data}
                onChange={(e) => void save({ voice: e.target.value })}
                options={(voices.data?.voices ?? []).map((v) => ({ value: v.id, label: `${v.label} · ${v.locale}` }))}
              />
            </div>
            <Button variant="secondary" icon="play" onClick={play} disabled={!ttsOk || !voice}>{t("settings.voice.sample")}</Button>
          </div>
          <div className={s.narrowField}>
            <Select
              label={t("settings.voice.speed")}
              value={String(settings.kokoro_speed)}
              disabled={!ttsOk}
              onChange={(e) => void save({ kokoro_speed: Number(e.target.value) })}
              options={[0.8, 0.9, 1, 1.1, 1.2].map((n) => ({ value: String(n), label: t("settings.voice.speedValue", { n }) }))}
            />
          </div>
          <Toggle label={t("settings.voice.speak")} description={t("settings.voice.speakHint")} checked={speak}
            onChange={(v) => { setSpeak(v); prefs.setSpeak(v); }} />
          {view}
        </Card>
      </Section>
      <Section title={t("settings.voice.stt")} id="stt-title">
        <Card className={s.stack}>
          <Segmented
            label={t("settings.voice.stt")}
            hideLabel
            value={sttPref}
            onChange={(v) => { setSttPref(v); prefs.setStt(v); }}
            options={[
              { value: "server", label: t("settings.voice.sttServer"), icon: "lock", disabled: stt.data?.available === false },
              { value: "browser", label: t("settings.voice.sttBrowser"), icon: "globe", disabled: !browserOk },
            ]}
          />
          <p className={s.hint}>
            {sttPref === "server"
              ? stt.data?.available === false ? t("settings.voice.sttServerMissing") : t("settings.voice.sttServerHint", { backend: stt.data?.backend ?? "" })
              : browserOk ? t("settings.voice.sttBrowserHint") : t("settings.voice.sttBrowserUnsupported")}
          </p>
          <div className={s.narrowField}>
            <Select
              label={t("settings.voice.pause")}
              hint={t("settings.voice.pauseHint")}
              value={String(pause)}
              onChange={(e) => { const v = Number(e.target.value) as PausePref; setPause(v); prefs.setPause(v); }}
              options={[2, 3, 5].map((n) => ({ value: String(n), label: t("settings.voice.pauseValue", { n }) }))
                .concat([{ value: "0", label: t("settings.voice.pauseManual") }])}
            />
          </div>
        </Card>
      </Section>
    </>
  );
}

function PracticeSection() {
  const { settings } = useApp();
  const { save, view } = useSave();
  if (!settings) return <Skeleton lines={4} />;
  return (
    <Section title={t("settings.practice.title")} id="practice-title">
      <Card className={s.stack}>
        <Toggle label={t("settings.practice.suggester")} description={t("settings.practice.suggesterHint")}
          checked={settings.answer_suggester} onChange={(v) => void save({ answer_suggester: v })} />
        <div>
          <Segmented
            label={t("settings.practice.layerOrder")}
            value={settings.layer_order}
            onChange={(v) => void save({ layer_order: v })}
            options={[
              { value: "content-first", label: t("settings.practice.contentFirst") },
              { value: "delivery-first", label: t("settings.practice.deliveryFirst") },
            ]}
          />
          <p className={s.hint}>{t("settings.practice.layerOrderHint")}</p>
        </div>
        <Segmented
          label={t("settings.practice.strictness")}
          value={String(settings.strictness) as "1" | "2" | "3"}
          onChange={(v) => void save({ strictness: Number(v) as 1 | 2 | 3 })}
          options={[
            { value: "1", label: t("home.round.gentle") },
            { value: "2", label: t("home.round.standard") },
            { value: "3", label: t("home.round.tough") },
          ]}
        />
        <div className={s.row}>
          <div className={s.narrowField}>
            <Select label={t("settings.practice.questions")} value={String(settings.questions_per_session)}
              onChange={(e) => void save({ questions_per_session: Number(e.target.value) })}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))} />
          </div>
          <div className={s.narrowField}>
            <Select label={t("settings.practice.level")} value={settings.level}
              onChange={(e) => void save({ level: e.target.value as Level })}
              options={(["A2", "B1", "B2", "C1"] as const).map((l) => ({ value: l, label: `${l} · ${t(`english.levels.${l}`)}` }))} />
          </div>
        </div>
        {view}
      </Card>
    </Section>
  );
}

function ProfileSection() {
  const profile = useLoad(() => api.profile());
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const value = text ?? profile.data?.text ?? "";
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: "success", text: ok });
      setText(null);
      profile.reload();
    } catch (e) {
      setMessage({ tone: "error", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title={t("settings.profile.title")} id="profile-title">
      <Card className={s.stack}>
        <p className={s.hint}>{t("settings.profile.hint")}</p>
        {profile.data?.text ? (
          <p className={s.hint}>
            {t("settings.profile.updated", { date: formatDateTime(profile.data.updated) })}
            {profile.data.source ? ` · ${t("settings.profile.source", { source: profile.data.source })}` : ""}
          </p>
        ) : profile.data ? <p className={s.hint}>{t("settings.profile.empty")}</p> : null}
        <Textarea label={t("setup.about.cv")} placeholder={t("setup.about.cvPlaceholder")} rows={10} value={value}
          onChange={(e) => setText(e.target.value)} showCount />
        <div className={s.row}>
          <Button variant="primary" loading={busy} disabled={text === null || !value.trim()}
            onClick={() => void run(() => api.saveProfile(value, "paste"), t("setup.about.cvSaved"))}>{t("common.save")}</Button>
          <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()} disabled={busy}>{t("setup.about.cvUpload")}</Button>
          <input ref={fileRef} type="file" className={s.fileInput} accept=".pdf,.docx,.txt,.md" tabIndex={-1} aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void run(() => api.uploadProfile(file), t("setup.about.cvSaved"));
            }} />
          {profile.data?.text ? (
            <Button variant="ghost" icon="trash" disabled={busy}
              onClick={() => void run(() => api.deleteProfile(), t("settings.profile.removed"))}>{t("settings.profile.remove")}</Button>
          ) : null}
        </div>
        {message ? <Callout tone={message.tone} live={message.tone === "error" ? "alert" : "status"}>{message.text}</Callout> : null}
      </Card>
    </Section>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useTheme();
  return (
    <Section title={t("settings.appearance.title")} id="appearance-title">
      <Card className={s.stack}>
        <Segmented
          label={t("theme.label")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("theme.system"), icon: "monitor" },
            { value: "light", label: t("theme.light"), icon: "sun" },
            { value: "dark", label: t("theme.dark"), icon: "moon" },
          ]}
        />
        <p className={s.hint}>{t("settings.appearance.themeHint")}</p>
      </Card>
    </Section>
  );
}

function PrivacySection() {
  const { settings } = useApp();
  const telemetry = useLoad(() => api.telemetry());
  const health = useLoad(() => api.health());
  const { save, view } = useSave();
  const [folder, setFolder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const setOpt = (optIn: boolean, clear = false) => {
    setError("");
    api.setTelemetry(optIn, clear).then((info) => telemetry.setData(info)).catch((e: unknown) => setError(errorMessage(e)));
  };
  const info = telemetry.data;
  const obsidian = folder ?? settings?.obsidian_dir ?? "";
  return (
    <Section title={t("settings.privacy.title")} id="privacy-title">
      <Card className={s.stack}>
        <Toggle label={t("settings.privacy.telemetry")} description={info?.what || t("settings.privacy.telemetryHint")}
          checked={Boolean(info?.opt_in)} disabled={!info} onChange={(v) => setOpt(v)} />
        {info ? (
          <div className={s.row}>
            <span className={s.hint}>{tp("settings.privacy.events", info.events)}</span>
            {info.events ? <Button variant="link" size="sm" onClick={() => setOpt(info.opt_in, true)}>{t("settings.privacy.clear")}</Button> : null}
          </div>
        ) : null}
        {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      </Card>
      <Card className={s.stack}>
        {health.data ? (
          <CopyField label={t("settings.privacy.folder")} value={health.data.data_dir} copyLabel={t("common.copy")} copiedLabel={t("common.copied")} />
        ) : null}
        <p className={s.hint}>{t("settings.privacy.folderHint")}</p>
        <div className={s.row}>
          <div className={s.grow}>
            <Input label={t("settings.privacy.obsidian")} hint={t("settings.privacy.obsidianHint")} optionalText={t("common.optional")}
              value={obsidian} onChange={(e) => setFolder(e.target.value)} spellCheck={false} />
          </div>
          <Button variant="secondary" disabled={folder === null}
            onClick={() => void save({ obsidian_dir: obsidian.trim() }).then(() => setFolder(null))}>{t("settings.privacy.obsidianSave")}</Button>
        </div>
        {view}
      </Card>
    </Section>
  );
}
