/* Rail chat rows (D51 item 6, Gemini sidebar): one quiet line per session. The server names every interview
 * "Interview practice" (+ " · <job title>" when a job was used), so the rail drops that shared prefix and shows the job,
 * and a short time or date at the end tells same-named sessions apart. Titles the user renamed are kept as they are. */
import type { SessionSummary } from "../lib/types";

export interface RailSession { id: string; title: string; track: "interview" | "english"; when?: string }

const GENERIC_PREFIX = "Interview practice · ";

export function railTitle(title: string, untitled: string): string {
  const raw = title.trim();
  if (!raw) return untitled;
  return raw.startsWith(GENERIC_PREFIX) && raw.length > GENERIC_PREFIX.length ? raw.slice(GENERIC_PREFIX.length) : raw;
}

/** Today: "2:23 PM"; another day: "Oct 18"; another year: "Oct 18, 2025". */
export function railWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", d.getFullYear() === now.getFullYear()
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

/** Every session, newest first (D52: the rail list is the history; no cap). */
export function railSessions(sessions: SessionSummary[], untitled: string, now: Date = new Date()): RailSession[] {
  return [...sessions]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((x) => ({
      id: x.id,
      title: railTitle(x.title, untitled),
      track: x.mode === "english" ? "english" : "interview",
      when: railWhen(x.started_at, now),
    }));
}
