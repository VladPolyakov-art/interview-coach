import type { ReactNode } from "react";
import s from "./Orb.module.css";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "muted" | "offline";

export interface OrbProps {
  state: OrbState;
  /** Visible state text. The orb is decorative; this text carries the meaning. */
  label: ReactNode;
  sub?: ReactNode;
  size?: "md" | "sm";
}

/** Voice-state orb. Graphic only: the state is always also given as text, announced politely. */
export function Orb({ state, label, sub, size = "md" }: OrbProps) {
  return (
    <div className={s.wrap}>
      <div className={`${s.orb} ${s[state]} ${size === "sm" ? s.sm : ""}`} aria-hidden="true" data-state={state} />
      <div className={s.label} role="status" aria-live="polite">{label}</div>
      {sub ? <div className={s.sub}>{sub}</div> : null}
    </div>
  );
}
