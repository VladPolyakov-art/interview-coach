/* Status pill (G11, docs/motion.md 3.2 P6/P7 + 3.7): the one state text under the orb (session.md O5).
 * It is the orb's live region (role="status", polite): colour never tells Mike's states apart (P6).
 * - Dot: --color-mic-live and static only while `live` (your turn / listening with the mic open; rule 3:
 *   nothing pulses while the user speaks). Grey pulse (`pulse-dot`, .motion-loop) while thinking / connecting.
 *   Grey and still otherwise. Muted shows the slashed mic icon instead of a dot. Never blue for Mike.
 * - Label cross-fades (fast) on change, except into Listening (the user has just started talking).
 * - `sub`: one static line under the pill ("Take your time. Mike waits for 5 s of quiet."). */
import type { ReactNode } from "react";
import { Icon } from "./icons";
import s from "./StatusPill.module.css";

export type StatusPillState =
  | "connecting" | "speaking" | "your-turn" | "listening" | "thinking" | "between" | "muted" | "offline" | "paused";

export interface StatusPillProps {
  state: StatusPillState;
  /** Visible label from the locale file ("Listening", "Mike is speaking"). */
  label: string;
  /** The user's mic is open (voice input, not muted). Only then can the dot be blue. */
  live?: boolean;
  /** Static sub line under the pill. */
  sub?: ReactNode;
  /** Be the polite live region (default true). Turn off when another element already announces the state. */
  announce?: boolean;
  className?: string;
}

const PULSE = new Set<StatusPillState>(["connecting", "thinking"]);

export function StatusPill({ state, label, live, sub, announce = true, className }: StatusPillProps) {
  const blue = live && (state === "listening" || state === "your-turn");
  const dotTone = blue ? s.dotLive : PULSE.has(state) ? `${s.dotPulse} motion-loop` : "";
  return (
    <div className={`${s.root} ${className ?? ""}`} data-review-id={`StatusPill/${state}${blue ? "-live" : ""}`}>
      <span className={s.pill} role={announce ? "status" : undefined} aria-live={announce ? "polite" : undefined}>
        {state === "muted"
          ? <span className={s.icon} aria-hidden="true"><Icon name="micOff" size="sm" /></span>
          : <span className={`${s.dot} ${dotTone}`} aria-hidden="true" />}
        <span key={`${state}:${label}`} className={state === "listening" ? s.label : `${s.label} ${s.labelIn}`}>{label}</span>
      </span>
      {sub ? <p className={s.sub}>{sub}</p> : null}
    </div>
  );
}
