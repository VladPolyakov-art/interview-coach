/* "What to work on" (G18 strip, home context) with the Focus chips and the Drill button (US-22).
 * The strip keeps its own Show all state; it is mirrored here (a click on its toggle) only to show the
 * "misheard words aren't counted" line while it is open (DS candidate: onExpandedChange). */
import { useState, type MouseEvent } from "react";
import { Button, Chip, ChipGroup, WeakSpotStrip, type WeakSpot, type WeakSpotLayer } from "../../../ds";
import { t, tp } from "../../../i18n";
import { drillScope, layerLabel, moreList, selectedJob } from "../helpers";
import type { InterviewModel, WeakItem } from "../types";
import { TextLink } from "./TextLink";
import s from "./parts.module.css";

const LAYERS: WeakSpotLayer[] = ["content", "language", "delivery"];
const VISIBLE = 2;

export interface WorkOnProps {
  model: InterviewModel;
  engineReady: boolean;
  onFocusChange?: (focus: "all" | WeakSpotLayer) => void;
  onDrill?: () => void;
}

export function WorkOn({ model, engineReady, onFocusChange, onDrill }: WorkOnProps) {
  const weak = model.weak;
  const [expanded, setExpanded] = useState(Boolean(weak?.expanded));
  if (!weak) return null;
  const items: WeakItem[] = weak.items;
  if (!weak.loading && items.length === 0) return null;
  const strip: WeakSpot[] = items.map((i) => ({ id: i.id, layer: i.layer, layerLabel: layerLabel(i.layer), title: i.title, count: i.count }));
  const hidden = items.slice(VISIBLE);
  const job = selectedJob(model);
  const counts = LAYERS.map((l) => ({ layer: l, n: items.filter((i) => i.layer === l).length })).filter((c) => c.n > 0);
  // The strip's own toggle flips its state; flip the mirror on the same click.
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("[aria-controls][aria-expanded]")) setExpanded((v) => !v);
  };

  return (
    <div
      className={s.workOn}
      onClick={onClick}
      data-review-id="Home/WorkOn"
      data-review-section="Home · What to work on"
      data-comment-target
    >
      <WeakSpotStrip
        context="home"
        title={t("home.workOn.title")}
        sub={weak.loading ? undefined : tp("home.workOn.from", weak.sessions)}
        headerAction={weak.last && !weak.loading ? (
          <TextLink to={`/sessions/${weak.last.id}`} iconRight="arrowRight">
            {t("home.workOn.lastSession", { title: weak.last.title, date: weak.last.date })}
          </TextLink>
        ) : undefined}
        items={weak.loading ? [] : strip}
        visibleCount={VISIBLE}
        moreText={hidden.length ? t("home.workOn.more", { n: hidden.length, list: moreList(hidden) }) : undefined}
        showAllLabel={t("home.workOn.showAll")}
        showLessLabel={t("home.workOn.showLess")}
        defaultExpanded={Boolean(weak.expanded)}
        loading={weak.loading}
        loadingLabel={t("home.workOn.loading")}
        footer={(
          <div className={s.workOnFooter}>
            {expanded ? <p className={s.misheard}>{t("home.workOn.misheard")}</p> : null}
            <ChipGroup label={t("home.workOn.focus")} role="radio" className={s.focusGroup}>
              <Chip role="radio" selected={weak.focus === "all"} count={items.length} onClick={() => onFocusChange?.("all")}>{t("home.workOn.all")}</Chip>
              {counts.map((c) => (
                <Chip key={c.layer} role="radio" selected={weak.focus === c.layer} count={c.n} onClick={() => onFocusChange?.(c.layer)}>
                  {layerLabel(c.layer)}
                </Chip>
              ))}
            </ChipGroup>
            <div className={s.drill}>
              <Button variant="secondary" disabled={!engineReady} onClick={onDrill}>{t("home.workOn.drill")}</Button>
              <span className={s.drillScope}>{drillScope(items, weak.focus, job)}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
