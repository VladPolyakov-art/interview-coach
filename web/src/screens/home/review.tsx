/* Home on the review page (stage 11, v2): the key states of ds/screens/home.md v2 §5 as playable scenes
 * (MemoryRouter + AppShellView + HomeView driven by the setup script). Fixture: docs/ia.md §6. All states: Storybook. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { HomeScene } from "./frames";
import type { HomeSceneId } from "./states";

const scene = (id: HomeSceneId) => () => <HomeScene id={id} />;
const state = (id: string, label: string, sceneId: HomeSceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: scene(sceneId), ...extra,
});

export const homeReview: ReviewScreen = {
  id: "home",
  title: "Home",
  note: "v2: стартовый экран как в чат-приложении (приветствие, одно поле, до трёх подсказок) → короткая настройка с Майком (до 3 вопросов, быстрые ответы, «Skip questions») → карточка плана с одной чёрной кнопкой Start interview. Реплики Майка — по сценарию, без LLM. Всё кликабельно.",
  states: [
    state("start-returning", "Старт: вернувшийся пользователь", "returning", { dark: true, note: "Без орба и без блоков: приветствие, поле «Message Mike» с чипом режима и «+», три подсказки. Слабые места — только чипом «Drill my weak spots» (D47e)." }),
    state("start-first", "Старт: первый визит", "firstVisit", { note: "Подсказки «General questions», «Show me an example», «Practise English». Recent в рейле пустой." }),
    state("start-mode", "Старт: выбор режима", "modeMenu", { note: "Чип режима в поле, как выбор модели у Gemini/Ollama: Interview / English practice с описаниями (вопрос Q3)." }),
    state("start-pasted", "Старт: вставлена вакансия", "pasted", { note: "Кнопка Send появляется только с текстом или файлом. ≥ 80 символов или ссылка — это вакансия." }),
    state("setup-reading", "Чат: Майк читает вакансию", "jobReading", { note: "Вставленный текст свёрнут до 3 строк + «Show all». Шиммер только пока идёт реальная работа." }),
    state("setup-ask-job", "Чат: T1 — какая вакансия", "askJob", { note: "Шапка «Setting up with Mike · Step 1 of 3 · Skip questions». Быстрые ответы — сохранённые вакансии + General questions; можно просто написать." }),
    state("setup-keyword", "Чат: всё понял из фразы", "keywordMatch", { note: "«I have an HR screen with Lumen tomorrow» → вакансия и раунд взяты, остался один вопрос (Step 1 of 1)." }),
    state("setup-plan", "Чат: план", "plan", { dark: true, note: "Карточка плана: Job, Round, Mike, Length, Based on, Watch for — у каждой правки ссылка Change. Единственная основная кнопка — Start interview." }),
    state("setup-plan-change", "План: Change round", "planChangeOpen", { note: "Меню раунда с описаниями открывается из «Change»; правка в карточке, Майк не пишет новое сообщение." }),
    state("setup-again", "«Kestrel Pay again»", "again", { note: "Вернувшийся пользователь: подсказка → сразу план с прошлыми настройками → Start. Два клика вместо одного (вопрос Q1)." }),
    state("setup-drill", "«Drill my weak spots»", "drill", { note: "Слабые места одним предложением Майка + выбор фокуса чипами (US-22, вопрос Q2)." }),
    state("setup-english", "Английский: план", "englishPlan", { note: "Уровень B2 подтверждён, тема, фразы для отработки; «Start talking»." }),
    state("setup-engine-down", "План: движок не запущен", "planEngineDown", { note: "Чат работает без движка (сценарий); неактивна только Start, причина под кнопкой." }),
    state("setup-overflow", "Переполнение +30%", "overflowSetup", { note: "Длинные названия переносятся, 40 строк вакансии свёрнуты, заметка 300 символов, 7 вакансий в Change job." }),
  ],
};
