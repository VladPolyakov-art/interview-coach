/* Defaults taken before the review (ds/screens/_index.md §3). Each row is commentable on the review page. */
export interface Decision { id: string; screen: string; question: string; chosen: string; alt?: string }

export const DECISIONS: Decision[] = [
  { id: "home-o1", screen: "Home", question: "Сохранённые вакансии — внутри поля ввода, а не рядом карточек", chosen: "да", alt: "ряд карточек над полем" },
  { id: "home-o2", screen: "Home", question: "Interview / English — переключатель-пилюля вместо вкладок с подчёркиванием", chosen: "да" },
  { id: "home-o3", screen: "Home", question: "Вставка текста вакансии открывает редактор с заполненными полями; Start с несохранённым текстом предлагает «Save and start»", chosen: "да" },
  { id: "home-o4", screen: "Home", question: "Убрать выбор числа вопросов и переключатель режима ответа", chosen: "да" },
  { id: "home-o5", screen: "Home", question: "Вкладка English — без поля ввода", chosen: "да" },
  { id: "home-o6", screen: "Home", question: "На телефоне кнопка Start прилипает к низу экрана", chosen: "да" },
  { id: "home-o7", screen: "Home", question: "Статус движка — в левом меню, без чипа модели в поле ввода", chosen: "да" },
  { id: "home-rail", screen: "Home", question: "В левом меню список «Recent» (3 сессии + All history), как в ChatGPT", chosen: "да", alt: "только разделы, без списка" },
  { id: "session-o2", screen: "Session", question: "Свой шар: размер следует за голосом Майка, «думает» — медленное дыхание, пока ты говоришь — неподвижен", chosen: "концепт 1", alt: "концепт 2 «круги» / концепт 3 «дуга»" },
  { id: "session-o3", screen: "Session", question: "Градиент шара — по центру, без блика", chosen: "да", alt: "плоский синий" },
  { id: "session-o4", screen: "Session", question: "Индикатор микрофона — тонкое синее кольцо вместо сплошного диска", chosen: "да" },
  { id: "session-o5", screen: "Session", question: "Одна подпись состояния под шаром, в верхней панели — нет", chosen: "да" },
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
  { id: "ds-quiet-send", screen: "ДС", question: "Кнопка отправки в поле на Home — контурная, чтобы главной оставалась одна Start", chosen: "да" },
];
