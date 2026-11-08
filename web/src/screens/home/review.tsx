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
    state("after-end-saving", "После End: сессия сохраняется", "afterEndSaving", { note: "D73: End с хотя бы одним ответом сразу ведёт на Home — без полноэкранного «Saving…» и без тоста. Сессия сразу первой строкой в Recents: название мерцает (шиммер — идёт реальная работа), справа «2 of 5», когда сервер сообщил прогресс; строку можно открыть. Когда дебриф готов, строка становится обычной и сверху приходит тост." }),
    state("after-end-saved", "После End: сессия готова", "afterEndSaved", { note: "D73: дебриф готов — строка в Recents перестаёт мерцать, сверху тост «Your session is saved · Open debrief» (ведёт на разбор: /sessions/:id?view=debrief; тост сам уходит через 5 с, наведение держит; на странице этой сессии не показывается и закрывается, когда туда переходишь (UT-4)). Без ответов End по-прежнему остаётся на экране сессии с «Nothing was saved»." }),
    state("start-first", "Старт: первый визит", "firstVisit", { note: "Микрофон запускает General questions · Unseen mix · 5 questions · voice. Подсказки «General questions», «Show me an example», «Practise English». Чатов в рейле пока нет." }),
    state("start-quick-engine-down", "Старт: движок не запущен", "engineDown", { note: "Кнопка-микрофон неактивна, причина — в баннере сверху; набрать текст и отправить в настройку можно; в рейле над аккаунтом строка «AI engine · Not ready» (ведёт в Settings → AI engine)." }),
    state("start-quick-text", "Старт: ответы текстом", "quickTextMode", { note: "Режим ввода «текстом» или нет распознавания речи: вместо микрофона — значок клавиатуры (тоже без подписи), запускает сессию с ответами текстом; подсказка — «… · typing»." }),
    state("start-typed", "Старт: набран текст → стрелка", "typed", { note: "Как у Gemini: с текстом (или файлом) микрофон превращается в стрелку Send, отправка открывает настройку с Майком. Enter в пустом поле сессию не запускает — только кнопка." }),
    state("start-pasted", "Старт: вставлена вакансия", "pasted", { note: "Кнопка Send появляется только с текстом или файлом. ≥ 80 символов или ссылка — это вакансия." }),
    state("setup-reading", "Чат: Майк читает вакансию", "jobReading", { note: "Вставленный текст свёрнут до 3 строк + «Show all». Шиммер только пока идёт реальная работа." }),
    state("setup-ask-job", "Чат: T1 — какая вакансия", "askJob", { note: "Шапка «Setting up with Mike · Step 1 of 3 · Skip questions». Быстрые ответы — сохранённые вакансии + General questions; можно просто написать." }),
    state("setup-cv-attached", "Чат: CV прикреплён в чате", "cvAttached", { note: "D89: в поле чата с Майком теперь есть «+», файл можно вставить (Cmd+V) или перетащить на поле — оно подсвечивается. Файл ложится карточкой, отправка — стрелкой. На вопросе «какая вакансия» файл — вакансия, на остальных шагах — CV в профиль. Файл, брошенный мимо поля, больше не открывается вместо приложения." }),
    state("setup-cv-added", "Чат: CV добавлен", "cvAdded", { note: "D89: «Reading your CV…» (шиммер, пока сервер читает) → Майк подтверждает и снова задаёт открытый вопрос с теми же быстрыми ответами. Не прочитался — красная реплика и тот же вопрос; в профиле уже 10 файлов — Майк так и говорит." }),
    state("setup-dictating", "Чат: диктовка", "dictating", { note: "D90: поле чата — одна строка: слева «+» (файл), справа микрофон. Нажал — «Listening…», кнопка становится «стоп»; нажал ещё раз — слова встают в поле, их можно поправить и отправить стрелкой. Распознаёт локальный STT на этом компьютере (браузерный — только если выбран в Settings); звук и текст не сохраняются. Чат прокручивается под полем до самого низа, сверху поля — короткое затухание." }),
    state("setup-dictation-error", "Чат: диктовка не расслышала", "dictationError", { note: "D90: ничего не распознано — строка под полем, поле и кнопки на месте; ввод текста убирает ошибку." }),
    state("setup-keyword", "Чат: всё понял из фразы", "keywordMatch", { note: "«I have an HR screen with Lumen tomorrow» → вакансия и раунд взяты, остался один вопрос (Step 1 of 1)." }),
    state("setup-plan", "Чат: план", "plan", { dark: true, note: "Карточка плана: Job, Round, Mike, Length, Based on, Watch for — у каждой правки ссылка Change. Единственная основная кнопка — Start interview." }),
    state("setup-plan-preparing", "План: вопросы готовятся", "planPreparing", { note: "QA-02: пока Майк пишет вопросы по вакансии («Preparing questions…» с шиммером), «Start interview» и «Type instead» выключены, под ними — «Start unlocks when the questions are ready.». Иначе сессия, начатая в этот момент, задала бы вопрос из общего банка, хотя план говорит «по вакансии». Готово — кнопки включаются; не получилось или > 90 с — «Couldn't prepare… Mike will use general questions» + «Try again», старт включён." }),
    state("setup-plan-change", "План: Change round", "planChangeOpen", { note: "Меню раунда с описаниями открывается из «Change»; правка в карточке, Майк не пишет новое сообщение." }),
    state("setup-again", "«Kestrel Pay again»", "again", { note: "Вернувшийся пользователь: подсказка → сразу план с прошлыми настройками → Start. Два клика вместо одного (вопрос Q1); в один клик — микрофон в поле." }),
    state("setup-drill", "«Drill my weak spots»", "drill", { note: "Слабые места одним предложением Майка + выбор фокуса чипами (US-22, вопрос Q2)." }),
    state("setup-english", "Английский: план", "englishPlan", { note: "Уровень B2 подтверждён, тема, фразы для отработки; «Start talking»." }),
    state("setup-engine-down", "План: движок не запущен", "planEngineDown", { note: "Чат работает без движка (сценарий); неактивна только Start, причина под кнопкой." }),
    state("talk-chips", "Tough talk: чипы в два ряда", "firstVisit", { note: "tough-talk.md §2.1: ряд 1 — личные подсказки («General questions», «Show me an example»; у вернувшегося «Kestrel Pay again» и «Drill my weak spots»), ряд 2 — всегда «Practise English», «Tough questions», «Negotiate salary». Группы «Suggestions» и «Other practice»; на 375 каждый ряд переносится сам (второй 2 + 1). Чип — первое сообщение пользователя, дальше чат с Майком." }),
    state("talk-neg-role", "Negotiate N-1: какая роль", "negRole", { note: "Три новые вакансии + «No job, I'll type it». Выбрал вакансию — Майк читает объявление и берёт вилку из него." }),
    state("talk-neg-numbers-empty", "Negotiate N-2: цифры, пусто", "negNumbersEmpty", { note: "Карточка цифр внутри сообщения Майка: вилка (необязательная пара), «My target», валюта (Select, «Other…» открывает 3-буквенный код), «Per year», галочка про реальный оффер, пометка про исследование. «Use these numbers» — вторичная кнопка и выключена, пока нет цели; причина под ней." }),
    state("talk-neg-numbers-prefilled", "Negotiate N-2: вилка из объявления", "negNumbersPrefilled", { dark: true, note: "Вилка и валюта взяты из объявления, под ней «From the job post — check it». Цель — единственное, что осталось ввести (если цифры уже вводились для этой вакансии, они подставляются сами)." }),
    state("talk-neg-numbers-error", "Negotiate N-2: ошибки", "negNumbersError", { note: "Ошибки в самом поле (иконка + текст, role=alert) на blur и при отправке: «The top of the range is below the bottom. Check the order.», «Add your target.». Подсказки без ошибки: цель выше вилки и слишком широкая вилка." }),
    state("talk-neg-style", "Negotiate N-3: стиль Майка", "negStyleFirst", { note: "Первый раз: «For a first try, Friendly is a good start.» и четыре ответа. Отправленная карточка цифр свёрнута в пузырь пользователя." }),
    state("talk-neg-style-again", "Negotiate N-3: стиль, повторно", "negStyleAgain", { note: "«Same as last time, Firm?» → Yes / Easier / Harder / Surprise me." }),
    state("talk-neg-plan", "Negotiate: план с тактиками", "negPlan", { dark: true, note: "Role, Numbers, Mike, Competing offer, Length и лента «Tactics for this call» (карточки из /api/tough-talk/content, в порядке разговора), «Hide tactics» — навсегда для этого режима (вернуть: Settings → Practice). Одна чёрная кнопка «Start negotiation»." }),
    state("talk-neg-plan-numbers", "Negotiate: Change your numbers", "negPlanNumbersOpen", { note: "Диалог «Change your numbers» с теми же полями; Cancel, Esc и клик по затемнению оставляют набранное как черновик." }),
    state("talk-neg-plan-hidden", "Negotiate: тактики скрыты", "negPlanHidden", { note: "Одна строка «Tactics are hidden.» и ссылка «Show them»." }),
    state("talk-tough-theme", "Tough T-1: тема", "toughTheme", { note: "Семь ответов (на 375 — три ряда); «Personal questions» — отдельная тема, в «Mix» не входит." }),
    state("talk-tough-plan", "Tough: план с тактиками", "toughPlan", { dark: true, note: "Theme, Mike, Length, After the call и лента из трёх карточек (для Money и Mix сначала «Keep your current pay private»)." }),
    state("talk-tough-personal", "Tough: Personal questions", "toughPersonal", { note: "Майк предупреждает, что такие вопросы во многих местах нельзя задавать, и что давить он не будет." }),
    state("setup-overflow", "Переполнение +30%", "overflowSetup", { note: "Длинные названия переносятся, 40 строк вакансии свёрнуты, заметка 300 символов, 7 вакансий в Change job." }),
  ],
};
