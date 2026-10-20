/* Answer suggester (US-58): practice only, generated once per question, static while the user speaks. */
import { useState } from "react";
import { Card, TextShimmer, Toggle } from "../../../ds";
import { t } from "../../../i18n";
import type { SessionHandlers, SessionSuggestion } from "../types";
import s from "./parts.module.css";

export function Suggester({ suggestion, handlers, defaultOn }: { suggestion?: SessionSuggestion; handlers?: SessionHandlers; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  const toggle = (next: boolean) => {
    setOn(next);
    handlers?.onSetSuggest?.(next);
  };
  return (
    <Card tone="subtle" padding="sm" className={s.suggest}>
      <div data-review-id="Session/Suggester" data-review-section="Session · Answer suggester" data-comment-target className={s.suggestInner}>
        <Toggle label={t("session.suggest.toggle")} description={t("session.suggest.practiceOnly")} checked={on} onChange={toggle} />
        {on && suggestion ? (
          <div className={s.suggestBody}>
            <strong>{t("session.suggest.title")}</strong>
            {suggestion.status === "pending" ? <TextShimmer status>{t("session.suggest.pending")}</TextShimmer> : null}
            {suggestion.status === "unavailable" ? <span>{suggestion.message}</span> : null}
            {suggestion.status === "ready" ? (
              <>
                {suggestion.story ? <span className={s.suggestStory}>{t("session.suggest.story", { story: suggestion.story })}</span> : null}
                {suggestion.answer ? <p className={s.suggestAnswer}>{suggestion.answer}</p> : null}
                {suggestion.points?.length ? (
                  <>
                    <span className={s.suggestStory}>{t("session.suggest.points")}</span>
                    <ul className={s.suggestList}>{suggestion.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
