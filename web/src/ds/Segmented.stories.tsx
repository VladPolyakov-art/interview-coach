import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Segmented } from "./Segmented";

const meta: Meta = { title: "DS/Segmented" };
export default meta;

function Demo() {
  const [v, setV] = useState<"voice" | "text">("voice");
  return (
    <Segmented
      label="How you answer"
      value={v}
      onChange={setV}
      options={[{ value: "voice", label: "Voice", icon: "mic" }, { value: "text", label: "Keyboard", icon: "keyboard" }]}
    />
  );
}
export const Default: StoryObj = { render: () => <Demo /> };
function Theme() {
  const [v, setV] = useState<"system" | "light" | "dark">("system");
  return (
    <Segmented
      label="Theme"
      value={v}
      onChange={setV}
      options={[
        { value: "system", label: "System", icon: "monitor" },
        { value: "light", label: "Light", icon: "sun" },
        { value: "dark", label: "Dark", icon: "moon" },
      ]}
    />
  );
}
export const ThemePicker: StoryObj = { render: () => <Theme /> };
