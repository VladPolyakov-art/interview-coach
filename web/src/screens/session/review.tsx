/* Session on the review page (stage 11, v2): the states of ds/screens/session.md §4 with the v2 island (§V2) as static
 * SessionView fixtures, rendered the way the real route does it (the Session route sits outside the shell).
 * Fixture: docs/ia.md §6, Alex Morgan · Kestrel Pay · Senior Product Designer. All states: Storybook. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { fixtureProps, type FixtureOptions } from "./fixtures";
import { SessionPreview } from "./SessionPreview";
import type { SessionViewProps } from "./types";

const show = (opts: FixtureOptions, extra: Partial<SessionViewProps> = {}) => () => <SessionPreview {...fixtureProps(opts)} {...extra} />;
/** A fixture with its live data patched (12d states: interrupted variants, both banners). */
const patch = (opts: FixtureOptions, fn: (p: SessionViewProps) => SessionViewProps) => () => <SessionPreview {...fn(fixtureProps(opts))} />;
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
    note: "Меню «…» на широком экране нет. Инструменты — иконками: Redo, Type, лампочка «пример ответа» (подсказчик), Feedback; у End — «?»: горячие клавиши и помощь с микрофоном. Вакансия и раунд — в подсказке при наведении на «Question 1 of 5». На телефоне меню «…» остаётся (места нет).",
    render: show({ scene: "q1-start" }, { suggester: "on" }),
  },
  {
    id: "s1-more", label: "D62 · Вариант B: те же иконки, остальное в More",
    note: "Лампочка и Feedback — иконками, как в A; горячие клавиши, помощь с микрофоном и контекст (вакансия, раунд) — в меню «…».",
    render: show({ scene: "q1-start" }, { suggester: "on", tools: "menu", initialOverlay: "more" }), mobile: false,
  },
  {
    id: "s1-panel", label: "D62 · Разбор открыт до первого ответа",
    note: "Кнопка Feedback работает всегда. Пока разбора нет, панель говорит, что появится здесь; во время ответа — «Still in progress…».",
    render: show({ scene: "q1-start" }, { panelOpen: true }),
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
    id: "s1-tips-text", label: "S1 · Подсказки первого раза (текст): где откроется разбор",
    note: "D96: во время звонка разбора нет — подсказка одна на все раскладки: «Feedback comes after the call, so Mike stays fast.» (английский: «Corrections come after the call…»). Раньше слова следовали за раскладкой («on the right», «slides in…»).",
    render: show({ scene: "q1-start" }, { input: "text" }),
  },
  {
    id: "s5a", label: "S5a · Разбор готов: панель открылась сама", dark: true,
    note: "D96: так панель выглядит только у возобновлённого звонка, где разбор уже сохранён; в живом звонке разбора нет (панель говорит «Feedback comes after the call»). На широком экране панель плавает справа, без затемнения; сцена сдвинулась влево, чтобы остаться по центру свободного места. Основная кнопка «Next question» — в островке, в подвале панели она вторичная (одна основная на экран, 🟡). Скрыть — X, F или Esc.",
    render: show({ scene: "feedback" }),
  },
  {
    id: "s5-hidden", label: "S5 · Разбор готов, панель скрыта пользователем", dark: true,
    note: "Никто не говорит — свечения нет (🟡 D49: в покое без свечения). Кнопка Feedback не нажата; Next question остаётся в островке.",
    render: show({ scene: "feedback" }, { panelOpen: false }),
  },
  {
    id: "s5-unread", label: "S5 · Разбор готов, панель закрыта: точка на кнопке Feedback (13, QA-01)", dark: true,
    note: "D96: во время живого звонка точка не загорается (разбор делается после звонка); состояние остаётся для возобновлённых сессий. 13 (QA-01): на среднем экране и на телефоне панель сама сцену не закрывает — о готовом разборе говорит точка на кнопке Feedback (имя кнопки: «Show feedback (F), new feedback is ready»). Нажали — панель открылась, точка погасла. На широком экране панель открывается сама; точка там только если пользователь закрыл панель сам, а пришёл новый разбор. 🟡 Закрытие вручную держится, пока пользователь сам не откроет панель.",
    render: show({ scene: "feedback" }, { panelOpen: false, feedbackUnread: true }),
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
  { id: "s5e", label: "S5e · Edit what I said: перепроверка не удалась", note: "12d (Q3): редактор открыт снова с вашим текстом и ошибкой; старый ответ не изменился.", render: show({ scene: "edit-failed" }) },
  { id: "s5f", label: "S5f · Проверяем исправленный ответ", note: "12d (Q3): панель остаётся открытой, скелет «Checking question N again…»; потом приходит новый разбор.", render: show({ scene: "rechecking" }) },
  {
    id: "s6", label: "S6 · Текстовый режим: островок превращается в поле ввода",
    note: "Сверху поле «Type your answer» без своей рамки (Composer surface none), под линией — та же строка управления без микрофона. D64: «Switch to voice» активна — голос и текст переключаются в одной сессии в обе стороны.",
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
  { id: "s7", label: "S7 · Drill: вопрос 1 из 3", note: "«Question 1 of 3»; фокус дрилла (бейджи) — в подсказке у «Question 1 of 3».", render: show({ scene: "drill" }) },
  {
    id: "s8", label: "S8 · English: ход 4",
    note: "«Turn 4» вместо «2 of 5», после хода — снова «Talk now»: Next question нет, разговор идёт дальше. End practice. Уровень B2 — в подсказке у статуса.",
    render: show({ scene: "english", withChecks: false }),
  },
  { id: "s9", label: "S9 · Подключение", note: "Пилюля «Connecting to Mike…» занимает весь островок, остаётся только End.", render: show({ scene: "connecting" }) },
  {
    id: "s10a", label: "S10a · Сессия прервана: ИИ-модель перестала отвечать",
    note: "Шара больше нет: блок с ошибкой — в конце транскрипта, статус «Paused» — над островком. Панель с разбором остаётся открытой. Resume выключена, пока движок не вернётся.",
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
  { id: "s14a", label: "S14a · Готовим разбор (P2)", note: "В слоте — «Preparing feedback», панель открыта и показывает ожидание.", render: show({ scene: "preparing" }) },
  { id: "s14b", label: "S14b · Разбор недоступен (P4)", render: show({ scene: "unavailable" }) },
  {
    id: "s14e", label: "S14e · Не получилось проверить слои: Content и Language",
    note: "12d (US-15 AC5): слой, который движок не смог сделать, говорит «Not available for this answer.» и «n/a» в сводке, а не «Nothing to fix» и «Good». Delivery считается локально и остаётся.",
    render: show({ scene: "layers-unavailable" }),
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
