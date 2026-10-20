/* Session on the review page (stage 11): every state of ds/screens/session.md §4 as a static SessionView fixture,
 * rendered the way the real route does it (the Session route sits outside the shell, so no AppShell here).
 * Fixture: docs/ia.md §6, Alex Morgan · Kestrel Pay · Senior Product Designer. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { fixtureProps, type FixtureOptions } from "./fixtures";
import { SessionPreview } from "./SessionPreview";

const show = (opts: FixtureOptions) => () => <SessionPreview {...fixtureProps(opts)} />;

const states: ReviewState[] = [
  {
    id: "s1", label: "S1 · Вопрос 1: Mike говорит, подсказки «первый раз»",
    note: "Панель пуста (P0), в доке «Interrupt», подсказки статичны. Орб без движения от нашего голоса.",
    render: show({ scene: "q1-start" }),
  },
  {
    id: "s2", label: "S2 · Mike задаёт уточняющий вопрос (орб отзывается на голос Mike)", dark: true,
    note: "Фиксированный уровень голоса 0.5: диск чуть «дышит» в такт. Основной вопрос серый, следом идёт Follow-up. Панель P1.",
    render: show({ scene: "follow-up" }),
  },
  {
    id: "s3", label: "S3 · Вы говорите: тихий режим, кольцо микрофона", dark: true,
    note: "data-motion-quiet: ничего не движется, кольцо «открытого уха» на орбе статично, уровень 0.6 только в кольце кнопки микрофона. Серые слова — ещё не распознаны.",
    render: show({ scene: "listening" }),
  },
  {
    id: "s4", label: "S4 · Mike думает", note: "Три серые точки на месте будущего ответа; подпись под орбом — «Thinking».",
    render: show({ scene: "thinking" }),
  },
  {
    id: "s5a", label: "S5a · Разбор после ответа: content first, с проверкой «may be misheard»", dark: true,
    note: "Три слоя в монохроме: левая линия + иконка + название. Серая карточка с пунктиром — слово, которое мы могли неверно расслышать; не считается, пока вы не подтвердите.",
    render: show({ scene: "feedback" }),
  },
  {
    id: "s5b", label: "S5b · Тот же разбор, delivery first (порядок слоёв из настроек)", mobile: false,
    render: show({ scene: "feedback", layerOrder: "delivery-first" }),
  },
  {
    id: "s5c", label: "S5c · «That's not what I said»: поле «What did you say?»",
    note: "Фраза уже снята со счёта; поле необязательное. Слово «figure file» в строке удалённых — Undo.",
    render: show({ scene: "that-not-said" }),
  },
  {
    id: "s5d", label: "S5d · Edit what I said", note: "Исправить только своё слово; перепроверяется один ответ. Next question становится вторичной кнопкой.",
    render: show({ scene: "edit" }),
  },
  {
    id: "s6", label: "S6 · Текстовый режим: транскрипт + композер, «You typed»",
    note: "Подсказка о нераспознанных словах и проверки скрыты, в Delivery только длина.",
    render: show({ scene: "text", withChecks: false }),
  },
  { id: "s7", label: "S7 · Drill: вопрос 1 из 3", render: show({ scene: "drill" }) },
  { id: "s8", label: "S8 · English: ход 4, только язык", note: "Нет Next question: после разбора разговор идёт дальше. Бейдж уровня B1 только здесь.", render: show({ scene: "english", withChecks: false }) },
  { id: "s9", label: "S9 · Подключение", render: show({ scene: "connecting" }) },
  {
    id: "s10a", label: "S10a · Сессия прервана: ИИ-модель перестала отвечать",
    note: "Внутри сцены, панель с разбором остаётся читаемой. Resume выключена, пока движок не вернётся; «Continue in text» намеренно нет.",
    render: show({ scene: "interrupted-engine" }),
  },
  { id: "s10b", label: "S10b · Сессия прервана: пропал голосовой канал", render: show({ scene: "interrupted-voice" }) },
  { id: "s11", label: "S11 · Mic help: микрофон заблокирован", render: show({ scene: "mic-help" }) },
  { id: "s12a", label: "S12a · StorageNotWritable между вопросами", render: show({ scene: "storage" }) },
  { id: "s12b", label: "S12b · BrowserBanner: браузер не распознаёт речь", render: show({ scene: "browser" }) },
  {
    id: "s13", label: "S13 · Переполнение +30%: длинный заголовок и вопрос, 3 фразы и проверка",
    note: "Заголовок с многоточием и тултипом, третья фраза схлопывается в «1 more phrasing not shown», проверка не схлопывается.",
    render: show({ scene: "overflow" }),
  },
  { id: "s14a", label: "S14a · Готовим разбор (P2)", render: show({ scene: "preparing" }) },
  { id: "s14b", label: "S14b · Разбор недоступен (P4)", render: show({ scene: "unavailable" }) },
  { id: "s14c", label: "S14c · Микрофон выключен", render: show({ scene: "muted" }) },
  { id: "s14d", label: "S14d · Подсказчик ответа включён (US-58)", render: show({ scene: "suggester" }) },
];

export const sessionReview: ReviewScreen = {
  id: "session",
  title: "Session",
  note: "Живая сессия: Mike на сцене слева, разбор по вопросу справа (на узком экране шторка снизу). Орб — концепт «голос ведёт», один текст состояния под ним.",
  states,
};
