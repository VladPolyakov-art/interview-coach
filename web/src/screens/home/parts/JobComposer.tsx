/* The job composer (G1 on Home, O-1/O-3): the attached job card, the field, File / Saved jobs / Strictness, and the
 * round "Add this job" button that appears with pasted text or a link. Saved jobs = Menu listbox, Strictness = Menu
 * with radio items. All data arrives by props; nothing here talks to the API. */
import { useRef, useState } from "react";
import { Button, Composer, ComposerAttachment, IconButton, Menu, Skeleton, TextShimmer, type ListboxOption, type MenuEntry } from "../../../ds";
import { t } from "../../../i18n";
import { GENERAL_JOB_ID, jobMeta, jobStatus, looksLikeJob, selectedJob, strictnessLabel, STRICTNESS_KEY } from "../helpers";
import type { InterviewModel, JobItem, Strictness } from "../types";
import s from "./parts.module.css";

const SEARCH_FROM = 6;
const STRICTNESS: Strictness[] = [1, 2, 3];

export interface JobComposerProps {
  model: InterviewModel;
  loading?: boolean;
  onSelectJob?: (id: string | null) => void;
  onEditJob?: (id: string) => void;
  onDeleteJob?: (id: string) => void;
  onAddJob?: () => void;
  onPickFile?: () => void;
  onPastedChange?: (text: string) => void;
  onAddPasted?: () => void;
  onStrictnessChange?: (s: Strictness) => void;
}

function statusNode(job: JobItem) {
  return job.state === "preparing" ? <TextShimmer>{t("home.vacancies.preparing")}</TextShimmer> : jobStatus(job);
}

export function JobComposer({
  model, loading, onSelectJob, onEditJob, onDeleteJob, onAddJob, onPickFile, onPastedChange, onAddPasted, onStrictnessChange,
}: JobComposerProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState(model.initialOverlay === "picker");
  const [strict, setStrict] = useState(model.initialOverlay === "strictness");
  const job = selectedJob(model);
  const canAdd = looksLikeJob(model.pasted);

  const options: ListboxOption[] = [
    { id: GENERAL_JOB_ID, label: t("home.vacancies.general"), description: t("home.vacancies.generalHint"), icon: "chat" },
    ...model.jobs.map((j): ListboxOption => ({
      id: j.id,
      label: j.company,
      description: jobMeta(j),
      meta: statusNode(j),
      icon: "briefcase",
    })),
  ];

  const strictItems: MenuEntry[] = STRICTNESS.map((n) => ({
    id: String(n),
    label: t(`home.strictness.${STRICTNESS_KEY[n]}.label`),
    description: t(`home.strictness.${STRICTNESS_KEY[n]}.desc`),
    checked: model.strictness === n,
    onSelect: () => onStrictnessChange?.(n),
  }));

  const attachment = loading ? (
    <Skeleton variant="row" rows={1} label={t("home.composer.loadingJob")} />
  ) : job ? (
    <ComposerAttachment
      title={job.company}
      meta={jobMeta(job)}
      preview={job.preview}
      status={statusNode(job)}
      actions={(
        <>
          <Menu
            label={t("home.composer.options", { company: job.company })}
            items={[
              { id: "edit", label: t("home.composer.edit"), icon: "edit", onSelect: () => onEditJob?.(job.id) },
              { id: "delete", label: t("home.composer.delete"), icon: "trash", onSelect: () => onDeleteJob?.(job.id) },
            ]}
            trigger={(p) => <IconButton {...p} icon="more" size="sm" label={t("home.composer.options", { company: job.company })} />}
          />
          <IconButton icon="x" size="sm" label={t("home.composer.remove")} onClick={() => onSelectJob?.(null)} />
        </>
      )}
    />
  ) : undefined;

  return (
    <div ref={anchor} className={s.composer} data-review-id="Home/Composer" data-review-section="Home · Job composer" data-comment-target>
      <Composer
        label={t("home.composer.label")}
        placeholder={job ? t("home.composer.placeholderAttached") : t("home.composer.placeholderNone")}
        value={model.pasted}
        onChange={(e) => onPastedChange?.(e.target.value)}
        busy={loading}
        attachment={attachment}
        submitOnEnter
        minRows={job ? 1 : 2}
        send={{ label: t("home.composer.add"), icon: "arrowRight", variant: "quiet", hidden: !canAdd, onSend: onAddPasted }}
        toolbarStart={(
          <>
            <Button variant="secondary" size="sm" icon="upload" disabled={loading} onClick={onPickFile}>{t("home.composer.file")}</Button>
            {model.jobs.length > 0 ? (
              <Menu
                kind="listbox"
                label={t("home.composer.listLabel")}
                anchor={anchor}
                open={picker}
                onOpenChange={setPicker}
                options={options}
                value={model.selectedJobId ?? GENERAL_JOB_ID}
                onChange={(id) => onSelectJob?.(id === GENERAL_JOB_ID ? null : id)}
                search={model.jobs.length >= SEARCH_FROM ? { label: t("home.composer.search"), placeholder: t("home.composer.search") } : undefined}
                footer={(
                  <Button variant="ghost" size="sm" icon="plus" onClick={() => { setPicker(false); onAddJob?.(); }}>
                    {t("home.composer.addJob")}
                  </Button>
                )}
                trigger={(p) => (
                  <Button {...p} variant="secondary" size="sm" icon="folder" iconRight="chevronDown" disabled={loading}>{t("home.composer.saved")}</Button>
                )}
              />
            ) : null}
          </>
        )}
        toolbarEnd={(
          <Menu
            label={t("home.strictness.menu")}
            open={strict}
            onOpenChange={setStrict}
            items={strictItems}
            placement="bottom-end"
            trigger={(p) => (
              <Button
                {...p}
                variant="secondary"
                size="sm"
                iconRight="chevronDown"
                disabled={loading}
                aria-label={t("home.strictness.aria", { level: strictnessLabel(model.strictness) })}
              >
                {strictnessLabel(model.strictness)}
              </Button>
            )}
          />
        )}
      />
    </div>
  );
}
