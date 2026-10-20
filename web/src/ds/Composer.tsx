/* Composer (G1, R6 Ollama / R2 ChatGPT, P3): one rounded input (--radius-lg) with everything inside it.
 * Slots, top to bottom: `attachment` (a ComposerAttachment card or a Skeleton row while loading) · the field
 * (a borderless textarea that grows 2 → `maxRows`) · toolbar (`toolbarStart` / `toolbarEnd`: outlined sm buttons)
 * + the round send button. Focus-within turns the composer border to --color-border-selected (fast); the field
 * itself carries the focus ring (Field exception: offset 0, its fill is never action or checked).
 * `send.variant`: `action` = black / white (Session), `quiet` = outlined (Home, so Start stays the only primary: DS-6).
 * The send button appears with a short rise when it becomes visible (D6). Narrow parents: the toolbar wraps and the
 * end group drops to its own line (container query on the composer). */
import {
  forwardRef, useEffect, useId, useImperativeHandle, useRef, type CSSProperties, type InputEvent, type KeyboardEvent, type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./icons";
import s from "./Composer.module.css";

export interface ComposerSend {
  /** Accessible name and tooltip ("Send", "Add this job"). */
  label: string;
  icon?: IconName;
  variant?: "action" | "quiet";
  disabled?: boolean;
  /** Hide the button (Home shows it only when there is text). */
  hidden?: boolean;
  onSend?: () => void;
}

export interface ComposerProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> {
  /** Accessible label of the field (visually hidden): "Your answer", "Paste a job description or a link". */
  label: string;
  attachment?: ReactNode;
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  send?: ComposerSend;
  /** Enter sends, Shift+Enter adds a line (Session text mode). Off by default (pasting a job keeps Enter). */
  submitOnEnter?: boolean;
  /** Visible rows when empty (default 2) and the most it grows to before scrolling (default 8). */
  minRows?: number;
  maxRows?: number;
  /** Line under the composer: shortcut hint ("Enter to send · Shift+Enter for a new line"). */
  hint?: ReactNode;
  /** Error under the composer (role="alert"). */
  error?: string;
  /** Loading: aria-busy on the composer (pair with a Skeleton row in `attachment`). */
  busy?: boolean;
  className?: string;
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    label, attachment, toolbarStart, toolbarEnd, send, submitOnEnter, minRows = 2, maxRows = 8, hint, error, busy,
    className, id, onKeyDown, onInput, disabled, value, ...rest
  },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const field = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => field.current as HTMLTextAreaElement);

  // Auto-grow: CSS `field-sizing: content` where supported; otherwise measure scrollHeight (bounded by maxRows in CSS).
  useEffect(() => {
    if (field.current) grow(field.current);
  }, [value]);

  const sendVariant = send?.variant ?? "action";
  const canSend = Boolean(send && !send.hidden && !send.disabled && !disabled);
  const keyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !submitOnEnter) return;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) send?.onSend?.();
    }
  };
  const describedBy = [hint ? `${fieldId}-h` : "", error ? `${fieldId}-e` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`${s.root} ${className ?? ""}`} data-review-id={`Composer/${sendVariant}`}>
      <div className={`${s.box} ${disabled ? s.disabled : ""} ${error ? s.invalid : ""}`} aria-busy={busy || undefined}>
        {attachment ? <div className={s.attachment}>{attachment}</div> : null}
        <label htmlFor={fieldId} className="visually-hidden">{label}</label>
        <textarea
          ref={field}
          id={fieldId}
          className={s.field}
          rows={minRows}
          style={{ "--min-rows": minRows, "--max-rows": maxRows } as CSSProperties}
          disabled={disabled}
          value={value}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onKeyDown={keyDown}
          onInput={(e: InputEvent<HTMLTextAreaElement>) => {
            grow(e.currentTarget);
            onInput?.(e);
          }}
          {...rest}
        />
        {toolbarStart || toolbarEnd || send ? (
          <div className={s.toolbar}>
            <div className={s.start}>{toolbarStart}</div>
            <div className={s.end}>
              {toolbarEnd}
              {send && !send.hidden ? (
                <button
                  type="button"
                  className={`${s.send} ${s[sendVariant]} motion-rise-base`}
                  aria-label={send.label}
                  title={send.label}
                  disabled={send.disabled || disabled}
                  onClick={send.onSend}
                >
                  <Icon name={send.icon ?? (sendVariant === "quiet" ? "arrowRight" : "send")} />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p id={`${fieldId}-e`} className={s.error} role="alert"><Icon name="alert" size="sm" />{error}</p> : null}
      {hint ? <p id={`${fieldId}-h`} className={s.hint}>{hint}</p> : null}
    </div>
  );
});

export interface ComposerAttachmentProps {
  icon?: IconName;
  /** "Kestrel Pay" (2-line clamp, full text in the tooltip). */
  title: string;
  /** "Senior Product Designer · Added Oct 18" (2-line clamp). */
  meta?: string;
  /** One-line preview of the content (clamped). */
  preview?: string;
  /** Status line: "12 questions from this job" or a TextShimmer ("Preparing questions…"). */
  status?: ReactNode;
  /** IconButtons at the end (options menu, remove). */
  actions?: ReactNode;
}

/** The attached job card inside the composer (`attachment` slot). */
export function ComposerAttachment({ icon = "briefcase", title, meta, preview, status, actions }: ComposerAttachmentProps) {
  return (
    <div className={s.card} data-review-id="Composer/attachment">
      <span className={s.tile}><Icon name={icon} /></span>
      <span className={s.cardText}>
        <span className={s.cardTitle} title={title}>{title}</span>
        {meta ? <span className={s.cardMeta} title={meta}>{meta}</span> : null}
        {preview ? <span className={s.cardPreview}>{preview}</span> : null}
        {status ? <span className={s.cardStatus}>{status}</span> : null}
      </span>
      {actions ? <span className={s.cardActions}>{actions}</span> : null}
    </div>
  );
}

/** Fallback auto-grow for browsers without `field-sizing`: the height follows the content, CSS caps it at max rows. */
function grow(el: HTMLTextAreaElement) {
  if (supportsFieldSizing()) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

let fieldSizing: boolean | undefined;
function supportsFieldSizing() {
  if (fieldSizing === undefined) {
    fieldSizing = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content");
  }
  return fieldSizing;
}
