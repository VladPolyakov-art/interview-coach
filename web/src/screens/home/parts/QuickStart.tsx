/* Quick start (D51 item 1, «Начать сразу»): the one-click fast path under the start composer. A primary pill with a
 * play icon and, next to it, a quiet line saying what it will start ("Kestrel Pay · Behavioural · 5 questions · voice").
 * Disabled while Home loads and while the AI engine is not ready (the engine banner above says why). */
import { useId } from "react";
import { Button } from "../../../ds";
import { t } from "../../../i18n";
import s from "./QuickStart.module.css";

export interface QuickStartProps {
  detail: string;
  disabled?: boolean;
  /** The quick start was pressed: the button shows a spinner until the session opens. */
  starting?: boolean;
  onStart?: () => void;
}

export function QuickStart({ detail, disabled, starting, onStart }: QuickStartProps) {
  const detailId = useId();
  return (
    <div className={s.quick} data-review-id="Home/QuickStart" data-review-section="Home · Quick start" data-comment-target>
      <Button
        variant="primary"
        size="sm"
        icon="play"
        loading={starting}
        disabled={disabled}
        aria-describedby={detailId}
        onClick={onStart}
      >
        {t("chat.quick.label")}
      </Button>
      <span id={detailId} className={s.detail}>{detail}</span>
    </div>
  );
}
