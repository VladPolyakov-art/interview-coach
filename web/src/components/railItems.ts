/* Rail chat rows (D57, claude.ai sidebar): one quiet line per session, no dates or times. The server names every interview
 * "Interview practice" (+ " · <job title>" when a job was used), so the rail drops that shared prefix and shows the job.
 * Titles the user renamed are kept as they are. */
import type { SessionSummary } from "../lib/types";

export interface RailSession { id: string; title: string; track: "interview" | "english" }

const GENERIC_PREFIX = "Interview practice · ";

export function railTitle(title: string, untitled: string): string {
  const raw = title.trim();
  if (!raw) return untitled;
  return raw.startsWith(GENERIC_PREFIX) && raw.length > GENERIC_PREFIX.length ? raw.slice(GENERIC_PREFIX.length) : raw;
}

/** Every session, newest first (D52: the rail list is the history; no cap). D69: short sessions (the debrief said
 * too short) stay in History only; a session with the bare generic title shows its first question instead. */
export function railSessions(sessions: SessionSummary[], untitled: string): RailSession[] {
  return [...sessions]
    .filter((x) => !x.too_short)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((x) => ({
      id: x.id,
      title: x.title.trim() === GENERIC_PREFIX.slice(0, -3) && x.first_question ? x.first_question : railTitle(x.title, untitled),
      track: x.mode === "english" ? "english" : "interview",
    }));
}
