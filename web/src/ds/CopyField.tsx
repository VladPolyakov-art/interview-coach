import { useEffect, useState } from "react";
import { IconButton } from "./Button";
import s from "./CopyField.module.css";

export interface CopyFieldProps {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  /** Accessible name of the code block, e.g. "Command". */
  label?: string;
}

/** A one-line command with a copy button (clipboard API, falls back to selecting the text). */
export function CopyField({ value, copyLabel, copiedLabel, label }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      const sel = window.getSelection();
      const node = document.getElementById(`copy-${value}`);
      if (sel && node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };
  return (
    <div className={s.row}>
      <code id={`copy-${value}`} className={s.code} aria-label={label}>{value}</code>
      <span aria-live="polite" className={s.done}>{copied ? copiedLabel : ""}</span>
      <IconButton icon={copied ? "check" : "copy"} label={copyLabel} size="sm" onClick={() => void copy()} />
    </div>
  );
}
