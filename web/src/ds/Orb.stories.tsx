import type { Meta, StoryObj } from "@storybook/react-vite";
import { Orb } from "./Orb";

const meta: Meta<typeof Orb> = { title: "DS/Orb", component: Orb };
export default meta;
type Story = StoryObj<typeof Orb>;

export const Speaking: Story = { args: { state: "speaking", label: "Mike is speaking" } };
export const Listening: Story = { args: { state: "listening", label: "Listening… take your time" } };
export const Thinking: Story = { args: { state: "thinking", label: "Mike is thinking" } };
export const Idle: Story = { args: { state: "idle", label: "Your turn" } };
export const Muted: Story = { args: { state: "muted", label: "Mic is off", sub: "Press M to turn it on" } };
export const Small: Story = { args: { state: "idle", label: "Type your answer", size: "sm" } };
