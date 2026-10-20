/* History of saved sessions and the trash (soft delete with restore). */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Callout, durationMs, EmptyState, IconButton, Skeleton } from "../ds";
import { t, tp } from "../i18n";
import { Page } from "../components/Page";
import { api } from "../lib/api";
import { formatDate, formatDateTime, formatDuration } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { errorMessage } from "../lib/store";
import s from "./History.module.css";

/* ---------- row motion (docs/motion.md 3.4: rows enter staggered once, a removed row slides out) ---------- */

/** Rows stagger in on the first load only (40ms apart, capped so a long list is not slow); later rows just appear. */
const STAGGER_CAP = 8;
function useFirstLoadStagger(ready: boolean) {
  const played = useRef(false);
  const stagger = !played.current;
  useEffect(() => {
    if (ready) played.current = true;
  }, [ready]);
  return (i: number) => (stagger ? { className: "motion-row", style: { "--row-i": Math.min(i, STAGGER_CAP) } as CSSProperties } : {});
}

/** Before a row leaves, focus moves to the next row's control, else the previous one, else the page title (rule 5). */
function focusAfter(li: HTMLElement | null) {
  let next = li?.nextElementSibling as HTMLElement | null;
  while (next?.dataset.leaving) next = next.nextElementSibling as HTMLElement | null;
  let prev = li?.previousElementSibling as HTMLElement | null;
  while (prev?.dataset.leaving) prev = prev.previousElementSibling as HTMLElement | null;
  const target = (next ?? prev)?.querySelector<HTMLElement>("a, button")
    ?? li?.closest("main")?.querySelector<HTMLElement>("h1") ?? null;
  if (!target) return;
  if (target.tagName === "H1") target.tabIndex = -1;
  target.focus();
}

/** A removed row plays row-out, then leaves the list; focus has already moved on, so nothing waits on the animation. */
function useRowExit(remove: (id: string) => void) {
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const exit = (id: string, li: HTMLElement | null) => {
    focusAfter(li);
    setLeaving((prev) => new Set(prev).add(id));
    timers.current.push(window.setTimeout(() => {
      remove(id);
      setLeaving((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, durationMs("--duration-exit")));
  };
  const rowProps = (id: string) => (leaving.has(id) ? { "data-leaving": "true", inert: true, className: "motion-row-out" } : {});
  return { exit, rowProps };
}

export function HistoryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialNotice = (location.state as { notice?: string } | null)?.notice ?? "";
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState("");
  const list = useLoad(() => api.sessions());
  const sessions = list.data?.sessions ?? [];
  const enter = useFirstLoadStagger(Boolean(list.data));
  const rows = useRowExit((id) => list.setData((d) => (d ? { ...d, sessions: d.sessions.filter((x) => x.id !== id) } : d)));

  const remove = async (id: string, title: string, li: HTMLElement | null) => {
    setError("");
    try {
      await api.deleteSession(id);
      setNotice(t("debrief.deleted"));
      rows.exit(id, li);
    } catch (e) {
      setError(`${title}: ${errorMessage(e)}`);
    }
  };

  return (
    <Page title={t("history.title")} sub={t("history.subtitle")} actions={<Link to="/history/trash">{t("history.trash")}</Link>}>
      {notice ? <Callout tone="success" live="status" actions={<Link to="/history/trash">{t("history.trash")}</Link>}>{notice}</Callout> : null}
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {list.loading && !list.data ? <Skeleton variant="row" rows={4} /> : null}
      {list.error ? (
        <Callout tone="error" actions={<Button size="sm" variant="secondary" onClick={list.reload}>{t("common.retry")}</Button>}>
          {t("history.loadError")}
        </Callout>
      ) : null}
      {list.data && !sessions.length ? (
        <EmptyState icon="history" title={t("history.empty")}
          actions={<Button variant="primary" icon="practice" onClick={() => navigate("/")}>{t("history.start")}</Button>}>
          {t("history.emptyBody")}
        </EmptyState>
      ) : null}
      {sessions.length ? (
        <ul className={s.list}>
          {sessions.map((x, i) => {
            const motion = { ...enter(i), ...rows.rowProps(x.id) };
            return (
            <li key={x.id} {...motion} className={`${s.row} ${motion.className ?? ""}`}>
              <div className={s.main}>
                <Link className={s.titleLink} to={`/sessions/${x.id}`} aria-label={t("history.open", { title: x.title })}>{x.title}</Link>
                <span className={s.meta}>
                  {x.mode ? <Badge tone="outline">{t(`history.mode.${x.mode}`)}</Badge> : null}
                  <span>{formatDateTime(x.started_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDuration(x.duration_s)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tp("debrief.answers", x.answers)}</span>
                </span>
                <span className={s.verdict}>{x.verdict || t("history.noVerdict")}</span>
              </div>
              <div className={s.side}>
                <IconButton icon="trash" label={t("history.delete", { title: x.title })}
                  onClick={(e) => void remove(x.id, x.title, e.currentTarget.closest("li"))} />
              </div>
            </li>
            );
          })}
        </ul>
      ) : null}
    </Page>
  );
}

export function TrashScreen() {
  const list = useLoad(() => api.trash());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const items = list.data?.items ?? [];
  const enter = useFirstLoadStagger(Boolean(list.data));
  const rows = useRowExit((id) => list.setData((d) => (d ? { ...d, items: d.items.filter((x) => x.trash_id !== id) } : d)));

  const restore = async (trashId: string, li: HTMLElement | null) => {
    setError("");
    try {
      await api.restoreSession(trashId);
      setNotice(t("history.restored"));
      rows.exit(trashId, li);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Page title={t("history.trashTitle")} actions={<Link to="/history">{t("history.backToHistory")}</Link>}>
      {notice ? <Callout tone="success" live="status">{notice}</Callout> : null}
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {list.loading && !list.data ? <Skeleton variant="row" rows={4} /> : null}
      {list.data && !items.length ? <EmptyState icon="trash" title={t("history.trashEmpty")} compact /> : null}
      {items.length ? (
        <ul className={s.list}>
          {items.map((x, i) => {
            const motion = { ...enter(i), ...rows.rowProps(x.trash_id) };
            return (
            <li key={x.trash_id} {...motion} className={`${s.row} ${motion.className ?? ""}`}>
              <div className={s.main}>
                <span className={s.titleLink}>{x.title}</span>
                <span className={s.meta}>
                  <span>{formatDate(x.started_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("history.deletedAt", { date: formatDateTime(x.deleted_at) })}</span>
                </span>
              </div>
              <div className={s.side}>
                <Button variant="secondary" size="sm" icon="redo" onClick={(e) => void restore(x.trash_id, e.currentTarget.closest("li"))}>{t("history.restore")}</Button>
              </div>
            </li>
            );
          })}
        </ul>
      ) : null}
    </Page>
  );
}
