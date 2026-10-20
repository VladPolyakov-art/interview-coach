import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import { FileDrop } from "./FileDrop";

/** File drop zone (G9): dashed zone + "browse" link, reading / chosen / error states. */
const meta: Meta<typeof FileDrop> = {
  title: "DS/FileDrop",
  component: FileDrop,
  tags: ["autodocs"],
  args: {
    label: "Job description file",
    privacy: "The file stays on this computer.",
    prompt: "Drop a file here or",
    browseLabel: "browse",
    hint: "PDF, DOCX, TXT, MD or HTML · up to 5 MB",
    accept: ".pdf,.docx,.txt,.md,.html",
  },
};
export default meta;
type Story = StoryObj<typeof FileDrop>;

export const Empty: Story = { args: { state: "empty" } };
export const Reading: Story = { args: { state: "reading", file: { name: "kestrel-pay-senior-product-designer.pdf", size: "184 KB" }, readingLabel: "Reading the file…" } };
export const Chosen: Story = {
  args: { state: "chosen", file: { name: "kestrel-pay-senior-product-designer.pdf", size: "184 KB" }, removeLabel: "Remove file", onRemove: () => {} },
};
export const Error: Story = {
  args: {
    state: "error",
    error: {
      title: "Couldn't read this file",
      body: "It may be a scanned PDF. Paste the job text instead.",
      action: <Button variant="secondary" size="sm">Choose another file</Button>,
    },
  },
};
export const Disabled: Story = { args: { state: "empty", disabled: true } };
/** Long file name in a narrow parent (343px): the name truncates, the size stays visible. */
export const Overflow: Story = {
  args: {
    state: "chosen",
    file: { name: "Kestrel-Pay_Senior-Product-Designer_Checkout-and-Merchant-Onboarding_2026-10-18_final_v3.pdf", size: "1.2 MB" },
    removeLabel: "Remove file",
    onRemove: () => {},
  },
  render: (args) => <div style={{ width: "21.4375rem" }}><FileDrop {...args} /></div>,
};
