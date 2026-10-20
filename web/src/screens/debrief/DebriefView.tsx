/* Debrief (ds/screens/debrief.md; variants interview · english · example). Pure: every state comes from props, so
 * stories and the review page render it without a server; `screens/Debrief.tsx` is the live container.
 * Structure after Otter's summary (R5): Verdict (overview) → What to work on (key points + actions) → Question by
 * question (outline with quotes). Layer tints live only here (CONTRACT §2.6); fixes are marked inside the user's own
 * sentence, never red / green (P8). Container queries on `page`, no viewport media queries. */
import { useEffect, useId, useRef, useState } from "react";
import { Button, Callout, durationMs, scrollBehavior } from "../../ds";
import { t } from "../../i18n";
import { pageStyles } from "../../components/Page";
import { layerSequence, type DebriefViewProps } from "./types";
import { BackLink, Header } from "./parts/Header";
import { EnglishBody } from "./parts/English";
import type { RowContext } from "./parts/Layers";
import { QuestionCard } from "./parts/QuestionCard";
import { Actions, SectionHead, TemplateNote, Verdict, VerdictNotice, WeakSpots } from "./parts/Sections";
import { ErrorBody, ExampleBanner, LoadingBody, NotFoundBody, PartialBanner, StorageBanner } from "./parts/States";
import s from "./DebriefView.module.css";

export function DebriefView(props: DebriefViewProps) {
  const { variant, state, model, layerOrder, ui, buildUp, storageError, className } = props;
  const uid = useId();
  const root = `${pageStyles.page} ${s.page} ${buildUp && state === "ready" ? "motion-stagger" : ""} ${className ?? ""}`;
  const heading = <h1 className="visually-hidden">{t("debrief.title")}</h1>;

  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set(ui?.open ?? []));
  const [strongerOpen, setStrongerOpen] = useState<ReadonlySet<number>>(() => new Set(ui?.strongerOpen ?? []));
  const [renaming, setRenaming] = useState(ui?.renaming ?? false);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ q: number; target: string } | null>(
    ui?.editing ? { q: ui.editing.question, target: ui.editing.correction } : null,
  );
  const [rechecking, setRechecking] = useState<number | null>(ui?.rechecking ?? null);
  const [dismissed, setDismissed] = useState<Readonly<Record<string, boolean>>>({});
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());
  /** Focus moves into a field only after the user opened it, never when a review state starts open. */
  const [userOpened, setUserOpened] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  if (state === "loading" || state === "preparing") {
    return (
      <div className={root} aria-busy="true">
        {heading}
        <BackLink />
        <LoadingBody preparing={state === "preparing"} />
      </div>
    );
  }
  if (state === "notFound") return <div className={root}>{heading}<NotFoundBody /></div>;
  if (state === "error" || !model) return <div className={root}>{heading}<BackLink /><ErrorBody onRetry={props.onRetry} /></div>;

  const canEdit = Boolean(props.onRecheck);
  const title = titleOverride ?? model.title;
  const seq = layerSequence(layerOrder);
  const headerId = (n: number) => `${uid}q${n}`;
  const key = (q: number, id: string) => `${q}:${id}`;

  const jump = (n: number) => {
    setOpen((prev) => new Set(prev).add(n));
    // The card region mounts on the next frames: scroll, then focus the card header (focus is moved, not stolen).
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const el = document.getElementById(headerId(n));
      el?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      el?.focus({ preventScroll: true });
    }));
  };

  const setCard = (n: number, value: boolean) => setOpen((prev) => {
    const next = new Set(prev);
    if (value) next.add(n); else next.delete(n);
    return next;
  });
  const allOpen = model.questions.length > 0 && model.questions.every((q) => open.has(q.n));
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(model.questions.map((q) => q.n)));

  const dismiss = (q: number, id: string) => {
    const k = key(q, id);
    setLeaving((prev) => new Set(prev).add(k));
    timers.current.push(window.setTimeout(() => {
      setDismissed((prev) => ({ ...prev, [k]: true }));
      setLeaving((prev) => { const n = new Set(prev); n.delete(k); return n; });
    }, durationMs("--duration-exit")));
    props.onDismiss?.(q, id);
  };
  const restore = (q: number, id: string) => {
    setDismissed((prev) => ({ ...prev, [key(q, id)]: false }));
    props.onRestore?.(q, id);
  };
  const save = (q: number, target: string, text: string) => {
    setEditing(null);
    setRechecking(q);
    props.onRecheck?.(q, target, text);
  };

  const rowsFor = (q: number): RowContext => ({
    isDismissed: (id, base) => dismissed[key(q, id)] ?? Boolean(base),
    isLeaving: (id) => leaving.has(key(q, id)),
    editing: editing && editing.q === q && editing.target !== "answer" ? editing.target : null,
    focusEditor: userOpened,
    onEdit: canEdit ? (id) => { setUserOpened(true); setEditing({ q, target: id }); } : undefined,
    onDismiss: props.onDismiss ? (id) => dismiss(q, id) : undefined,
    onRestore: props.onRestore ? (id) => restore(q, id) : undefined,
    onSave: (id, text) => save(q, id, text),
    onCancel: () => setEditing(null),
  });

  const english = variant === "english" ? model.english : undefined;
  const partial = Boolean(model.partial);
  const ids = { verdict: `${uid}-verdict`, spots: `${uid}-spots`, actions: `${uid}-actions`, questions: `${uid}-questions` };

  return (
    <div className={root} data-review-id="Debrief/Page" data-variant={variant}>
      {storageError ? <StorageBanner onDownload={props.onDownload} /> : null}
      {variant === "example" ? <ExampleBanner onStart={props.onStartFirst} /> : null}

      <Header
        title={title}
        meta={storageError ? model.meta.map((m) => (m.href ? { icon: "alert" as const, text: t("debrief.notSaved"), tone: "warning" as const } : m)) : model.meta}
        example={variant === "example"}
        obsidian={model.obsidian}
        renaming={renaming}
        focusRename={userOpened}
        onRenameStart={props.onRename ? () => { setUserOpened(true); setRenaming(true); } : undefined}
        onRenameSave={(next) => {
          setTitleOverride(next);
          setRenaming(false);
          const saved = props.onRename?.(next);
          if (saved instanceof Promise) void saved.then((ok) => { if (ok === false) setTitleOverride(null); });
        }}
        onRenameCancel={() => setRenaming(false)}
        onExport={props.onExport}
        onDownload={props.onDownload}
        onTrash={props.onTrash}
      />

      {props.notice ? <Callout tone="error" live="alert">{props.notice}</Callout> : null}
      {partial ? <PartialBanner answered={model.partial!.answered} total={model.partial!.total} /> : null}
      {model.verdictNotice && model.verdictNotice !== "template" && !partial ? <VerdictNotice kind={model.verdictNotice} id={ids.verdict} rerunning={props.rerunning} onRerun={props.onRerun} /> : null}
      {model.verdict && !partial ? <Verdict verdict={model.verdict} id={ids.verdict} note={model.verdictNotice === "template" ? <TemplateNote rerunning={props.rerunning} onRerun={props.onRerun} /> : undefined} /> : null}
      {!partial && !english && model.weakSpots.length ? <WeakSpots model={model} order={layerOrder} onJump={jump} id={ids.spots} /> : null}
      {english ? (
        <EnglishBody english={english} ctx={rowsFor(0)} ids={{ summary: `${uid}-sum`, corrections: `${uid}-cor`, phrases: `${uid}-phr` }} />
      ) : null}
      <Actions
        variant={variant}
        model={model}
        english={english}
        partial={partial}
        storageError={storageError}
        onDrill={props.onDrill}
        onPractise={props.onPractise}
        onStartFirst={props.onStartFirst}
        id={ids.actions}
      />

      {model.questions.length ? (
        <section className={s.questions} aria-labelledby={ids.questions} data-review-id="Debrief/Questions" data-review-section="Debrief · Question by question" data-comment-target="">
          <SectionHead
            id={ids.questions}
            title={t("debrief.qSection")}
            action={model.questions.length > 1 ? (
              <Button variant="link" size="sm" onClick={toggleAll}>{allOpen ? t("debrief.closeAll") : t("debrief.openAll")}</Button>
            ) : undefined}
          />
          <ol className={s.list}>
            {model.questions.map((q) => (
              <QuestionCard
                key={q.n}
                q={q}
                order={seq}
                headerId={headerId(q.n)}
                open={open.has(q.n)}
                onOpenChange={(v) => setCard(q.n, v)}
                strongerOpen={strongerOpen.has(q.n)}
                onStrongerOpenChange={(v) => {
                  setStrongerOpen((prev) => { const n = new Set(prev); if (v) n.add(q.n); else n.delete(q.n); return n; });
                  if (v && q.stronger?.status === "idle") props.onStronger?.(q.n);
                }}
                rows={rowsFor(q.n)}
                rechecking={rechecking === q.n}
                answerEditing={editing?.q === q.n && editing.target === "answer"}
                onEditAnswer={canEdit ? () => { setUserOpened(true); setEditing({ q: q.n, target: "answer" }); } : undefined}
                onSaveAnswer={(text) => save(q.n, "answer", text)}
                onCancelAnswer={() => setEditing(null)}
                focusEditor={userOpened}
              />
            ))}
          </ol>
          {model.skipped ? (
            <p className={s.skipped}>
              {model.skipped.from === model.skipped.to
                ? t("debrief.partial.skippedOne", { n: model.skipped.from })
                : t("debrief.partial.skipped", { from: model.skipped.from, to: model.skipped.to })}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
