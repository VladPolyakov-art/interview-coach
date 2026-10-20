/* Which layout the Session is in, measured on its own root (a container, not the viewport): review frames and the
 * real window use the same code. Thresholds are the `session` container widths of ds/screens/session.md §0 and
 * the same ones the CSS `@container session` queries use. Only the pieces that CSS can't swap (the panel becoming a
 * Drawer, icon-only Segmented labels) read this; every other layout rule stays in CSS. */
import { useLayoutEffect, useState, type RefObject } from "react";

export type SessionLayout = "wide" | "mid" | "narrow";

export const SESSION_WIDE = 1024;
export const SESSION_MID = 768;

export function layoutFor(width: number): SessionLayout {
  return width >= SESSION_WIDE ? "wide" : width >= SESSION_MID ? "mid" : "narrow";
}

export function useSessionLayout(ref: RefObject<HTMLElement | null>): SessionLayout {
  const [layout, setLayout] = useState<SessionLayout>("wide");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLayout(layoutFor(el.clientWidth));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentBoxSize?.[0]?.inlineSize ?? el.clientWidth;
      setLayout(layoutFor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return layout;
}
