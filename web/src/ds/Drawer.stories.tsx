import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Drawer, type DrawerSide } from "./Drawer";
import { NavRow } from "./NavRow";
import { OverlayRoot } from "./OverlayRoot";

const meta: Meta = { title: "DS/Drawer" };
export default meta;

const railBody = (
  <nav aria-label="Main" style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
    <NavRow href="#practice" label="Home" icon="practice" current />
    <NavRow href="#history" label="Archive" icon="history" />
    <NavRow href="#settings" label="Settings" icon="settings" />
  </nav>
);
const feedbackBody = (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
    <p><strong style={{ color: "var(--color-text-primary)" }}>Question 2 of 5.</strong> Clear situation and a concrete result: the checkout redesign cut drop-off for small merchants.</p>
    <p>Say what you did yourself, not the team: "I ran the usability sessions" instead of "we tested".</p>
  </div>
);

function Frame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <div style={{ width, maxWidth: "100%", height, border: "var(--border-width) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--color-canvas)" }}>
      <OverlayRoot>{children}</OverlayRoot>
    </div>
  );
}

function Demo({ side, startOpen = false }: { side: DrawerSide; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const left = side === "left";
  return (
    <Frame width={left || side === "bottom" ? 375 : 720} height={560}>
      <div style={{ padding: "var(--space-4)" }}>
        <Button onClick={() => setOpen(true)}>{left ? "Open menu" : "Show feedback"}</Button>
      </div>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side={side}
        label={left ? "Menu" : "Feedback"}
        title={left ? "Vukoli" : "Feedback"}
        closeLabel={left ? undefined : "Hide feedback"}
        duration={left ? "slow" : "slower"}
      >
        {left ? railBody : feedbackBody}
      </Drawer>
    </Frame>
  );
}

/** Left: the rail below 1024 (sidebar surface), open and static. */
export const LeftRail: StoryObj = {
  render: () => (
    <Drawer inline open onClose={() => {}} side="left" label="Menu" title="Vukoli">{railBody}</Drawer>
  ),
};

/** Right: the Session feedback panel at mid width, open and static. */
export const RightPanel: StoryObj = {
  render: () => (
    <Drawer inline open onClose={() => {}} side="right" label="Feedback" title="Feedback" closeLabel="Hide feedback"
      footer={<Button variant="secondary" size="sm">Show a stronger answer</Button>}>
      {feedbackBody}
    </Drawer>
  ),
};

/** Bottom: the feedback sheet on a phone, open and static. */
export const BottomSheet: StoryObj = {
  render: () => (
    <div style={{ width: 375, maxWidth: "100%" }}>
      <Drawer inline open onClose={() => {}} side="bottom" label="Feedback" title="Feedback" closeLabel="Hide feedback">{feedbackBody}</Drawer>
    </div>
  ),
};

/** Interactive in a frame (OverlayRoot): slide in, scrim, Esc / scrim click close, focus returns. */
export const InteractiveLeft: StoryObj = { render: () => <Demo side="left" startOpen /> };
export const InteractiveRight: StoryObj = { render: () => <Demo side="right" /> };
export const InteractiveBottom: StoryObj = { render: () => <Demo side="bottom" /> };
