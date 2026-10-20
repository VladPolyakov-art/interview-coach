/* Home v2 (ds/screens/home.md v2, D47a/b): a start screen that turns into a short setup chat with Mike.
 * A pure view: every state of the map is a set of props (the live container is HomeScreen.tsx, the review harness is
 * frames.tsx; both run the same script). Home owns a definite-height column inside <main> (absolute, inset 0), so the
 * setup header and the bottom composer stay put while only the chat scrolls — no sticky inside a scaled review frame.
 * - start: banners · greeting · composer · suggestions, centred a little above the middle; footer line at the bottom.
 * - setup: header row · chat (scrolls) · composer + footer at the bottom. The composer moves from the middle to the
 *   bottom by FLIP (motion "Home → setup chat"); under reduced motion it simply appears there. */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Composer } from "../../ds";
import { durationMs } from "../../ds/motion";
import { t } from "../../i18n";
import { Banners } from "./parts/Banners";
import { SetupChat, SetupHeader } from "./parts/SetupChat";
import { Footer, StartScreen } from "./parts/StartScreen";
import type { HomeViewProps } from "./types";
import s from "./HomeView.module.css";

/** The `page` container is < 560 (placeholders get shorter). Measured on Home's own box (same width as <main>). */
function useNarrow(ref: RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return narrow;
}

export function HomeView(props: HomeViewProps) {
  const { step, track, setup, composer, leaving, overlay } = props;
  const root = useRef<HTMLDivElement>(null);
  const startComposer = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const startTop = useRef<number | null>(null);
  const narrow = useNarrow(root);

  // "Adjusting state on a prop change": the chat is entering only when this view saw the start step first.
  const [prevStep, setPrevStep] = useState(step);
  const [entering, setEntering] = useState(false);
  if (prevStep !== step) {
    setPrevStep(step);
    setEntering(prevStep === "start" && step === "setup");
  }

  // Remember where the start composer is, for the FLIP when the chat opens.
  useLayoutEffect(() => {
    if (step === "start" && startComposer.current) startTop.current = startComposer.current.getBoundingClientRect().top;
  });

  useLayoutEffect(() => {
    if (step !== "setup" || !entering || startTop.current === null || !dock.current) return;
    const el = dock.current;
    const ms = durationMs("--duration-slower");
    const dy = startTop.current - el.getBoundingClientRect().top;
    startTop.current = null;
    if (!ms || !dy || typeof el.animate !== "function") return;
    const ease = getComputedStyle(el).getPropertyValue("--ease-standard").trim() || "ease";
    el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: ms, easing: ease });
  }, [step, entering]);

  const banners = (
    <Banners
      engine={props.engineBanner}
      browser={props.browserBanner}
      storage={props.storageError}
      onRetryEngine={props.onRetryEngine}
      onUseTextMode={props.onUseTextMode}
      onDismissBrowser={props.onDismissBrowser}
    />
  );
  const placeholder = setup?.stage === "plan"
    ? t("chat.setup.placeholderPlan")
    : setup?.stage === "job" ? t("chat.setup.placeholderJob") : t("chat.setup.placeholderReply");
  const rootClass = [s.home, leaving ? "motion-soft-out" : ""].filter(Boolean).join(" ");

  return (
    <div ref={root} className={rootClass} data-review-id={step === "start" ? "Home/Start" : "Home/Setup"} aria-busy={props.loading || undefined}>
      {step === "start" ? (
        <div className={s.startPage}>
          <div className={s.column}>
            {banners}
            <div className={s.startCenter}>
              <StartScreen {...props} narrow={narrow} composerRef={startComposer} />
            </div>
            <div className={s.startFooter}><Footer track={track} /></div>
          </div>
        </div>
      ) : (
        <>
          <div className={s.top}>
            <div className={s.column}><SetupHeader setup={setup} onSkip={props.onSkip} /></div>
          </div>
          <div ref={scroller} className={s.scroller}>
            <div className={`${s.column} ${s.chat}`}>
              {banners}
              <SetupChat {...props} entering={entering} scroller={scroller} />
            </div>
          </div>
          <div ref={dock} className={s.dock} data-review-id="Home/Setup/Composer" data-review-section="Home · Setup composer" data-comment-target>
            <div className={s.column}>
              <Composer
                label={t("chat.setup.label")}
                placeholder={placeholder}
                value={composer.text}
                minRows={1}
                maxRows={6}
                submitOnEnter
                onChange={(e) => props.onComposerChange?.(e.target.value)}
                send={{ label: t("chat.start.send"), icon: "arrowRight", variant: "action", hidden: !composer.text.trim(), onSend: props.onSend }}
              />
              <Footer track={track} />
            </div>
          </div>
        </>
      )}
      {overlay}
    </div>
  );
}
