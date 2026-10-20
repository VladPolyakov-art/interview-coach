import type { HTMLAttributes, ReactNode } from "react";
import s from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "li";
  padding?: "sm" | "md" | "lg";
  tone?: "raised" | "subtle" | "flat";
  children?: ReactNode;
}

export function Card({ as: Tag = "div", padding = "md", tone = "raised", className, children, ...rest }: CardProps) {
  const cls = [s.card, s[`pad-${padding}`], tone !== "raised" ? s[tone] : "", className ?? ""].filter(Boolean).join(" ");
  return <Tag className={cls} {...rest}>{children}</Tag>;
}

export interface SelectableCardProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onSelect"> {
  selected?: boolean;
  padding?: "sm" | "md" | "lg";
  onSelect?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

/** A card that is one choice in a set (vacancy card, engine card): a button with aria-pressed. */
export function SelectableCard({ selected, padding = "md", onSelect, className, children, disabled, ...rest }: SelectableCardProps) {
  const cls = [s.card, s.interactive, s[`pad-${padding}`], selected ? s.selected : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} aria-pressed={selected} onClick={onSelect} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
