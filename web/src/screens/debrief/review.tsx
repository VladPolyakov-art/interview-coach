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
    state("interview-full", "Interview · S2 Kestrel Pay, выбран ответ Q2", "interviewFull", {
      tall: true,
      dark: true,
      note: "D80: чат открывается сразу на разговоре. Вердикт — свёрнутая плашка сверху: «Verdict · Getting there» и маленькая шкала; по клику — итог, шкала, что подтянуть и кнопки. Ниже разговор: слева весь чат, справа разбор выбранного ответа (D71). В шапке нет «назад в History»: все чаты в сайдбаре.",
    }),
    state("verdict-open", "Interview · вердикт раскрыт", "interviewVerdictOpen", {
      tall: true,
      note: "D80: плашка вердикта раскрыта: итог одной фразой, шкала Not ready → Getting there → Ready, «What to fix first» по слоям, Drill / Practise again. Ещё клик — сворачивается.",
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
      note: "12d: в чистой сессии нет фраз для повторения — внизу просто «Practise again», без строки «uses these 0 phrases».",
    }),
    state("example", "Example · Sam Rivera, Brightline", "exampleContentFirst", {
      tall: true,
      note: "Выдуманный пример с баннером Example; Q3 открыт. Для нового пользователя — путь «Start your first interview».",
    }),
    state("partial", "Partial · 2 из 5 ответов", "partial", {
      tall: true,
      note: "Меньше 3 ответов: вердикта и слабых мест нет, есть Callout и «Practise again». Q2 набран текстом: «You typed», в Delivery только длина.",
    }),
    state("loading", "Loading", "loading", { note: "Скелеты заголовка, вердикта, карточек слабых мест и вопросов; aria-busy." }),
    state("preparing", "Preparing · пишем разбор", "preparing", { note: "Сразу после сессии: шиммер «Writing your debrief…» над скелетом." }),
    state("storage", "Storage not writable", "storageNotWritable", {
      note: "Сначала предупреждение, Download — главная кнопка, Drill уходит во вторичные; в мете «Not saved».",
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
    state("overflow", "Overflow +30%", "longText", {
      tall: true,
      note: "Длинное название (2–3 строки), тексты +30%, ответ режется на 6 строках, одна карточка «Feedback wasn't available».",
    }),
  ],
};
