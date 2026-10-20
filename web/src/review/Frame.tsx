import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { OverlayRoot } from "../ds/OverlayRoot";
import { usePrefixIds } from "./prefixIds";
import s from "./review.module.css";

/**
 * Viewport frame: the content is laid out at `width` × `height` and scaled down with a transform to the space available,
 * so the page never scrolls sideways. The inner box is a size container named `app`: screens adapt with
 * `@container app (…)`, not viewport media queries. `theme` sets data-theme on the frame only (tokens.css scopes it).
 * `prefix` is added to every data-review-id inside, so ids stay unique across frames.
 * Overlays (Dialog, Drawer, Menu, Toast, Tooltip) render into the frame's OverlayRoot, so they stay inside the frame.
 */
export function Frame({ width, height, theme = "light", prefix, children }: {
  width: number; height: number; theme?: "light" | "dark"; prefix: string; children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const o = outer.current;
    if (!o) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, o.clientWidth / width)));
    ro.observe(o);
    return () => ro.disconnect();
  }, [width]);

  usePrefixIds(inner, prefix);

  return (
    <div ref={outer} className={s.frameOuter} style={{ height: height * scale, maxWidth: width }}>
      <div
        ref={inner}
        className={s.frameInner}
        data-theme={theme}
        style={{ width, height, transform: `scale(${scale})`, colorScheme: theme }}
      >
        <OverlayRoot>{children}</OverlayRoot>
      </div>
    </div>
  );
}
