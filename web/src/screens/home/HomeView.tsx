/* Home (ds/screens/home.md): the start screen. A pure view: every state of the map is a set of props, nothing here
 * reads the store or the network (the live container is HomeScreen.tsx). Order, top to bottom: banners, orb, greeting,
 * track switch, then the Interview panel (What to work on, round type, job composer, Start, example) or the English
 * panel (level, topic, Start, phrases). The orb and the banners are drawn before the H1 with `order` (Page has no slot
 * for them), so the reading order of the DOM differs from the visual order — see the report. */
import { useState } from "react";
import { Orb, Segmented, Swap } from "../../ds";
import { t } from "../../i18n";
import { Page } from "../../components/Page";
import { basisText } from "./helpers";
import { Banners } from "./parts/Banners";
import { EnglishPanel, PhrasesBlock } from "./parts/EnglishPanel";
import { ExamplePanel } from "./parts/ExamplePanel";
import { JobComposer } from "./parts/JobComposer";
import { RoundType } from "./parts/RoundType";
import { Basis, Disclaimer, StartBlock, StartButton, StickyStart, useOutOfView } from "./parts/StartBlock";
import { WorkOn } from "./parts/WorkOn";
import type { HomeViewProps, Track } from "./types";
import s from "./HomeView.module.css";

export function HomeView(props: HomeViewProps) {
  const {
    track, greeting, name, loading, engineReady, engineBanner, browserBanner, textMode, storageError, starting, buildUp, leaving,
    interview, english, overlay,
  } = props;
  const [switched, setSwitched] = useState(false);
  const { ref: startRef, out } = useOutOfView();
  const title = name ? t("home.greetingName", { greeting, name }) : greeting;
  const isInterview = track === "interview";
  const firstVisit = isInterview ? interview.firstVisit : english.firstVisit;

  const startLabel = isInterview ? t("home.start") : t("english.start");
  const startDisabled = !engineReady || Boolean(loading) || (!isInterview && !english.level);
  const reason = !engineReady
    ? { text: t("home.engine.reason") }
    : loading
      ? { text: t("home.reason.loading"), shimmer: true }
      : !isInterview && !english.level
        ? { text: t("english.startReason") }
        : null;
  const typedLine = textMode ? (isInterview ? t("home.browser.typing") : t("english.typing")) : undefined;
  const changeTrack = (next: Track) => { setSwitched(true); props.onTrackChange?.(next); };

  const pageClass = [s.home, leaving ? "motion-soft-out" : buildUp ? "motion-stagger" : ""].filter(Boolean).join(" ");
  const panelClass = [s.panel, buildUp && !switched ? `motion-stagger ${s.nested}` : ""].filter(Boolean).join(" ");

  return (
    <Page
      layout="start"
      title={title}
      sub={isInterview && firstVisit ? t("home.vacancies.empty") : undefined}
      className={pageClass}
    >
      <Banners
        engine={engineBanner}
        browser={browserBanner}
        storage={storageError}
        onRetryEngine={props.onRetryEngine}
        onUseTextMode={props.onUseTextMode}
        onDismissBrowser={props.onDismissBrowser}
      />
      <div className={s.orb} data-review-id="Home/Orb">
        <Orb
          state={engineReady ? "idle" : "offline"}
          size="sm"
          hideLabel
          label={engineReady ? t("home.orbIdle") : t("home.orbOffline")}
        />
      </div>

      <div className={s.track} data-review-id="Home/TrackSwitch" data-review-section="Home · Track switch" data-comment-target>
        <div className={s.trackSwitch}>
          <Segmented<Track>
            label={t("home.tabs")}
            hideLabel
            value={track}
            onChange={changeTrack}
            options={[
              { value: "interview", label: t("home.tabInterview"), icon: "briefcase" },
              { value: "english", label: t("home.tabEnglish"), icon: "chat" },
            ]}
          />
        </div>
        {isInterview ? <p className={s.trackHint}>{t("home.trackHint")}</p> : null}
      </div>

      <Swap swapKey={track}>
        <div className={panelClass} aria-busy={loading || undefined}>
          {isInterview ? (
            <>
              {!interview.firstVisit && !storageError ? (
                <div className={s.workOn}>
                  <WorkOn model={interview} engineReady={engineReady} onFocusChange={props.onFocusChange} onDrill={props.onDrill} />
                </div>
              ) : null}
              <div className={s.compose}>
                <RoundType value={interview.round} disabled={loading} onChange={props.onRoundChange} />
                <JobComposer
                  model={interview}
                  loading={loading}
                  onSelectJob={props.onSelectJob}
                  onEditJob={props.onEditJob}
                  onDeleteJob={props.onDeleteJob}
                  onAddJob={props.onAddJob}
                  onPickFile={props.onPickFile}
                  onPastedChange={props.onPastedChange}
                  onAddPasted={props.onAddPasted}
                  onStrictnessChange={props.onStrictnessChange}
                />
                <Basis text={basisText(interview)} showCvNudge={!interview.hasCv} />
              </div>
              <StartBlock
                startRef={startRef}
                label={startLabel}
                textMode={textMode}
                disabled={startDisabled}
                starting={starting}
                reason={reason}
                line={typedLine}
                typeInstead={!textMode}
                onStart={props.onStart}
                onTypeInstead={props.onTypeInstead}
              />
              <Disclaimer />
              {interview.firstVisit ? <ExamplePanel order={interview.layerOrder} /> : null}
            </>
          ) : (
            <>
              <EnglishPanel
                model={english}
                loading={loading}
                onLevelChange={props.onLevelChange}
                onTopicChange={props.onTopicChange}
              />
              <StartBlock
                startRef={startRef}
                label={startLabel}
                textMode={textMode}
                disabled={startDisabled}
                starting={starting}
                reason={reason}
                line={typedLine ?? t("english.after")}
                typeInstead={!textMode}
                onStart={props.onStart}
                onTypeInstead={props.onTypeInstead}
              />
              <PhrasesBlock model={english} engineReady={engineReady} onPractisePhrases={props.onPractisePhrases} />
              <Disclaimer english />
            </>
          )}
        </div>
      </Swap>

      <StickyStart show={out}>
        <StartButton
          label={startLabel}
          textMode={textMode}
          disabled={startDisabled}
          starting={starting}
          onStart={props.onStart}
          describedBy={reason ? "home-start-reason" : undefined}
        />
      </StickyStart>
      {overlay}
    </Page>
  );
}
