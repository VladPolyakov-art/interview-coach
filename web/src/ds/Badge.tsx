import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import s from "./Badge.module.css";

export type BadgeTone = "neutral" | "live" | "success" | "warning" | "error" | "outline" | "content" | "language" | "delivery";

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: IconName;
  dot?: boolean;
  children: ReactNode;
  title?: string;
}

/** Static status label. Tone is never the only signal: always pair it with text. */
export function Badge({ tone = "neutral", icon, dot, children, title }: BadgeProps) {
  return (
    <span className={`${s.badge} ${s[tone]}`} title={title}>
      {dot ? <span className={s.dot} aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </span>
  );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  selected?: boolean;
}

/** Toggleable or actionable pill (preset picker, filter). */
export function Chip({ icon, selected, children, className, ...rest }: ChipProps) {
  return (
    <button type="button" className={`${s.chip} ${className ?? ""}`} aria-pressed={selected} {...rest}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </button>
  );
}
