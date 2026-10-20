import { useEffect, useId, useRef, type ReactNode } from "react";
import s from "./Dialog.module.css";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

/** Modal built on native <dialog>: focus trap, Esc and inert background come from the platform. */
export function Dialog({ open, title, children, actions, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={`${id}-t`}
      onClose={onClose}
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
