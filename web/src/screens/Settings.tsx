/* Settings (D76: a popup like Claude's, over the page you were on): a search field and the sections on the left, the
 * section on the right. Every setting is one row — name and description left, the control right (SettingRow).
 * Sections: engine (same flow as the setup wizard, a summary card by default), voice and speech, practice, CV,
 * appearance, privacy and data, about and what's free (D58: the free-vs-premium table of US-30, practice-only
 * statement, licence; `#free` anchor). Deep links stay: /settings/<section>[#<row>] opens the popup at that row. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useNavigationType, type Location } from "react-router-dom";
import {
  Badge, Button, Callout, Card, CopyField, Dialog, Icon, IconButton, Input, Segmented, Select, SettingRow, Skeleton,
  Textarea, Toggle, scrollBehavior, type IconName,
} from "../ds";
import { t, tp, type MessageKey } from "../i18n";
import { EnginePanel } from "../components/EnginePanel";
import { Section } from "../components/Page";
import { browserSttSupported } from "../audio/browserStt";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { prefs, type PausePref } from "../lib/prefs";
import { errorMessage, useApp } from "../lib/store";
import { useTheme } from "../lib/theme";
import type { Level, SettingsPatch } from "../lib/types";
import s from "./Settings.module.css";

const SECTIONS: { id: SectionId; icon: IconName }[] = [
  { id: "engine", icon: "cpu" },
  { id: "voice", icon: "mic" },
  { id: "practice", icon: "practice" },
  { id: "profile", icon: "user" },
  { id: "appearance", icon: "sun" },
  { id: "privacy", icon: "lock" },
  { id: "about", icon: "info" },
];
export type SectionId = "engine" | "voice" | "practice" | "profile" | "appearance" | "privacy" | "about";
/** Old section names that links still use. */
const ALIASES: Record<string, SectionId> = { storage: "privacy" };

/* ---------- search ---------- */

interface SearchItem { id: string; section: SectionId; label: MessageKey; description?: MessageKey; keywords?: string }

/** Every row a search can find. `id` is the row's anchor in its section. */
const SEARCH: SearchItem[] = [
  { id: "engine", section: "engine", label: "settings.section.engine", description: "settings.search.engine", keywords: "model ollama gemini openai claude api key local llm" },
  { id: "voice-voice", section: "voice", label: "settings.voice.voice", description: "settings.voice.title", keywords: "tts kokoro sample" },
  { id: "voice-speed", section: "voice", label: "settings.voice.speed", keywords: "rate fast slow" },
  { id: "voice-speak", section: "voice", label: "settings.voice.speak", description: "settings.voice.speakHint", keywords: "mute sound audio" },
  { id: "voice-stt", section: "voice", label: "settings.voice.sttWhere", keywords: "speech recognition stt microphone mic browser whisper" },
  { id: "voice-pause", section: "voice", label: "settings.voice.pause", description: "settings.voice.pauseHint", keywords: "silence send" },
  { id: "practice-suggester", section: "practice", label: "settings.practice.suggester", description: "settings.practice.suggesterHint", keywords: "sample answer hint" },
  { id: "practice-order", section: "practice", label: "settings.practice.layerOrder", description: "settings.practice.layerOrderHint", keywords: "feedback content delivery" },
  { id: "practice-strictness", section: "practice", label: "settings.practice.strictness", keywords: "gentle standard tough" },
  { id: "practice-questions", section: "practice", label: "settings.practice.questions", keywords: "count number length" },
  { id: "practice-level", section: "practice", label: "settings.practice.level", keywords: "english a2 b1 b2 c1" },
  { id: "profile-cv", section: "profile", label: "settings.section.profile", description: "settings.profile.hint", keywords: "resume cv upload pdf docx" },
  { id: "appearance-theme", section: "appearance", label: "theme.label", description: "settings.appearance.themeHint", keywords: "dark light mode system" },
  { id: "privacy-telemetry", section: "privacy", label: "settings.privacy.telemetry", description: "settings.privacy.telemetryHint", keywords: "analytics usage statistics" },
  { id: "privacy-folder", section: "privacy", label: "settings.privacy.folder", description: "settings.privacy.folderHint", keywords: "storage files path disk" },
  { id: "privacy-obsidian", section: "privacy", label: "settings.privacy.obsidian", description: "settings.privacy.obsidianHint", keywords: "obsidian markdown export notes" },
  { id: "privacy-trash", section: "privacy", label: "settings.privacy.trash", description: "settings.privacy.trashHint", keywords: "deleted restore" },
  { id: "free", section: "about", label: "settings.about.freeTitle", description: "settings.about.freeIntro", keywords: "premium price cost" },
  { id: "about-licence", section: "about", label: "settings.about.licenceTitle", description: "settings.about.licence", keywords: "agpl open source license" },
];

/** Rows whose name, description, section or keywords contain every word of the query. */
export function searchSettings(query: string): SearchItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return SEARCH.filter((item) => {
    const text = [t(item.label), item.description ? t(item.description) : "", t(`settings.section.${item.section}`), item.keywords ?? ""]
      .join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/* ---------- route ---------- */

const HOME: Location = { pathname: "/", search: "", hash: "", state: null, key: "settings-home" };

/** `/settings/<section>` → the section (aliases resolved, unknown → engine); null when the path is not Settings. */
export function settingsSection(pathname: string): { section: SectionId; canonical: boolean } | null {
  const m = /^\/settings(?:\/([^/]*))?\/?$/.exec(pathname);
  if (!m) return null;
  const raw = m[1] ?? "";
  if (SECTIONS.some((x) => x.id === raw)) return { section: raw as SectionId, canonical: true };
  return { section: ALIASES[raw] ?? "engine", canonical: false };
}

/** Settings open as a popup over the page you came from (D76). Returns the location the page routes should render —
 * the last page before Settings, or Home on a direct visit — and the dialog. Closing goes back in history when Settings
 * was opened from inside the app (section switches replace, so one step back is the page), otherwise to Home. */
export function useSettingsRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const route = settingsSection(location.pathname);
  const open = route !== null;
  const [page, setPage] = useState<Location | null>(open ? null : location);
  const [from, setFrom] = useState<"push" | "direct" | null>(null);
  const [section, setSection] = useState<SectionId>(route?.section ?? "engine");
  if (!open && page !== location) setPage(location);
  if (!open && from !== null) setFrom(null);
  if (open && from === null) setFrom(page && navType === "PUSH" ? "push" : "direct");
  if (route && route.section !== section) setSection(route.section);

  useEffect(() => {
    if (route && !route.canonical) navigate(`/settings/${route.section}${location.hash}`, { replace: true, state: location.state });
  }, [route, location.hash, location.state, navigate]);

  const close = () => {
    if (from === "push") navigate(-1);
    else navigate(page ? { pathname: page.pathname, search: page.search, hash: page.hash } : "/", { replace: true });
  };
  const pageLocation = open ? page ?? HOME : location;
  return {
    open,
    pageLocation,
    dialog: <SettingsDialog open={open} section={section} onClose={close} />,
  };
}

interface ReviewProps {
  /** Review and stories: open with this search typed in. */
  initialQuery?: string;
  /** Review and stories: this content instead of the section's own (e.g. the engine panel at a given step). */
  content?: ReactNode;
}

/** Review frames and stories: the popup at the router's current section, nothing behind it. */
export function SettingsScreen(props: ReviewProps) {
  const { pathname } = useLocation();
  return <SettingsDialog open section={settingsSection(pathname)?.section ?? "engine"} onClose={() => {}} {...props} />;
}

export function SettingsDialog({ open, section, onClose, ...review }: { open: boolean; section: SectionId; onClose: () => void } & ReviewProps) {
  return (
    <Dialog open={open} size="lg" title={t("settings.title")} closeLabel={t("common.close")} onClose={onClose}>
      <SettingsBody section={section} {...review} />
    </Dialog>
  );
}

function SettingsBody({ section, initialQuery = "", content: override }: { section: SectionId } & ReviewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState(initialQuery);
  const results = query.trim() ? searchSettings(query) : null;
  const content = useRef<HTMLDivElement>(null);

  // A row named by the hash (deep link, search result): scroll it into view and mark it. Rows of a loading section
  // appear a moment later, so look again for a short while.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || results) return;
    let tries = 0;
    let unmark = 0;
    const find = window.setInterval(() => {
      const el = document.getElementById(id);
      if (!el && ++tries < 20) return;
      window.clearInterval(find);
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: scrollBehavior() });
      el.setAttribute("data-found", "");
      unmark = window.setTimeout(() => el.removeAttribute("data-found"), 2600);
    }, 100);
    return () => { window.clearInterval(find); window.clearTimeout(unmark); };
    // location.key: the same result picked twice marks it again.
  }, [location.key, location.hash, section, results]);

  const go = (item: SearchItem) => {
    setQuery("");
    navigate(`/settings/${item.section}${item.id === item.section ? "" : `#${item.id}`}`, { replace: true });
  };

  return (
    <div className={s.layout}>
      <div className={s.side}>
        <div className={s.search} role="search">
          <Input
            type="search"
            label={t("settings.search.label")}
            hideLabel
            placeholder={t("settings.search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && results?.[0]) go(results[0]); }}
            adornment={query
              ? <IconButton icon="x" size="sm" label={t("settings.search.clear")} onClick={() => setQuery("")} />
              : <Icon name="search" size="sm" />}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <nav aria-label={t("settings.sections")}>
          <ul className={s.nav}>
            {SECTIONS.map((x) => (
              <li key={x.id}>
                <Link className={s.navLink} to={`/settings/${x.id}`} replace onClick={() => setQuery("")}
                  aria-current={!results && x.id === section ? "page" : undefined}>
                  <Icon name={x.icon} size="sm" />{t(`settings.section.${x.id}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div key={results ? "search" : section} ref={content} className={s.content}>
        {results ? <SearchResults query={query.trim()} results={results} onPick={go} /> : override ?? <SectionContent id={section} />}
      </div>
    </div>
  );
}

function SearchResults({ query, results, onPick }: { query: string; results: SearchItem[]; onPick: (item: SearchItem) => void }) {
  return (
    <section aria-labelledby="settings-results" className={s.results}>
      <h2 id="settings-results" className={s.resultsTitle} role="status">
        {results.length ? tp("settings.search.results", results.length) : t("settings.search.empty", { q: query })}
      </h2>
      {results.length ? (
        <ul className={s.resultList}>
          {results.map((item) => (
            <li key={item.id}>
              <button type="button" className={s.result} onClick={() => onPick(item)}>
                <span className={s.resultLabel}>{t(item.label)}</span>
                <span className={s.resultMeta}>
                  {t(`settings.section.${item.section}`)}
                  {item.description ? ` · ${t(item.description)}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SectionContent({ id }: { id: SectionId }) {
  if (id === "engine") return <div id="engine"><EnginePanel mode="settings" /></div>;
  if (id === "voice") return <VoiceSection />;
  if (id === "practice") return <PracticeSection />;
  if (id === "profile") return <ProfileSection />;
  if (id === "appearance") return <AppearanceSection />;
  if (id === "privacy") return <PrivacySection />;
  return <AboutSection />;
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

/** A field in a row's control column: one width for every select, so they line up. */
function Field({ children }: { children: ReactNode }) {
  return <div data-field="">{children}</div>;
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
  const sttHint = sttPref === "server"
    ? stt.data?.available === false ? t("settings.voice.sttServerMissing") : t("settings.voice.sttServerHint", { backend: stt.data?.backend ?? "" })
    : browserOk ? t("settings.voice.sttBrowserHint") : t("settings.voice.sttBrowserUnsupported");
  return (
    <>
      <Section title={t("settings.voice.title")} id="voice-title">
        {!ttsOk ? <Callout tone="info">{t("settings.voice.unavailable")}</Callout> : null}
        <div className={s.rows}>
          <SettingRow id="voice-voice" label={t("settings.voice.voice")}>
            <Field>
              <Select
                label={t("settings.voice.voice")}
                hideLabel
                value={voice}
                disabled={!ttsOk || !voices.data}
                onChange={(e) => void save({ voice: e.target.value })}
                options={(voices.data?.voices ?? []).map((v) => ({ value: v.id, label: `${v.label} · ${v.locale}` }))}
              />
            </Field>
            <IconButton icon="play" label={t("settings.voice.sample")} onClick={play} disabled={!ttsOk || !voice} />
          </SettingRow>
          <SettingRow id="voice-speed" label={t("settings.voice.speed")}>
            <Field>
              <Select
                label={t("settings.voice.speed")}
                hideLabel
                value={String(settings.kokoro_speed)}
                disabled={!ttsOk}
                onChange={(e) => void save({ kokoro_speed: Number(e.target.value) })}
                options={[0.8, 0.9, 1, 1.1, 1.2].map((n) => ({ value: String(n), label: t("settings.voice.speedValue", { n }) }))}
              />
            </Field>
          </SettingRow>
          <SettingRow id="voice-speak" label={t("settings.voice.speak")} description={t("settings.voice.speakHint")}>
            <Toggle label={t("settings.voice.speak")} hideLabel checked={speak}
              onChange={(v) => { setSpeak(v); prefs.setSpeak(v); }} />
          </SettingRow>
        </div>
        {view}
      </Section>
      <Section title={t("settings.voice.stt")} id="stt-title">
        <div className={s.rows}>
          <SettingRow id="voice-stt" label={t("settings.voice.sttWhere")} description={sttHint}>
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
          </SettingRow>
          <SettingRow id="voice-pause" label={t("settings.voice.pause")} description={t("settings.voice.pauseHint")}>
            <Field>
              <Select
                label={t("settings.voice.pause")}
                hideLabel
                value={String(pause)}
                onChange={(e) => { const v = Number(e.target.value) as PausePref; setPause(v); prefs.setPause(v); }}
                options={[2, 3, 5].map((n) => ({ value: String(n), label: t("settings.voice.pauseValue", { n }) }))
                  .concat([{ value: "0", label: t("settings.voice.pauseManual") }])}
              />
            </Field>
          </SettingRow>
        </div>
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
      <div className={s.rows}>
        <SettingRow id="practice-suggester" label={t("settings.practice.suggester")} description={t("settings.practice.suggesterHint")}>
          <Toggle label={t("settings.practice.suggester")} hideLabel
            checked={settings.answer_suggester} onChange={(v) => void save({ answer_suggester: v })} />
        </SettingRow>
        <SettingRow id="practice-order" label={t("settings.practice.layerOrder")} description={t("settings.practice.layerOrderHint")}>
          <Segmented
            label={t("settings.practice.layerOrder")}
            hideLabel
            value={settings.layer_order}
            onChange={(v) => void save({ layer_order: v })}
            options={[
              { value: "content-first", label: t("settings.practice.contentFirst") },
              { value: "delivery-first", label: t("settings.practice.deliveryFirst") },
            ]}
          />
        </SettingRow>
        <SettingRow id="practice-strictness" label={t("settings.practice.strictness")}>
          <Segmented
            label={t("settings.practice.strictness")}
            hideLabel
            value={String(settings.strictness) as "1" | "2" | "3"}
            onChange={(v) => void save({ strictness: Number(v) as 1 | 2 | 3 })}
            options={[
              { value: "1", label: t("home.round.gentle") },
              { value: "2", label: t("home.round.standard") },
              { value: "3", label: t("home.round.tough") },
            ]}
          />
        </SettingRow>
        <SettingRow id="practice-questions" label={t("settings.practice.questions")}>
          <Field>
            <Select label={t("settings.practice.questions")} hideLabel value={String(settings.questions_per_session)}
              onChange={(e) => void save({ questions_per_session: Number(e.target.value) })}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))} />
          </Field>
        </SettingRow>
        <SettingRow id="practice-level" label={t("settings.practice.level")}>
          <Field>
            <Select label={t("settings.practice.level")} hideLabel value={settings.level}
              onChange={(e) => void save({ level: e.target.value as Level })}
              options={(["A2", "B1", "B2", "C1"] as const).map((l) => ({ value: l, label: `${l} · ${t(`english.levels.${l}`)}` }))} />
          </Field>
        </SettingRow>
      </div>
      {view}
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
  const status = profile.data?.text
    ? `${t("settings.profile.updated", { date: formatDateTime(profile.data.updated) })}${profile.data.source ? ` · ${t("settings.profile.source", { source: profile.data.source })}` : ""}`
    : profile.data ? t("settings.profile.empty") : null;
  return (
    <Section title={t("settings.profile.title")} id="profile-title">
      <div className={s.rows}>
        <SettingRow id="profile-cv" layout="stack" label={t("settings.profile.cv")}
          description={<>{t("settings.profile.hint")}{status ? <><br />{status}</> : null}</>}>
          <Field>
            <Textarea label={t("setup.about.cv")} hideLabel placeholder={t("setup.about.cvPlaceholder")} rows={10} value={value}
              onChange={(e) => setText(e.target.value)} showCount />
          </Field>
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
        </SettingRow>
      </div>
      {message ? <Callout tone={message.tone} live={message.tone === "error" ? "alert" : "status"}>{message.text}</Callout> : null}
    </Section>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useTheme();
  return (
    <Section title={t("settings.appearance.title")} id="appearance-title">
      <div className={s.rows}>
        <SettingRow id="appearance-theme" label={t("theme.label")} description={t("settings.appearance.themeHint")}>
          <Segmented
            label={t("theme.label")}
            hideLabel
            value={theme}
            onChange={setTheme}
            options={[
              { value: "system", label: t("theme.system"), icon: "monitor" },
              { value: "light", label: t("theme.light"), icon: "sun" },
              { value: "dark", label: t("theme.dark"), icon: "moon" },
            ]}
          />
        </SettingRow>
      </div>
    </Section>
  );
}

function PrivacySection() {
  const { settings } = useApp();
  const telemetry = useLoad(() => api.telemetry());
  const health = useLoad(() => api.health());
  const trash = useLoad(() => api.trash());
  const { save, view } = useSave();
  const [folder, setFolder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const setOpt = (optIn: boolean, clear = false) => {
    setError("");
    api.setTelemetry(optIn, clear).then((info) => telemetry.setData(info)).catch((e: unknown) => setError(errorMessage(e)));
  };
  const info = telemetry.data;
  const obsidian = folder ?? settings?.obsidian_dir ?? "";
  const trashCount = trash.data?.items.length ?? 0;
  return (
    <Section title={t("settings.privacy.title")} id="privacy-title">
      <div className={s.rows}>
        <SettingRow id="privacy-telemetry" label={t("settings.privacy.telemetry")}
          description={(
            <>
              {info?.what || t("settings.privacy.telemetryHint")}
              {info ? (
                <span className={s.meta}>
                  {tp("settings.privacy.events", info.events)}
                  {info.events ? <Button variant="link" size="sm" onClick={() => setOpt(info.opt_in, true)}>{t("settings.privacy.clear")}</Button> : null}
                </span>
              ) : null}
            </>
          )}>
          <Toggle label={t("settings.privacy.telemetry")} hideLabel checked={Boolean(info?.opt_in)} disabled={!info} onChange={(v) => setOpt(v)} />
        </SettingRow>
        <SettingRow id="privacy-folder" layout="stack" label={t("settings.privacy.folder")} description={t("settings.privacy.folderHint")}>
          {health.data ? (
            <Field><CopyField label={t("settings.privacy.folder")} value={health.data.data_dir} copyLabel={t("common.copy")} copiedLabel={t("common.copied")} /></Field>
          ) : <Skeleton lines={1} />}
        </SettingRow>
        <SettingRow id="privacy-obsidian" layout="stack" label={<>{t("settings.privacy.obsidian")}<span className={s.optional}> · {t("common.optional")}</span></>}
          description={t("settings.privacy.obsidianHint")}>
          <div className={s.inputRow}>
            <Input label={t("settings.privacy.obsidian")} hideLabel value={obsidian} onChange={(e) => setFolder(e.target.value)} spellCheck={false} />
            <Button variant="secondary" disabled={folder === null}
              onClick={() => void save({ obsidian_dir: obsidian.trim() }).then(() => setFolder(null))}>{t("settings.privacy.obsidianSave")}</Button>
          </div>
        </SettingRow>
        <SettingRow id="privacy-trash" label={t("settings.privacy.trash")} description={t("settings.privacy.trashHint")}>
          <Link to="/history/trash" className={s.rowLink}>
            <Icon name="trash" size="sm" />
            {trashCount ? t("history.trashCount", { n: trashCount }) : t("settings.privacy.trashOpen")}
          </Link>
        </SettingRow>
      </div>
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {view}
    </Section>
  );
}

/** US-30 rows in table order: free-forever features first, then what Premium adds. A text cell says what the free core
 * offers instead (D13); no cell means "not included". */
const FREE_ROWS = ["practice", "english", "prep", "bank", "debrief", "memory", "drill"] as const;
const PREMIUM_ROWS = [
  { id: "setup", free: "setup" },
  { id: "voice", free: "voice" },
  { id: "trends", free: null },
  { id: "devices", free: "devices" },
] as const;

function Included() {
  return <span className={s.yes}><Icon name="check" size="sm" /><span className="visually-hidden">{t("settings.about.included")}</span></span>;
}

function NotIncluded() {
  return <span className={s.no}><span aria-hidden="true">—</span><span className="visually-hidden">{t("settings.about.notIncluded")}</span></span>;
}

/** About and what's free (D58): reached from the account menu ("Help & what's free") and Home's "What's free" link. */
function AboutSection() {
  return (
    <>
      <div id="free" className={s.anchor}>
        <Section title={t("settings.about.freeTitle")} id="about-free-title">
          <p className={s.lead}>{t("settings.about.freeIntro")}</p>
          <Card className={s.tableCard}>
            <table className={s.table} data-review-id="Settings/freeTable">
              <caption className="visually-hidden">{t("settings.about.tableCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("settings.about.feature")}</th>
                  <th scope="col">{t("settings.about.free")}</th>
                  <th scope="col">
                    <span className={s.premiumHead}>{t("settings.about.premium")}<Badge tone="outline">{t("settings.about.later")}</Badge></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FREE_ROWS.map((id) => (
                  <tr key={id}>
                    <th scope="row">{t(`settings.about.row.${id}`)}</th>
                    <td><Included /></td>
                    <td><Included /></td>
                  </tr>
                ))}
                {PREMIUM_ROWS.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{t(`settings.about.row.${row.id}`)}</th>
                    <td>{row.free ? <span className={s.cellText}>{t(`settings.about.cell.${row.free}`)}</span> : <NotIncluded />}</td>
                    <td><Included /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className={s.hint}>{t("settings.about.premiumNote")}</p>
        </Section>
      </div>
      <Section title={t("settings.about.practiceTitle")} id="about-practice-title">
        <Callout tone="info">{t("app.practiceOnly")}</Callout>
      </Section>
      <div id="about-licence" className={s.anchor}>
        <Section title={t("settings.about.licenceTitle")} id="about-licence-title">
          <p className={s.lead}>{t("settings.about.licence")}</p>
        </Section>
      </div>
    </>
  );
}
