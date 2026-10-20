/* SessionInterrupted: inside the stage (the panel stays readable), replacing question, captions and dock (US-04 AC5,
 * US-13 AC5). Engine drop: Resume is disabled until the engine answers again; no "Continue in text" (GR5).
 * Voice drop: Mike is still running, so typing continues. */
import { Button, Callout, CopyField, Orb, StatusPill } from "../../../ds";
import { t } from "../../../i18n";
import type { SessionHandlers } from "../types";
import s from "./parts.module.css";

export function Interrupted({ kind, handlers }: { kind: "engine" | "voice"; handlers?: SessionHandlers }) {
  return (
    <section className={s.interrupted} aria-label={t("session.status.paused")} data-review-id="Session/Interrupted" data-review-section="Session · Interrupted" data-comment-target>
      <div className={s.orbBlock}>
        <div className={s.orbBox}>
          <Orb state="offline" label={null} hideLabel />
        </div>
        <StatusPill state="paused" label={t("session.status.paused")} announce={false} />
      </div>
      {kind === "engine" ? (
        <>
          <Callout tone="error" live="alert" title={t("session.interrupted.engineTitle")}>
            {t("session.interrupted.engineBody")}
            <CopyField value={t("session.interrupted.command")} copyLabel={t("common.copyCommand")} copiedLabel={t("common.copied")} label={t("common.command")} />
          </Callout>
          <p className={s.interruptedNote}>{t("session.interrupted.engineRetry")}</p>
          <div className={s.interruptedActions}>
            <Button variant="primary" disabled onClick={handlers?.onResume}>{t("session.interrupted.resume")}</Button>
            <Button variant="ghost" onClick={handlers?.onEndAndDebrief}>{t("session.interrupted.endDebrief")}</Button>
          </div>
        </>
      ) : (
        <>
          <Callout tone="error" live="alert" title={t("session.interrupted.voiceTitle")}>
            {t("session.interrupted.voiceBody")}
          </Callout>
          <div className={s.interruptedActions}>
            <Button variant="primary" onClick={handlers?.onResume}>{t("session.interrupted.resumeVoice")}</Button>
            <Button variant="secondary" icon="keyboard" onClick={handlers?.onUseText}>{t("session.interrupted.continueText")}</Button>
            <Button variant="ghost" onClick={handlers?.onEndAndDebrief}>{t("session.interrupted.endDebrief")}</Button>
          </div>
        </>
      )}
    </section>
  );
}
