import { useEffect, useId, useRef, type ReactNode } from "react";
import { durationMs, runExit } from "./motion";
import s from "./Dialog.module.css";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

/** Modal built on native <dialog>: focus trap, Esc and inert background come from the platform.
 * Motion (docs/motion.md 3.3 D11): enters with `dialog-in` and a plain scrim fade (no blur). On close the
 * dialog leaves the top layer at once — the page is interactive again and focus returns to the opener
 * immediately — while a non-interactive copy of its box plays `dialog-out` (rule 5: the exit never blocks,
 * and it ends on a timer even if `animationend` never fires). Esc goes through the same exit. */
export function Dialog({ open, title, children, actions, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const cancelExit = useRef<(() => void) | null>(null);
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      cancelExit.current?.();
      cancelExit.current = null;
      el.inert = false;
      if (!el.open) {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        el.showModal();
      }
      return;
    }
    if (!el.open) return;
    el.close();
    // Browsers restore focus on close; do it ourselves where they don't.
    const back = opener.current;
    if (back && back.isConnected && (document.activeElement === document.body || el.contains(document.activeElement))) {
      back.focus({ preventScroll: true });
    }
    el.inert = true; // the fading copy is never reachable by Tab
    cancelExit.current = runExit(el, {
      className: s.closing ?? "closing",
      durationMs: durationMs("--duration-exit"),
      onDone: () => { el.inert = false; },
    });
  }, [open]);
  useEffect(() => () => cancelExit.current?.(), []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={`${id}-t`}
      onClose={() => { if (open) onClose(); }}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      <div className={s.inner}>
        <h2 id={`${id}-t`} className={s.title}>{title}</h2>
        {children ? <div className={s.body}>{children}</div> : null}
        <div className={s.actions}>{actions}</div>
      </div>
    </dialog>
  );
}
