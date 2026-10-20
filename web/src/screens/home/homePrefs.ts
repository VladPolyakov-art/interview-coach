/* Home's own per-browser choices. The round type has four values here (US-12 AC1); lib/prefs only knows three, so this
 * reads and writes the same key with the wider type. Storage can throw (private windows): every access is wrapped. */
import type { RoundType } from "./types";

const KEY = "ic.roundType";
const LAYOUT_KEY = "ic.startLayout";

/** D52: two Home start layouts to compare in the live prototype. `current` = the "Start now" pill under the composer
 * (D51); `gemini` = the composer carries the fast path ("+" and the mode chip on the left, a round mic on the right). */
export type StartLayout = "current" | "gemini";

/** `?layout=gemini` / `?layout=current` (any case); anything else = not set. */
export function parseStartLayout(v: string | null | undefined): StartLayout | null {
  const x = v?.trim().toLowerCase();
  return x === "gemini" || x === "current" ? x : null;
}

/** The URL wins over the remembered choice; nothing valid = `current` until the owner picks (D52). */
export function resolveStartLayout(param: string | null | undefined, stored: string | null | undefined): StartLayout {
  return parseStartLayout(param) ?? parseStartLayout(stored) ?? "current";
}
const ROUNDS: RoundType[] = ["hr", "behavioural", "technical", "mix"];

export const homePrefs = {
  round(): RoundType {
    try {
      const v = window.localStorage.getItem(KEY);
      return ROUNDS.find((r) => r === v) ?? "mix";
    } catch {
      return "mix";
    }
  },
  setRound(v: RoundType) {
    try {
      window.localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  },
  /** The start layout for this visit: `?layout=` if valid (and remembered for next time), else the remembered one. */
  startLayout(param: string | null): StartLayout {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LAYOUT_KEY);
    } catch {
      /* ignore */
    }
    const layout = resolveStartLayout(param, stored);
    if (parseStartLayout(param) && layout !== stored) {
      try {
        window.localStorage.setItem(LAYOUT_KEY, layout);
      } catch {
        /* ignore */
      }
    }
    return layout;
  },
};

/** "Oct 18" (the year only matters in History). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
