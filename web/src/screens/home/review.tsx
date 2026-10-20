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
  note: "v2 + D51: стартовый экран как в чат-приложении (приветствие, одно поле, до трёх подсказок) → короткая настройка с Майком (до 3 вопросов, быстрые ответы, «Skip questions») → карточка плана с одной чёрной кнопкой Start interview. Реплики Майка — по сценарию, без LLM. Всё кликабельно. D52/D53: старт как в Gemini — в поле слева «+» и чип режима, справа круглый микрофон без подписи = Start now.",
  states: [
    state("start-returning", "Старт: вернувшийся пользователь", "returning", { dark: true, note: "Приветствие, поле «Message Mike»: слева «+» и чип «Interview ▾», справа круглая кнопка-микрофон без подписи = Start now (D51·1, D53: один клик — голосовая сессия с прошлыми настройками; подсказка при наведении — «Kestrel Pay · Behavioural · 5 questions · voice»). Под полем — три подсказки. Сайдбар как в Gemini (D51·6, D52·1): New practice → все чаты → аккаунт с настройками внизу." }),
    state("start-first", "Старт: первый визит", "firstVisit", { note: "Микрофон запускает General questions · Unseen mix · 5 questions · voice. Подсказки «General questions», «Show me an example», «Practise English». Чатов в рейле пока нет." }),
    state("start-quick-engine-down", "Старт: движок не запущен", "engineDown", { note: "Кнопка-микрофон неактивна, причина — в баннере сверху; набрать текст и отправить в настройку можно; в рейле над аккаунтом строка «AI engine · Not ready» (ведёт в Settings → AI engine)." }),
    state("start-quick-text", "Старт: ответы текстом", "quickTextMode", { note: "Режим ввода «текстом» или нет распознавания речи: вместо микрофона — значок клавиатуры (тоже без подписи), запускает сессию с ответами текстом; подсказка — «… · typing»." }),
    state("start-typed", "Старт: набран текст → стрелка", "typed", { note: "Как у Gemini: с текстом (или файлом) микрофон превращается в стрелку Send, отправка открывает настройку с Майком. Enter в пустом поле сессию не запускает — только кнопка." }),
    state("start-mode", "Старт: выбор режима", "modeMenu", { note: "Чип режима в поле, как выбор модели у Gemini/Ollama: Interview / English practice с описаниями (вопрос Q3)." }),
    state("start-pasted", "Старт: вставлена вакансия", "pasted", { note: "Кнопка Send появляется только с текстом или файлом. ≥ 80 символов или ссылка — это вакансия." }),
    state("setup-reading", "Чат: Майк читает вакансию", "jobReading", { note: "Вставленный текст свёрнут до 3 строк + «Show all». Шиммер только пока идёт реальная работа." }),
    state("setup-ask-job", "Чат: T1 — какая вакансия", "askJob", { note: "Шапка «Setting up with Mike · Step 1 of 3 · Skip questions». Быстрые ответы — сохранённые вакансии + General questions; можно просто написать." }),
    state("setup-keyword", "Чат: всё понял из фразы", "keywordMatch", { note: "«I have an HR screen with Lumen tomorrow» → вакансия и раунд взяты, остался один вопрос (Step 1 of 1)." }),
    state("setup-plan", "Чат: план", "plan", { dark: true, note: "Карточка плана: Job, Round, Mike, Length, Based on, Watch for — у каждой правки ссылка Change. Единственная основная кнопка — Start interview." }),
    state("setup-plan-change", "План: Change round", "planChangeOpen", { note: "Меню раунда с описаниями открывается из «Change»; правка в карточке, Майк не пишет новое сообщение." }),
    state("setup-again", "«Kestrel Pay again»", "again", { note: "Вернувшийся пользователь: подсказка → сразу план с прошлыми настройками → Start. Два клика вместо одного (вопрос Q1); в один клик — микрофон в поле." }),
    state("setup-drill", "«Drill my weak spots»", "drill", { note: "Слабые места одним предложением Майка + выбор фокуса чипами (US-22, вопрос Q2)." }),
    state("setup-english", "Английский: план", "englishPlan", { note: "Уровень B2 подтверждён, тема, фразы для отработки; «Start talking»." }),
    state("setup-engine-down", "План: движок не запущен", "planEngineDown", { note: "Чат работает без движка (сценарий); неактивна только Start, причина под кнопкой." }),
    state("setup-overflow", "Переполнение +30%", "overflowSetup", { note: "Длинные названия переносятся, 40 строк вакансии свёрнуты, заметка 300 символов, 7 вакансий в Change job." }),
  ],
};
