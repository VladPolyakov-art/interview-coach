/* History of saved sessions and the trash (soft delete with restore). */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Callout, EmptyState, IconButton, Spinner } from "../ds";
import { t, tp } from "../i18n";
import { Page } from "../components/Page";
import { api } from "../lib/api";
import { formatDate, formatDateTime, formatDuration } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { errorMessage } from "../lib/store";
import s from "./History.module.css";

export function HistoryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialNotice = (location.state as { notice?: string } | null)?.notice ?? "";
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState("");
  const list = useLoad(() => api.sessions());
  const sessions = list.data?.sessions ?? [];

  const remove = async (id: string, title: string) => {
    setError("");
    try {
      await api.deleteSession(id);
      setNotice(t("debrief.deleted"));
      list.setData({ sessions: sessions.filter((x) => x.id !== id) });
    } catch (e) {
      setError(`${title}: ${errorMessage(e)}`);
    }
  };

  return (
    <Page title={t("history.title")} sub={t("history.subtitle")} actions={<Link to="/history/trash">{t("history.trash")}</Link>}>
      {notice ? <Callout tone="success" live="status" actions={<Link to="/history/trash">{t("history.trash")}</Link>}>{notice}</Callout> : null}
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {list.loading && !list.data ? <Spinner label={t("common.loading")} /> : null}
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
          {sessions.map((x) => (
            <li key={x.id} className={s.row}>
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
                <IconButton icon="trash" label={t("history.delete", { title: x.title })} onClick={() => void remove(x.id, x.title)} />
              </div>
            </li>
          ))}
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

  const restore = async (trashId: string) => {
    setError("");
    try {
      await api.restoreSession(trashId);
      setNotice(t("history.restored"));
      list.setData({ items: items.filter((x) => x.trash_id !== trashId) });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Page title={t("history.trashTitle")} actions={<Link to="/history">{t("history.backToHistory")}</Link>}>
      {notice ? <Callout tone="success" live="status">{notice}</Callout> : null}
      {error ? <Callout tone="error" live="alert">{error}</Callout> : null}
      {list.loading && !list.data ? <Spinner label={t("common.loading")} /> : null}
      {list.data && !items.length ? <EmptyState icon="trash" title={t("history.trashEmpty")} compact /> : null}
      {items.length ? (
        <ul className={s.list}>
          {items.map((x) => (
            <li key={x.trash_id} className={s.row}>
              <div className={s.main}>
                <span className={s.titleLink}>{x.title}</span>
                <span className={s.meta}>
                  <span>{formatDate(x.started_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("history.deletedAt", { date: formatDateTime(x.deleted_at) })}</span>
                </span>
              </div>
              <div className={s.side}>
                <Button variant="secondary" size="sm" icon="redo" onClick={() => void restore(x.trash_id)}>{t("history.restore")}</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Page>
  );
}
