/* Settings (D76: a popup like Claude's, over the page you were on): a search field and the sections on the left, the
 * section on the right. Every setting is one row — name and description left, the control right (SettingRow); rows
 * sit in titled groups, one rounded box each (SettingGroup, D78), so a section's parts are easy to tell apart.
 * Sections (D78): general (your CV: a file to drop or replace, its text under a disclosure; the theme), AI engine (the
 * engine in use on top, the others under it, each set up in place), voice and speech, practice, privacy and data,
 * about and what's free (D58: the free-vs-premium table of US-30, practice-only statement, licence; `#free` anchor).
 * Deep links stay: /settings/<section>[#<row>] opens the popup at that row; old sections redirect (profile → general).
 * A change that is saved shows a short "Saved" toast. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useNavigationType, type Location } from "react-router-dom";
import {
  Badge, Button, Callout, CopyField, Dialog, Disclosure, FileDrop, Icon, IconButton, Input, Segmented, Select, SettingGroup,
  SettingRow, Skeleton, Textarea, Toggle, scrollBehavior, useToast, type IconName,
} from "../ds";
import { t, tp, type MessageKey } from "../i18n";
import { EnginePanel } from "../components/EnginePanel";
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
  { id: "general", icon: "settings" },
  { id: "engine", icon: "sparkle" },
  { id: "voice", icon: "mic" },
  { id: "practice", icon: "practice" },
  { id: "privacy", icon: "lock" },
  { id: "about", icon: "info" },
];
export type SectionId = "general" | "engine" | "voice" | "practice" | "privacy" | "about";
const DEFAULT_SECTION: SectionId = "general";
/** Old section names that links still use, with the row they meant. */
const ALIASES: Record<string, { section: SectionId; hash?: string }> = {
  storage: { section: "privacy" },
  profile: { section: "general", hash: "profile-cv" },
  appearance: { section: "general", hash: "general-theme" },
};
/** How long the "Saved" toast stays (D78): long enough to read one word. */
const SAVED_MS = 1600;

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
  { id: "profile-cv", section: "general", label: "settings.profile.title", description: "settings.profile.hint", keywords: "resume cv upload pdf docx file profile" },
  { id: "general-theme", section: "general", label: "theme.label", description: "settings.appearance.themeHint", keywords: "dark light mode system appearance" },
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

/** `/settings/<section>` → the section (aliases resolved, unknown → general); null when the path is not Settings. */
export function settingsSection(pathname: string): { section: SectionId; canonical: boolean; hash?: string } | null {
  const m = /^\/settings(?:\/([^/]*))?\/?$/.exec(pathname);
  if (!m) return null;
  const raw = m[1] ?? "";
  if (SECTIONS.some((x) => x.id === raw)) return { section: raw as SectionId, canonical: true };
  const alias = ALIASES[raw];
  return { section: alias?.section ?? DEFAULT_SECTION, canonical: false, hash: alias?.hash };
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
  const [section, setSection] = useState<SectionId>(route?.section ?? DEFAULT_SECTION);
  if (!open && page !== location) setPage(location);
  if (!open && from !== null) setFrom(null);
  if (open && from === null) setFrom(page && navType === "PUSH" ? "push" : "direct");
  if (route && route.section !== section) setSection(route.section);

  useEffect(() => {
    if (route && !route.canonical) {
      const hash = location.hash || (route.hash ? `#${route.hash}` : "");
      navigate(`/settings/${route.section}${hash}`, { replace: true, state: location.state });
    }
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
  return <SettingsDialog open section={settingsSection(pathname)?.section ?? DEFAULT_SECTION} onClose={() => {}} {...props} />;
}

export function SettingsDialog({ open, section, onClose, ...review }: { open: boolean; section: SectionId; onClose: () => void } & ReviewProps) {
  return (
    <Dialog open={open} size="lg" title={t("settings.title")} closeLabel={t("common.close")} onClose={onClose} closeOnBackdrop>
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
              : <span className={s.searchIcon}><Icon name="search" size="sm" /></span>}
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
        {results ? <SearchResults query={query.trim()} results={results} onPick={go} /> : (
          <>
            <h2 className={s.pageTitle}>{t(`settings.section.${section}`)}</h2>
            {override ?? <SectionContent id={section} />}
          </>
        )}
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
  if (id === "general") return <GeneralSection />;
  if (id === "engine") return <div id="engine"><EnginePanel mode="settings" /></div>;
  if (id === "voice") return <VoiceSection />;
  if (id === "practice") return <PracticeSection />;
  if (id === "privacy") return <PrivacySection />;
  return <AboutSection />;
}

/** Saves a settings patch: a short "Saved" toast on success (D78), an error callout where the row is. */
function useSave() {
  const { updateSettings } = useApp();
  const saved = useSavedToast();
  const [error, setError] = useState("");
  const save = async (patch: SettingsPatch) => {
    setError("");
    try {
      await updateSettings(patch);
      saved();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const view = error ? <Callout tone="error" live="alert">{t("settings.saveError", { message: error })}</Callout> : null;
  return { save, view };
}

function useSavedToast() {
  const toast = useToast();
  return (message = t("settings.saved")) => {
    toast.show({ message: <span className={s.saved}><Icon name="check" size="sm" />{message}</span>, duration: SAVED_MS });
  };
}

function GeneralSection() {
  const [theme, setTheme] = useTheme();
  return (
    <>
      <CvGroup />
      <SettingGroup title={t("settings.appearance.title")} id="appearance-title">
        <SettingRow id="general-theme" label={t("theme.label")} description={t("settings.appearance.themeHint")}>
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
      </SettingGroup>
    </>
  );
}

/** Your CV (D78): the file itself — drop one, replace it, remove it — and the text Mike reads, under a disclosure
 * (open it to paste a CV as text, or to fix what came out of the file). */
function CvGroup() {
  const profile = useLoad(() => api.profile());
  const saved = useSavedToast();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState<"file" | "text" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const data = profile.data;
  const has = Boolean(data?.text);
  const value = text ?? data?.text ?? "";
  const fileName = data?.source.startsWith("file:") ? data.source.slice(5) : null;
  const run = async (kind: "file" | "text" | "remove", fn: () => Promise<unknown>, ok: string) => {
    setBusy(kind);
    setError("");
    try {
      await fn();
      saved(ok);
      setText(null);
      profile.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      setReading(null);
    }
  };
  const upload = (file: File) => {
    setReading(file.name);
    void run("file", () => api.uploadProfile(file), t("setup.about.cvSaved"));
  };
  if (!data) return profile.error ? <Callout tone="error">{errorMessage(profile.error)}</Callout> : <Skeleton lines={3} />;
  const state = reading ? "reading" : error && busy === null && !has ? "error" : has ? "chosen" : "empty";
  return (
    <SettingGroup title={t("settings.profile.title")} id="profile-title" description={t("settings.profile.hint")}>
      <div id="profile-cv" className={s.cvFile}>
        <FileDrop
          label={t("settings.profile.fileLabel")}
          prompt={t("settings.profile.drop")}
          browseLabel={t("settings.profile.browse")}
          hint={t("settings.profile.fileHint")}
          accept=".pdf,.docx,.txt,.md"
          state={state}
          file={reading ? { name: reading } : { name: fileName ?? t("settings.profile.pasted"), size: t("settings.profile.updated", { date: formatDateTime(data.updated) }) }}
          readingLabel={t("common.checking")}
          replaceLabel={t("settings.profile.replace")}
          removeLabel={t("settings.profile.remove")}
          error={error ? { body: error } : undefined}
          onFile={upload}
          onRemove={() => void run("remove", () => api.deleteProfile(), t("settings.profile.removed"))}
          disabled={busy !== null}
        />
      </div>
      {error && state !== "error" ? <Callout tone="error" live="alert">{error}</Callout> : null}
      <div className={s.cvText}>
        <Disclosure surface="plain" title={has ? t("settings.profile.text") : t("settings.profile.asText")}>
          <div className={s.cvTextBody}>
            {has ? <p className={s.hint}>{t("settings.profile.textHint")}</p> : null}
            <Textarea label={t("settings.profile.text")} hideLabel placeholder={t("setup.about.cvPlaceholder")} rows={10} value={value}
              onChange={(e) => setText(e.target.value)} showCount />
            <div className={s.cvActions}>
              <Button variant="primary" loading={busy === "text"} disabled={text === null || !value.trim() || busy !== null}
                onClick={() => void run("text", () => api.saveProfile(value, "paste"), t("setup.about.cvSaved"))}>{t("common.save")}</Button>
            </div>
          </div>
        </Disclosure>
      </div>
    </SettingGroup>
  );
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
  const serverOk = stt.data?.available !== false;
  // D78: one description for both choices, so switching does not move the text. Only a missing option adds a line.
  const sttHint = (
    <>
      {t("settings.voice.sttHint")}
      {!serverOk ? <span className={s.descNote}>{t("settings.voice.sttServerMissing")}</span> : null}
      {!browserOk ? <span className={s.descNote}>{t("settings.voice.sttBrowserUnsupported")}</span> : null}
    </>
  );
  return (
    <>
      <SettingGroup title={t("settings.voice.title")} id="voice-title">
        {!ttsOk ? <Callout tone="info">{t("settings.voice.unavailable")}</Callout> : null}
        <SettingRow id="voice-voice" label={t("settings.voice.voice")}>
          <Select
            label={t("settings.voice.voice")}
            hideLabel
            width="content"
            value={voice}
            disabled={!ttsOk || !voices.data}
            onChange={(v) => void save({ voice: v })}
            options={(voices.data?.voices ?? []).map((v) => ({ value: v.id, label: `${v.label} · ${v.locale}` }))}
          />
          <IconButton icon="play" label={t("settings.voice.sample")} onClick={play} disabled={!ttsOk || !voice} />
        </SettingRow>
        <SettingRow id="voice-speed" label={t("settings.voice.speed")}>
          <Select
            label={t("settings.voice.speed")}
            hideLabel
            width="content"
            value={String(settings.kokoro_speed)}
            disabled={!ttsOk}
            onChange={(v) => void save({ kokoro_speed: Number(v) })}
            options={[0.8, 0.9, 1, 1.1, 1.2].map((n) => ({ value: String(n), label: t("settings.voice.speedValue", { n }) }))}
          />
        </SettingRow>
        <SettingRow id="voice-speak" label={t("settings.voice.speak")} description={t("settings.voice.speakHint")}>
          <Toggle label={t("settings.voice.speak")} hideLabel checked={speak}
            onChange={(v) => { setSpeak(v); prefs.setSpeak(v); }} />
        </SettingRow>
      </SettingGroup>
      {view}
      <SettingGroup title={t("settings.voice.stt")} id="stt-title">
        <SettingRow id="voice-stt" label={t("settings.voice.sttWhere")} description={sttHint}>
          <Segmented
            label={t("settings.voice.stt")}
            hideLabel
            value={sttPref}
            onChange={(v) => { setSttPref(v); prefs.setStt(v); }}
            options={[
              { value: "server", label: t("settings.voice.sttServer"), icon: "lock", disabled: !serverOk },
              { value: "browser", label: t("settings.voice.sttBrowser"), icon: "globe", disabled: !browserOk },
            ]}
          />
        </SettingRow>
        <SettingRow id="voice-pause" label={t("settings.voice.pause")} description={t("settings.voice.pauseHint")}>
          <Select
            label={t("settings.voice.pause")}
            hideLabel
            width="content"
            value={String(pause)}
            onChange={(v) => { const n = Number(v) as PausePref; setPause(n); prefs.setPause(n); }}
            options={[2, 3, 5].map((n) => ({ value: String(n), label: t("settings.voice.pauseValue", { n }) }))
              .concat([{ value: "0", label: t("settings.voice.pauseManual") }])}
          />
        </SettingRow>
      </SettingGroup>
    </>
  );
}

function PracticeSection() {
  const { settings } = useApp();
  const { save, view } = useSave();
  if (!settings) return <Skeleton lines={4} />;
  return (
    <>
      <SettingGroup title={t("settings.practice.defaults")} id="practice-title">
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
          <Select label={t("settings.practice.questions")} hideLabel width="content" value={String(settings.questions_per_session)}
            onChange={(v) => void save({ questions_per_session: Number(v) })}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))} />
        </SettingRow>
        <SettingRow id="practice-level" label={t("settings.practice.level")} description={t("settings.practice.levelHint")}>
          {/* D78: a short name on the button and in the list ("B1 · Familiar topics"). */}
          <Select label={t("settings.practice.level")} hideLabel width="content" value={settings.level}
            onChange={(v) => void save({ level: v as Level })}
            options={(["A2", "B1", "B2", "C1"] as const).map((l) => ({
              value: l, label: `${l} · ${t(`english.short.${l}`)}`,
            }))} />
        </SettingRow>
      </SettingGroup>
      {view}
    </>
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
    <>
      <SettingGroup title={t("settings.privacy.sharing")} id="privacy-title">
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
      </SettingGroup>
      <SettingGroup title={t("settings.privacy.files")} id="privacy-files-title">
        <SettingRow id="privacy-folder" layout="stack" label={t("settings.privacy.folder")} description={t("settings.privacy.folderHint")}>
          {health.data ? (
            <div data-field=""><CopyField label={t("settings.privacy.folder")} value={health.data.data_dir} copyLabel={t("common.copy")} copiedLabel={t("common.copied")} /></div>
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
      </SettingGroup>
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {view}
    </>
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
        <SettingGroup title={t("settings.about.freeTitle")} id="about-free-title" description={t("settings.about.freeIntro")} flush>
          <div className={s.tableWrap}>
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
          </div>
        </SettingGroup>
        <p className={s.note}>{t("settings.about.premiumNote")}</p>
      </div>
      <SettingGroup title={t("settings.about.practiceTitle")} id="about-practice-title">
        <p className={s.lead}>{t("app.practiceOnly")}</p>
      </SettingGroup>
      <div id="about-licence" className={s.anchor}>
        <SettingGroup title={t("settings.about.licenceTitle")} id="about-licence-title">
          <p className={s.lead}>{t("settings.about.licence")}</p>
        </SettingGroup>
      </div>
    </>
  );
}
