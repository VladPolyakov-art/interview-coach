import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyField } from "./CopyField";

const meta: Meta<typeof CopyField> = { title: "DS/CopyField", component: CopyField };
export default meta;
export const Command: StoryObj<typeof CopyField> = {
  args: { value: "ollama pull qwen3:4b-instruct", copyLabel: "Copy command", copiedLabel: "Copied", label: "Command" },
};
