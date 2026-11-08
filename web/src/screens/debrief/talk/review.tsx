/* Tough talk debriefs on the review page (ds/screens/tough-talk.md §5-§6). Fixtures: ./fixtures.ts. */
import type { ReviewState } from "../../../review/screens";
import type { SessionRecord } from "../../../lib/types";
import {
  negotiateAcceptedFirst, negotiateNoOffer, negotiateNotInWriting, negotiateStrong, toughModelFailed, toughNormal, toughOne, toughTwo,
} from "./fixtures";
import { Scene } from "./TalkScene";

const st = (id: string, label: string, record: SessionRecord, extra: Partial<ReviewState> & { q?: number } = {}): ReviewState => {
  const { q, ...rest } = extra;
  return { id, label, tall: true, render: () => <Scene record={record} q={q} />, ...rest };
};

export const debriefNegotiateStates: ReviewState[] = [
  st("neg-strong", "Debrief Negotiate · сильная сделка, step-up в письме", negotiateStrong, { dark: true, note: "Your result · What moved the offer · Say it better. Step-up стоит в offer letter — «In the offer letter» с галочкой." }),
  st("neg-verbal", "Debrief Negotiate · step-up не в письменном виде", negotiateNotInWriting, { note: "«Not in writing» и строка Say it better, которая просит зафиксировать." }),
  st("neg-first", "Debrief Negotiate · принято первое предложение", negotiateAcceptedFirst, { note: "Нет строки про сделку и блока «moves»." }),
  st("neg-none", "Debrief Negotiate · оффера ещё нет", negotiateNoOffer, { note: "Прочерк вместо суммы, объяснение и две плитки тактик." }),
];

export const debriefToughStates: ReviewState[] = [
  st("tough-normal", "Debrief Tough · обычный: пять ответов", toughNormal, { dark: true, note: "Три спокойных ответа, самый болезненный — ссылкой из сводки, личный вопрос с примечанием." }),
  st("tough-q2", "Debrief Tough · вопрос 2", toughNormal, { q: 2, note: "Разбор одного вопроса." }),
  st("tough-failed", "Debrief Tough · модель не отработала (только сигналы кода)", toughModelFailed, { note: "Без цитаты, форма ответа и тихая заметка." }),
  st("tough-two", "Debrief Tough · 2 ответа", toughTwo, { note: "Без счётчиков." }),
  st("tough-one", "Debrief Tough · 1 ответ", toughOne, { note: "Без счётчиков." }),
];
