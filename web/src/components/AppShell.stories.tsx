import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { Button, Card } from "../ds";
import { OverlayRoot } from "../ds/OverlayRoot";
import { AppShellView, type AppShellViewProps, type RecentState } from "./AppShell";
import { Page, Section } from "./Page";

/* Fixture: docs/ia.md §6 (Alex Morgan; S1–S3). Each story is a frame of a real width, scaled to fit, with its own
 * OverlayRoot (the drawer opens inside it) — the same set-up as the review page. */
const meta: Meta = { title: "Patterns/AppShell", parameters: { layout: "wide" } };
export default meta;

const READY: RecentState = {
  status: "ready",
  items: [
    { id: "s3", title: "Kestrel Pay · Senior Product Designer", track: "interview", when: "10:42 AM" },
    { id: "s2", title: "English practice", track: "english", when: "Oct 17" },
    { id: "s1", title: "Lumen Health · Product Designer, Design Systems", track: "interview", when: "Oct 14" },
    { id: "s0", title: "Interview practice", track: "interview", when: "Oct 12" },
  ],
};
const ENGINE = { name: "Ollama · qwen3:4b", status: "ready" as const };

function Scaled({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} style={{ width: "100%", maxWidth: width, height: height * scale, overflow: "hidden", border: "var(--border-width) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", overflow: "hidden" }}>
        <OverlayRoot>{children}</OverlayRoot>
      </div>
    </div>
  );
}

function SamplePage({ start }: { start?: boolean }) {
  return start ? (
    <Page layout="start" title="Good evening, Alex">
      <Card padding="md"><p>The start column: centred header, 720px column (Home builds its content here).</p></Card>
    </Page>
  ) : (
    <Page title="History" sub="Interviews and English practice, saved on this computer." actions={<Button variant="link" size="sm" icon="trash">Trash (1)</Button>}>
      <Section title="This week" id="sample-week">
        <Card padding="md"><p>Page rhythm: header to blocks --space-10, groups --space-4, rows --space-2.</p></Card>
      </Section>
      <Section title="Last week" id="sample-last">
        <Card padding="md"><p>Lumen Health · Product Designer, Design Systems</p></Card>
      </Section>
    </Page>
  );
}

function Shell({ width, height, path = "/history", start, ...props }: Partial<AppShellViewProps> & { width: number; height: number; path?: string; start?: boolean }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Scaled width={width} height={height}>
        <AppShellView current={start ? "practice" : "history"} recent={READY} engine={ENGINE} {...props}>
          <SamplePage start={start} />
        </AppShellView>
      </Scaled>
    </MemoryRouter>
  );
}

/** ≥ 1024: Gemini rail (D51·6) — New practice, all the chats (one line + time), no History row (D52), the account row with Settings. */
export const Desktop: StoryObj = { render: () => <Shell width={1440} height={900} /> };

/** Home start layout (Page layout="start"). */
export const DesktopStart: StoryObj = { render: () => <Shell width={1440} height={900} path="/" start /> };

/** 640–1023: top bar (menu, app name; a Not ready badge only when the engine is down); the rail lives in a drawer. */
export const Tablet: StoryObj = { render: () => <Shell width={800} height={720} /> };

/** < 640: the same top bar; page column narrow (< 560). */
export const Mobile: StoryObj = { render: () => <Shell width={375} height={812} /> };

/** < 1024 with the rail drawer open (inside the frame). */
export const MobileDrawerOpen: StoryObj = { render: () => <Shell width={375} height={812} drawerOpen onDrawerOpenChange={() => {}} /> };

/** Recent loading (skeleton) and the engine check in progress. */
export const RecentLoading: StoryObj = {
  render: () => <Shell width={1440} height={900} recent={{ status: "loading" }} engine={{ status: "checking" }} />,
};

/** Engine not ready: a warning row above the account (→ Settings · AI engine) and the badge in the top bar (P6). */
export const EngineNotReady: StoryObj = {
  render: () => <Shell width={1440} height={900} engine={{ name: "Ollama · qwen3:4b", status: "notReady" }} />,
};
export const EngineNotReadyTablet: StoryObj = {
  render: () => <Shell width={800} height={720} engine={{ name: "Ollama · qwen3:4b", status: "notReady" }} />,
};

/** Settings open: the account row is current. */
export const SettingsCurrent: StoryObj = { render: () => <Shell width={1440} height={900} path="/settings" current="settings" /> };

/** First run: no sessions yet, no engine chosen. */
export const RecentEmpty: StoryObj = {
  render: () => <Shell width={1440} height={900} path="/" start recent={{ status: "ready", items: [] }} engine={{ status: "notReady" }} />,
};

/** A debrief listed in Recent: its row is current, no nav row is. */
export const DebriefCurrent: StoryObj = {
  render: () => <Shell width={1440} height={900} path="/sessions/s3" current={null} currentSessionId="s3" />,
};
