/* Stage and harnesses for stories and the review page. The harness keeps the choices in local state so a state is
 * playable (switch the track, pick a round, open the picker); nothing here reaches the network. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppShellView } from "../../components/AppShell";
import { DeleteJobDialog, VacancyEditorView, type FileState, type LinkState, type VacancySource } from "../../components/VacancyEditor";
import { OverlayRoot } from "../../ds/OverlayRoot";
import type { EditorSeed } from "./editorSeeds";
import { HomeView } from "./HomeView";
import { SCENES, type HomeScene, type HomeSceneId } from "./states";
import type { InterviewModel } from "./types";

/** A frame of a real width, scaled down to fit, with its own OverlayRoot (menus and dialogs open inside it). */
export function ScaledStage({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div
      ref={outer}
      style={{ width: "100%", maxWidth: width, height: height * scale, overflow: "hidden", border: "var(--border-width) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}
    >
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", overflow: "hidden" }}>
        <OverlayRoot>{children}</OverlayRoot>
      </div>
    </div>
  );
}

export function EditorHarness({ seed, open, inline, onClose }: { seed: EditorSeed; open: boolean; inline?: boolean; onClose: () => void }) {
  const [source, setSource] = useState<VacancySource>(seed.source ?? "paste");
  const [text, setText] = useState(seed.text ?? "");
  const [url, setUrl] = useState(seed.url ?? "");
  const [company, setCompany] = useState(seed.company ?? "");
  const [role, setRole] = useState(seed.role ?? "");
  const [link, setLink] = useState<LinkState>(seed.link ?? "idle");
  const [fileState, setFileState] = useState<FileState>(seed.fileState ?? "empty");
  const [file, setFile] = useState(seed.file ?? null);
  return (
    <VacancyEditorView
      {...seed}
      open={open}
      inline={inline}
      source={source}
      onSourceChange={setSource}
      text={text}
      onTextChange={setText}
      url={url}
      onUrlChange={setUrl}
      company={company}
      role={role}
      onCompanyChange={setCompany}
      onRoleChange={setRole}
      link={link}
      onFetch={() => setLink("fetching")}
      file={file}
      fileState={fileState}
      onFile={(f) => { setFile({ name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB` }); setFileState("chosen"); }}
      onRemoveFile={() => { setFile(null); setFileState("empty"); }}
      onSwitchToPaste={() => setSource("paste")}
      onClose={onClose}
    />
  );
}

export function HomeHarness({ scene }: { scene: HomeScene }) {
  const p = scene.props;
  const [track, setTrack] = useState(p.track);
  const [interview, setInterview] = useState<InterviewModel>(p.interview);
  const [english, setEnglish] = useState(p.english);
  const [textMode, setTextMode] = useState(Boolean(p.textMode));
  const [starting, setStarting] = useState(Boolean(p.starting));
  const [editor, setEditor] = useState({ open: scene.dialog === "editor", seed: (scene.editor ?? {}) as EditorSeed, n: 0 });
  const openEditor = (seed: EditorSeed) => setEditor((e) => ({ open: true, seed, n: e.n + 1 }));
  const [deleting, setDeleting] = useState(scene.dialog === "delete");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const patch = (next: Partial<InterviewModel>) => setInterview((m) => ({ ...m, ...next }));
  const job = interview.jobs.find((j) => j.id === interview.selectedJobId);
  const start = () => {
    setStarting(true);
    timer.current = window.setTimeout(() => setStarting(false), 2400);
  };

  return (
    <HomeView
      {...p}
      track={track}
      interview={interview}
      english={english}
      textMode={textMode}
      starting={starting}
      onTrackChange={setTrack}
      onRoundChange={(round) => patch({ round })}
      onStrictnessChange={(strictness) => patch({ strictness })}
      onSelectJob={(id) => patch({ selectedJobId: id })}
      onEditJob={(id) => {
        const j = interview.jobs.find((x) => x.id === id);
        openEditor({ mode: "edit", source: "paste", text: j?.preview ?? "", company: j?.company ?? "", role: j?.role ?? "" });
      }}
      onDeleteJob={() => setDeleting(true)}
      onAddJob={() => openEditor({ source: "paste" })}
      onPickFile={() => openEditor({ source: "file" })}
      onPastedChange={(pasted) => patch({ pasted })}
      onAddPasted={() => openEditor({ source: "paste", text: interview.pasted })}
      onFocusChange={(focus) => interview.weak && patch({ weak: { ...interview.weak, focus } })}
      onStart={start}
      onTypeInstead={() => setTextMode(true)}
      onUseTextMode={() => setTextMode(true)}
      onDismissBrowser={() => {}}
      onLevelChange={(level) => setEnglish((e) => ({ ...e, level }))}
      onTopicChange={(topic) => setEnglish((e) => ({ ...e, topic }))}
      overlay={(
        <>
          <EditorHarness key={editor.n} seed={editor.seed} open={editor.open} onClose={() => setEditor((e) => ({ ...e, open: false }))} />
          <DeleteJobDialog open={deleting} name={job?.company ?? "Kestrel Pay"} onCancel={() => setDeleting(false)} onConfirm={() => setDeleting(false)} />
        </>
      )}
    />
  );
}

/** The screen inside the shell, no frame around it (the review page brings its own). */
export function HomeScene({ id }: { id: HomeSceneId }) {
  const scene = SCENES[id];
  return (
    <MemoryRouter initialEntries={["/"]}>
      <AppShellView current="practice" recent={scene.recent} engine={scene.engine}>
        <HomeHarness scene={scene} />
      </AppShellView>
    </MemoryRouter>
  );
}
