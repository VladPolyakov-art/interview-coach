/* Start screen (home.md v2 §3, D47a/b): a text greeting (no orb), one composer, up to three suggestions
 * (the footer line is pinned to the bottom of <main> by HomeView).
 * Calm like a chat start page: nothing else on screen. The composer carries the practice type (mode chip with a
 * radio menu) and a "+" for a job file; Send appears only with text or a file (motion D6). Under the composer: the
 * quick start (D51 item 1: "Start now" + what it starts), then the suggestions. */
import type { Ref } from "react";
import { Button, Chip, ChipGroup, Composer, ComposerAttachment, Icon, IconButton, Menu, Skeleton } from "../../../ds";
import { t } from "../../../i18n";
import type { HomeViewProps, Track } from "../types";
import { QuickStart } from "./QuickStart";
import { TextLink } from "./TextLink";
import s from "./parts.module.css";

export function Footer({ track }: { track: Track }) {
  return (
    <p className={s.footer} data-review-id="Home/Footer">
      {track === "english" ? t("english.free") : t("home.disclaimer")} <TextLink to="/settings/about#free">{t("home.free")}</TextLink>
    </p>
  );
}

function ModeMenu({ track, open, onChange }: { track: Track; open?: boolean; onChange?: (track: Track) => void }) {
  const label = track === "english" ? t("chat.start.mode.english") : t("chat.start.mode.interview");
  return (
    <Menu
      label={t("chat.start.mode.menu")}
      defaultOpen={open}
      items={[
        { id: "interview", label: t("chat.start.mode.interview"), description: t("chat.start.mode.interviewDesc"), icon: "briefcase", checked: track === "interview", onSelect: () => onChange?.("interview") },
        { id: "english", label: t("chat.start.mode.english"), description: t("chat.start.mode.englishDesc"), icon: "chat", checked: track === "english", onSelect: () => onChange?.("english") },
      ]}
      trigger={(p) => (
        <Button {...p} variant="secondary" size="sm" icon={track === "english" ? "chat" : "briefcase"} iconRight="chevronDown" aria-label={t("chat.start.mode.aria", { mode: label })}>
          {label}
        </Button>
      )}
    />
  );
}

/** Longer chip labels ("Kestrel Payments Internati… again") are clamped by CSS; the full text goes to `title`. */
const CHIP_CLAMP = 28;

export interface StartScreenProps extends HomeViewProps {
  narrow: boolean;
  composerRef?: Ref<HTMLDivElement>;
}

export function StartScreen(props: StartScreenProps) {
  const { track, name, composer, suggestions, narrow, composerRef, buildUp } = props;
  const english = track === "english";
  const title = english
    ? name ? t("chat.start.englishName", { name }) : t("chat.start.english")
    : name ? t("chat.start.greetingName", { name }) : t("chat.start.greeting");
  const placeholder = english ? t("chat.start.placeholderEnglish") : narrow ? t("chat.start.placeholderNarrow") : t("chat.start.placeholder");
  const hasInput = Boolean(composer.text.trim() || composer.file);

  return (
    <div className={`${s.start} ${buildUp ? "motion-stagger" : ""}`} data-review-id="Home/Start-screen">
      <h1 className={s.greeting} data-review-id="Home/Greeting" data-review-section="Home · Greeting" data-comment-target>{title}</h1>
      <div ref={composerRef} className={s.composer} data-review-id="Home/Composer" data-review-section="Home · Composer" data-comment-target>
        <Composer
          label={t("chat.start.label")}
          placeholder={placeholder}
          value={composer.text}
          minRows={1}
          maxRows={8}
          submitOnEnter
          busy={props.loading}
          onChange={(e) => props.onComposerChange?.(e.target.value)}
          attachment={composer.file ? (
            <ComposerAttachment
              icon="file"
              title={composer.file.name}
              meta={composer.file.size}
              actions={<IconButton icon="x" size="sm" label={t("chat.start.removeFile")} onClick={props.onRemoveFile} />}
            />
          ) : undefined}
          toolbarStart={(
            <>
              <ModeMenu track={track} open={props.initialOverlay === "mode"} onChange={props.onModeChange} />
              {english ? null : <IconButton icon="plus" size="sm" outlined label={t("chat.start.addFile")} onClick={props.onAddFile} />}
            </>
          )}
          send={{ label: t("chat.start.send"), icon: "arrowRight", variant: "action", hidden: !hasInput, onSend: props.onSend }}
        />
      </div>
      {composer.file ? (
        <p className={s.fileLine}><Icon name="lock" size="sm" />{t("chat.start.fileLocal")}</p>
      ) : null}
      {props.quickStart ? (
        <QuickStart
          detail={props.quickStart.detail}
          disabled={props.loading || !props.engineReady}
          starting={props.starting}
          onStart={props.onQuickStart}
        />
      ) : null}
      <div className={s.suggestions} aria-busy={props.loading || undefined} data-review-id="Home/Suggestions" data-review-section="Home · Suggestions" data-comment-target>
        {props.loading && !suggestions.length ? (
          <Skeleton variant="lines" lines={1} className={s.suggestionsSkeleton} />
        ) : suggestions.length ? (
          <ChipGroup label={t("chat.start.suggestions")} hideLabel align="center">
            {suggestions.map((x) => (
              <Chip key={x.id} icon={x.icon} title={x.label.length > CHIP_CLAMP ? x.label : undefined} disabled={props.loading} onClick={() => props.onSuggestion?.(x.id)}>
                <span className={s.chipLabel}>{x.label}</span>
              </Chip>
            ))}
          </ChipGroup>
        ) : null}
      </div>
    </div>
  );
}
