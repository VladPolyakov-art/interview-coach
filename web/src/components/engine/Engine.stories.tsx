import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { EnginePanel, type EnginePanelProps } from "../EnginePanel";
import { EngineFixture, NONE_READY, SETTINGS, makeEngines } from "./fixtures";

/* D54: choose first, connect after. A = choose, B = connect (one engine), C = Settings summary.
 * Fixture: no server; switching and saving change local state. The playable stories start at the first step. */
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

// A: choose
export const ChooseNoneReady: Story = panel(NONE_READY, { mode: "setup" });
export const ChooseOllamaReady: Story = panel(makeEngines(), { mode: "setup" });
export const ChooseSettings: Story = panel(makeEngines({ gemini_live: "ready" }, "gemini_live"), { mode: "settings", initialStep: "choose" });

// B: connect, one engine at a time
export const ConnectOllamaReady: Story = panel(makeEngines(), { mode: "setup", initialStep: "connect", initialPick: "ollama" }, { ...SETTINGS, ollama: { ...SETTINGS.ollama, model: "qwen3:8b" } });
export const ConnectOllamaNotRunning: Story = panel(NONE_READY, { mode: "setup", initialStep: "connect", initialPick: "ollama" });
export const ConnectOllamaNotInstalled: Story = panel(makeEngines({ ollama: "not_installed" }), { mode: "setup", initialStep: "connect", initialPick: "ollama" });
export const ConnectOllamaNoModel: Story = panel(makeEngines({ ollama: "no_model" }), { mode: "setup", initialStep: "connect", initialPick: "ollama" });
export const ConnectOpenAiNeedsSetup: Story = panel(makeEngines(), { mode: "settings", initialStep: "connect", initialPick: "openai_compatible" });
export const ConnectOpenAiReady: Story = panel(makeEngines({ openai_compatible: "ready" }), { mode: "settings", initialStep: "connect", initialPick: "openai_compatible" }, { ...SETTINGS, openai_compatible: { base_url: "http://localhost:1234/v1", model: "qwen3-4b-instruct", has_api_key: false } });
export const ConnectClaudeFound: Story = panel(makeEngines({ claude_cli: "ready" }), { mode: "settings", initialStep: "connect", initialPick: "claude_cli" });
export const ConnectClaudeNotFound: Story = panel(makeEngines({ claude_cli: "not_installed" }), { mode: "settings", initialStep: "connect", initialPick: "claude_cli" });
export const ConnectGeminiNeedsKey: Story = panel(makeEngines(), { mode: "setup", initialStep: "connect", initialPick: "gemini_live" });
export const ConnectGeminiReady: Story = panel(makeEngines({ gemini_live: "ready" }), { mode: "setup", initialStep: "connect", initialPick: "gemini_live" }, { ...SETTINGS, gemini_live: { ...SETTINGS.gemini_live, has_api_key: true } });

// C: Settings summary
export const SummaryOllama: Story = panel(makeEngines(), { mode: "settings" }, { ...SETTINGS, ollama: { ...SETTINGS.ollama, model: "qwen3:8b" } });
export const SummaryNotReady: Story = panel(NONE_READY, { mode: "settings" });
export const SummaryGemini: Story = panel(makeEngines({ gemini_live: "ready" }, "gemini_live"), { mode: "settings" });
