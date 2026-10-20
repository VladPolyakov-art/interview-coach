import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { OverlayRoot } from "../../ds/OverlayRoot";
import { fixtureProps, type FixtureOptions } from "./fixtures";
import { SessionPreview } from "./SessionPreview";
import type { SessionViewProps } from "./types";

/* Screens/Session: one story per state of ds/screens/session.md §4 (S1 to S14), with the v2 island (§V2). Each is a
 * frame of a real width scaled to fit, with its own OverlayRoot (the sheet and the dialog open inside it), the same
 * set-up as the review page.
 * The `frame` control switches 1440 / 900 / 768 / 375. */
type Frame = "desktop" | "mid" | "tablet" | "mobile";
interface Args extends Omit<FixtureOptions, "scene"> { frame: Frame }
const SIZE: Record<Frame, [number, number]> = { desktop: [1440, 900], mid: [900, 700], tablet: [768, 1024], mobile: [375, 812] };

const meta: Meta<Args> = {
  title: "Screens/Session",
  parameters: { layout: "wide" },
  args: { frame: "desktop", layerOrder: "content-first", withChecks: true },
  argTypes: {
    frame: { control: "inline-radio", options: ["desktop", "mid", "tablet", "mobile"] },
    layerOrder: { control: "inline-radio", options: ["content-first", "delivery-first"] },
  },
};
export default meta;
type Story = StoryObj<Args>;

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
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", overflow: "hidden", background: "var(--color-canvas)" }}>
        <OverlayRoot>{children}</OverlayRoot>
      </div>
    </div>
  );
}

function scene(name: string, sceneId: FixtureOptions["scene"], extra: Partial<Story> = {}, view: Partial<SessionViewProps> = {}): Story {
  return {
    name,
    ...extra,
    render: ({ frame, layerOrder, withChecks }) => {
      const [w, h] = SIZE[frame];
      return (
        <Scaled key={`${frame}:${sceneId}:${layerOrder}:${withChecks}`} width={w} height={h}>
          <SessionPreview {...fixtureProps({ scene: sceneId, layerOrder, withChecks })} {...view} />
        </Scaled>
      );
    },
  };
}

export const S1QuestionOne = scene("S1 · Question 1, tips, Mike speaking", "q1-start");
export const S2FollowUp = scene("S2 · Mike asks the follow-up", "follow-up");
export const S3Listening = scene("S3 · You are speaking (quiet mode)", "listening");
export const S4Thinking = scene("S4 · Thinking", "thinking");
export const S5aFeedbackContentFirst = scene("S5a · Feedback, content first, with a check", "feedback");
export const S5bFeedbackDeliveryFirst = scene("S5b · Feedback, delivery first", "feedback", { args: { layerOrder: "delivery-first" } });
export const S5cThatsNotWhatISaid = scene("S5c · That's not what I said", "that-not-said");
export const S5dEditWhatISaid = scene("S5d · Edit what I said", "edit");
export const S6TextMode = scene("S6 · Text mode", "text", { args: { withChecks: false } });
export const S7Drill = scene("S7 · Drill, Question 1 of 3", "drill");
export const S8English = scene("S8 · English, Turn 4", "english");
export const S9Connecting = scene("S9 · Connecting", "connecting");
export const S10aInterruptedEngine = scene("S10a · Interrupted: engine", "interrupted-engine");
export const S10bInterruptedVoice = scene("S10b · Interrupted: voice", "interrupted-voice");
export const S11MicHelp = scene("S11 · Mic help dialog", "mic-help");
export const S12aStorageBanner = scene("S12a · Storage not writable", "storage");
export const S12bBrowserBanner = scene("S12b · Browser can't recognise speech", "browser");
export const S13Overflow = scene("S13 · Overflow +30%", "overflow");
export const S14aPreparing = scene("S14a · Preparing feedback", "preparing");
export const S14bUnavailable = scene("S14b · Feedback unavailable", "unavailable");
export const S14cMuted = scene("S14c · Muted", "muted");
export const S14dSuggester = scene("S14d · Answer suggester on", "suggester");

/* The same feedback on a phone and in the mid layout: bottom sheet and right drawer. */
export const NarrowFeedback = scene("Narrow · Feedback sheet", "feedback", { args: { frame: "mobile" } });
export const MidFeedback = scene("Mid · Feedback drawer", "feedback", { args: { frame: "mid" } });

/* v2 island (session.md §V2.9). */
export const S1IslandMoreOpen = scene("S1 · Island, More menu open", "q1-start", {}, { initialOverlay: "more" });
export const S5PanelHidden = scene("S5 · Feedback ready, panel hidden", "feedback", {}, { panelOpen: false });
export const S6TextIsland = scene("S6 · Text mode island (box)", "text", { args: { withChecks: false } });
export const Shortcuts = scene("Keyboard shortcuts dialog", "feedback", {}, { initialOverlay: "shortcuts" });
export const NarrowIsland = scene("Narrow · Island, two rows", "listening", { args: { frame: "mobile" } }, { panelOpen: false });
