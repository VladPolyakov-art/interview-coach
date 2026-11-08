import { debriefMoneyStates, debriefNegotiateStates, debriefToughStates } from "../screens/debrief/talk/review";
import { homeReview } from "../screens/home/review";
import { historyReview } from "../screens/history/review";
import { sessionTalkStates } from "../screens/session/hintReview";
import type { ReviewScreen, ReviewState } from "./screens";

/* "Tough talk" group (tough-talk.md): the new states, pulled out of Home / Archive and joined by Session and Debrief. */
const HOME_IDS = (s: ReviewState) => s.id.startsWith("talk-");
const HISTORY_IDS = new Set(["talk", "filtered-tough", "filtered-negotiate"]);

export const homeWithoutTalk: ReviewScreen = { ...homeReview, states: homeReview.states.filter((s) => !HOME_IDS(s)) };
export const historyWithoutTalk: ReviewScreen = { ...historyReview, states: historyReview.states.filter((s) => !HISTORY_IDS.has(s.id)) };

const home = homeReview.states.filter(HOME_IDS).map((s) => ({ ...s, dark: s.dark ?? false }));
const homeBy = (re: RegExp) => home.filter((s) => re.test(s.id));

export const TOUGH_TALK_SCREENS: ReviewScreen[] = [
  { id: "tt-home-chips", title: "Tough talk · Home: чипы и план", note: "Два ряда чипов на старте и ленты тактик в карточках плана (Negotiate и Tough).", states: [...homeBy(/^talk-chips$/), ...homeBy(/^talk-(neg|tough)-.*plan/)] },
  { id: "tt-home-scenario", title: "Negotiation v2 · Сценарий и цифры", note: "Первый шаг — какой разговор (пять сценариев с одной строкой), затем цифры под сценарий: raise, counteroffer, screening, internship; план с тактиками сценария.", states: homeBy(/^talk-scn-/) },
  { id: "tt-home-money", title: "Negotiation v2 · Interview: «End with a salary talk»", note: "Строка в плане интервью, выключена по умолчанию; включённая показывает роль и цель.", states: homeBy(/^talk-money-/) },
  { id: "tt-home-negotiate", title: "Tough talk · Negotiate: настройка с Майком", note: "N-1 роль → N-2 цифры (пусто / из объявления / ошибки) → N-3 стиль.", states: homeBy(/^talk-neg-(role|numbers|style)/) },
  { id: "tt-home-tough", title: "Tough talk · Tough: тема", note: "T-1: выбор темы и Personal questions.", states: homeBy(/^talk-tough-(theme|personal)$/) },
  { id: "tt-session", title: "Tough talk · Session: подсказки", note: "Кнопка Hint и карточка подсказки в островке сессии: Negotiate (N9, N10) и Tough.", states: sessionTalkStates },
  { id: "tt-debrief-negotiate", title: "Tough talk · Debrief Negotiate", note: "Сильная сделка со step-up в письме, step-up не в письме, принято первое предложение, оффера ещё нет.", states: debriefNegotiateStates },
  { id: "tt-debrief-money", title: "Negotiation v2 · Interview: кадр «Salary talk»", note: "Интервью с зарплатной частью.", states: debriefMoneyStates },
  { id: "tt-debrief-tough", title: "Tough talk · Debrief Tough", note: "Обычный разбор, модель не отработала, 1–2 ответа.", states: debriefToughStates },
  { id: "tt-history", title: "Tough talk · Archive: строки и фильтры", note: "Строки практик со строкой результата и пустые состояния фильтров Tough / Negotiate.", states: historyReview.states.filter((s) => HISTORY_IDS.has(s.id)) },
].filter((sc) => sc.states.length > 0).map((sc) => ({ ...sc, states: sc.states.map((st) => ({ ...st })) }));
