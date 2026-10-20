/* Basis line, Start / Type instead, disclaimer, and the sticky Start bar for phones (home.md §3.2 items 7–9, §3.6). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Dots, Icon, TextShimmer } from "../../../ds";
import { t } from "../../../i18n";
import { TextLink } from "./TextLink";
import s from "./parts.module.css";

/** Basis line under the composer (US-10 AC2) and the no-CV nudge. */
export function Basis({ text, showCvNudge }: { text: string; showCvNudge?: boolean }) {
  return (
    <div className={s.basis} data-review-id="Home/Basis">
      <p className={s.basisLine}><Icon name="info" size="sm" /><span>{text}</span></p>
      {showCvNudge ? (
        <p className={s.cvNudge}>
          {t("home.vacancies.addCv")} <TextLink to="/settings/profile">{t("home.vacancies.addCvLink")}</TextLink>
        </p>
      ) : null}
    </div>
  );
}

export interface StartButtonProps {
  label: string;
  textMode?: boolean;
  disabled?: boolean;
  starting?: boolean;
  onStart?: () => void;
  describedBy?: string;
  className?: string;
}

/** The one primary. While starting it cross-fades into the connecting pill (Dots, docs/motion.md 3.3 D1). */
export function StartButton({ label, textMode, disabled, starting, onStart, describedBy, className }: StartButtonProps) {
  return (
    <span key={starting ? "connecting" : "start"} className={`${s.startSlot} ${className ?? ""}`}>
      {starting ? (
        <Dots variant="pill" label={t("home.connecting")} shimmer fullWidth />
      ) : (
        <Button
          variant="primary"
          size="lg"
          icon={textMode ? "keyboard" : "mic"}
          disabled={disabled}
          aria-describedby={describedBy}
          className={s.startButton}
          onClick={onStart}
        >
          {label}
        </Button>
      )}
    </span>
  );
}

export interface StartBlockProps extends StartButtonProps {
  /** Visible reason under Start when it is disabled (linked by aria-describedby). `loading` draws the shimmer. */
  reason?: { text: string; shimmer?: boolean } | null;
  /** "Type instead" (GR5): hidden in text mode and while starting. */
  typeInstead?: boolean;
  /** Line under Start in text mode ("You'll answer by typing."). */
  line?: string;
  onTypeInstead?: () => void;
  startRef?: React.Ref<HTMLDivElement>;
}

export function StartBlock({ reason, typeInstead = true, line, onTypeInstead, startRef, ...start }: StartBlockProps) {
  const reasonId = reason ? "home-start-reason" : undefined;
  return (
    <div className={s.startBlock} ref={startRef} data-review-id="Home/Start" data-review-section="Home · Start" data-comment-target>
      <StartButton {...start} describedBy={reasonId} />
      {reason ? (
        <p id={reasonId} className={s.reason}>
          {reason.shimmer ? <TextShimmer>{reason.text}</TextShimmer> : reason.text}
        </p>
      ) : null}
      {line ? <p className={s.startLine}>{line}</p> : null}
      {typeInstead && !start.starting ? (
        <Button variant="ghost" size="sm" icon="keyboard" onClick={onTypeInstead}>{t("home.typeInstead")}</Button>
      ) : null}
    </div>
  );
}

/** "Practice only…" + What's free (US-31 AC1, US-30 link). English tab: "Free forever…". */
export function Disclaimer({ english }: { english?: boolean }) {
  return (
    <p className={s.disclaimer} data-review-id="Home/Disclaimer">
      {english ? t("english.free") : t("home.disclaimer")} <TextLink to="/settings/about#free">{t("home.free")}</TextLink>
    </p>
  );
}

/** Phones (shell < 640, CSS decides): when Start scrolls out of view, the same Start sticks to the bottom (O-6). */
export function useOutOfView(): { ref: React.RefObject<HTMLDivElement | null>; out: boolean } {
  const ref = useRef<HTMLDivElement | null>(null);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOut(Boolean(entry) && !entry!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, out };
}

export function StickyStart({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <div className={s.sticky} data-review-id="Home/StickyStart">{children}</div>;
}
