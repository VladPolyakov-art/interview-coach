/* Home on the review page (stage 11): the states of ds/screens/home.md §4 as playable scenes (MemoryRouter + AppShellView
 * + HomeView with local choices). Fixture: docs/ia.md §6. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { HomeScene } from "./frames";
import type { HomeSceneId } from "./states";

const scene = (id: HomeSceneId) => () => <HomeScene id={id} />;
const state = (id: string, label: string, sceneId: HomeSceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: scene(sceneId), ...extra,
});

export const homeReview: ReviewScreen = {
  id: "home",
  title: "Home",
  note: "Один экран «Practice»: композер с вакансией, раунд, строгость и единственная чёрная кнопка Start. Все состояния играбельны.",
  states: [
    state("returning", "Returning user", "returning", { dark: true, note: "Полоса слабых мест, чипы раунда, композер с вакансией Kestrel Pay, Start. Recent живёт в рейле." }),
    state("first-visit", "First visit", "firstVisit", { dark: true, note: "Без полосы и Recent; под Start пример разбора (Sam Rivera)." }),
    state("english-first", "English tab, first visit", "englishFirst", { note: "Уровень не выбран, Start неактивна, причина видна. Композера нет (O-5)." }),
    state("vacancy-editor", "VacancyEditor open", "editorAdd", { note: "Диалог «Add a job»: Paste / File / Link, Company и Role." }),
    state("engine-down", "Engine not running", "engineDown", { note: "Баннер над орбом, Start и Drill неактивны, причина под Start." }),
    state("loading", "Loading", "loading", { note: "Скелетоны полосы, вакансии и Recent; Start с шиммером." }),
    state("overflow", "Overflow +30%", "overflow", { note: "Длинные названия, 7 вакансий в списке, текст +30%." }),
  ],
};
