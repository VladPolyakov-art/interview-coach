import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, SelectableCard } from "./Card";

const meta: Meta<typeof Card> = { title: "DS/Card", component: Card };
export default meta;
type Story = StoryObj<typeof Card>;

export const Raised: Story = { args: { children: "Kestrel Pay · Senior Product Designer" } };
export const Subtle: Story = { args: { tone: "subtle", children: "Feedback appears here after each question." } };
export const Selectable: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 16rem)", gap: "var(--space-3)" }}>
      <SelectableCard selected>Kestrel Pay<br />Added Oct 18</SelectableCard>
      <SelectableCard>Lumen Health<br />Added Oct 15</SelectableCard>
    </div>
  ),
};
