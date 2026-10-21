/* Session on the review page (stage 11, v2): the states of ds/screens/session.md §4 with the v2 island (§V2) as static
 * SessionView fixtures, rendered the way the real route does it (the Session route sits outside the shell).
 * Fixture: docs/ia.md §6, Alex Morgan · Kestrel Pay · Senior Product Designer. All states: Storybook. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { fixtureProps, type FixtureOptions } from "./fixtures";
import { SessionPreview } from "./SessionPreview";
import type { SessionViewProps } from "./types";

const show = (opts: FixtureOptions, extra: Partial<SessionViewProps> = {}) => () => <SessionPreview {...fixtureProps(opts)} {...extra} />;

const states: ReviewState[] = [
  {
    id: "s1", label: "S1 · Вопрос 1: Майк говорит, подсказки «первый раз»", dark: true,
    note: "D49: пока Майк говорит, вдоль верхнего края — свечение с точечным паттерном; волны по центру и по бокам следуют за голосом. В центре — транскрипт разговора, новые слова Майка проявляются. Статус — одна строка над островком. Управление — в «островке» внизу (D47c).",
    render: show({ scene: "q1-start" }),
  },
  {
    id: "s1-more", label: "S1 · Меню More: контекст и настройки",
    note: "Сюда ушло то, что было в верхней панели: название вакансии и «Behavioural · Standard» в шапке меню. Дальше — «Keyboard shortcuts» (?), «Microphone help».",
    render: show({ scene: "q1-start" }, { initialOverlay: "more" }), mobile: false,
  },
  {
    id: "s2", label: "S2 · Майк задаёт уточняющий вопрос", dark: true,
    note: "Весь диалог в транскрипте: «Question 1», «Question 2», уточняющий вопрос — с бейджем Follow-up. Панель разбора закрылась сама, когда Майк заговорил; по Feedback (или F) — разбор прошлого ответа.",
    render: show({ scene: "follow-up" }),
  },
  {
    id: "s3", label: "S3 · Вы говорите: тихий режим", dark: true,
    note: "D49: свечение отвечает на ваш голос — спокойнее, чем у Майка (уровень микрофона сглажен ~0,45 с). Ваш ответ — последний пузырь с тонкой синей обводкой; ещё не распознанные слова серые. Остальное во время ответа не двигается.",
    render: show({ scene: "listening" }),
  },
  {
    id: "s4", label: "S4 · Майк думает", dark: true,
    note: "D49: одна широкая волна ходит из стороны в сторону (2,8 с на проход), не шарик. D55: индикатор один — свечение сверху плюс одна подпись «Thinking» над островком; точек в транскрипте и в островке больше нет.",
    render: show({ scene: "thinking" }),
  },
  {
    id: "s5a", label: "S5a · Разбор готов: панель открылась сама", dark: true,
    note: "На широком экране панель плавает справа, без затемнения; сцена сдвинулась влево, чтобы остаться по центру свободного места. Основная кнопка «Next question» — в островке, в подвале панели она вторичная (одна основная на экран, 🟡). Скрыть — X, F или Esc.",
    render: show({ scene: "feedback" }),
  },
  {
    id: "s5-hidden", label: "S5 · Разбор готов, панель скрыта пользователем", dark: true,
    note: "Никто не говорит — свечения нет (🟡 D49: в покое без свечения). Кнопка Feedback не нажата; Next question остаётся в островке.",
    render: show({ scene: "feedback" }, { panelOpen: false }),
  },
  {
    id: "s5b", label: "S5b · Тот же разбор, delivery first (порядок слоёв из настроек)", mobile: false,
    render: show({ scene: "feedback", layerOrder: "delivery-first" }),
  },
  {
    id: "s5c", label: "S5c · «That's not what I said»: поле «What did you say?»",
    note: "Фраза уже снята со счёта; поле необязательное. Фокус остаётся в панели.",
    render: show({ scene: "that-not-said" }),
  },
  {
    id: "s5d", label: "S5d · Edit what I said",
    note: "Исправить только своё слово; перепроверяется один ответ. «Next question» в островке становится вторичной.",
    render: show({ scene: "edit" }),
  },
  {
    id: "s6", label: "S6 · Текстовый режим: островок превращается в поле ввода",
    note: "Сверху поле «Type your answer» без своей рамки (Composer surface none), под линией — та же строка управления без микрофона. «Switch to voice» неактивна: сессию, начатую текстом, нельзя переключить на голос (ограничение движка).",
    render: show({ scene: "text", withChecks: false }),
  },
  {
    id: "s6-answer", label: "S6 · Текстовый режим: ваш ход, вы печатаете ответ",
    note: "Пока вы пишете, в строке управления нет главной кнопки: отправка — стрелкой в поле или Enter. Разбор открывается кнопкой Feedback.",
    render: show({ scene: "text", withChecks: false }, { phase: "your-turn" }),
  },
  {
    id: "s2-turn", label: "S2 · Ваш ход (голос): слабое свечение-приглашение", dark: true,
    note: "D50: пока вы не заговорили — тихое, медленное свечение (~35%): «ваша очередь». Как только микрофон слышит голос — свечение оживает (S3). Без микрофона — свечения нет. Подпись над островком всегда говорит состояние.",
    render: show({ scene: "follow-up" }, { phase: "your-turn" }),
  },
  {
    id: "s2-reading", label: "S2 · Вы листаете транскрипт вверх: «Jump to latest»",
    note: "Пока вы читаете выше, новые реплики не сдвигают текст; кнопка «Jump to latest» над островком возвращает к последней строке. Внизу — снова автопрокрутка.",
    render: show({ scene: "feedback" }, { initialFollow: "reading", panelOpen: false }),
  },
  {
    id: "s1-reduced", label: "S1/S3/S4 · Reduced motion: неподвижные кадры", mobile: false,
    note: "При «уменьшить движение» — один неподвижный кадр на состояние: говорит — волны подняты; слушает — центр и бока чуть приподняты; думает — гребень стоит у левого края.",
    render: show({ scene: "thinking" }, { reducedMotion: true }),
  },
  { id: "s7", label: "S7 · Drill: вопрос 1 из 3", note: "«1 of 3»; фокус дрилла (бейджи) — в шапке меню More.", render: show({ scene: "drill" }) },
  {
    id: "s8", label: "S8 · English: ход 4",
    note: "«Turn 4» вместо «2 of 5», после хода — снова «Talk now»: Next question нет, разговор идёт дальше. End practice. Уровень B2 — в шапке More.",
    render: show({ scene: "english", withChecks: false }),
  },
  { id: "s9", label: "S9 · Подключение", note: "Пилюля «Connecting to Mike…» занимает весь островок, остаётся только End.", render: show({ scene: "connecting" }) },
  {
    id: "s10a", label: "S10a · Сессия прервана: ИИ-модель перестала отвечать",
    note: "Шара больше нет: блок с ошибкой — в конце транскрипта, статус «Paused» — над островком. Панель с разбором остаётся открытой. Resume выключена, пока движок не вернётся.",
    render: show({ scene: "interrupted-engine" }),
  },
  { id: "s10b", label: "S10b · Сессия прервана: пропал голосовой канал", note: "Микрофон неактивен, «Type instead» работает (продолжить текстом).", render: show({ scene: "interrupted-voice" }) },
  { id: "s11", label: "S11 · Mic help: микрофон заблокирован", render: show({ scene: "mic-help" }) },
  { id: "s12a", label: "S12a · StorageNotWritable между вопросами", render: show({ scene: "storage" }) },
  { id: "s12b", label: "S12b · Браузер не распознаёт речь", note: "Микрофон неактивен с причиной; в More — «Switch to voice» неактивная с пояснением.", render: show({ scene: "browser" }) },
  {
    id: "s13", label: "S13 · Переполнение +30%: длинный заголовок, вопрос, таймер больше часа",
    note: "Таймер «1:02:14» помещается в свой слот, островок не расширяется. Длинное название — только в шапке More (2 строки + подсказка).",
    render: show({ scene: "overflow" }),
  },
  { id: "s14a", label: "S14a · Готовим разбор (P2)", note: "В слоте — «Preparing feedback», панель открыта и показывает ожидание.", render: show({ scene: "preparing" }) },
  { id: "s14b", label: "S14b · Разбор недоступен (P4)", render: show({ scene: "unavailable" }) },
  { id: "s14c", label: "S14c · Микрофон выключен", note: "Кнопка микрофона перечёркнута, «Talk now» неактивна до включения (M).", render: show({ scene: "muted" }) },
  {
    id: "s14d", label: "S14d · Подсказчик ответа включён (US-58)",
    note: "Карточка с примером ответа — на сцене; переключатель «Show a sample answer» перенесён в меню More (чекбокс).",
    render: show({ scene: "suggester" }, { initialOverlay: "more" }),
  },
  {
    id: "shortcuts", label: "Горячие клавиши",
    note: "Строка подсказок под доком из v1 переехала сюда: More → Keyboard shortcuts или «?». Новые: F — разбор, N — следующий вопрос, Esc — закрыть панель/меню.",
    render: show({ scene: "feedback" }, { initialOverlay: "shortcuts" }), mobile: false,
  },
];

export const sessionReview: ReviewScreen = {
  id: "session",
  title: "Session",
  note: "v2.1 (D49): в центре — транскрипт всего разговора (новое внизу, автопрокрутка, «Jump to latest»). Шар заменён свечением вдоль верхнего края с точечным паттерном: только пока кто-то говорит или Майк думает. Статус — одна строка над «таблеткой» управления. Разбор — плавающей панелью справа (широкий экран) или шторкой снизу (телефон).",
  states,
};
