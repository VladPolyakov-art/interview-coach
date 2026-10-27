/* Debrief on the review page (stage 11): the states of ds/screens/debrief.md §5 as static scenes (MemoryRouter +
 * AppShellView + DebriefView). Fixture: docs/ia.md §6. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { DebriefScene, type DebriefSceneId } from "./frames";

const state = (id: string, label: string, scene: DebriefSceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: () => <DebriefScene id={scene} />, ...extra,
});

export const debriefReview: ReviewScreen = {
  id: "debrief",
  title: "Debrief",
  note: "Разбор сессии как конспект: вердикт, что подтянуть (по слою), вопросы по порядку. Слои — только оттенки; правки — внутри вашей фразы, не красным и не зелёным.",
  states: [
    state("interview-conversation", "Interview · S2 Kestrel Pay, чат (по умолчанию)", "interviewConversation", {
      tall: true,
      dark: true,
      note: "Сохранённая сессия открывается на чате: он занимает всю ширину основной области (реплики Mike слева, ваши справа в пузырях, строка читаемой длины). Под названием: переключатель «Conversation | Debrief» и одна кнопка «Practise again»; сверху чата (прилипает при прокрутке) — переход между вопросами 1–5. Сессия без разбора (слишком короткая) — только чат, без переключателя.",
    }),
    state("interview-full", "Interview · вкладка Debrief, выбран ответ Q2", "interviewFull", {
      tall: true,
      dark: true,
      note: "Вкладка Debrief (`?view=debrief`, туда ведёт тост «Debrief ready»), вариант D (2026-10-27): вердикт и «Your level» блоками, один итоговый балл «3.3/5 · Average of 7 skills» (по наведению слева открываются семь навыков), план с единственной главной кнопкой Drill, липкий переключатель вопросов, один вопрос за раз: слева ваш ответ, справа один список Feedback. Практика — одна кнопка под названием.",
    }),
    state("verdict-open", "Interview · Debrief, вердикт и план", "interviewVerdictOpen", {
      tall: true,
      note: "Сверху вниз: итог (имя шага и одна фраза модели), «Your level» (Not ready yet › Getting there › Ready, по ячейке на навык, «To reach …»), балл справа — по наведению или фокусу слева открывается карточка навыков (слабые первыми, «3/5», ссылки на вопросы с потерянными баллами, «Not asked this time»); «Your plan for the next session» (до 3 строк + Drill); переключатель вопросов. Ширина контента — как у шапки.",
    }),
    state("question-4", "Interview · открыт по ссылке ?q=4", "interviewQ4", {
      tall: true,
      note: "Просмотрщик стартует на вопросе 4: адрес хранит номер (`?q=4`), перезагрузка и ссылка открывают тот же вопрос. Слабое место показано на первом вопросе из его доказательств (What you said / How it lands / How to fix).",
    }),
    state("ten-questions", "Interview · 10 вопросов", "interviewTen", {
      note: "Максимум сервера: подписи не помещаются, переключатель показывает только номера со стрелками ‹ ›. Всегда одна строка.",
    }),
    state("twelve-questions", "Interview · 12 вопросов", "interviewTwelve", {
      note: "Больше максимума (деградация): номера, на 375 прокручиваются вбок с затуханием у края; выбранный остаётся в видимой части.",
    }),
    state("scorecard-null", "Interview · навыки «Not asked this time»", "interviewNullRows", {
      mobile: false,
      note: "D98 r2: навыки без оценки не показываются строками в карточке навыков; одна строка «Not asked this time: Lessons learned, Delivery». Уровень считается по тем, что оценены.",
    }),
    state("no-step", "Interview · вердикт без шага", "interviewNoStep", {
      mobile: false,
      note: "Разбор, записанный до появления шагов: уровень выводится из оценок по тому же правилу, заголовок остаётся фразой модели. Нет ни одной оценки — нет блока уровня и итогового балла.",
    }),
    state("no-plan", "Interview · старый разбор без плана", "interviewNoPlan", {
      mobile: false,
      note: "D98: сессия, сохранённая до D98, не получает scorecard и plan: без балла и без «Lost points on», слабые места стоят в блоке «What to work on» вместо плана, Drill в нём же.",
    }),
    state("interview-delivery-first", "Interview · delivery first", "interviewDeliveryFirst", {
      mobile: false,
      note: "Порядок слоёв из настроек: те же данные, слои и слабые места идут Delivery → Language → Content.",
    }),
    state("english", "English · S3", "english", {
      tall: true,
      dark: true,
      note: "Только язык: Summary, исправления по порядку с «Turn n · mm:ss», «Show 2 more», Phrases to review.",
    }),
    state("english-no-phrases", "English · нечего повторять", "englishNoPhrases", {
      note: "12d: в чистой сессии нет фраз для повторения — под названием просто «Practise again», без подсказки «uses these 0 phrases».",
    }),
    state("english-no-corrections", "English · без исправлений", "englishNoCorrections", {
      note: "13, F-13-7: нет исправлений — вместо пустого заголовка «Corrections» одна строка «No corrections this time.».",
    }),
    state("english-typed", "English · набрано текстом", "englishTyped", {
      note: "13, QA-14: у строк «You typed», а подзаголовок Corrections не объясняет «Heard as».",
    }),
    state("example", "Example · Sam Rivera, Brightline", "exampleContentFirst", {
      tall: true,
      note: "Выдуманный пример с баннером Example; Q3 открыт. Для нового пользователя — путь «Start your first interview».",
    }),
    state("partial", "Partial · 2 из 5 ответов", "partial", {
      tall: true,
      note: "Меньше 3 ответов: вердикта и слабых мест нет, есть Callout; «Practise again» под названием (основная кнопка: другого действия нет). Q2 набран текстом: «You typed», в Delivery только длина.",
    }),
    state("loading", "Loading", "loading", { note: "Скелеты заголовка, вердикта, карточек слабых мест и вопросов; aria-busy." }),
    state("preparing", "Preparing · пишем разбор", "preparing", { note: "Сразу после сессии: шиммер «Writing your debrief…» над скелетом." }),
    state("preparing-feedback", "Preparing · фидбек после звонка", "preparingFeedback", { note: "D96: фидбек делается после End, по ответу. Шиммер «Preparing feedback · 2 of 5 answers», под ним строка «You can leave this page…» и скелет. Страница сама перезапрашивает запись, пока на ней есть post_call." }),
    state("storage", "Storage not writable", "storageNotWritable", {
      note: "Сначала предупреждение, Download — главная кнопка, Drill и «Practise again» уходят во вторичные; в мете «Not saved». Открыта вкладка Debrief.",
    }),
    state("rename", "Rename in place", "interviewRename", { mobile: false, note: "H1 → InlineRename (35 / 80), Enter сохраняет, Esc отменяет." }),
    state("recheck", "Recheck · «Not what you said?»", "interviewRecheck", {
      mobile: false,
      note: "Поле «What you actually said» под строкой Language; перепроверяется только этот вопрос.",
    }),
    state("edited", "After recheck · «Edited by you»", "interviewEdited", {
      mobile: false,
      note: "12d (Q3): сервер подставил исправленный текст, пересчитал разбор этого ответа и сохранил сессию; у ответа — бейдж «Edited by you».",
    }),
    state("recheck-failed", "Recheck failed", "interviewRecheckFailed", {
      mobile: false,
      note: "12d (Q3): «Couldn't check that answer again. It was not changed.» с причиной; редактор открывается снова с вашим текстом.",
    }),
    state("not-found", "Not found", "notFound", { mobile: false, note: "Сессии нет (удалена из Trash или ссылка неверна)." }),
    state("error", "Error", "error", { mobile: false, note: "Файл сессии не открылся: Try again / Open Archive." }),
    state("overflow-chat", "Overflow · чат", "longTextConversation", {
      tall: true,
      note: "Тот же стресс-фикстур на вкладке Conversation: длинное название, длинный токен в реплике; по горизонтали ничего не уезжает.",
    }),
    state("overflow", "Overflow +30%", "longText", {
      tall: true,
      note: "Длинное название (2–3 строки), тексты +30%, ответ режется на 6 строках, одна карточка «Feedback wasn't available».",
    }),
  ],
};
