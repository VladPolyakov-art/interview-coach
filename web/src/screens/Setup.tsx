/* First-run wizard: 1 engine (choose, then connect: EnginePanel) → 2 test → 3 about you and the job → 4 first round. Sets prefs.setupDone at the end. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Callout, Card, Icon, Segmented, Spinner, Textarea, Toggle } from "../ds";
import { t } from "../i18n";
import { EnginePanel, EngineTest } from "../components/EnginePanel";
import { VacancyEditor } from "../components/VacancyEditor";
import { Wordmark } from "../components/Wordmark";
import { captureErrorCode, micLevelMeter } from "../audio/capture";
import { api } from "../lib/api";
import { useLoad } from "../lib/hooks";
import { prefs } from "../lib/prefs";
import { errorMessage, useApp } from "../lib/store";
import { buildSessionConfig } from "../session/startConfig";
import s from "./Setup.module.css";

const STEPS = ["engine", "test", "about", "first"] as const;
type Step = (typeof STEPS)[number];

export function SetupWizard() {
  const [step, setStep] = useState<Step>("engine");
  const index = STEPS.indexOf(step);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]!);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]!);

  return (
    <SetupFrame step={step}>
      {step === "engine" ? <EngineStep headingRef={headingRef} onNext={next} /> : null}
      {step === "test" ? <TestStep headingRef={headingRef} onNext={next} onBack={back} /> : null}
      {step === "about" ? <AboutStep headingRef={headingRef} onNext={next} onBack={back} /> : null}
      {step === "first" ? <FirstStep headingRef={headingRef} onBack={back} /> : null}
    </SetupFrame>
  );
}

/** The wizard chrome: brand, step list, content column. Also used by the review page. */
export function SetupFrame({ step, children }: { step: Step; children: ReactNode }) {
  const index = STEPS.indexOf(step);
  return (
    <div className={s.screen}>
      <header className={s.header}>
        <span className={s.brand}><Wordmark /></span>
        <nav aria-label={t("setup.steps")}>
          <ol className={s.steps}>
            {STEPS.map((x, i) => (
              <li key={x} className={`${s.step} ${i < index ? s.stepDone : ""}`} aria-current={x === step ? "step" : undefined}>
                <span className={s.num} aria-hidden="true">{i < index ? <Icon name="check" size="sm" /> : i + 1}</span>
                <span className={s.stepLabel}>{t(`setup.step.${x}`)}</span>
                {i < index ? <span className="visually-hidden">({t("setup.stepDone")})</span> : null}
              </li>
            ))}
          </ol>
        </nav>
      </header>
      <main className={s.main} id="main">
        {children}
      </main>
    </div>
  );
}

type Ref = React.RefObject<HTMLHeadingElement | null>;

function Head({ headingRef, title, sub }: { headingRef: Ref; title: string; sub: string }) {
  return (
    <div className={s.head}>
      <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      <p className={s.sub}>{sub}</p>
    </div>
  );
}

function EngineStep({ headingRef, onNext }: { headingRef: Ref; onNext: () => void }) {
  return <EnginePanel mode="setup" headingRef={headingRef} onDone={onNext} />;
}

function TestStep({ headingRef, onNext, onBack }: { headingRef: Ref; onNext: () => void; onBack: () => void }) {
  const { selectedEngine } = useApp();
  const voices = useLoad(() => api.voices());
  const stt = useLoad(() => api.stt());
  const telemetry = useLoad(() => api.telemetry());
  const [mic, setMic] = useState<{ on: boolean; level: number; peak: number; error: string }>({ on: false, level: 0, peak: 0, error: "" });
  const stopRef = useRef<(() => void) | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { stopRef.current?.(); audio.current?.pause(); }, []);

  const startMic = async () => {
    try {
      setMic({ on: true, level: 0, peak: 0, error: "" });
      stopRef.current = await micLevelMeter((rms) => setMic((m) => ({ ...m, level: rms, peak: Math.max(m.peak, rms) })));
    } catch (e) {
      const code = captureErrorCode(e);
      setMic({ on: false, level: 0, peak: 0, error: code === "not_found" ? t("setup.test.micMissing") : t("setup.test.micDenied") });
    }
  };
  const stopMic = () => { stopRef.current?.(); stopRef.current = null; setMic((m) => ({ ...m, on: false, level: 0 })); };
  const heard = mic.peak > 0.02;
  const ttsOk = voices.data?.tts.available !== false;
  const play = () => {
    audio.current?.pause();
    audio.current = new Audio(api.voiceSampleUrl(voices.data?.default ?? ""));
    void audio.current.play().catch(() => {});
  };
  const setOpt = (v: boolean) => api.setTelemetry(v).then((info) => telemetry.setData(info)).catch(() => {});
  const levelPct = Math.min(100, Math.round(mic.level * 600));

  return (
    <>
      <Head headingRef={headingRef} title={t("setup.test.title")} sub={t("setup.test.subtitle")} />
      <div className={s.checks}>
        <Card className={s.check}>
          <div className={s.checkHead}>
            <span className={s.checkTitle}><Icon name="mic" />{t("setup.test.mic")}</span>
            <Button size="sm" variant="secondary" onClick={mic.on ? stopMic : () => void startMic()}>
              {mic.on ? t("setup.test.micStop") : t("setup.test.micStart")}
            </Button>
          </div>
          {mic.on ? (
            <>
              <p className={s.hint}>{t("setup.test.micSay")}</p>
              <div className={s.meter} role="meter" aria-label={t("setup.test.micLevel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelPct}>
                <div className={s.meterFill} style={{ width: `${levelPct}%` }} />
              </div>
              <span className={heard ? s.ok : s.hint} role="status">
                {heard ? <><Icon name="check" size="sm" />{t("setup.test.micHeard")}</> : t("setup.test.micQuiet")}
              </span>
            </>
          ) : mic.error ? <Callout tone="warning">{mic.error}</Callout> : <p className={s.hint}>{t("setup.test.micPrompt")}</p>}
        </Card>
        <Card className={s.check}>
          <span className={s.checkTitle}><Icon name="cpu" />{t("setup.test.engine")}{selectedEngine ? ` · ${selectedEngine.name}` : ""}</span>
          {selectedEngine ? <EngineTest id={selectedEngine.id} /> : <Spinner size="sm" />}
        </Card>
        <Card className={s.check}>
          <div className={s.checkHead}>
            <span className={s.checkTitle}><Icon name="play" />{t("setup.test.voice")}</span>
            {ttsOk ? <Button size="sm" variant="secondary" icon="play" onClick={play} disabled={!voices.data}>{t("setup.test.voicePlay")}</Button> : null}
          </div>
          {!ttsOk ? <p className={s.hint}>{t("setup.test.voiceMissing")}</p> : null}
        </Card>
        <Card className={s.check}>
          <span className={s.checkTitle}><Icon name="language" />{t("setup.test.speech")}</span>
          {stt.data ? (
            stt.data.available
              ? <span className={s.ok}><Icon name="check" size="sm" />{t("setup.test.speechReady", { backend: stt.data.backend })}</span>
              : <span className={s.warn}>{t("setup.test.speechMissing")}</span>
          ) : <Spinner size="sm" />}
        </Card>
        <Card className={s.check}>
          <Toggle label={t("setup.test.telemetry")} description={t("setup.test.telemetryHint")}
            checked={Boolean(telemetry.data?.opt_in)} disabled={!telemetry.data} onChange={(v) => void setOpt(v)} />
        </Card>
      </div>
      <div className={s.footer}>
        <Button variant="ghost" icon="chevronLeft" onClick={onBack}>{t("common.back")}</Button>
        <div className={s.footerRight}>
          <Button variant="secondary" icon="keyboard" onClick={() => { prefs.setInput("text"); stopMic(); onNext(); }}>{t("setup.test.useKeyboard")}</Button>
          <Button variant="primary" iconRight="arrowRight" onClick={() => { stopMic(); onNext(); }}>{t("common.continue")}</Button>
        </div>
      </div>
    </>
  );
}

function AboutStep({ headingRef, onNext, onBack }: { headingRef: Ref; onNext: () => void; onBack: () => void }) {
  const profile = useLoad(() => api.profile());
  const [cv, setCv] = useState<string | null>(null);
  const [job, setJob] = useState("");
  const [editor, setEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const value = cv ?? profile.data?.text ?? "";

  const saveAndNext = async () => {
    if (cv !== null && cv.trim()) {
      setBusy(true);
      try {
        await api.saveProfile(cv, "paste");
      } catch (e) {
        setMsg({ tone: "error", text: errorMessage(e) });
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    onNext();
  };
  const upload = async (file: File) => {
    setBusy(true);
    setMsg(null);
    try {
      const p = await api.uploadProfile(file);
      setCv(null);
      profile.setData(p);
      setMsg({ tone: "success", text: t("setup.about.cvSaved") });
    } catch (e) {
      setMsg({ tone: "error", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head headingRef={headingRef} title={t("setup.about.title")} sub={t("setup.about.subtitle")} />
      <Card className={s.check}>
        <Textarea label={t("setup.about.cv")} optionalText={t("common.optional")} placeholder={t("setup.about.cvPlaceholder")}
          rows={8} value={value} onChange={(e) => setCv(e.target.value)} />
        <div className={s.row}>
          <Button size="sm" variant="secondary" icon="upload" disabled={busy} onClick={() => fileRef.current?.click()}>{t("setup.about.cvUpload")}</Button>
          <input ref={fileRef} type="file" className={s.fileInput} accept=".pdf,.docx,.txt,.md" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
        </div>
        {msg ? <Callout tone={msg.tone} live={msg.tone === "error" ? "alert" : "status"}>{msg.text}</Callout> : null}
      </Card>
      <Card className={s.check}>
        <span className={s.checkTitle}><Icon name="briefcase" />{t("setup.about.job")}</span>
        {job ? <span className={s.ok}><Icon name="check" size="sm" />{t("setup.about.jobAdded", { title: job })}</span> : null}
        <div className={s.row}>
          <Button size="sm" variant="secondary" icon="plus" onClick={() => setEditor(true)}>{t("setup.about.jobAdd")}</Button>
        </div>
      </Card>
      <div className={s.footer}>
        <Button variant="ghost" icon="chevronLeft" onClick={onBack}>{t("common.back")}</Button>
        <div className={s.footerRight}>
          <Button variant="ghost" onClick={onNext}>{t("setup.about.skip")}</Button>
          <Button variant="primary" iconRight="arrowRight" loading={busy} onClick={() => void saveAndNext()}>{t("common.continue")}</Button>
        </div>
      </div>
      <VacancyEditor open={editor} onClose={() => setEditor(false)}
        onSaved={(v) => { setEditor(false); setJob(v.title); prefs.setVacancy(v.id); void api.vacancyQuestions(v.id).catch(() => {}); }} />
    </>
  );
}

function FirstStep({ headingRef, onBack }: { headingRef: Ref; onBack: () => void }) {
  const navigate = useNavigate();
  const { settings } = useApp();
  const stt = useLoad(() => api.stt());
  const [answer, setAnswer] = useState(prefs.input());
  const start = () => {
    prefs.setSetupDone(true);
    prefs.setInput(answer);
    const vacancyId = prefs.vacancy() || undefined;
    const config = buildSessionConfig({ mode: "interview", answer, roundType: "mix", vacancyId }, settings, stt.data);
    navigate("/session", { replace: true, state: { config, title: t("setup.first.title") } });
  };
  return (
    <>
      <Head headingRef={headingRef} title={t("setup.first.title")} sub={t("setup.first.subtitle")} />
      <Card className={s.check}>
        <Segmented
          label={t("setup.first.how")}
          value={answer}
          onChange={setAnswer}
          options={[{ value: "voice", label: t("home.voice"), icon: "mic" }, { value: "text", label: t("home.keyboard"), icon: "keyboard" }]}
        />
      </Card>
      <div className={s.footer}>
        <Button variant="ghost" icon="chevronLeft" onClick={onBack}>{t("common.back")}</Button>
        <div className={s.footerRight}>
          <Button variant="secondary" onClick={() => { prefs.setSetupDone(true); navigate("/", { replace: true }); }}>{t("setup.first.later")}</Button>
          <Button variant="primary" size="lg" icon={answer === "voice" ? "mic" : "keyboard"} onClick={start}>{t("setup.first.start")}</Button>
        </div>
      </div>
    </>
  );
}
