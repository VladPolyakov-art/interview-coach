/* AI engine flow (D54): choose first, connect after.
 *   A  choose   a short list of four options; choosing does not switch the engine
 *   B  connect  only the chosen engine's connection UI; "Continue" switches and moves on
 * Used by Setup step 1 (mode "setup": A → B → onDone). Settings → AI engine (mode "settings") is one view without
 * steps (D78, EngineSettings): the engine in use on top, the others under it, each set up in place.
 * Status comes from GET /api/engines; every not-ready state has a concrete way forward (link, command to copy, form). */
import { useEffect, useRef, useState, type Ref } from "react";
import { Button, Callout, Skeleton } from "../ds";
import { t } from "../i18n";
import { useInterval } from "../lib/hooks";
import { errorMessage, useApp } from "../lib/store";
import type { EngineId } from "../lib/types";
import { EngineChoose } from "./engine/EngineChoose";
import { EngineConnect } from "./engine/EngineConnect";
import { EngineSettings } from "./engine/EngineSettings";
import { RECOMMENDED, engineKey, engineName } from "./engine/meta";
import s from "./engine/engine.module.css";

export { EngineStatus } from "./engine/EngineStatus";
export { EngineTest } from "./engine/EngineTest";

export type EngineStep = "choose" | "connect";

export interface EnginePanelProps {
  /** `setup`: first run, ends with `onDone`. `settings`: the one-view engine settings (D78). */
  mode: "setup" | "settings";
  /** Setup: the engine is ready and in use → go to the next step. */
  onDone?: () => void;
  /** Setup passes its page heading ref so the wizard can focus the h1; sub-steps move focus to the heading themselves. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Review and stories: open at a given step / engine (settings: that engine's setup expanded). */
  initialStep?: EngineStep;
  initialPick?: EngineId;
}

export function EnginePanel(props: EnginePanelProps) {
  return props.mode === "settings" ? <EngineSettings initialOpen={props.initialPick} /> : <SetupFlow {...props} />;
}

function SetupFlow({ mode, onDone, headingRef, initialStep, initialPick }: EnginePanelProps) {
  const { engines, refreshEngines, enginesLoading, updateSettings } = useApp();
  const [step, setStep] = useState<EngineStep>(initialStep ?? "choose");
  const [picked, setPicked] = useState<EngineId | null>(initialPick ?? null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const own = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Preselect the engine in use, or Ollama when there is none.
  const pick = picked ?? engines?.selected ?? RECOMMENDED;
  const pickedEngine = engines?.engines.find((e) => e.id === pick) ?? null;

  useEffect(() => { void refreshEngines(); }, [refreshEngines]);
  // Moving between A and B moves focus to the new heading (not on first render: the page does that).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    own.current?.focus();
  }, [step]);
  // Re-check every 5 s while the engine we are looking at is not ready (its status turns Ready by itself).
  const watched = step === "connect" ? pickedEngine : null;
  useInterval(() => { void refreshEngines(); }, 5000, Boolean(watched) && !watched?.status.ready);

  const setRef = (el: HTMLHeadingElement | null) => {
    own.current = el;
    if (typeof headingRef === "function") headingRef(el);
    else if (headingRef) (headingRef as { current: HTMLHeadingElement | null }).current = el;
  };

  const use = async () => {
    if (!pickedEngine) return;
    setError("");
    if (pickedEngine.id !== engines?.selected) {
      setSwitching(true);
      try {
        await updateSettings({ engine: pickedEngine.id });
      } catch (e) {
        setError(errorMessage(e));
        setSwitching(false);
        return;
      }
      setSwitching(false);
    }
    onDone?.();
  };

  if (!engines) {
    return enginesLoading ? <Skeleton variant="row" rows={3} label={t("common.checking")} /> : (
      <Callout tone="error" title={t("errors.server_unreachable")} actions={<Button size="sm" onClick={() => void refreshEngines()}>{t("common.tryAgain")}</Button>} />
    );
  }

  const heading = (title: string, sub?: string) => {
    const Tag = mode === "setup" ? "h1" : "h2";
    return (
      <div className={s.head} data-review-id="Engine/Heading" data-review-section="AI engine · Heading" data-comment-target>
        <Tag ref={setRef} tabIndex={-1} className={mode === "settings" ? s.title : undefined}>{title}</Tag>
        {sub ? <p className={s.sub}>{sub}</p> : null}
      </div>
    );
  };
  const errorBox = error ? <Callout tone="error" live="alert">{error}</Callout> : null;

  if (step === "connect" && pickedEngine) {
    return (
      <div className={s.flow}>
        <div className={s.backRow} data-review-id="Engine/Back" data-review-section="AI engine · Back" data-comment-target>
          <Button variant="link" size="sm" icon="chevronLeft" onClick={() => { setError(""); setStep("choose"); }}>{t("common.back")}</Button>
        </div>
        {heading(t("engines.flow.connectTitle", { name: engineName(pickedEngine) }), t(`engines.${engineKey(pickedEngine.id)}.tagline`))}
        {errorBox}
        <EngineConnect
          engine={pickedEngine}
          mode={mode}
          switching={switching}
          checking={enginesLoading}
          onRecheck={() => void refreshEngines()}
          onUse={() => void use()}
        />
      </div>
    );
  }

  return (
    <div className={s.flow}>
      {heading(t("engines.flow.chooseTitle"), t("engines.flow.chooseSub"))}
      <EngineChoose
        engines={engines.engines}
        value={pick}
        onChange={setPicked}
        mode={mode}
        onNext={() => setStep("connect")}
      />
    </div>
  );
}
