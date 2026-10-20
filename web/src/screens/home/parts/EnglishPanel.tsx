/* HomeEnglish (§3.4): level (radiogroup of cards), topic chips, phrases to review. No composer (O-5). */
import { useState } from "react";
import { Button, Card, Chip, ChipGroup, Icon, InlineMark, SelectableCard, SelectableCardGroup } from "../../../ds";
import { t, tp } from "../../../i18n";
import { splitAround } from "../helpers";
import type { EnglishModel, EnglishTopic, Level, Phrase } from "../types";
import s from "./parts.module.css";

const LEVELS: Level[] = ["A2", "B1", "B2", "C1"];
const TOPICS: EnglishTopic[] = ["free", "work", "small"];
const PHRASES_VISIBLE = 3;
const PHRASE_SESSION_MIN = 5;

export interface EnglishPanelProps {
  model: EnglishModel;
  loading?: boolean;
  onLevelChange?: (l: Level) => void;
  onTopicChange?: (topic: EnglishTopic) => void;
}

/** The level and topic blocks; Start, phrases and the disclaimer are drawn by HomeView so they share the Start logic. */
export function EnglishPanel({ model, loading, onLevelChange, onTopicChange }: EnglishPanelProps) {
  return (
    <>
      <section className={s.level} aria-labelledby="home-level" data-review-id="Home/Level" data-review-section="Home · Your level" data-comment-target>
        <div className={s.sectionHead}>
          <h2 id="home-level" className={s.sectionTitle}>{t("english.level")}</h2>
          <p className={s.helperTertiary}>{t("english.levelPick")}</p>
        </div>
        <SelectableCardGroup
          label={t("english.level")}
          hideLabel
          columns={4}
          description={model.level && model.levelRemembered ? t("english.lastChoice", { level: model.level }) : t("english.notSure")}
        >
          {LEVELS.map((l) => (
            <SelectableCard key={l} role="radio" padding="sm" selected={model.level === l} disabled={loading} onSelect={() => onLevelChange?.(l)}>
              <span className={s.levelCard}>
                <span className={s.levelCode}>{l}</span>
                <span className={s.levelText}>{t(`english.levels.${l}`)}</span>
              </span>
            </SelectableCard>
          ))}
        </SelectableCardGroup>
      </section>

      <div data-review-id="Home/Topic">
        <ChipGroup label={t("english.topic")} role="radio">
          {TOPICS.map((x) => (
            <Chip key={x} role="radio" selected={model.topic === x} disabled={loading} onClick={() => onTopicChange?.(x)}>
              {t(`english.topics.${x}`)}
            </Chip>
          ))}
        </ChipGroup>
      </div>
    </>
  );
}

function PhraseText({ p }: { p: Phrase }) {
  const parts = splitAround(p.to, p.right);
  return (
    <span className={s.phrase}>
      <span className={s.phraseFrom}>{p.from}</span>
      <Icon name="arrowRight" size="sm" />
      <span className={s.phraseTo}>
        <span className="visually-hidden">{t("english.phrases.shouldBe")} </span>
        {parts ? <>{parts[0]}<InlineMark kind="fix">{parts[1]}</InlineMark>{parts[2]}</> : p.to}
      </span>
    </span>
  );
}

export function PhrasesBlock({ model, engineReady, onPractisePhrases }: { model: EnglishModel; engineReady: boolean; onPractisePhrases?: () => void }) {
  const [all, setAll] = useState(Boolean(model.phrasesExpanded));
  const phrases = model.phrases;
  if (model.firstVisit || phrases.length === 0) {
    return <p className={s.phrasesEmpty} data-review-id="Home/Phrases">{t("english.phrases.empty")}</p>;
  }
  const shown = all ? phrases : phrases.slice(0, PHRASES_VISIBLE);
  const hiddenCount = phrases.length - PHRASES_VISIBLE;
  return (
    <section className={s.phrases} aria-labelledby="home-phrases" data-review-id="Home/Phrases" data-review-section="Home · Phrases to review" data-comment-target>
      <Card tone="subtle" padding="md" className={s.phrasesCard}>
        <div className={s.sectionHead}>
          <h2 id="home-phrases" className={s.sectionTitleStrong}>{t("english.phrases.title")}</h2>
          <p className={s.helperTertiary}>{t("english.phrases.sub")}</p>
        </div>
        <ul className={s.phraseRows}>
          {shown.map((p) => (
            <li key={p.id} className={s.phraseRow}>
              <PhraseText p={p} />
              <span className={s.phraseTimes}>{tp("english.phrases.times", p.times)}</span>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 ? (
          <Button variant="link" size="sm" aria-expanded={all} onClick={() => setAll((v) => !v)} className={s.phrasesToggle}>
            {all ? t("english.phrases.showLess") : t("english.phrases.showAll", { n: phrases.length })}
          </Button>
        ) : null}
        <div className={s.drill}>
          <Button variant="secondary" disabled={!engineReady} onClick={onPractisePhrases}>{t("english.phrases.practise")}</Button>
          <span className={s.drillScope}>{tp("english.phrases.scope", phrases.length, { min: PHRASE_SESSION_MIN })}</span>
        </div>
      </Card>
    </section>
  );
}
