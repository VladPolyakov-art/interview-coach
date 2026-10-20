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
  note: "v2 + D51: стартовый экран как в чат-приложении (приветствие, одно поле, до трёх подсказок) → короткая настройка с Майком (до 3 вопросов, быстрые ответы, «Skip questions») → карточка плана с одной чёрной кнопкой Start interview. Реплики Майка — по сценарию, без LLM. Всё кликабельно. D52: два варианта старта рядом — «как сейчас» (таблетка Start now под полем) и «как в Gemini» (микрофон в поле справа).",
  states: [
    state("start-returning", "Старт: вернувшийся пользователь", "returning", { dark: true, note: "Приветствие, поле «Message Mike» с чипом режима и «+», под ним «Start now» (D51·1: один клик — сессия с прошлыми настройками: Kestrel Pay · Behavioural · 5 questions · voice), ниже три подсказки. Сайдбар как в Gemini (D51·6): New practice, History → чаты → аккаунт с настройками внизу." }),
    state("start-first", "Старт: первый визит", "firstVisit", { note: "«Start now» = General questions · Unseen mix · 5 questions · voice. Подсказки «General questions», «Show me an example», «Practise English». Чатов в рейле пока нет." }),
    state("start-quick-engine-down", "Старт: движок не запущен", "engineDown", { note: "«Start now» неактивна, причина — в баннере сверху; в рейле над аккаунтом строка «AI engine · Not ready» (ведёт в Settings → AI engine)." }),
    state("start-quick-text", "Start now: ответы текстом", "quickTextMode", { note: "Подпись следует режиму ввода: «… · typing»." }),
    state("start-layout-current", "Старт: вариант «как сейчас»", "returning", { dark: true, note: "D52·3, вариант A: «+» и чип режима в поле, под полем таблетка «Start now» с подписью «Kestrel Pay · Behavioural · 5 questions · voice». В живом прототипе: /?layout=current." }),
    state("start-layout-gemini", "Старт: вариант «как в Gemini»", "layoutGemini", { dark: true, note: "D52·2, вариант B: слева «+» и чип «Interview ▾», справа круглая кнопка-микрофон без подписи = Start now (один клик — голосовая сессия с теми же настройками; подсказка при наведении — «Kestrel Pay · Behavioural · 5 questions · voice»). Таблетки под полем нет, подсказки остаются. В живом прототипе: /?layout=gemini (запоминается)." }),
    state("start-layout-gemini-typed", "Gemini: набран текст → стрелка", "layoutGeminiTyped", { note: "Как у Gemini: с текстом (или файлом) микрофон превращается в стрелку Send, отправка открывает настройку с Майком, как сейчас. Enter в пустом поле сессию не запускает — только кнопка." }),
    state("start-layout-gemini-text", "Gemini: ответы текстом", "layoutGeminiTextMode", { note: "Режим ввода «текстом» или нет распознавания речи: вместо микрофона — значок клавиатуры (тоже без подписи), запускает сессию с ответами текстом." }),
    state("start-layout-gemini-engine-down", "Gemini: движок не запущен", "layoutGeminiEngineDown", { note: "Кнопка-микрофон неактивна (те же правила, что у Start now), причина — в баннере сверху. Набрать текст и отправить в настройку можно." }),
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
