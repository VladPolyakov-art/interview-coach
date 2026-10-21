/* AI engine on the review page: Settings → AI engine (D78), one view. Setup step 1 moved to the Setup screen (D81).
 * Fixtures: components/engine/fixtures.tsx (no server). Every state is reachable by props (EnginePanel initialPick). */
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppShellView } from "../../components/AppShell";
import { EnginePanel, type EnginePanelProps } from "../../components/EnginePanel";
import { EngineFixture, SETTINGS, makeEngines } from "../../components/engine/fixtures";
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { SHELL_ENGINE, SHELL_RECENT } from "../debrief/frames";
import { SettingsScreen } from "../Settings";

type Engines = ReturnType<typeof makeEngines>;

function SettingsScene({ engines, props, settings }: { engines: Engines; props: EnginePanelProps; settings?: typeof SETTINGS }) {
  return (
    <EngineFixture engines={engines} settings={settings}>
      <MemoryRouter initialEntries={["/settings/engine"]}>
        <AppShellView current="settings" recent={SHELL_RECENT} engine={SHELL_ENGINE}>
          <SettingsScreen content={<EnginePanel {...props} />} />
        </AppShellView>
      </MemoryRouter>
    </EngineFixture>
  );
}

const withModel = { ...SETTINGS, ollama: { ...SETTINGS.ollama, model: "qwen3:8b" } };
const state = (id: string, label: string, render: () => ReactNode, extra: Partial<ReviewState> = {}): ReviewState => ({ id, label, render, ...extra });

export const engineReview: ReviewScreen = {
  id: "engine",
  title: "AI engine",
  note: "D78: в Settings — один экран без внутренних шагов: сверху движок в работе, ниже остальные, каждый подключается на месте; кнопки «Change engine» и «Test» убраны. D81: шаг движка в Setup — тот же экран (см. экран Setup), старый поток «выбор → подключение» (D54) убран.",
  states: [
    state("settings-ollama", "Settings · Ollama в работе", () => (
      <SettingsScene engines={makeEngines()} props={{}} settings={withModel} />
    ), {
      dark: true,
      note: "D78: один экран. Блок «In use»: Ollama · qwen3:8b, статус Ready, выбор моделей — в раскрывашке «Models», «Check again» — тихая иконка у заголовка. Ниже «Other engines»: OpenAI-compatible, Gemini Live, Claude CLI — у готового кнопка «Use», у остальных «Set up». Ни «Change engine», ни «Test». D79: модели Ollama — строками «Model for typed answers» / «Model for voice», выпадающий список справа от названия; тоста «Model saved» нет.",
    }),
    state("settings-setup-openai", "Settings · подключить OpenAI-compatible на месте", () => (
      <SettingsScene engines={makeEngines({ gemini_live: "ready" }, "gemini_live")} props={{ initialPick: "openai_compatible" }} />
    ), {
      note: "«Set up» раскрывает подключение прямо в строке: пресеты, адрес, ключ, модель, цена и данные. «Use OpenAI-compatible» активна, когда статус станет Ready; после переключения движок поднимается наверх (D79: без тоста — смена видна сама).",
    }),
  ],
};
