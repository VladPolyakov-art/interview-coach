/* Home v2, live: runs the scripted setup (script.ts) on real data and feeds HomeView. Real work behind a pending Mike
 * message: a pasted job / link / file is saved with api.createVacancy, then questions are prepared from it.
 * Gaps the server has today (🟡, home.md §9): no "technical" round (runs as the mixed round, B2), no field for the
 * user's note (UI only, B3), no questions status (we track the prepare call, B5), the last interview's job and round
 * are not in SessionSummary (remembered job + remembered round, B8), Drill = a 3-question mixed session (B7), no
 * recurring-phrases data (English phrases empty), no profile name (h1 without the name, US-08 AC3). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { durationMs, motionMemory, shouldBuildUp } from "../../ds";
import { t, tMaybe, tp } from "../../i18n";
import { VacancyEditor } from "../../components/VacancyEditor";
import { splitTitle } from "../../components/vacancyTitle";
import { browserSttSupported } from "../../audio/browserStt";
import { api, fileToBase64 } from "../../lib/api";
import { useInterval, useLoad } from "../../lib/hooks";
import { prefs } from "../../lib/prefs";
import { useApp } from "../../lib/store";
import type { Vacancy } from "../../lib/types";
import { buildSessionConfig } from "../../session/startConfig";
import { homePrefs, shortDate } from "./homePrefs";
import { HomeView } from "./HomeView";
import {
  begin, change, pick, planFor, removeNote, resolveJob, say, setupModel, skip, suggestionsFor, updateJob,
  type ScriptContext, type SetupState,
} from "./script";
import type { EnglishTopic, JobItem, PlanModel, Track, WeakItem } from "./types";

let browserBannerDismissed = false;
const TOPICS: EnglishTopic[] = ["free", "work", "small"];

function toJob(v: { id: string; title: string; created_at: string; questions: number | unknown[] }, state: JobItem["state"]): JobItem {
  const parts = splitTitle(v.title);
  const questions = Array.isArray(v.questions) ? v.questions.length : v.questions;
  return { id: v.id, company: parts.company, role: parts.role, added: shortDate(v.created_at), questions, state };
}

interface EditorState { open: boolean; editId: string | null }

export function HomeScreen() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
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

  const [setup, setSetup] = useState<SetupState | null>(null);
  const [composer, setComposer] = useState<{ text: string; file?: { name: string; size: string } }>({ text: "" });
  const fileRef = useRef<File | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [prep, setPrep] = useState<Record<string, "preparing" | "error">>({});
  const [textMode, setTextMode] = useState(prefs.input() === "text");
  const [browserDismissed, setBrowserDismissed] = useState(browserBannerDismissed);
  const [editor, setEditor] = useState<EditorState>({ open: false, editId: null });

  // "Start over" (home.md §4.1): the Practice nav row (a new location on "/") returns to the start screen.
  useEffect(() => { setSetup(null); }, [location.key]);
  // Engine check every 5 seconds while it is not ready.
  useInterval(() => { void refreshEngines(); }, 5000, Boolean(selectedEngine) && !engineReady);

  const list = useMemo(
    () => [...(vacancies.data?.vacancies ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [vacancies.data],
  );
  const sessionList = sessions.data?.sessions;
  const memoryData = memory.data;
  const hasCv = Boolean(profile.data?.text);

  const ctx = useMemo<ScriptContext>(() => {
    const jobs = list.map((v) => toJob(v, prep[v.id] ?? "ready"));
    const interviews = (sessionList ?? []).filter((x) => x.mode !== "english");
    const lastInterview = interviews[0];
    const remembered = prefs.vacancy();
    const weak: WeakItem[] = (memoryData?.weak_spots ?? []).slice(0, 6).map((w) => {
      const title = tMaybe(`feedback.tag.${w.tag}`, w.text || w.tag.replace(/_/g, " "));
      const count = tp("home.workOn.count", w.sessions);
      return { id: `${w.layer}-${w.tag}`, layer: w.layer, title, short: title.toLowerCase(), phrase: `${title.toLowerCase()} (${count})`, count };
    });
    return {
      track,
      firstVisit: interviews.length === 0,
      hasCv,
      jobs,
      last: lastInterview
        ? {
          date: shortDate(lastInterview.started_at),
          jobId: jobs.some((j) => j.id === remembered) ? remembered : null,
          round: homePrefs.round(),
          strictness: settings?.strictness ?? 2,
        }
        : undefined,
      strictness: settings?.strictness ?? 2,
      questions: settings?.questions_per_session ?? 5,
      weak,
      weakSessions: memoryData?.sessions_considered ?? 0,
      level: (sessionList ?? []).some((x) => x.mode === "english") ? settings?.level ?? null : null,
      phrases: [],
    };
  }, [list, prep, sessionList, memoryData, hasCv, settings, track]);

  /* Questions from a job: the plan's Job row shows "Preparing questions…" until the call returns. */
  const prepareQuestions = useCallback((job: JobItem) => {
    setPrep((p) => ({ ...p, [job.id]: "preparing" }));
    setSetup((st) => (st ? updateJob(st, { ...job, state: "preparing" }) : st));
    api.vacancyQuestions(job.id)
      .then((r) => {
        setPrep((p) => { const rest = { ...p }; delete rest[job.id]; return rest; });
        setSetup((st) => (st ? updateJob(st, { ...job, questions: r.questions.length, state: "ready" }) : st));
        vacancies.reload();
      })
      .catch(() => {
        setPrep((p) => ({ ...p, [job.id]: "error" }));
        setSetup((st) => (st ? updateJob(st, { ...job, state: "error" }) : st));
      });
  }, [vacancies]);

  /* A pending read (pasted job, link, file): save it as a job, then let Mike name it. */
  const pendingId = setup?.pending?.turnId;
  useEffect(() => {
    const p = setup?.pending;
    if (!p) return;
    let cancelled = false;
    (async () => {
      const body: Parameters<typeof api.createVacancy>[0] = {};
      if (p.kind === "link") body.url = p.url;
      else if (p.kind === "job") body.text = p.text;
      else if (fileRef.current) body.file = { name: fileRef.current.name, data: await fileToBase64(fileRef.current) };
      const v: Vacancy = await api.createVacancy(body);
      return toJob(v, "preparing");
    })()
      .then((job) => {
        if (cancelled) return;
        setSetup((st) => (st ? resolveJob(ctx, st, { ok: true, job }) : st));
        vacancies.reload();
        prepareQuestions(job);
      })
      .catch(() => { if (!cancelled) setSetup((st) => (st ? resolveJob(ctx, st, { ok: false }) : st)); });
    return () => { cancelled = true; };
    // Runs once per pending message; ctx is read at resolve time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  const run = (fn: (st: SetupState) => SetupState) => setSetup((st) => (st ? fn(st) : st));

  const onSend = () => {
    const text = composer.text.trim();
    if (!setup) {
      if (!text && !composer.file) return;
      setSetup(begin(ctx, composer.file ? { kind: "file", ...composer.file } : { kind: "text", text }));
    } else if (text) {
      run((st) => say(ctx, st, text));
    }
    setComposer({ text: "" });
  };

  /* Start: Home soft-outs (`exit`), then the session opens. Instant under reduced motion. */
  const leave = (go: () => void) => {
    if (leaving) return;
    const ms = durationMs("--duration-exit");
    if (ms <= 0) { go(); return; }
    setLeaving(true);
    window.setTimeout(go, ms);
  };

  const start = (plan: PlanModel, answer: "voice" | "text") => {
    if (plan.kind === "english") {
      const level = plan.level ?? settings?.level ?? "B1";
      if (settings && settings.level !== level) void updateSettings({ level });
      const key = TOPICS.find((x) => t(`english.topics.${x}`) === plan.topic);
      const topic = key ? t(`english.topicValue.${key}`) : plan.topic ?? "";
      const config = buildSessionConfig({ mode: "english", answer, level, topic }, settings, stt.data);
      leave(() => navigate("/session", { state: { config, title: t("home.tabEnglish") } }));
      return;
    }
    homePrefs.setRound(plan.round);
    prefs.setVacancy(plan.job?.id ?? "");
    // The server knows three round types; "technical" runs as the mixed round until it learns the fourth (B2).
    const roundType = plan.kind === "drill" || plan.round === "technical" ? "mix" : plan.round;
    const config = buildSessionConfig({
      mode: "interview", answer, roundType, strictness: plan.strictness, questions: plan.questions, vacancyId: plan.job?.id,
    }, settings, stt.data);
    const title = list.find((v) => v.id === plan.job?.id)?.title ?? "";
    leave(() => navigate("/session", { state: { config, title, roundType: config.start.round_type } }));
  };
  const plan = setup ? planFor(ctx, setup) : null;
  const unsupportedSpeech = stt.data?.available === false && !browserSttSupported();
  const loading = (vacancies.loading && !vacancies.data) || (sessions.loading && !sessions.data);
  const shown = setup ? setupModel(ctx, setup) : undefined;

  return (
    <>
      <HomeView
        step={setup ? "setup" : "start"}
        track={setup?.track ?? track}
        loading={loading}
        engineReady={engineReady}
        engineBanner={selectedEngine && !engineReady
          ? {
            body: [selectedEngine.status.message, selectedEngine.status.hint].filter(Boolean).join(" "),
            command: selectedEngine.status.hint_command || undefined,
          }
          : null}
        browserBanner={unsupportedSpeech && !browserDismissed && !textMode}
        textMode={textMode}
        storageError={Boolean(sessions.error)}
        suggestions={loading ? [] : suggestionsFor(ctx)}
        composer={composer}
        setup={shown}
        jobs={setup ? [...setup.jobs, ...ctx.jobs.filter((j) => !setup.jobs.some((x) => x.id === j.id))] : ctx.jobs}
        starting={leaving}
        buildUp={buildUp}
        leaving={leaving}
        layerOrder={settings?.layer_order}
        onComposerChange={(text) => setComposer((c) => ({ ...c, text }))}
        onAddFile={() => picker.current?.click()}
        onRemoveFile={() => { fileRef.current = null; setComposer((c) => ({ text: c.text })); }}
        onSend={onSend}
        onSuggestion={(id) => setSetup(begin(ctx, { kind: "suggestion", id }))}
        onReply={(turnId, replyId) => run((st) => pick(ctx, st, turnId, replyId))}
        onTurnAction={(_turnId, action) => {
          if (action === "use-general") run((st) => say(ctx, st, t("chat.suggest.general")));
          else setEditor({ open: true, editId: setup?.draft.jobId ?? null });
        }}
        onSkip={() => run((st) => skip(ctx, st))}
        onChange={(row, value) => run((st) => change(ctx, st, row, value))}
        onRemoveNote={() => run(removeNote)}
        onRetryPrep={() => {
          const job = shown?.plan?.job ? (setup?.jobs ?? []).concat(ctx.jobs).find((j) => j.id === shown.plan!.job!.id) : undefined;
          if (job) prepareQuestions(job);
        }}
        onAddCv={() => navigate("/settings/profile")}
        onStart={() => { if (plan) start(plan, textMode ? "text" : "voice"); }}
        onTypeInstead={() => { if (plan) start(plan, "text"); }}
        onModeChange={(next) => setParams(next === "english" ? { track: "english" } : {}, { replace: true })}
        onUseTextMode={() => { prefs.setInput("text"); setTextMode(true); }}
        onDismissBrowser={() => { browserBannerDismissed = true; setBrowserDismissed(true); }}
        onRetryEngine={() => { void refreshEngines(); }}
        overlay={(
          <VacancyEditor
            open={editor.open}
            editId={editor.editId}
            onClose={() => setEditor({ open: false, editId: null })}
            onDeleted={() => { vacancies.reload(); run((st) => change(ctx, st, "job", "general")); }}
            onSaved={(v) => {
              setEditor({ open: false, editId: null });
              const job = toJob(v, "preparing");
              // An edit saves a new copy: the plan follows it (Mike's earlier line is not rewritten).
              run((st) => change(ctx, updateJob(st, job), "job", job.id));
              vacancies.reload();
              prepareQuestions(job);
            }}
          />
        )}
      />
      <input
        ref={picker}
        type="file"
        hidden
        accept=".pdf,.docx,.txt,.md,.html,application/pdf,text/plain,text/markdown,text/html"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          fileRef.current = f;
          setComposer((c) => ({ ...c, file: { name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB` } }));
        }}
      />
    </>
  );
}
