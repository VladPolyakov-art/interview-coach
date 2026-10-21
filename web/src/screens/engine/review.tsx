/* AI engine on the review page: Settings → AI engine (D78), one view. Setup step 1 moved to the Setup screen (D81).
 * Fixtures: components/engine/fixtures.tsx (no server). Every state is reachable by props (EnginePanel initialPick). */
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppShellView } from "../../components/AppShell";
import { EnginePanel, type EnginePanelProps } from "../../components/EnginePanel";
import { EngineFixture, LIMITS, SETTINGS, makeEngines } from "../../components/engine/fixtures";
import type { EngineId, EngineLimits } from "../../lib/types";
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { SHELL_ENGINE, SHELL_RECENT } from "../debrief/frames";
import { SettingsScreen } from "../Settings";

type Engines = ReturnType<typeof makeEngines>;

function SettingsScene({ engines, props, settings, limits }: {
  engines: Engines; props: EnginePanelProps; settings?: typeof SETTINGS; limits?: Partial<Record<EngineId, EngineLimits>>;
}) {
  return (
    <EngineFixture engines={engines} settings={settings} limits={limits}>
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
    state("settings-limit-codex", "Settings · лимит Codex", () => (
      <SettingsScene engines={makeEngines({ codex_cli: "ready" }, "codex_cli")} props={{}} />
    ), {
      note: "D88: под движком в работе — одна строка лимита из самого тарифа (Codex отдаёт его через codex app-server без запроса к модели): «Free plan · 2% of your monthly limit used · resets Nov 20 · 98+ sessions left». «Сессий осталось» — оценка по прошлым сессиям; «98+» — счётчик за сессию не сдвинулся, значит не меньше. Все окна и пояснение — в «Connection».",
    }),
    state("settings-limit-claude-low", "Settings · Claude, лимит почти исчерпан", () => (
      <SettingsScene engines={makeEngines({ claude_cli: "ready" }, "claude_cli")} props={{}} limits={{ claude_cli: LIMITS.claudeLow }} />
    ), {
      note: "D88: осталось меньше 20% — строка становится предупреждением: «Only 14% of your 5-hour limit left · resets 1:00 PM · about 4 sessions left». Claude сообщает лимит в каждом ответе, поэтому цифры обновляются после сессии. Исчерпан — «Your 5-hour limit is used up · resets … Pick another engine meanwhile.», а в сессии — сообщение с тем же советом.",
    }),
    state("settings-limit-antigravity", "Settings · Antigravity, счётчик запросов", () => (
      <SettingsScene engines={makeEngines({ antigravity_cli: "ready" }, "antigravity_cli")} props={{}} />
    ), {
      note: "D88: Google не публикует размер бесплатной квоты Antigravity, поэтому честно: «Google doesn't publish the exact limit. This week Vukoli sent 46 requests.» Квота обновляется раз в неделю. Кончилась — в сессии «Your Antigravity quota is used up for now» и совет переключить движок.",
    }),
    state("settings-limit-gemini", "Settings · Gemini, запросы за сегодня", () => (
      <SettingsScene engines={makeEngines({ gemini_live: "ready" }, "gemini_live")} props={{}} />
    ), {
      note: "D88: у Gemini лимит в день на проект Google, точное число видно только в AI Studio. Строка: сколько запросов Vukoli отправил сегодня и когда сброс (полночь по тихоокеанскому времени, показано в местном).",
    }),
  ],
};
