import type { ComponentType, ReactNode } from "react";

/*
 * Gallery = every Storybook story (one source for the catalogue and the review page).
 * Screen stories (Screens/*) are shown as frames, not in the gallery.
 */
export type Args = Record<string, unknown>;
export type Render = (args: Args, ctx: unknown) => ReactNode;
export interface StoryLike { name?: string; args?: Args; render?: Render }
export interface MetaLike { title: string; component?: ComponentType<Args>; args?: Args; render?: Render; parameters?: { layout?: string } }
type StoryModule = { default: MetaLike } & Record<string, StoryLike | MetaLike>;

const modules = import.meta.glob<StoryModule>("../**/*.stories.tsx", { eager: true });
export const ORDER = ["DS", "Patterns", "Shell"];

const startCase = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2");

export interface GalleryEntry { section: string; component: string; stories: { id: string; name: string; meta: MetaLike; story: StoryLike }[] }

export const ENTRIES: GalleryEntry[] = Object.values(modules)
  .filter((m) => !m.default.title.startsWith("Screens/"))
  .map((m) => {
    const [section = "DS", component = m.default.title] = m.default.title.split("/");
    const stories = Object.entries(m)
      .filter(([k]) => k !== "default")
      .map(([k, st]) => ({ id: `${component}/${k}`, name: (st as StoryLike).name ?? startCase(k), meta: m.default, story: st as StoryLike }));
    return { section, component, stories };
  })
  .sort((a, b) => ORDER.indexOf(a.section) - ORDER.indexOf(b.section) || a.component.localeCompare(b.component));
