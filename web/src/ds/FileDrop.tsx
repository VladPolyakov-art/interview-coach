/* File drop zone (G9): drop a file or browse. SetupProfile CV, VacancyEditor "File" tab.
 * The privacy line comes first, above the zone (GR7, US-09 AC5): "The file stays on this computer."
 * States: empty · drag-over (border + fill, fast) · reading (text shimmer) · chosen (file row + Remove) ·
 * error (Callout error, role="alert", with the caller's next action, e.g. "Switch to Paste").
 * The zone itself is not a button (no nested controls): "browse" is a link-style Button that opens the native
 * picker, so keyboard and screen-reader users get the same path. Validation (type, size) is the caller's. */
import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Button, IconButton } from "./Button";
import { Callout } from "./Callout";
import { Icon } from "./icons";
import { TextShimmer } from "./TextShimmer";
import s from "./FileDrop.module.css";

export interface FileDropProps {
  /** Accessible name of the zone ("Job description file"). */
  label: string;
  /** Privacy line shown above the zone. */
  privacy?: ReactNode;
  /** "Drop a file here or" */
  prompt: string;
  /** "browse" */
  browseLabel: string;
  /** "PDF, DOCX, TXT, MD or HTML · up to 5 MB" */
  hint?: ReactNode;
  accept?: string;
  state?: "empty" | "reading" | "chosen" | "error";
  /** Chosen / reading file: name and a size line ("184 KB"). */
  file?: { name: string; size?: string };
  /** "Reading the file…" */
  readingLabel?: string;
  /** "Remove file" (the Remove button shows only with both `removeLabel` and `onRemove`). */
  removeLabel?: string;
  error?: { title?: string; body: ReactNode; action?: ReactNode };
  onFile?: (file: File) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function FileDrop({
  label, privacy, prompt, browseLabel, hint, accept, state = "empty", file, readingLabel, removeLabel,
  error, onFile, onRemove, disabled, className,
}: FileDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();

  const take = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f && !disabled) onFile?.(f);
  };
  const onDragOver = (e: DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!over) setOver(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  };

  const showZone = state === "empty" || state === "error";
  return (
    <div className={`${s.root} ${className ?? ""}`} data-review-id={`FileDrop/${state}`}>
      {privacy ? <p className={s.privacy}><Icon name="lock" size="sm" />{privacy}</p> : null}
      {showZone ? (
        <div
          role="group"
          aria-labelledby={`${id}p`}
          aria-describedby={hint ? `${id}h` : undefined}
          className={`${s.zone} ${over ? s.over : ""} ${disabled ? s.disabled : ""}`}
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <span className={s.icon}><Icon name="upload" size="lg" /></span>
          <p id={`${id}p`} className={s.prompt}>
            <span className="visually-hidden">{label}. </span>
            {prompt}{" "}
            <Button variant="link" onClick={() => input.current?.click()} disabled={disabled}>{browseLabel}</Button>
          </p>
          {hint ? <p id={`${id}h`} className={s.hint}>{hint}</p> : null}
          <input
            ref={input}
            type="file"
            accept={accept}
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            onChange={(e) => {
              take(e.currentTarget.files);
              e.currentTarget.value = "";
            }}
          />
        </div>
      ) : (
        <div className={`${s.file} motion-fade`}>
          <span className={s.fileIcon}><Icon name="file" /></span>
          <span className={s.fileText}>
            <span className={s.fileName} title={file?.name}>{file?.name}</span>
            {state === "reading"
              ? <TextShimmer status>{readingLabel}</TextShimmer>
              : file?.size ? <span className={s.fileSize}>{file.size}</span> : null}
          </span>
          {state === "chosen" && onRemove && removeLabel ? <IconButton icon="x" size="sm" label={removeLabel} onClick={onRemove} /> : null}
        </div>
      )}
      {state === "error" && error ? (
        <div className="motion-fade">
          <Callout tone="error" live="alert" title={error.title} actions={error.action}>{error.body}</Callout>
        </div>
      ) : null}
    </div>
  );
}
