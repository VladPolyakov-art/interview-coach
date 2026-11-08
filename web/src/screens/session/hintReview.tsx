/* Card texts are copied from app/server/content/tough_talk.json (rule → text).
 * Tough talk Session states for the review page: the Hint button and the hint card in the island (ds/screens/tough-talk.md §4).
 * Same patches as SessionHint.stories.tsx. */
import type { ReviewState } from "../../review/screens";
import { fixtureProps } from "./fixtures";
import { SessionView } from "./SessionView";
import type { SessionHint, SessionViewProps } from "./types";

const closed: SessionHint = { available: true, open: false, used: 0 };
const NEGOTIATE_CARD: SessionHint["card"] = {
  id: "N6", title: "If base is stuck, ask about the package",
  text: "Sign-on, an earlier review, days off, remote days, title.",
  example: "If base is fixed, could we add a sign-on bonus or a review at six months?",
};
const N9_CARD: SessionHint["card"] = {
  id: "N9", title: "Bridge the gap with a step-up",
  text: "If they cannot reach your number now, agree on it later: the offer now, your number after the probation or in six months.",
  example: "If 90,000 is the limit today, could we agree on 98,000 after the three-month probation?",
};
const N10_CARD: SessionHint["card"] = {
  id: "N10", title: "Make the step-up real",
  text: "Amount, date, what you need to show, and in the offer letter. A promise said aloud is not a deal.",
  example: "Great. Can we write the 98,000 at three months and the goals into the offer?",
};
const TOUGH_CARD: SessionHint["card"] = {
  id: "T1", title: "Personal question: acknowledge, fact, redirect",
  text: "Stay calm and short, then go back to the job.",
  example: "My plans won't affect my work. Can I tell you about my availability?",
};

const negotiate = (hint: SessionHint) => (p: SessionViewProps): SessionViewProps => ({
  ...p, variant: "negotiate", input: "text", phase: "your-turn",
  data: { ...p.data, title: "Negotiation · Product Designer · Friendly", sub: undefined, progress: "Turn 4", step: undefined, nextNumber: null, hint },
});
const tough = (hint: SessionHint) => (p: SessionViewProps): SessionViewProps => ({
  ...p, variant: "tough", input: "text", phase: "your-turn", data: { ...p.data, title: "Tough questions · Why you left", hint },
});
const scene = (fn: (p: SessionViewProps) => SessionViewProps) => () => <SessionView {...fn(fixtureProps({ scene: "text" }))} />;

export const sessionTalkStates: ReviewState[] = [
  { id: "neg-n9", label: "Negotiate · подсказка N9 (step-up в письменном виде)", dark: true, note: "Ход пользователя, карточка подсказки открыта под транскриптом, кнопка Hint нажата; в ленте нет «Next question» — считаются ходы.", render: scene(negotiate({ available: true, open: true, used: 1, card: N9_CARD })) },
  { id: "neg-n10", label: "Negotiate · подсказка N10 (время на решение)", note: "Та же карточка, другая тактика.", render: scene(negotiate({ available: true, open: true, used: 2, card: N10_CARD })) },
  { id: "neg-n6", label: "Negotiate · подсказка с примером реплики", note: "Карточка с «Try saying».", render: scene(negotiate({ available: true, open: true, used: 1, card: NEGOTIATE_CARD })) },
  { id: "neg-button", label: "Negotiate · кнопка Hint, пока говорит Майк", note: "Подсказку можно спросить, пока Майк не думает.", mobile: true, render: () => <SessionView {...negotiate(closed)({ ...fixtureProps({ scene: "text" }), phase: "mike-speaking" })} /> },
  { id: "tough-hint", label: "Tough · вопрос с возражением и подсказкой", dark: true, note: "Вопрос «Why you left», карточка подсказки с формой ответа (answer shape) и примером.", render: scene(tough({ available: true, open: true, used: 1, card: TOUGH_CARD })) },
  { id: "tough-button", label: "Tough · кнопка Hint, подсказка закрыта", note: "Ход пользователя, подсказка ещё не просили.", render: scene(tough(closed)) },
  { id: "tough-first", label: "Tough · первые подсказки режима", note: "Подсказки первого раза режима Tough.", render: () => <SessionView {...{ ...tough(closed)({ ...fixtureProps({ scene: "text" }), phase: "mike-speaking" }), firstTime: true }} /> },
  { id: "neg-first", label: "Negotiate · первые подсказки режима", note: "Подсказки первого раза режима Negotiate.", render: () => <SessionView {...{ ...negotiate(closed)({ ...fixtureProps({ scene: "text" }), phase: "mike-speaking" }), firstTime: true }} /> },
  { id: "neg-checking", label: "Negotiate · Майк проверяет у hiring manager", dark: true, note: "Статус «Mike is checking…» и присутствие «думает», поле ввода остаётся доступным; через несколько секунд Майк возвращается сам.", render: () => <SessionView {...negotiate(closed)({ ...fixtureProps({ scene: "text" }), phase: "your-turn", data: { ...fixtureProps({ scene: "text" }).data, checking: true } })} /> },
  { id: "interview-money", label: "Interview · переход к разговору о зарплате", note: "Прогресс «Salary talk», подсказка включается с этого момента.", render: () => <SessionView {...{ ...fixtureProps({ scene: "text" }), data: { ...fixtureProps({ scene: "text" }).data, progress: "Salary talk", step: undefined, moneyPart: true, hint: closed } }} /> },
];
