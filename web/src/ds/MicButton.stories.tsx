import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { MicButton } from "./MicButton";

const meta: Meta = { title: "DS/MicButton" };
export default meta;

/** Fake voice level: the slider feeds getLevel; the disc reads it every animation frame (no re-render). */
function Demo() {
  const [level, setLevel] = useState(0.3);
  const [muted, setMuted] = useState(false);
  const [live, setLive] = useState(true);
  const ref = useRef(level);
  ref.current = level;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", alignItems: "flex-start" }}>
      <div style={{ padding: "var(--space-6)" }}>
        <MicButton label={muted ? "Unmute" : "Mute"} muted={muted} live={live} getLevel={() => ref.current} onClick={() => setMuted(!muted)} />
      </div>
      <label style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        Level
        <input type="range" min={0} max={1} step={0.01} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{level.toFixed(2)}</span>
      </label>
      <label style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Mic open (session live)
      </label>
    </div>
  );
}
export const FakeLevel: StoryObj = { render: () => <Demo /> };
export const Muted: StoryObj = { render: () => <MicButton label="Unmute" muted live /> };
