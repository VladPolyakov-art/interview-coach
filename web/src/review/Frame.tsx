import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { OverlayRoot } from "../ds/OverlayRoot";
import { usePrefixIds } from "./prefixIds";
import s from "./review.module.css";

/**
 * Viewport frame: the content is laid out at `width` × `height` and scaled down with a transform to the space available,
 * so the page never scrolls sideways. The inner box is a size container named `app`: screens adapt with
 * `@container app (…)`, not viewport media queries. `theme` sets data-theme on the frame only (tokens.css scopes it).
 * `tall` lets the frame grow to the content's full height (long pages such as the debrief) instead of cutting it at `height`;
 * the inner box is then an inline-size container only.
 * `prefix` is added to every data-review-id inside, so ids stay unique across frames.
 * Overlays (Dialog, Drawer, Menu, Toast, Tooltip) render into the frame's OverlayRoot, so they stay inside the frame.
 */
export function Frame({ width, height, tall = false, theme = "light", prefix, children }: {
  width: number; height: number; tall?: boolean; theme?: "light" | "dark"; prefix: string; children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(height);

  useLayoutEffect(() => {
    const o = outer.current;
    if (!o) return;
    const i = inner.current;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, o.clientWidth / width));
      if (tall && i) setContentH(Math.max(height, i.offsetHeight));
    });
    ro.observe(o);
    if (tall && i) ro.observe(i);
    return () => ro.disconnect();
  }, [width, height, tall]);

  usePrefixIds(inner, prefix);

  return (
    <div ref={outer} className={s.frameOuter} style={{ height: (tall ? contentH : height) * scale, maxWidth: width }}>
      <div
        ref={inner}
        className={tall ? `${s.frameInner} ${s.frameTall}` : s.frameInner}
        data-theme={theme}
        style={{ width, height: tall ? undefined : height, minHeight: tall ? height : undefined, transform: `scale(${scale})`, colorScheme: theme }}
      >
        <OverlayRoot>{children}</OverlayRoot>
      </div>
    </div>
  );
}
