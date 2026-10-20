/* G14 SessionTopBar (screen-local until the DS indexes it): context title, progress, static timer, mode switch, End.
 * Variants interview | drill | english; wide = one row on a 1fr auto 1fr grid, narrow = two rows (CSS container query).
 * The timer is static: it never pulses or recolours, in any state (US-13 AC7). */
import { Badge, Button, Icon, Segmented, Tooltip } from "../../../ds";
import { t } from "../../../i18n";
import type { SessionData, SessionHandlers, SessionInput, SessionVariant } from "../types";
import s from "./TopBar.module.css";

/** "07:12": mm:ss, minutes padded (the debrief and History use the unpadded clock). */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TopBar({ variant, input, data, handlers, compact, entering, voiceLocked }: {
  variant: SessionVariant;
  input: SessionInput;
  data: SessionData;
  handlers?: SessionHandlers;
  compact: boolean;
  entering?: boolean;
  /** Voice can't come back once the session runs in text (the backend can't switch input mid-session). */
  voiceLocked?: boolean;
}) {
  const total = Math.max(0, Math.floor(data.elapsed));
  const aria = t("session.elapsedAria", { m: Math.floor(total / 60), s: total % 60 });
  const modes = [
    { value: "voice" as const, label: compact ? "" : t("session.voice"), icon: "mic" as const, disabled: voiceLocked && input === "text", title: voiceLocked && input === "text" ? t("session.voiceNeedsNew") : t("session.voice") },
    { value: "text" as const, label: compact ? "" : t("session.text"), icon: "keyboard" as const, title: t("session.text") },
  ];
  return (
    <header className={s.bar} data-compact={compact || undefined} data-review-id="Session/Topbar" data-review-section="Session · Top bar" data-comment-target>
      <div className={s.left}>
        <Tooltip content={data.title} onlyWhenTruncated block>
          <span className={s.title} data-truncate>{data.title}</span>
        </Tooltip>
        {data.sub && variant === "interview" ? <span className={s.sub}>{data.sub}</span> : null}
        {data.badges?.length ? (
          <span className={s.badges}>
            {data.badges.map((b) => <Badge key={b.label} tone={b.tone} icon={b.icon}>{b.label}</Badge>)}
          </span>
        ) : null}
      </div>
      <span className={s.progress}>{data.progress}</span>
      <div className={s.right}>
        <span className={`${s.timer} ${entering ? "motion-meta" : ""}`} role="timer" aria-label={aria}>
          <Icon name="clock" size="sm" />
          <span aria-hidden="true">{clock(data.elapsed)}</span>
        </span>
        <span className={s.mode}>
          <Segmented
            label={t("session.modeSwitch")}
            hideLabel
            value={input}
            onChange={(v) => { if (input !== v) handlers?.onMode?.(v); }}
            options={modes}
          />
        </span>
        <Button className={s.end} variant="secondary" size={compact ? "sm" : "md"} icon="stop" onClick={handlers?.onEnd}>
          {variant === "english" ? t("session.endPractice") : t("session.end")}
        </Button>
      </div>
    </header>
  );
}
