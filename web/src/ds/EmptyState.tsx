import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import s from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  headingLevel?: 2 | 3;
}

export function EmptyState({ icon = "info", title, children, actions, compact, headingLevel = 2 }: EmptyStateProps) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={`${s.empty} ${compact ? s.compact : ""}`}>
      <span className={s.icon}><Icon name={icon} size="lg" /></span>
      <H className={s.title}>{title}</H>
      {children ? <div className={s.body}>{children}</div> : null}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </div>
  );
}
