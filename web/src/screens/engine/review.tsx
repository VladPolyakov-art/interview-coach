/* AI engine on the review page (D54): choose, then connect. Setup step 1 (A, B) and Settings → AI engine (C, A).
 * Fixtures: components/engine/fixtures.tsx (no server). Every state is reachable by props (EnginePanel initialStep / initialPick). */
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppShellView } from "../../components/AppShell";
import { EnginePanel, type EnginePanelProps } from "../../components/EnginePanel";
import { EngineFixture, NONE_READY, SETTINGS, makeEngines } from "../../components/engine/fixtures";
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { SHELL_ENGINE, SHELL_RECENT } from "../debrief/frames";
import { SettingsScreen } from "../Settings";
import { SetupFrame } from "../Setup";

type Engines = ReturnType<typeof makeEngines>;

function SetupScene({ engines, props, settings }: { engines: Engines; props: EnginePanelProps; settings?: typeof SETTINGS }) {
  return (
    <EngineFixture engines={engines} settings={settings}>
      <SetupFrame step="engine"><EnginePanel {...props} /></SetupFrame>
    </EngineFixture>
  );
}

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
  note: "D54: сначала выбор, потом подключение. Было: четыре движка развёрнуты целиком (около 2500 px). Стало: A — короткий список из четырёх вариантов с одним словом статуса; B — только подключение выбранного; D78: в Settings — один экран без внутренних шагов: сверху движок в работе, ниже остальные, каждый подключается на месте; кнопки «Change engine» и «Test» убраны. Выбор в Setup сам по себе движок не переключает.",
  states: [
    state("choose-none", "A · Setup, ничего не готово", () => <SetupScene engines={NONE_READY} props={{ mode: "setup" }} />, {
      note: "Заголовок «Choose how Mike runs» и одна строка. Четыре варианта без радио-кружков (D59): значок, название, одна простая строка, под ней «Needs setup» / «Ready»; у выбранного — обводка и метка «Selected» справа. У Ollama — «Recommended» и он выбран заранее. Кнопка Continue ведёт к подключению.",
    }),
    state("choose-ready", "A · Setup, Ollama готов", () => <SetupScene engines={makeEngines()} props={{ mode: "setup" }} />, {
      dark: true,
      note: "Тот же список: у готового движка — «Ready» с галочкой, спокойным зелёным. Стрелки двигают выбор, фокус виден.",
    }),
    state("connect-ollama-down", "B · Ollama не запущен", () => (
      <SetupScene engines={NONE_READY} props={{ mode: "setup", initialStep: "connect", initialPick: "ollama" }} />
    ), {
      note: "«Connect Ollama»: ссылка Back, статус, шаги запуска и команда для копирования. Cost and your data — свёрнутая строка. Continue неактивна, причина рядом: «Ollama works once its status says Ready».",
    }),
    state("connect-ollama-ready", "B · Ollama готов", () => (
      <SetupScene engines={makeEngines()} props={{ mode: "setup", initialStep: "connect", initialPick: "ollama" }} settings={withModel} />
    ), {
      dark: true,
      note: "Два выбора модели (для набранных ответов и для голоса). Continue переключает движок и ведёт к шагу «Test» — проверка движка теперь только там (D78).",
    }),
    state("connect-gemini", "B · Gemini: нужен ключ", () => (
      <SetupScene engines={makeEngines()} props={{ mode: "setup", initialStep: "connect", initialPick: "gemini_live" }} />
    ), {
      note: "Только ключ и «Get a free key»; плашка о данных (голос уходит в Google) остаётся, цена и данные — в свёрнутом блоке.",
    }),
    state("settings-ollama", "Settings · Ollama в работе", () => (
      <SettingsScene engines={makeEngines()} props={{ mode: "settings" }} settings={withModel} />
    ), {
      dark: true,
      note: "D78: один экран. Блок «In use»: Ollama · qwen3:8b, статус Ready, выбор моделей — в раскрывашке «Models», «Check again» — тихая иконка у заголовка. Ниже «Other engines»: OpenAI-compatible, Gemini Live, Claude CLI — у готового кнопка «Use», у остальных «Set up». Ни «Change engine», ни «Test». D79: модели Ollama — строками «Model for typed answers» / «Model for voice», выпадающий список справа от названия; тоста «Model saved» нет.",
    }),
    state("settings-setup-openai", "Settings · подключить OpenAI-compatible на месте", () => (
      <SettingsScene engines={makeEngines({ gemini_live: "ready" }, "gemini_live")} props={{ mode: "settings", initialPick: "openai_compatible" }} />
    ), {
      note: "«Set up» раскрывает подключение прямо в строке: пресеты, адрес, ключ, модель, цена и данные. «Use OpenAI-compatible» активна, когда статус станет Ready; после переключения движок поднимается наверх (D79: без тоста — смена видна сама).",
    }),
  ],
};
