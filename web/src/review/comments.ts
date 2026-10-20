/*
 * Comments on the published artifact (claude.ai). Called only from a viewer's click.
 * Without window.claude the page works fully: the comment buttons are hidden by the .no-comments class.
 */
type CommentsApi = { openComposer: (o: { element: Element }) => Promise<unknown> };
type ClaudeWindow = Window & { claude?: { use?: (cap: string) => Promise<CommentsApi | null | undefined> } };

let commentsApi: CommentsApi | null = null;
/* window.claude may arrive late: wait up to ~5 s, then decide. */
void (async () => {
  document.documentElement.classList.add("no-comments");
  for (let i = 0; i < 25 && !(window as ClaudeWindow).claude?.use; i++) await new Promise((r) => setTimeout(r, 200));
  try { commentsApi = (await (window as ClaudeWindow).claude?.use?.("comments")) ?? null; } catch { /* no runtime */ }
  if (commentsApi) document.documentElement.classList.remove("no-comments");
})();

export async function openComment(el: Element) {
  if (!commentsApi) return;
  try { await commentsApi.openComposer({ element: el }); }
  catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "not_granted" || code === "forbidden" || code === "capability_disabled") document.documentElement.classList.add("no-comments");
  }
}
