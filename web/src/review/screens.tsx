import type { ReactNode } from "react";

/*
 * Screens on the review page. Each screen agent adds its own entry file (screens/<name>/review.tsx) and registers it here.
 * A state is rendered at 1440 × 900 and 375 × 812, light; `dark: true` adds the dark pair.
 */
export interface ReviewState {
  id: string;
  label: string;
  note?: string;
  render: () => ReactNode;
  /** default true */
  desktop?: boolean;
  /** default true */
  mobile?: boolean;
  /** also render the dark theme; default false */
  dark?: boolean;
}

export interface ReviewScreen {
  id: string;
  title: string;
  note: string;
  states: ReviewState[];
}

export const REVIEW_SCREENS: ReviewScreen[] = [];
