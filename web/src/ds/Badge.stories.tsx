import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, Chip } from "./Badge";

const meta: Meta = { title: "DS/Badge" };
export default meta;

export const Tones: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <Badge>Free</Badge>
      <Badge tone="live" dot>Mike is speaking</Badge>
      <Badge tone="success" icon="check">Ready</Badge>
      <Badge tone="warning" icon="alert">Not running</Badge>
      <Badge tone="error" icon="x">Not found</Badge>
      <Badge tone="outline" icon="lock">Local</Badge>
      <Badge tone="content" icon="content">Content</Badge>
      <Badge tone="language" icon="language">Language</Badge>
      <Badge tone="delivery" icon="delivery">Delivery</Badge>
    </div>
  ),
};
export const Chips: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <Chip selected>LM Studio</Chip>
      <Chip>Jan</Chip>
      <Chip>OpenRouter</Chip>
      <Chip icon="plus">Add</Chip>
    </div>
  ),
};
