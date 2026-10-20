/* Debrief of a saved session (live container). The screen itself is the pure `DebriefView` (screens/debrief/);
 * this file loads the session, polls while the debrief is being written, and wires the actions to the REST API. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFreshOnce } from "../ds";
import { t } from "../i18n";
import { api, ApiError } from "../lib/api";
import { useInterval, useLoad } from "../lib/hooks";
import { errorMessage, useApp } from "../lib/store";
import type { FeedbackRecord } from "../lib/types";
import type { StrongerState } from "../session/reducer";
import { DebriefView } from "./debrief/DebriefView";
import { DEFAULT_OPEN, exampleSam } from "./debrief/fixtures";
import { feedbackOfFlag, mapRecord, threadsFromRecord } from "./debrief/mapRecord";
import { renameSession } from "./debrief/rename";

export { threadsFromRecord };

/** The build-up plays on the first open of each session in this visit (Debrief build-up, motion.md). */
const seen = new Set<string>();

/** `/sessions/example`: the built-in sample debrief (History empty state link); never reads the saved sessions. */
function ExampleDebrief() {
  const navigate = useNavigate();
  const { settings } = useApp();
  return (
    <DebriefView
      variant="example"
      state="ready"
      model={exampleSam}
      layerOrder={settings?.layer_order ?? "content-first"}
      ui={{ open: DEFAULT_OPEN.example }}
      onStartFirst={() => navigate("/")}
    />
  );
}

export function DebriefScreen() {
  const { id = "" } = useParams();
  return id === "example" ? <ExampleDebrief /> : <LiveDebrief />;
}

function LiveDebrief() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { settings } = useApp();
  const session = useLoad(() => api.session(id), [id]);
  const [stronger, setStronger] = useState<Record<string, StrongerState>>({});
  const [rerunning, setRerunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [polls, setPolls] = useState(0);
  /** Bumped when an optimistic change failed: the view starts again from the saved data. */
  const [epoch, setEpoch] = useState(0);
  const record = session.data;
  const fresh = useFreshOnce(seen, `debrief:${id}`);
  const loadedOnce = useRef(false);
  if (record) loadedOnce.current = true;

  // The debrief may still be being written right after a session: poll for up to a minute.
  const waiting = Boolean(record && record.mode === "interview" && !record.debrief && record.feedback.length && polls < 20);
  useInterval(() => {
    setPolls((n) => n + 1);
    api.session(id).then((r) => session.setData(r)).catch(() => {});
  }, 3000, waiting);
  useEffect(() => { setPolls(0); setStronger({}); setNotice(""); }, [id]);

  const model = useMemo(
    () => (record ? mapRecord(record, { obsidian: Boolean(settings?.obsidian_dir), stronger, waiting }) : undefined),
    [record, settings?.obsidian_dir, stronger, waiting],
  );

  if (!record) {
    const gone = session.error instanceof ApiError && session.error.status === 404;
    return (
      <DebriefView
        variant="interview"
        state={session.loading ? "loading" : gone ? "notFound" : "error"}
        layerOrder={settings?.layer_order ?? "content-first"}
        onRetry={session.reload}
      />
    );
  }

  const fail = (e: unknown) => { setNotice(errorMessage(e)); setEpoch((n) => n + 1); };
  const replaceFeedback = (fb: FeedbackRecord) =>
    session.setData({ ...record, feedback: record.feedback.map((x) => (x.id === fb.id ? fb : x)) });

  const flag = (flagId: string, action: "dismiss" | "restore") => {
    const fb = feedbackOfFlag(record, flagId);
    if (!fb) return;
    setNotice("");
    api.sessionFlag(record.id, flagId, fb.id, action)
      .then(({ language }) => replaceFeedback({ ...fb, layers: { ...fb.layers, language } }))
      .catch(fail);
  };
  const askStronger = (n: number) => {
    const th = threadsFromRecord(record).find((x) => x.number === n);
    const main = th?.records.find((r) => r.answer_kind === "main") ?? th?.records[0];
    if (!main) return;
    setStronger((m) => ({ ...m, [main.id]: { status: "loading" } }));
    api.sessionStronger(record.id, main.id)
      .then((v) => setStronger((m) => ({ ...m, [main.id]: { status: "ready", ...v } })))
      .catch((e: unknown) => setStronger((m) => ({ ...m, [main.id]: { status: "unavailable", message: errorMessage(e) } })));
  };
  const rerun = () => {
    setRerunning(true);
    setNotice("");
    api.rerunDebrief(record.id)
      .then((debrief) => session.setData({ ...record, debrief }))
      .catch((e: unknown) => setNotice(errorMessage(e)))
      .finally(() => setRerunning(false));
  };
  const trash = async () => {
    try {
      const { trash_id } = await api.deleteSession(record.id);
      navigate("/history", { replace: true, state: { trashed: { title: record.title, trashId: trash_id } } });
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = api.sessionMarkdownUrl(record.id);
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const rename = async (title: string) => {
    try {
      const saved = await renameSession(record.id, title);
      session.setData({ ...record, title: saved });
      return true;
    } catch {
      setNotice(t("history.toast.renameFailed"));
      return false;
    }
  };
  const practise = () => navigate(record.mode === "english" ? "/?track=english" : "/");

  return (
    <DebriefView
      key={epoch}
      variant={record.mode === "english" ? "english" : "interview"}
      state="ready"
      model={model}
      layerOrder={settings?.layer_order ?? "content-first"}
      buildUp={fresh}
      rerunning={rerunning}
      notice={notice || undefined}
      onRename={rename}
      onRerun={rerun}
      onDownload={download}
      onTrash={() => void trash()}
      onDrill={practise}
      onPractise={practise}
      onDismiss={(_q, flagId) => flag(flagId, "dismiss")}
      onRestore={(_q, flagId) => flag(flagId, "restore")}
      onStronger={askStronger}
    />
  );
}
