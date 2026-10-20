/* Defaults taken before the review (ds/screens/_index.md §3). Each row is commentable on the review page.
 * v2 (D47): rows overridden by the owner's v1 comments are gone (Home O-1, O-2, O-5, O-6, DS-6); the v2 questions Q1-Q5
 * and the scripted setup chat are new.
 * V2.1 (D49): the orb rows (session-o2, o3) are replaced by the Presence and transcript rows; o5 now places the state
 * text above the island. */
export interface Decision { id: string; screen: string; question: string; chosen: string; alt?: string }

export const DECISIONS: Decision[] = [
  { id: "home-v2-setup", screen: "Home", question: "Настройка с Майком идёт по сценарию (готовые реплики + распознавание ключевых слов), без вызова модели — работает и при выключенном движке", chosen: "да, 🟡 позже — с моделью" },
  { id: "home-v2-q1", screen: "Home", question: "Q1. На стартовом экране нет кнопки Start: вернувшийся пользователь идёт «Kestrel Pay again» → план → Start (2 клика вместо 1)", chosen: "да", alt: "план прошлой сессии сразу под полем (экран снова плотнее)" },
  { id: "home-v2-q2", screen: "Home", question: "Q2. Обновить в PRD US-22 AC1 (слабые места — чип + фраза Майка + «Watch for» в плане) и US-29 AC1 (пример — в одно касание)", chosen: "да" },
  { id: "home-v2-q3", screen: "Home", question: "Q3. Interview / English — чип режима внутри поля (как выбор модели в Gemini и Ollama), а не переключатель над ним", chosen: "да", alt: "маленький переключатель под приветствием" },
  { id: "session-v2-q4", screen: "Session", question: "Q4. Верхней панели нет совсем: название, раунд и строгость — в шапке меню More в островке", chosen: "да" },
  { id: "session-v2-q5", screen: "Session", question: "Q5. Панель разбора открывается сама, когда разбор готов, и закрывается, когда начинается следующий вопрос; F — показать/скрыть", chosen: "да" },
  { id: "home-o3", screen: "Home", question: "Вставленная вакансия никогда не сохраняется молча: Майк говорит, что сохранил её, и предлагает «Edit details»", chosen: "да" },
  { id: "home-o4", screen: "Home", question: "Убрать выбор числа вопросов и переключатель режима ответа", chosen: "да" },
  { id: "home-o7", screen: "Home", question: "Статус движка — в левом меню, без чипа модели в поле ввода", chosen: "да" },
  { id: "home-rail", screen: "Home", question: "В левом меню список «Recent» (3 сессии + All history), как в ChatGPT", chosen: "да", alt: "только разделы, без списка" },
  { id: "session-d49-presence", screen: "Session", question: "D49. Вместо шара — свечение вдоль верхнего края сцены: пока Майк говорит, волны идут по всей ширине (центр и края) за его голосом; пока говорите вы — спокойнее, за микрофоном; «думает» — одна широкая волна из стороны в сторону (2,8 с на проход)", chosen: "да" },
  { id: "session-d49-dots", screen: "Session", question: "D49. Ваш точечный паттерн виден только внутри свечения и в его цвете; цвет — синяя палитра (blue.700 → blue.400), медленно перетекает", chosen: "да" },
  { id: "session-d49-idle", screen: "Session", question: "🟡 Когда никто не говорит (ваш ход, пауза, связь прервана) — свечения нет совсем, оно гаснет за 0,42 с; состояние говорит подпись", chosen: "да", alt: "еле заметное свечение в покое" },
  { id: "session-d49-scope", screen: "Session", question: "🟡 Свечение — только в Session (не на Home и не в разборе)", chosen: "да" },
  { id: "session-d49-turn", screen: "Session", question: "🟡 «Ваш ход» до первого слова — без свечения; оно появляется, как только микрофон слышит голос", chosen: "да", alt: "слабое свечение-приглашение" },
  { id: "session-d49-transcript", screen: "Session", question: "D49. По центру — весь диалог: новое внизу, вопросы с заголовком «Question N», уточнения с меткой Follow-up; ваш ответ, пока вы говорите, — последний, с тонкой синей рамкой", chosen: "да" },
  { id: "session-d49-follow", screen: "Session", question: "🟡 Диалог сам прокручивается к новому, пока вы внизу; если пролистали вверх — не дёргаем, показываем «Jump to latest»", chosen: "да" },
  { id: "session-d49-level", screen: "Session", question: "🟡 Громкость голоса Майка для свечения пока не подключена: до этапа 12d свечение идёт по ритму речи, а не по реальному звуку", chosen: "да, подключить на 12d" },
  { id: "session-o4", screen: "Session", question: "Индикатор микрофона — тонкое синее кольцо вместо сплошного диска", chosen: "да" },
  { id: "session-o5", screen: "Session", question: "Одна подпись состояния — над островком (шара больше нет; свечение декоративное, состояние всегда текстом)", chosen: "да" },
  { id: "session-o6", screen: "Session", question: "«Связь прервалась» — внутри сцены, а не модальным окном", chosen: "да" },
  { id: "session-o8", screen: "Session", question: "Подсказчик ответа выключен по умолчанию", chosen: "да" },
  { id: "session-o9", screen: "Session", question: "Разговорная практика заканчивается только кнопкой «End practice»", chosen: "да" },
  { id: "debrief-o2", screen: "Debrief", question: "Время начала каждого вопроса в разборе (нужно сохранять при записи)", chosen: "да" },
  { id: "debrief-o3", screen: "Debrief", question: "Вердикт — только если ответов не меньше 3", chosen: "да" },
  { id: "debrief-o5", screen: "Debrief", question: "Ошибка сохранения: «Download debrief» — единственная главная кнопка", chosen: "да" },
  { id: "all-375", screen: "Все", question: "Мобильные рамки 375 для всех экранов (в PRD мобайл — Won't)", chosen: "да, простая раскладка в столбик" },
  { id: "ds-radius", screen: "ДС", question: "Скругление карточек 10 px", chosen: "да", alt: "16 px, как было" },
  { id: "ds-touch", screen: "ДС", question: "На сенсорных экранах зона нажатия 44 px без изменения размера кнопки", chosen: "да" },
  { id: "ds-rail", screen: "ДС", question: "Уже 1024 px — верхняя панель + выезжающее меню, без узкой панели иконок", chosen: "да" },
  { id: "ds-danger", screen: "ДС", question: "Красная кнопка — только для удаления навсегда; «Move to Trash» нейтральная", chosen: "да" },
];
