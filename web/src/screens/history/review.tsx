/* History on the review page (stage 11): the states of ds/screens/debrief.md §4 as static scenes. Fixture: docs/ia.md §6. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { HistoryScene, type HistorySceneId } from "./frames";

const state = (id: string, label: string, scene: HistorySceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: () => <HistoryScene id={scene} />, ...extra,
});

export const historyReview: ReviewScreen = {
  id: "history",
  title: "History",
  note: "Сохранённые сессии по неделям с фильтром All / Interview / English. Ряд целиком — ссылка на разбор; переименование и Trash — справа.",
  states: [
    state("data", "Data · S1–S3", "data", {
      dark: true,
      note: "Три сессии в двух группах. Результат — обычным текстом, без цвета. Действия появляются при наведении; на узком — одна кнопка «more».",
    }),
    state("renaming", "Renaming", "renaming", { mobile: false, note: "Ряд Lumen → InlineRename со счётчиком 35 / 80." }),
    state("row-menu", "Row menu (narrow)", "menuOpen", { desktop: false, note: "375 px: меню ряда — Rename, Move to Trash." }),
    state("overflow", "Overflow +30%", "overflow", { note: "Семь рядов: длинные названия обрезаются с тултипом, результат «No verdict — 2 of 5 answered»." }),
    state("filtered-empty", "Filtered empty · English", "filteredEmpty", { note: "?track=english без английских сессий: подсказка и «Start English practice»." }),
    state("empty", "Empty", "empty", { note: "Нет сессий: фильтры скрыты, «Start a session» и пример разбора." }),
    state("loading", "Loading", "loading", { note: "Чипы фильтра выключены, четыре скелета рядов, aria-busy." }),
    state("error", "Error", "error", { note: "Не прочитали папку с данными: Try again и «Open storage settings»." }),
    state("toast", "After Move to Trash", "toast", { mobile: false, note: "Ряд ушёл, тост «Moved to Trash. Undo» (не зелёная плашка). Trash (2)." }),
    state("failed", "Action failed", "failed", { mobile: false, note: "Переименование не сохранилось: ошибка над списком, старое название вернулось." }),
  ],
};
