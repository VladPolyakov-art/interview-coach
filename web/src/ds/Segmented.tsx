import { useId, useRef, type KeyboardEvent } from "react";
import { Icon, type IconName } from "./icons";
import s from "./Segmented.module.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  title?: string;
}

export interface SegmentedProps<T extends string> {
  label: string;
  hideLabel?: boolean;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
}

/** Radio group styled as a segmented control. Arrow keys move and select. */
export function Segmented<T extends string>({ label, hideLabel, options, value, onChange, fullWidth }: SegmentedProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const onKey = (event: KeyboardEvent, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const pos = enabled.indexOf(index);
    const nextPos = forward ? (pos + 1) % enabled.length : (pos - 1 + enabled.length) % enabled.length;
    const nextIndex = enabled[nextPos];
    if (nextIndex === undefined) return;
    const opt = options[nextIndex];
    if (opt) {
      onChange(opt.value);
      refs.current[nextIndex]?.focus();
    }
  };
  return (
    <div className={s.wrap}>
      <span id={`${id}-l`} className={hideLabel ? "visually-hidden" : s.legend}>{label}</span>
      <div role="radiogroup" aria-labelledby={`${id}-l`} className={`${s.group} ${fullWidth ? s.full : ""}`}>
        {options.map((o, i) => {
          const checked = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={o.disabled}
              title={o.title}
              className={s.option}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {o.icon ? <Icon name={o.icon} size="sm" /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
