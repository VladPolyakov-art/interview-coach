import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { EnginePanel, type EnginePanelProps } from "../EnginePanel";
import { EngineFixture, NONE_READY, SETTINGS, makeEngines } from "./fixtures";

/* D78: Settings → AI engine is one view: the engine in use on top, the other engines under it, set up in place.
 * D81: Setup step 1 uses the same view (Pages/Setup). Fixture: no server; switching and saving change local state. */
const meta: Meta = { title: "Patterns/EnginePanel", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

function Stage({ engines, settings, children }: { engines: ReturnType<typeof makeEngines>; settings?: typeof SETTINGS; children: ReactNode }) {
  return (
    <EngineFixture engines={engines} settings={settings}>
      <div style={{ maxWidth: "calc(var(--layout-narrow) + var(--space-16))" }}>{children}</div>
    </EngineFixture>
  );
}
const panel = (engines: ReturnType<typeof makeEngines>, props: EnginePanelProps, settings?: typeof SETTINGS): Story => ({
  render: () => <Stage engines={engines} settings={settings}><EnginePanel {...props} /></Stage>,
});

export const SettingsOllama: Story = panel(makeEngines(), {}, { ...SETTINGS, ollama: { ...SETTINGS.ollama, model: "qwen3:8b" } });
export const SettingsNotReady: Story = panel(NONE_READY, {});
export const SettingsOllamaNotInstalled: Story = panel(makeEngines({ ollama: "not_installed" }), {});
export const SettingsOllamaNoModel: Story = panel(makeEngines({ ollama: "no_model" }), {});
export const SettingsGemini: Story = panel(makeEngines({ gemini_live: "ready" }, "gemini_live"), {});
export const SettingsSetUpOpenAi: Story = panel(makeEngines(), { initialPick: "openai_compatible" });
export const SettingsSetUpClaude: Story = panel(makeEngines({ claude_cli: "not_installed" }), { initialPick: "claude_cli" });
export const SettingsDisconnected: Story = panel(makeEngines({ ollama: "disconnected" }), {});
export const SettingsSetUpGemini: Story = panel(makeEngines(), { initialPick: "gemini_live" });
