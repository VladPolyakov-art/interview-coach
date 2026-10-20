/* Home, live: feeds HomeView from the store and the API. Every choice that starts a session ends in navigate("/session").
 * Gaps the server has today (reported in the stage-11 notes): no "technical" round (mapped to the mixed round), no job
 * update call (Edit = create the new copy + move the old one to Trash), no link preview (Save fetches the page),
 * no recurring-phrases data (the English phrases list is empty), Drill = a 3-question mixed session. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { durationMs, motionMemory, shouldBuildUp } from "../../ds";
import { t, tMaybe, tp } from "../../i18n";
import { DeleteJobDialog, VacancyEditor, type VacancySource } from "../../components/VacancyEditor";
import { splitTitle } from "../../components/vacancyTitle";
import { browserSttSupported } from "../../audio/browserStt";
import { api } from "../../lib/api";
import { useInterval, useLoad } from "../../lib/hooks";
import { prefs } from "../../lib/prefs";
import { useApp } from "../../lib/store";
import type { Level, VacancySummary } from "../../lib/types";
import { buildSessionConfig } from "../../session/startConfig";
import { homePrefs, shortDate } from "./homePrefs";
import { DRILL_QUESTIONS, looksLikeJob } from "./helpers";
import { HomeView } from "./HomeView";
import type { EnglishTopic, InterviewModel, JobItem, RoundType, Strictness, Track, WeakItem } from "./types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? t("home.greeting.morning") : h < 18 ? t("home.greeting.afternoon") : t("home.greeting.evening");
}

let browserBannerDismissed = false;

interface EditorState { open: boolean; initial?: { source?: VacancySource; text?: string; url?: string }; editId: string | null; startAfter: boolean }
const CLOSED: EditorState = { open: false, editId: null, startAfter: false };

export function HomeScreen() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const track: Track = params.get("track") === "english" ? "english" : "interview";
  const { settings, selectedEngine, refreshEngines, updateSettings } = useApp();
  const engineReady = Boolean(selectedEngine?.status.ready);
  const vacancies = useLoad(() => api.vacancies());
  const profile = useLoad(() => api.profile());
  const sessions = useLoad(() => api.sessions());
  const memory = useLoad(() => api.memory());
  const stt = useLoad(() => api.stt());

  // Build-up (docs/motion.md 3.1, N3): first visit and return from a session only, never on a re-render.
  const [buildUp] = useState(() => shouldBuildUp(motionMemory));
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    motionMemory.homeSeen = true;
    motionMemory.returnFromSession = false;
  }, []);

  const [round, setRound] = useState<RoundType>(() => homePrefs.round());
  const [strictness, setStrictness] = useState<Strictness>(2);
  const [vacancyId, setVacancyId] = useState(prefs.vacancy());
  const [pasted, setPasted] = useState("");
  const [focus, setFocus] = useState<"all" | WeakItem["layer"]>("all");
  const [textMode, setTextMode] = useState(prefs.input() === "text");
  const [browserDismissed, setBrowserDismissed] = useState(browserBannerDismissed);
  const [editor, setEditor] = useState<EditorState>(CLOSED);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState<Level | null>(null);
  const [topic, setTopic] = useState<EnglishTopic>("free");

  useEffect(() => { if (settings) setStrictness(settings.strictness); }, [settings]);
  // Engine check every 5 seconds while it is not ready (home.md §4 EngineNotRunning).
  useInterval(() => { void refreshEngines(); }, 5000, Boolean(selectedEngine) && !engineReady);

  const list = useMemo(
    () => [...(vacancies.data?.vacancies ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [vacancies.data],
  );
  const jobs: JobItem[] = list.map((v) => {
    const parts = splitTitle(v.title);
    return {
      id: v.id,
      company: parts.company,
      role: parts.role,
      added: shortDate(v.created_at),
      questions: v.questions,
      state: preparing[v.id] ? "preparing" : "ready",
    };
  });
  // A remembered job that was deleted falls back to general questions.
  const selected = list.find((v) => v.id === vacancyId) ?? null;
  const jobsLoading = vacancies.loading && !vacancies.data;
  const hasCv = Boolean(profile.data?.text);
  const sessionList = sessions.data?.sessions;
  const storageError = Boolean(sessions.error);
  const interviewFirst = sessionList ? !sessionList.some((x) => x.mode !== "english") : false;
  const englishFirst = sessionList ? !sessionList.some((x) => x.mode === "english") : false;
  const last = sessionList?.[0];

  const weakItems: WeakItem[] = (memory.data?.weak_spots ?? []).slice(0, 6).map((w) => {
    const title = tMaybe(`feedback.tag.${w.tag}`, w.text || w.tag.replace(/_/g, " "));
    return { id: `${w.layer}-${w.tag}`, layer: w.layer, title, short: title, count: tp("home.workOn.count", w.sessions) };
  });
  // Skeleton for the strip only when there are past sessions to learn from (no empty flash for new users).
  const weakLoading = memory.loading && !memory.data && Boolean(sessionList?.length);
  const interview: InterviewModel = {
    firstVisit: interviewFirst,
    round,
    strictness,
    jobs,
    jobsLoading,
    selectedJobId: selected?.id ?? null,
    pasted,
    hasCv,
    questions: settings?.questions_per_session ?? 5,
    layerOrder: settings?.layer_order,
    weak: weakLoading || weakItems.length
      ? {
        items: weakItems,
        sessions: memory.data?.sessions_considered ?? 0,
        last: last ? { id: last.id, title: last.title, date: shortDate(last.started_at) } : undefined,
        loading: weakLoading,
        focus,
      }
      : null,
  };

  const choose = (id: string) => { setVacancyId(id); prefs.setVacancy(id); };

  /* Start: Home content soft-outs (`exit`), then the session opens. Instant under reduced motion. */
  const leave = (go: () => void) => {
    if (leaving) return;
    const ms = durationMs("--duration-exit");
    if (ms <= 0) { go(); return; }
    setLeaving(true);
    window.setTimeout(go, ms);
  };

  const startInterview = (opts: { answer?: "voice" | "text"; vacancyId?: string; questions?: number; drill?: boolean } = {}) => {
    homePrefs.setRound(round);
    // The server knows three round types; "technical" runs as the mixed round until it learns the fourth.
    const roundType = round === "technical" ? "mix" : round;
    const vid = opts.vacancyId ?? selected?.id;
    const config = buildSessionConfig({
      mode: "interview",
      answer: opts.answer ?? (textMode ? "text" : "voice"),
      roundType: opts.drill ? "mix" : roundType,
      strictness,
      questions: opts.questions ?? interview.questions,
      vacancyId: vid,
    }, settings, stt.data);
    const title = opts.vacancyId ? "" : selected ? selected.title : "";
    leave(() => navigate("/session", { state: { config, title, roundType: config.start.round_type } }));
  };

  const startEnglish = (answer?: "voice" | "text") => {
    if (!level) return;
    if (settings && settings.level !== level) void updateSettings({ level });
    const config = buildSessionConfig({
      mode: "english", answer: answer ?? (textMode ? "text" : "voice"), level, topic: t(`english.topicValue.${topic}`),
    }, settings, stt.data);
    leave(() => navigate("/session", { state: { config, title: t("home.tabEnglish") } }));
  };

  const prepareQuestions = (v: { id: string }) => {
    setPreparing((p) => ({ ...p, [v.id]: true }));
    api.vacancyQuestions(v.id)
      .then(() => vacancies.reload())
      .catch(() => {})
      .finally(() => setPreparing((p) => ({ ...p, [v.id]: false })));
  };

  const openEditor = (next: Partial<EditorState> = {}) => setEditor({ ...CLOSED, open: true, ...next });
  const addPasted = (startAfter = false) => {
    const v = pasted.trim();
    openEditor({
      initial: /^https?:\/\/\S+$/i.test(v) ? { source: "link", url: v } : { source: "paste", text: v },
      startAfter,
    });
  };

  const onStart = () => {
    if (track === "english") { startEnglish(); return; }
    if (pasted.trim() && looksLikeJob(pasted)) { addPasted(true); return; }
    startInterview();
  };
  const onTypeInstead = () => {
    if (track === "english") { startEnglish("text"); return; }
    if (pasted.trim() && looksLikeJob(pasted)) { addPasted(true); return; }
    startInterview({ answer: "text" });
  };

  const deleting = list.find((v: VacancySummary) => v.id === deleteId) ?? null;
  const unsupportedSpeech = stt.data?.available === false && !browserSttSupported();

  return (
    <HomeView
      track={track}
      greeting={greeting()}
      loading={jobsLoading}
      engineReady={engineReady}
      engineBanner={selectedEngine && !engineReady
        ? {
          body: [selectedEngine.status.message, selectedEngine.status.hint].filter(Boolean).join(" "),
          command: selectedEngine.status.hint_command || undefined,
        }
        : null}
      browserBanner={unsupportedSpeech && !browserDismissed && !textMode}
      textMode={textMode}
      storageError={storageError}
      starting={leaving}
      buildUp={buildUp}
      leaving={leaving}
      interview={interview}
      english={{
        firstVisit: englishFirst,
        level: level ?? (englishFirst ? null : settings?.level ?? null),
        levelRemembered: !englishFirst,
        topic,
        phrases: [],
      }}
      onTrackChange={(next) => setParams(next === "english" ? { track: "english" } : {}, { replace: true })}
      onRoundChange={setRound}
      onStrictnessChange={setStrictness}
      onSelectJob={(id) => choose(id ?? "")}
      onEditJob={(id) => openEditor({ editId: id })}
      onDeleteJob={setDeleteId}
      onAddJob={() => openEditor()}
      onPickFile={() => openEditor({ initial: { source: "file" } })}
      onPastedChange={setPasted}
      onAddPasted={() => addPasted()}
      onFocusChange={setFocus}
      onDrill={() => startInterview({ questions: DRILL_QUESTIONS, drill: true })}
      onStart={onStart}
      onTypeInstead={onTypeInstead}
      onUseTextMode={() => { prefs.setInput("text"); setTextMode(true); }}
      onDismissBrowser={() => { browserBannerDismissed = true; setBrowserDismissed(true); }}
      onRetryEngine={() => { void refreshEngines(); }}
      onLevelChange={setLevel}
      onTopicChange={setTopic}
      onStartEnglish={() => startEnglish()}
      overlay={(
        <>
          <VacancyEditor
            open={editor.open}
            initial={editor.initial}
            editId={editor.editId}
            saveLabel={editor.startAfter ? t("vacancy.saveAndStart") : undefined}
            onClose={() => setEditor(CLOSED)}
            onDeleted={(id) => { if (vacancyId === id) choose(""); vacancies.reload(); }}
            onSaved={(v) => {
              setEditor(CLOSED);
              setPasted("");
              choose(v.id);
              vacancies.reload();
              prepareQuestions(v);
              if (editor.startAfter) startInterview({ vacancyId: v.id });
            }}
          />
          <DeleteJobDialog
            open={Boolean(deleting)}
            name={deleting ? splitTitle(deleting.title).company : ""}
            onCancel={() => setDeleteId(null)}
            onConfirm={() => {
              const id = deleteId;
              setDeleteId(null);
              if (!id) return;
              void api.deleteVacancy(id).then(() => { if (vacancyId === id) choose(""); vacancies.reload(); });
            }}
          />
        </>
      )}
    />
  );
}

