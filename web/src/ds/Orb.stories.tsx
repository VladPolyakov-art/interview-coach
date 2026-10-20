import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { getFakeLevel } from "./fakeLevel";
import { Orb, type OrbState } from "./Orb";

/** Orb concept 1 "voice-led": speaking scales with Mike's playback level (fake driver below), thinking = slow held
 * breath, listening = still disc + still thin ring, idle / muted / offline = grey. Every state has a text label;
 * reduced motion = still disc. The fake driver is passed to every state: only `speaking` reads it. */
const meta: Meta<typeof Orb> = { title: "DS/Orb", component: Orb, tags: ["autodocs"], args: { getLevel: getFakeLevel } };
export default meta;
type Story = StoryObj<typeof Orb>;

export const Speaking: Story = { args: { state: "speaking", label: "Mike is speaking" } };
/** No level source (engine gives no audio level): falls back to a slow breath. */
export const SpeakingNoLevel: Story = { args: { state: "speaking", label: "Mike is speaking", getLevel: undefined } };
/** Static level (review frames): scale is fixed at the given level. */
export const SpeakingStaticLevel: Story = { args: { state: "speaking", label: "Mike is speaking", getLevel: undefined, level: 0.8 } };
export const Listening: Story = { args: { state: "listening", label: "Listening… take your time" } };
export const Thinking: Story = { args: { state: "thinking", label: "Mike is thinking" } };
export const Idle: Story = { args: { state: "idle", label: "Your turn" } };
export const Muted: Story = { args: { state: "muted", label: "Mic is off", sub: "Press M to turn it on" } };
export const Offline: Story = { args: { state: "offline", label: "Ollama isn't running", sub: "Start it, then try again" } };
export const Small: Story = { args: { state: "idle", label: "Type your answer", size: "sm" } };
export const HiddenLabel: Story = { args: { state: "idle", label: "Mike is ready", size: "sm", hideLabel: true } };
export const Entering: Story = { args: { state: "speaking", label: "Mike is speaking", entering: true } };
/** Narrow parent (160px): the orb shrinks to the box, the ring never overflows. */
export const NarrowParent: Story = {
  args: { state: "listening", label: "Listening… take your time" },
  render: (args) => <div style={{ width: "10rem", border: "var(--border-width) dashed var(--color-border-subtle)" }}><Orb {...args} /></div>,
};

const STATES: { state: OrbState; label: string }[] = [
  { state: "speaking", label: "Mike is speaking" },
  { state: "listening", label: "Listening… take your time" },
  { state: "thinking", label: "Mike is thinking" },
  { state: "idle", label: "Your turn" },
  { state: "muted", label: "Mic is off" },
  { state: "offline", label: "Ollama isn't running" },
];

/** Walk through the states with the fake level driver running. */
function Driver() {
  const [i, setI] = useState(0);
  const cur = STATES[i]!;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)" }}>
      <Orb state={cur.state} label={cur.label} getLevel={getFakeLevel} />
      <div role="group" aria-label="Orb state" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "center" }}>
        {STATES.map((s, k) => (
          <button key={s.state} type="button" aria-pressed={k === i} onClick={() => setI(k)}>{s.state}</button>
        ))}
      </div>
    </div>
  );
}
export const FakeLevelDriver: Story = { render: () => <Driver /> };
