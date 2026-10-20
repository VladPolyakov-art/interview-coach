/* Practice home: Interview track (default on every open, owner rule) and English practice. */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge, Button, Callout, Card, Chip, durationMs, Icon, IconButton, motionMemory, Segmented, Select, SelectableCard,
  shouldBuildUp, Skeleton, Swap, TabPanel, Tabs,
} from "../ds";
import { t, tMaybe, tp } from "../i18n";
import { Page, Section } from "../components/Page";
import { VacancyEditor } from "../components/VacancyEditor";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { prefs } from "../lib/prefs";
import { useApp } from "../lib/store";
import type { Level, VacancySummary } from "../lib/types";
import { buildSessionConfig } from "../session/startConfig";
import s from "./Home.module.css";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? t("home.greeting.morning") : h < 18 ? t("home.greeting.afternoon") : t("home.greeting.evening");
}

type Leave = (go: () => void) => void;

export function HomeScreen() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("track") === "english" ? "english" : "interview";
  const { selectedEngine } = useApp();
  const engineReady = Boolean(selectedEngine?.status.ready);
  // Build-up (docs/motion.md 3.1, N3): first visit and return from a session only, never on a re-render.
  const [buildUp] = useState(() => shouldBuildUp(motionMemory));
  const [tabChanged, setTabChanged] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    motionMemory.homeSeen = true;
    motionMemory.returnFromSession = false;
  }, []);
  /* Start: Home content soft-outs (`exit`), then the session opens. Instant under reduced motion. */
  const leave: Leave = (go) => {
    if (leaving) return;
    const ms = durationMs("--duration-exit");
    if (ms <= 0) {
      go();
      return;
    }
    setLeaving(true);
    window.setTimeout(go, ms);
  };
  return (
    <Page title={greeting()} className={leaving ? "motion-soft-out" : buildUp ? "motion-stagger" : ""}>
      {selectedEngine && !engineReady ? (
        <Callout
          tone="warning"
          title={t("home.engineBanner.title")}
          actions={<Link to="/settings/engine">{t("home.engineBanner.settings")}</Link>}
        >
          {[selectedEngine.status.message, selectedEngine.status.hint].filter(Boolean).join(" ")}
        </Callout>
      ) : null}
      <div>
        <Tabs
          idBase="track"
          label={t("home.tabs")}
          value={tab}
          onChange={(v) => { setTabChanged(true); setParams(v === "english" ? { track: "english" } : {}, { replace: true }); }}
          items={[
            { id: "interview", label: t("home.tabInterview"), icon: "briefcase" },
            { id: "english", label: t("home.tabEnglish"), icon: "chat", hint: t("home.tabEnglishHint") },
          ]}
        />
        <TabPanel idBase="track" id={tab}>
          {/* Mode switch (N11): the outgoing track soft-outs (`exit`), the incoming one rises in (`base`). */}
          <Swap swapKey={tab}>
            <div
              className={`${s.tabsPanel} ${buildUp && !tabChanged ? `motion-stagger ${s.nestedStagger}` : ""}`}
            >
              {tab === "interview" ? <InterviewTab engineReady={engineReady} leave={leave} /> : <EnglishTab engineReady={engineReady} leave={leave} />}
            </div>
          </Swap>
        </TabPanel>
      </div>
    </Page>
  );
}

function AnswerMode({ value, onChange }: { value: "voice" | "text"; onChange: (v: "voice" | "text") => void }) {
  return (
    <Segmented
      label={t("home.answerMode")}
      value={value}
      onChange={(v) => { prefs.setInput(v); onChange(v); }}
      options={[{ value: "voice", label: t("home.voice"), icon: "mic" }, { value: "text", label: t("home.keyboard"), icon: "keyboard" }]}
    />
  );
}

function InterviewTab({ engineReady, leave }: { engineReady: boolean; leave: Leave }) {
  const navigate = useNavigate();
  const { settings } = useApp();
  const vacancies = useLoad(() => api.vacancies());
  const profile = useLoad(() => api.profile());
  const sessions = useLoad(() => api.sessions());
  const memory = useLoad(() => api.memory());
  const stt = useLoad(() => api.stt());
  const [vacancyId, setVacancyId] = useState(prefs.vacancy());
  const [roundType, setRoundType] = useState(prefs.roundType());
  const [strictness, setStrictness] = useState<"1" | "2" | "3">("2");
  const [questions, setQuestions] = useState("5");
  const [answer, setAnswer] = useState(prefs.input());
  const [editor, setEditor] = useState(false);
  const [preparing, setPreparing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (settings) {
      setStrictness(String(settings.strictness) as "1" | "2" | "3");
      setQuestions(String(settings.questions_per_session));
    }
  }, [settings]);

  const list = vacancies.data?.vacancies ?? [];
  // A remembered vacancy that was deleted falls back to general questions.
  const selected = list.find((v) => v.id === vacancyId) ?? null;
  const hasCv = Boolean(profile.data?.text);
  const firstOpen = sessions.data ? sessions.data.sessions.length === 0 : false;
  const last = sessions.data?.sessions[0];

  const choose = (id: string) => { setVacancyId(id); prefs.setVacancy(id); };

  const prepareQuestions = (v: { id: string }) => {
    setPreparing((p) => ({ ...p, [v.id]: true }));
    api.vacancyQuestions(v.id)
      .then(() => vacancies.reload())
      .catch(() => {})
      .finally(() => setPreparing((p) => ({ ...p, [v.id]: false })));
  };

  const remove = async (v: VacancySummary) => {
    if (!window.confirm(t("home.vacancies.deleteConfirm", { title: v.title }))) return;
    await api.deleteVacancy(v.id);
    if (vacancyId === v.id) choose("");
    vacancies.reload();
  };

  const basis = selected
    ? (hasCv ? t("home.round.basisJob", { job: selected.title }) : t("home.round.basisJobNoCv", { job: selected.title }))
    : hasCv ? t("home.round.basisCv") : t("home.round.basisGeneral");
  const n = Number(questions);

  const start = () => {
    prefs.setRoundType(roundType);
    const config = buildSessionConfig({
      mode: "interview", answer, roundType, strictness: Number(strictness), questions: n, vacancyId: selected?.id,
    }, settings, stt.data);
    leave(() => navigate("/session", { state: { config, title: selected?.title ?? "", roundType } }));
  };

  // Skeleton for the weak-spots card only when there are past sessions to learn from (no empty flash for new users).
  const weakLoading = memory.loading && !memory.data && Boolean(sessions.data?.sessions.length);

  return (
    <>
      {weakLoading ? (
        <Section title={t("home.workOn.title")} id="work-on">
          <Skeleton variant="card" lines={3} />
        </Section>
      ) : null}
      {memory.data && memory.data.weak_spots.length ? (
        <Section title={t("home.workOn.title")} id="work-on">
          <Card className={s.example}>
            <p className={s.cardMeta}>{tp("home.workOn.from", memory.data.sessions_considered)}</p>
            <ul className={s.weak}>
              {memory.data.weak_spots.slice(0, 4).map((w) => (
                <li key={`${w.layer}-${w.tag}`} className={s.weakRow}>
                  <Badge tone={w.layer} icon={w.layer}>{t(`feedback.layer.${w.layer}`)}</Badge>
                  <span>{tMaybe(`feedback.tag.${w.tag}`, w.text || w.tag.replace(/_/g, " "))}</span>
                  <span className={s.weakCount}>{tp("home.workOn.count", w.sessions)}</span>
                </li>
              ))}
            </ul>
          </Card>
          {last ? (
            <Link to={`/sessions/${last.id}`}>{t("home.workOn.lastSession", { title: last.title, date: formatDate(last.started_at) })}</Link>
          ) : null}
        </Section>
      ) : null}

      <Section title={t("home.vacancies.title")} id="vacancies">
        {!list.length && !vacancies.loading ? <p className={s.helper}>{t("home.vacancies.empty")}</p> : null}
        <div className={s.cards} aria-busy={vacancies.loading && !vacancies.data ? true : undefined}>
          {vacancies.loading && !vacancies.data ? <Skeleton variant="card" lines={2} /> : null}
          <SelectableCard selected={!selected} onSelect={() => choose("")}>
            <span className={s.cardInner}>
              <span className={s.cardTitle}>{t("home.vacancies.general")}{!selected ? <Icon name="check" size="sm" /> : null}</span>
              <span className={s.cardMeta}>{t("home.vacancies.generalHint")}</span>
            </span>
          </SelectableCard>
          {list.map((v) => (
            <div key={v.id} className={s.cardWrap}>
              <SelectableCard selected={selected?.id === v.id} onSelect={() => choose(v.id)} title={v.title}>
                <span className={s.cardInner}>
                  <span className={s.cardTitle}>{v.title}{selected?.id === v.id ? <Icon name="check" size="sm" /> : null}</span>
                  <span className={s.cardMeta}>{t("home.vacancies.added", { date: formatDate(v.created_at) })}</span>
                  <span className={s.cardMeta}>
                    {preparing[v.id]
                      ? <span className="shimmer-text">{t("home.vacancies.preparing")}</span>
                      : v.questions ? tp("home.vacancies.questionsReady", v.questions) : ""}
                  </span>
                </span>
              </SelectableCard>
              <span className={s.cardDelete}>
                <IconButton icon="trash" size="sm" label={t("home.vacancies.delete", { title: v.title })} onClick={() => void remove(v)} />
              </span>
            </div>
          ))}
          <button type="button" className={s.addCard} onClick={() => setEditor(true)}>
            <Icon name="plus" />{t("home.vacancies.add")}
          </button>
        </div>
        {!hasCv && profile.data ? (
          <p className={s.helper}>{t("home.vacancies.addCv")} <Link to="/settings/profile">{t("home.vacancies.addCvLink")}</Link></p>
        ) : null}
      </Section>

      <Section title={t("home.round.title")} id="round">
        <div className={s.round}>
          <div>
            <Segmented
              label={t("home.round.type")}
              value={roundType}
              onChange={setRoundType}
              options={[
                { value: "hr", label: t("home.round.hr") },
                { value: "behavioural", label: t("home.round.behavioural") },
                { value: "mix", label: t("home.round.mix") },
              ]}
            />
            <p className={s.helper}>{t(`home.round.${roundType}Hint`)}</p>
          </div>
          <div>
            <Segmented
              label={t("home.round.strictness")}
              value={strictness}
              onChange={setStrictness}
              options={[
                { value: "1", label: t("home.round.gentle") },
                { value: "2", label: t("home.round.standard") },
                { value: "3", label: t("home.round.tough") },
              ]}
            />
            <p className={s.helper}>{t(strictness === "1" ? "home.round.gentleHint" : strictness === "3" ? "home.round.toughHint" : "home.round.standardHint")}</p>
          </div>
          <div className={s.qSelect}>
            <Select
              label={t("home.round.questions")}
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => ({ value: String(x), label: String(x) }))}
            />
          </div>
          <AnswerMode value={answer} onChange={setAnswer} />
          <p className={s.basis}><Icon name="info" size="sm" />{basis} {t("home.round.length", { n, min: n * 4 })}</p>
          <div className={s.startRow}>
            <Button variant="primary" size="lg" icon={answer === "voice" ? "mic" : "keyboard"} disabled={!engineReady} onClick={start}>
              {t("home.start")}
            </Button>
            {!engineReady ? <span className={s.reason}>{t("home.engineBanner.reason")}</span> : null}
          </div>
        </div>
      </Section>

      {firstOpen ? <ExampleFeedback /> : null}

      <VacancyEditor
        open={editor}
        onClose={() => setEditor(false)}
        onSaved={(v) => {
          setEditor(false);
          choose(v.id);
          vacancies.reload();
          prepareQuestions(v);
        }}
      />
    </>
  );
}

function ExampleFeedback() {
  const order = useApp().settings?.layer_order ?? "content-first";
  const rows = [
    { layer: "content" as const, text: t("home.example.content") },
    { layer: "language" as const, text: t("home.example.language") },
    { layer: "delivery" as const, text: t("home.example.delivery") },
  ];
  if (order === "delivery-first") rows.reverse();
  return (
    <Section title={t("home.example.title")} id="example">
      <Card tone="subtle" className={s.example}>
        <Badge tone="outline">{t("home.example.label")} · {t("feedback.example.name")}</Badge>
        {rows.map((r) => (
          <div key={r.layer} className={s.exampleRow}>
            <Badge tone={r.layer} icon={r.layer}>{t(`feedback.layer.${r.layer}`)}</Badge>
            <span>{r.text}</span>
          </div>
        ))}
        <p className={s.helper}>{t("home.example.after")}</p>
      </Card>
    </Section>
  );
}

const LEVELS: Level[] = ["A2", "B1", "B2", "C1"];
type Topic = "free" | "work" | "small";

function EnglishTab({ engineReady, leave }: { engineReady: boolean; leave: Leave }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useApp();
  const stt = useLoad(() => api.stt());
  const [level, setLevel] = useState<Level | null>(null);
  const [topic, setTopic] = useState<Topic>("free");
  const [answer, setAnswer] = useState(prefs.input());
  useEffect(() => { if (settings && !level) setLevel(settings.level); }, [settings, level]);
  const topics: Topic[] = useMemo(() => ["free", "work", "small"], []);

  const start = () => {
    if (!level) return;
    if (settings && settings.level !== level) void updateSettings({ level });
    const config = buildSessionConfig({ mode: "english", answer, level, topic: t(`english.topicValue.${topic}`) }, settings, stt.data);
    leave(() => navigate("/session", { state: { config, title: t("home.tabEnglish") } }));
  };

  return (
    <>
      <Section title={t("english.level")} id="level">
        <div className={s.levels} role="radiogroup" aria-labelledby="level">
          {LEVELS.map((l) => (
            <SelectableCard key={l} selected={level === l} onSelect={() => setLevel(l)} role="radio" aria-checked={level === l} aria-pressed={undefined}>
              <span className={s.cardInner}>
                <span className={s.levelCode}>{l}</span>
                <span className={s.cardMeta}>{t(`english.levels.${l}`)}</span>
              </span>
            </SelectableCard>
          ))}
        </div>
        <p className={s.helper}>{t("english.notSure")} {t("english.levelHint")}</p>
      </Section>
      <Section title={t("english.topic")} id="topic">
        <div className={s.startRow} role="group" aria-labelledby="topic">
          {topics.map((x) => <Chip key={x} selected={topic === x} onClick={() => setTopic(x)}>{t(`english.topics.${x}`)}</Chip>)}
        </div>
      </Section>
      <AnswerMode value={answer} onChange={setAnswer} />
      <div className={s.startRow}>
        <Button variant="primary" size="lg" icon={answer === "voice" ? "mic" : "keyboard"} disabled={!engineReady || !level} onClick={start}>
          {t("english.start")}
        </Button>
        {!engineReady ? <span className={s.reason}>{t("home.engineBanner.reason")}</span> : null}
      </div>
      <p className={s.helper}>{t("english.after")}</p>
      <p className={s.helper}>{t("english.free")}</p>
    </>
  );
}
