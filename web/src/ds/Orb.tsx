/* Mike's orb, concept 1 "voice-led" (session.md §5.1, docs/motion.md 3.7 "Orb concept 1"). Our own motion:
 * the v1 orb (drifting clouds, glow, sky gradient) was copied from ChatGPT and is gone.
 * - A matte disc with a centred two-stop fill (no off-centre highlight, no glow: P4). One blue hue, only while
 *   Mike is live; idle / muted / offline are grey (P2).
 * - Speaking: the disc's scale follows Mike's playback level (`level`, or `getLevel` read by rAF and written to
 *   --voice without a React render). Silence between phrases = still. No level source → a slow breath fallback.
 * - Thinking: a "held breath" (shrinks a little, holds, comes back) once per --duration-orb.
 * - Listening / your turn: a still disc and a still thin ring — the "open ear". Nothing moves while the user talks.
 * - The state is always text too (role="status", polite): the orb is decorative (P6). `hideLabel` keeps the text
 *   for assistive tech only (Home).
 * Reduced motion: static at scale 1; only the listening ring stays. */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { smoothLevel } from "./motion";
import s from "./Orb.module.css";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "muted" | "offline";

export interface OrbProps {
  state: OrbState;
  /** State text. The orb is decorative; this text carries the meaning. */
  label: ReactNode;
  sub?: ReactNode;
  size?: "md" | "sm";
  /** Keep the label for screen readers only (Home: the orb is an anchor, the page has its own heading). */
  hideLabel?: boolean;
  /** Mike's playback level 0..1, static (review frames, stories). Used while speaking. */
  level?: number;
  /** Live playback level 0..1, read every animation frame while speaking (smoothed like the mic). Wins over `level`. */
  getLevel?: () => number;
  /** Play the session entrance: the orb grows into place (transform only, docs/motion.md 3.3). */
  entering?: boolean;
  className?: string;
}

export function Orb({ state, label, sub, size = "md", hideLabel, level, getLevel, entering, className }: OrbProps) {
  const disc = useRef<HTMLDivElement>(null);
  const getLevelRef = useRef(getLevel);
  getLevelRef.current = getLevel;
  const live = Boolean(getLevel);
  const speaking = state === "speaking";
  const voiceLed = speaking && (live || level !== undefined);

  useEffect(() => {
    const el = disc.current;
    if (!el || !speaking || !live) return;
    let raf = 0;
    let v = 0;
    const tick = () => {
      v = smoothLevel(v, getLevelRef.current?.() ?? 0);
      el.style.setProperty("--voice", v.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.style.removeProperty("--voice");
    };
  }, [speaking, live]);

  const staticVoice = voiceLed && !live ? ({ "--voice": clamp01(level ?? 0).toFixed(3) } as CSSProperties) : undefined;
  const motion = state === "thinking" ? `${s.hold} motion-loop` : speaking && !voiceLed ? `${s.breath} motion-loop` : "";
  const figure = (
    <div className={`${s.figure} ${size === "sm" ? s.sm : ""}`} aria-hidden="true">
      <div ref={disc} className={`${s.disc} ${s[state]} ${voiceLed ? s.voiceLed : ""} ${motion}`} style={staticVoice} data-state={state} />
      <div className={`${s.ring} ${state === "listening" ? s.ringOn : ""}`} />
    </div>
  );
  return (
    <div className={`${s.wrap} ${className ?? ""}`} data-review-id={`Orb/${state}${size === "sm" ? "-sm" : ""}`}>
      {entering ? <div className={s.enter}>{figure}</div> : figure}
      <div className={hideLabel ? "visually-hidden" : s.label} role="status" aria-live="polite">{label}</div>
      {sub ? <div className={hideLabel ? "visually-hidden" : s.sub}>{sub}</div> : null}
    </div>
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}
