import type { ReactNode } from "react";
import s from "./SettingRow.module.css";

export interface SettingRowProps {
  /** The setting's name. The control keeps its own accessible name (`hideLabel`), so this text is not a <label>. */
  label: ReactNode;
  description?: ReactNode;
  /** The control: a toggle, select, segmented control or button(s). */
  children: ReactNode;
  /** `inline` (default): text left, control right. `stack`: the control under the text, full width (CV text, a path). */
  layout?: "inline" | "stack";
  /** Anchor for settings search and deep links (`/settings/voice#voice-speed`). */
  id?: string;
  className?: string;
}

/** One settings row (owner, D76): name and an optional description on the left, the control on the right, the same
 * for every kind of control. Rows in a list are split by a hairline; on a narrow container the control drops under the
 * text. */
export function SettingRow({ label, description, children, layout = "inline", id, className }: SettingRowProps) {
  return (
    <div id={id} className={`${s.row} ${layout === "stack" ? s.stack : ""} ${className ?? ""}`} data-setting-row="">
      <div className={s.text}>
        <span className={s.label}>{label}</span>
        {description ? <span className={s.desc}>{description}</span> : null}
      </div>
      <div className={s.control}>{children}</div>
    </div>
  );
}
