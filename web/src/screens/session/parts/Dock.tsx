/* The dock (R7 conversation bar, US-13 AC1): mic, the one main action, Redo, Type instead, the shortcut help line;
 * connecting pill; text-mode Composer. Narrow: Redo / Type instead become IconButtons and the main action is `lg`. */
import { useState } from "react";
import { Button, Composer, Dots, IconButton, Kbd, MicButton } from "../../../ds";
import { t } from "../../../i18n";
import type { SessionHandlers, SessionInput, SessionPhase } from "../types";
import s from "./parts.module.css";

export interface DockProps {
  input: SessionInput;
  phase: SessionPhase;
  muted: boolean;
  micLevel: number;
  getMicLevel?: () => number;
  /** The user has answered at least once, or is recording now (Redo needs something to redo). */
  canRedo: boolean;
  /** The mic is open for the user (voice, session live). */
  micLive: boolean;
  pauseSec: number;
  handlers?: SessionHandlers;
  compact: boolean;
  /** Text mode: the send button stays disabled while the panel waits for Next question. */
  sendLocked: boolean;
  autoFocus?: boolean;
}

export function Dock(p: DockProps) {
  const { input, phase, handlers: h } = p;
  return (
    <div className={s.dock} data-compact={p.compact || undefined} data-input={input} data-review-id="Session/Dock" data-review-section="Session · Dock" data-comment-target>
      {phase === "connecting" ? (
        <div className={`${s.dockRow} motion-fade`}>
          <Dots variant="pill" shimmer label={t("session.connectingPill")} fullWidth={p.compact} />
        </div>
      ) : input === "text" ? (
        <TextDock {...p} />
      ) : (
        <VoiceDock {...p} />
      )}
      {h && input === "voice" && phase !== "connecting" ? <ShortcutHelp /> : null}
    </div>
  );
}

function VoiceDock({ phase, muted, micLevel, getMicLevel, canRedo, micLive, handlers: h, compact }: DockProps) {
  const speaking = phase === "mike-speaking";
  const listening = phase === "listening";
  const yourTurn = phase === "your-turn";
  const size = compact ? "lg" : "md";
  // The main action swaps with a short rise (D6), except into "Send now": the user has just started talking (rule 3).
  const swapIn = listening ? undefined : "motion-rise-base";
  return (
    <div className={`${s.dockRow} motion-dock`} role="group" aria-label={t("session.controls.label")}>
      <MicButton
        label={muted ? t("session.controls.unmute") : t("session.controls.mute")}
        muted={muted}
        live={micLive}
        level={getMicLevel ? undefined : micLevel}
        getLevel={getMicLevel}
        onClick={h?.onToggleMute}
      />
      {speaking ? (
        <Button key="interrupt" className={swapIn} variant="secondary" size={size} icon="hand" onClick={h?.onInterrupt}>{t("session.controls.interrupt")}</Button>
      ) : listening ? (
        <Button key="send" variant="primary" size={size} icon="send" onClick={h?.onSendNow}>{t("session.controls.sendNow")}</Button>
      ) : yourTurn ? (
        <Button key="talk" className={swapIn} variant="secondary" size={size} icon="mic" onClick={h?.onInterrupt} disabled={muted}>{t("session.controls.talk")}</Button>
      ) : null}
      {compact ? (
        <>
          <IconButton icon="redo" label={t("session.controls.redo")} onClick={h?.onRedo} disabled={!canRedo} />
          <IconButton icon="keyboard" label={t("session.controls.typeInstead")} onClick={h?.onTypeInstead} />
        </>
      ) : (
        <>
          <Button variant="ghost" icon="redo" onClick={h?.onRedo} disabled={!canRedo}>{t("session.controls.redo")}</Button>
          <Button variant="ghost" icon="keyboard" onClick={h?.onTypeInstead}>{t("session.controls.typeInstead")}</Button>
        </>
      )}
    </div>
  );
}

function TextDock({ phase, handlers: h, sendLocked, autoFocus }: DockProps) {
  const [draft, setDraft] = useState("");
  const busy = phase === "mike-speaking" || phase === "thinking" || phase === "connecting";
  const canSend = !busy && !sendLocked && draft.trim().length > 0;
  const send = () => {
    if (canSend && h?.onSendText?.(draft)) setDraft("");
  };
  return (
    <div className="motion-dock">
      <Composer
        label={t("session.input.label")}
        placeholder={t("session.input.placeholder")}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        submitOnEnter
        minRows={1}
        maxRows={6}
        autoFocus={autoFocus}
        send={{ label: t("session.input.send"), icon: "send", variant: "action", disabled: !canSend, onSend: send }}
        hint={
          <span className={s.hint}>
            <span><Kbd>{t("session.input.enter")}</Kbd> {t("session.input.hintSend")}</span>
            <span aria-hidden="true">·</span>
            <span><Kbd>{t("session.input.shiftEnter")}</Kbd> {t("session.input.hintNewline")}</span>
          </span>
        }
      />
    </div>
  );
}

function ShortcutHelp() {
  const items: [string, string][] = [
    [t("session.help.space"), t("session.help.interrupt")],
    ["M", t("session.help.mute")],
    ["R", t("session.help.redo")],
    [t("session.help.enter"), t("session.help.send")],
    ["T", t("session.help.type")],
  ];
  return (
    <p className={s.help} aria-label={t("session.controls.help")}>
      {items.map(([key, label]) => (
        <span key={key} className={s.helpItem}><Kbd>{key}</Kbd> {label}</span>
      ))}
    </p>
  );
}
