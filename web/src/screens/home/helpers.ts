/* Pure text helpers for Home (no React). Copy lives in src/i18n/en.json. */
import { t, tp } from "../../i18n";
import type { InterviewModel, JobItem, Strictness, WeakItem } from "./types";

export const QUESTIONS_PER_MIN = 4;
/** Minutes a session takes (the same rule as before: about 4 minutes per question). */
export const minutesFor = (questions: number) => questions * QUESTIONS_PER_MIN;
/** Drill is a short session: 3 questions aimed at the focus (home.md §3.2). */
export const DRILL_QUESTIONS = 3;
/** Pasting at least this much text (or a link) offers "Add this job" (US-10 AC3 keeps 80 as the "short" line). */
export const MIN_JOB_CHARS = 80;
export const GENERAL_JOB_ID = "__general";

export function selectedJob(model: InterviewModel): JobItem | null {
  return model.jobs.find((j) => j.id === model.selectedJobId) ?? null;
}

/** "Senior Product Designer · Added Oct 18" */
export function jobMeta(job: JobItem): string {
  return `${job.role} · ${t("home.vacancies.added", { date: job.added })}`;
}

/** Status line under a job: null while the questions are being prepared (the caller draws the shimmer). */
export function jobStatus(job: JobItem): string | null {
  if (job.state === "preparing") return null;
  if (job.state === "short") return t("home.job.short");
  if (job.state === "link") return job.questions ? `${t("home.job.fromLink")} · ${tp("home.vacancies.questionsReady", job.questions)}` : t("home.job.fromLink");
  return job.questions ? tp("home.vacancies.questionsReady", job.questions) : "";
}

export function looksLikeJob(text: string): boolean {
  const v = text.trim();
  return v.length >= MIN_JOB_CHARS || /^https?:\/\/\S+$/i.test(v);
}

/** The basis line (US-10 AC2): four cases. */
export function basisText(model: InterviewModel): string {
  const job = selectedJob(model);
  const base = job
    ? t(model.hasCv ? "home.basis.job" : "home.basis.jobNoCv", { job: job.company })
    : t(model.hasCv ? "home.basis.cv" : "home.basis.general");
  return `${base} · ${t("home.round.length", { n: model.questions, min: minutesFor(model.questions) })}`;
}

export const STRICTNESS_KEY = { 1: "gentle", 2: "standard", 3: "tough" } as const;
export function strictnessLabel(s: Strictness): string {
  return t(`home.strictness.${STRICTNESS_KEY[s]}.label`);
}

export const layerLabel = (layer: WeakItem["layer"]) => t(`feedback.layer.${layer}`);

/** "Language “I have led” · Delivery fillers" for the rows behind Show all. */
export function moreList(items: WeakItem[]): string {
  return items.map((i) => `${layerLabel(i.layer)} ${i.short ?? i.title}`).join(" · ");
}

/** The Drill scope line: "3 questions aimed at all 4 · ~12 min · Kestrel Pay job". */
export function drillScope(items: WeakItem[], focus: "all" | WeakItem["layer"], job: JobItem | null): string {
  const picked = focus === "all" ? items : items.filter((i) => i.layer === focus);
  const aim = focus === "all"
    ? t("home.workOn.scopeAll", { n: DRILL_QUESTIONS, total: items.length })
    : t("home.workOn.scopeFocus", { n: DRILL_QUESTIONS, list: picked.slice(0, 2).map((i) => i.short ?? i.title).join(" · ") });
  const parts = [aim, t("home.workOn.scopeMin", { min: minutesFor(DRILL_QUESTIONS) })];
  if (job) parts.push(t("home.workOn.scopeJob", { job: job.company }));
  return parts.join(" · ");
}

/** Split `text` around the first occurrence of `fragment` (for the fix mark inside a phrase). */
export function splitAround(text: string, fragment: string): [string, string, string] | null {
  if (!fragment) return null;
  const i = text.indexOf(fragment);
  return i < 0 ? null : [text.slice(0, i), fragment, text.slice(i + fragment.length)];
}
