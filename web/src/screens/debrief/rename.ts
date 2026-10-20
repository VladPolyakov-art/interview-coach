/* Rename a saved session: PATCH /api/sessions/{id} {title} (US-23 AC2). The backend route is not there yet at the time of
 * writing (see the report: "backend gaps"), so a failed call is a normal path: the caller puts the old title back. */
import { ApiError } from "../../lib/api";

/** Titles longer than this are cut by the server and by the field (maxLength). */
export const TITLE_MAX = 80;

export async function renameSession(id: string, title: string): Promise<string> {
  const next = title.trim().slice(0, TITLE_MAX);
  let res: Response;
  try {
    res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
  } catch {
    throw new ApiError(0, "server_unreachable", "The app server is not answering.");
  }
  if (!res.ok) throw new ApiError(res.status, `http_${res.status}`, res.statusText);
  return next;
}
