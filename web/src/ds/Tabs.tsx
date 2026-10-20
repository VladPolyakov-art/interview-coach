import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import s from "./Tabs.module.css";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: IconName;
  /** Short helper shown next to an inactive tab (e.g. the English-practice hint). */
  hint?: string;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Prefix for tab / panel ids: panels use `${idBase}-panel-${id}`. */
  idBase: string;
  label: string;
}

/** WAI-ARIA tabs with arrow-key navigation (automatic activation). */
export function Tabs<T extends string>({ items, value, onChange, idBase, label }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (event: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    const item = items[next];
    if (item) {
      onChange(item.id);
      refs.current[next]?.focus();
    }
  };
  return (
    <div role="tablist" aria-label={label} className={s.list}>
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            id={`${idBase}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            className={s.tab}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {item.icon ? <Icon name={item.icon} size="sm" /> : null}
            {item.label}
            {!selected && item.hint ? <span className={s.hint}>· {item.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, id, children }: { idBase: string; id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel-${id}`} aria-labelledby={`${idBase}-tab-${id}`} tabIndex={-1}>
      {children}
    </div>
  );
}
