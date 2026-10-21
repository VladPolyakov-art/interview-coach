/* Archive on the review page (D80; was History, ds/screens/debrief.md §4) as static scenes. Fixture: docs/ia.md §6. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { HistoryScene, TrashScene, type HistorySceneId, type TrashSceneId } from "./frames";

const state = (id: string, label: string, scene: HistorySceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: () => <HistoryScene id={scene} />, ...extra,
});

export const historyReview: ReviewScreen = {
  id: "history",
  title: "Archive",
  note: "D80: History убрана — все чаты в сайдбаре («Recents»), а здесь Archive: только чаты, которые вы убрали туда из меню «…». По неделям, с фильтром All / Interview / English. Ряд целиком — ссылка на разбор; справа — переименование, «Move back to Recents» и Delete (с подтверждением, уходит в Trash).",
  states: [
    state("data", "Data · S1–S3", "data", {
      dark: true,
      note: "Три сессии в двух группах. Результат — обычным текстом, без цвета. Действия появляются при наведении; на узком — одна кнопка «more».",
    }),
    state("renaming", "Renaming", "renaming", { mobile: false, note: "Ряд Lumen → InlineRename со счётчиком 35 / 80." }),
    state("row-menu", "Row menu (narrow)", "menuOpen", { desktop: false, note: "375 px: меню ряда — Rename, Move back to Recents, Delete (спросит подтверждение)." }),
    state("overflow", "Overflow +30%", "overflow", { note: "Семь рядов: длинные названия обрезаются с тултипом, результат «No verdict — 2 of 5 answered»." }),
    state("filtered-empty", "Filtered empty · English", "filteredEmpty", { note: "?track=english без английских сессий: подсказка и «Start English practice»." }),
    state("empty", "Empty", "empty", { note: "Архив пуст: фильтры скрыты, подсказка «Archive a chat from its … menu», «Start a practice» и пример разбора." }),
    state("loading", "Loading", "loading", { note: "Чипы фильтра выключены, четыре скелета рядов, aria-busy." }),
    state("error", "Error", "error", { note: "Не прочитали папку с данными: Try again и «Open storage settings»." }),
    state("toast", "After Move back to Recents", "toast", { mobile: false, note: "Ряд ушёл из архива обратно в Recents, тост «Moved back to Recents. Undo» (не зелёная плашка)." }),
    state("failed", "Action failed", "failed", { mobile: false, note: "Переименование не сохранилось: ошибка над списком, старое название вернулось." }),
  ],
};

const trash = (id: string, label: string, scene: TrashSceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: () => <TrashScene id={scene} />, ...extra,
});

export const trashReview: ReviewScreen = {
  id: "trash",
  title: "Trash",
  note: "US-23 AC2 (12d, Q9): удалённые сессии лежат в Trash. У ряда — Restore и «Delete forever» (с подтверждением, без отмены). Ошибка чтения папки — Try again и «Open storage settings».",
  states: [
    trash("data", "Data", "data", { dark: true, note: "Длинное название переносится внутри ряда; справа Restore и Delete forever." }),
    trash("confirm", "Delete forever · confirm", "confirm", { note: "Диалог: удалить насовсем нельзя отменить; красная кнопка." }),
    trash("restored", "After Restore", "restored", { mobile: false, note: "Ряд ушёл, строка «Restored.»; Recents в сайдбаре обновились." }),
    trash("failed", "Action failed", "failed", { mobile: false, note: "Сервер не ответил: ошибка над списком, ряды на месте." }),
    trash("empty", "Empty", "empty"),
    trash("loading", "Loading", "loading"),
    trash("error", "Load error", "error", { note: "Не прочитали корзину: Try again и ссылка на настройки хранилища." }),
  ],
};
