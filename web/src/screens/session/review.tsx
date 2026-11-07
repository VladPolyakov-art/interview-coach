/* Session on the review page (stage 11, v2): the states of ds/screens/session.md §4 with the v2 island (§V2) as static
 * SessionView fixtures, rendered the way the real route does it (the Session route sits outside the shell).
 * Fixture: docs/ia.md §6, Alex Morgan · Kestrel Pay · Senior Product Designer. All states: Storybook. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { fixtureProps, type FixtureOptions } from "./fixtures";
import { SessionView } from "./SessionView";
import type { SessionViewProps } from "./types";

const show = (opts: FixtureOptions, extra: Partial<SessionViewProps> = {}) => () => <SessionView {...fixtureProps(opts)} {...extra} />;
/** A fixture with its live data patched (12d states: interrupted variants, both banners). */
const patch = (opts: FixtureOptions, fn: (p: SessionViewProps) => SessionViewProps) => () => <SessionView {...fn(fixtureProps(opts))} />;
const interrupted = (i: NonNullable<SessionViewProps["data"]["interrupted"]>) => (p: SessionViewProps): SessionViewProps =>
  ({ ...p, data: { ...p.data, interrupted: i } });

const states: ReviewState[] = [
  {
    id: "s1", label: "S1 · Вопрос 1: Майк говорит, подсказки «первый раз»", dark: true,
    note: "D49: пока Майк говорит, вдоль верхнего края — свечение с точечным паттерном; волны по центру и по бокам следуют за голосом. В центре — транскрипт разговора, новые слова Майка проявляются. Статус — одна строка над островком. Управление — в «островке» внизу (D47c).",
    render: show({ scene: "q1-start" }),
  },
  {
    id: "s1-open", label: "D62 · Вариант A (по умолчанию): ничего не спрятано",
    note: "Меню «…» на широком экране нет. Инструменты — иконками: Redo, Type, лампочка «пример ответа» (подсказчик); у End — «?»: горячие клавиши и помощь с микрофоном. Вакансия и раунд — в подсказке при наведении на «Question 1 of 5». На телефоне меню «…» остаётся (места нет).",
    render: show({ scene: "q1-start" }, { suggester: "on" }),
  },
  {
    id: "s1-more", label: "D62 · Вариант B: те же иконки, остальное в More",
    note: "Лампочка — иконкой, как в A; горячие клавиши, помощь с микрофоном и контекст (вакансия, раунд) — в меню «…».",
    render: show({ scene: "q1-start" }, { suggester: "on", tools: "menu", initialOverlay: "more" }), mobile: false,
  },
  {
    id: "s2", label: "S2 · Майк задаёт уточняющий вопрос", dark: true,
    note: "Весь диалог в транскрипте: «Question 1», «Question 2», уточняющий вопрос — с бейджем Follow-up.",
    render: show({ scene: "follow-up" }),
  },
  {
    id: "s3", label: "S3 · Вы говорите: тихий режим", dark: true,
    note: "D49: свечение отвечает на ваш голос — спокойнее, чем у Майка (уровень микрофона сглажен ~0,45 с). Ваш ответ — последний пузырь с тонкой синей обводкой; ещё не распознанные слова серые. Остальное во время ответа не двигается.",
    render: show({ scene: "listening" }),
  },
  {
    id: "s3b", label: "S3b · Вы говорите: подсказка свернулась", dark: true,
    note: "D93: точка синяя во всех состояниях, строка — в полупрозрачной капсуле (свечение просвечивает, текст читается за счёт размытия). D92: строка состояния — наверху, в свечении (оно показывает то же состояние), над островком её больше нет — диалог доходит до самого островка. D91: «Listening» — точка и слово, без подложки. «Take your time. Mike waits for N s of quiet.» видна 6 с, потом плавно сворачивается, и диалог забирает её строку. Состояния вроде Muted/Paused не сворачиваются. Диалог начинается в нижней части свечения и растворяется к нему (было: целиком под свечением).",
    render: show({ scene: "listening" }, { hintMs: 1 }),
  },
  {
    id: "s4", label: "S4 · Майк думает", dark: true,
    note: "D49: одна широкая волна ходит из стороны в сторону (2,8 с на проход), не шарик. D55: индикатор один — свечение сверху; точек в транскрипте и в островке больше нет. D92/D93: подпись состояния («Thinking») — вверху, в свечении, в прозрачной капсуле с синей точкой, а не над островком. D61: нажатая кнопка не пропадает — в островке остаётся неактивная «Sent» с галочкой, пока Майк не заговорит (тогда — Interrupt).",
    render: show({ scene: "thinking" }),
  },
  {
    id: "s1-tips-text", label: "S1 · Подсказки первого раза (текст)",
    note: "D96/D107: во время звонка разбора нет и панели нет — подсказка одна на все раскладки: «Feedback comes after the call, so Mike stays fast.» (английский: «Corrections come after the call…»).",
    render: show({ scene: "q1-start" }, { input: "text" }),
  },
  {
    id: "s6", label: "S6 · Текстовый режим: островок превращается в поле ввода",
    note: "Сверху поле «Type your answer» без своей рамки (Composer surface none), под линией — та же строка управления без микрофона. D64: «Switch to voice» активна — голос и текст переключаются в одной сессии в обе стороны.",
    render: show({ scene: "text" }),
  },
  {
    id: "s6-answer", label: "S6 · Текстовый режим: ваш ход, вы печатаете ответ",
    note: "Пока вы пишете, в строке управления нет главной кнопки: отправка — стрелкой в поле или Enter.",
    render: show({ scene: "text" }, { phase: "your-turn" }),
  },
  {
    id: "s2-turn", label: "S2 · Ваш ход (голос): слабое свечение-приглашение", dark: true,
    note: "D50: пока вы не заговорили — тихое, медленное свечение (~35%): «ваша очередь». Как только микрофон слышит голос — свечение оживает (S3). Без микрофона — свечения нет. Подпись над островком всегда говорит состояние.",
    render: show({ scene: "follow-up" }, { phase: "your-turn" }),
  },
  {
    id: "s2-reading", label: "S2 · Вы листаете транскрипт вверх: «Jump to latest»",
    note: "Пока вы читаете выше, новые реплики не сдвигают текст; кнопка «Jump to latest» над островком возвращает к последней строке. Внизу — снова автопрокрутка.",
    render: show({ scene: "answered" }, { initialFollow: "reading" }),
  },
  {
    id: "s1-reduced", label: "S1/S3/S4 · Reduced motion: неподвижные кадры", mobile: false,
    note: "При «уменьшить движение» — один неподвижный кадр на состояние: говорит — волны подняты; слушает — центр и бока чуть приподняты; думает — гребень стоит у левого края.",
    render: show({ scene: "thinking" }, { reducedMotion: true }),
  },
  { id: "s7", label: "S7 · Drill: вопрос 1 из 3", note: "«Question 1 of 3»; фокус дрилла (бейджи) — в подсказке у «Question 1 of 3».", render: show({ scene: "drill" }) },
  {
    id: "s8", label: "S8 · English: ход 4",
    note: "«Turn 4» вместо «2 of 5», после хода — снова «Talk now»: Next question нет, разговор идёт дальше. End practice. Уровень B2 — в подсказке у статуса.",
    render: show({ scene: "english" }),
  },
  { id: "s9", label: "S9 · Подключение", note: "Пилюля «Connecting to Mike…» занимает весь островок, остаётся только End.", render: show({ scene: "connecting" }) },
  {
    id: "s10a", label: "S10a · Сессия прервана: ИИ-модель перестала отвечать",
    note: "Шара больше нет: блок с ошибкой — в конце транскрипта, статус «Paused» — над островком. Resume выключена, пока движок не вернётся.",
    render: show({ scene: "interrupted-engine" }),
  },
  { id: "s10b", label: "S10b · Сессия прервана: пропал голосовой канал", note: "Микрофон неактивен, «Type instead» работает (продолжить текстом).", render: show({ scene: "interrupted-voice" }) },
  { id: "s10c", label: "S10c · Прервано: Claude снова отвечает — Resume", note: "12d (Q1, Q6): текст под движок сессии, Resume включается, когда движок снова готов (опрос раз в 5 с); Майк продолжает с той же истории.", render: patch({ scene: "interrupted-engine" }, interrupted({ engine: "claude_cli", input: "voice", canResume: true })) },
  { id: "s10d", label: "S10d · Прервано: подключаемся снова", note: "12d: Resume открывает новое соединение и продолжает ту же сохранённую сессию (тот же id, ответы и разборы на месте).", render: patch({ scene: "interrupted-voice" }, interrupted({ input: "voice", canResume: true, resuming: true })) },
  { id: "s10e", label: "S10e · Прервано: не получилось продолжить", note: "12d: Resume можно нажать ещё раз; рядом — «Continue in text» и End.", render: patch({ scene: "interrupted-voice" }, interrupted({ input: "voice", canResume: true, failed: "" })) },
  { id: "s10f", label: "S10f · Прервано: Gemini Live — только текстом", note: "12d: голосовую сессию Gemini Live сервер продолжить не может — предлагаем «Continue in text» или End and debrief.", render: patch({ scene: "interrupted-voice" }, interrupted({ engine: "gemini_live", input: "voice", canResume: false })) },
  { id: "s11", label: "S11 · Mic help: микрофон заблокирован", render: show({ scene: "mic-help" }) },
  { id: "s11b", label: "S11b · Mic help открылась сама: микрофон не найден", note: "12d (Q17): при отказе или отсутствии микрофона подсказка открывается сама (US-06 AC2).", render: show({ scene: "mic-help" }, { micHelpReason: "none" } as Partial<SessionViewProps>) },
  { id: "s12a", label: "S12a · StorageNotWritable между вопросами", note: "D61: плашки — прямо над строкой статуса и островком, а не у верхнего края; транскрипт уступает им место, свечение не перекрыто.", render: show({ scene: "storage" }) },
  { id: "s12b", label: "S12b · Браузер не распознаёт речь", note: "Микрофон неактивен с причиной; в More — «Switch to voice» неактивная с пояснением.", render: show({ scene: "browser" }) },
  { id: "s12c", label: "S12c · Обе плашки сразу: хранилище и браузер", note: "12d (Q2): папка с данными не пишется (проверка в /api/health) и браузер не распознаёт речь — плашки стопкой.", render: patch({ scene: "storage" }, (p) => ({ ...p, overlay: "none", banners: { browser: true, storage: true } })) },
  {
    id: "s13", label: "S13 · Переполнение +30%: длинный заголовок, вопрос, таймер больше часа",
    note: "Таймер «1:02:14» помещается в свой слот, островок не расширяется. Длинное название — в подсказке у статуса.",
    render: show({ scene: "overflow" }),
  },
  { id: "s14c", label: "S14c · Микрофон выключен", note: "Кнопка микрофона перечёркнута, «Talk now» неактивна до включения (M).", render: show({ scene: "muted" }) },
  { id: "s14c2", label: "S14c2 · Говорите при выключенном микрофоне", note: "D72: вместо плашки над сценой — тултип над кнопкой микрофона; исчезает при включении (M) или через 6 с.", render: show({ scene: "muted-talking" }) },
  {
    id: "s14d", label: "S14d · Подсказчик ответа включён (US-58)",
    note: "D62: переключатель — лампочка в островке (нажата = пример показан), не в меню «…». Карточка с примером — на сцене. D92: у примера своя заливка — темнее пузырей и подсказок, без рамки.",
    render: show({ scene: "suggester" }),
  },
  {
    id: "shortcuts", label: "Горячие клавиши",
    note: "Строка подсказок под доком из v1 переехала сюда: More → Keyboard shortcuts или «?». Новые: N — следующий вопрос, Esc — закрыть меню.",
    render: show({ scene: "answered" }, { initialOverlay: "shortcuts" }), mobile: false,
  },
];

export const sessionReview: ReviewScreen = {
  id: "session",
  title: "Session",
  note: "v2.1 (D49): в центре — транскрипт всего разговора (новое внизу, автопрокрутка, «Jump to latest»). Шар заменён свечением вдоль верхнего края с точечным паттерном: только пока кто-то говорит или Майк думает. Статус — одна строка над «таблеткой» управления. D107: панели разбора в звонке нет — разбор только после сессии.",
  states,
};
