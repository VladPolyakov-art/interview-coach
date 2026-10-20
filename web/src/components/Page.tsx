import type { ReactNode } from "react";
import s from "./Page.module.css";

export function Page({ title, sub, actions, narrow, children }: {
  title: ReactNode; sub?: ReactNode; actions?: ReactNode; narrow?: boolean; children?: ReactNode;
}) {
  return (
    <div className={`${s.page} ${narrow ? s.narrow : ""}`}>
      <div className={s.headerRow}>
        <div className={s.header}>
          <h1>{title}</h1>
          {sub ? <p className={s.sub}>{sub}</p> : null}
        </div>
        {actions ? <div className={s.row}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, id, children, action }: { title: ReactNode; id?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={s.section} aria-labelledby={id}>
      <div className={s.row} style={{ justifyContent: "space-between" }}>
        <h2 id={id} className={s.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const pageStyles = s;
