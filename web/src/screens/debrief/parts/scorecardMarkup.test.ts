import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { exampleSam, interviewS2 } from "../fixtures";
import type { PlanStepModel, ScoreRowModel } from "../types";
import { Plan } from "./Plan";
import { Scorecard } from "./Scorecard";
import { Actions, WeakSpots } from "./Sections";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
const noop = () => {};

const rows: ScoreRowModel[] = [
  { key: "structure", score: 3, answers: 5, lost: [1, 2, 4] },
  { key: "own_part", score: 5, answers: 5, lost: [] },
  { key: "reflection", score: null, answers: 0, lost: [] },
];
const html = () => renderToStaticMarkup(createElement(Scorecard, { rows, id: "sc", onJump: noop }));

describe("scorecard markup (D98, US-20 AC6)", () => {
  it("is a section named Scorecard with the practice-score caption", () => {
    const h = html();
    expect(h).toContain('aria-labelledby="sc"');
    expect(text(h)).toContain("Scorecard");
    expect(text(h)).toContain("Practice scores from this app's rubric, not a hiring prediction.");
  });

  it("one list item per row; a scored row reads as 'label, n out of 5'", () => {
    const h = html();
    expect((h.match(/<li /g) ?? []).length).toBe(3);
    expect(text(h)).toContain("Structure (STAR) 3/5 , 3 out of 5");
    expect(h).toContain('<span class="visually-hidden">, 3 out of 5</span>');
    expect(h).toContain('<span class="visually-hidden">, 5 out of 5</span>');
  });

  it("the meter is decoration: five segments, hidden from screen readers", () => {
    const h = html();
    expect((h.match(/aria-hidden="true"><span class="[^"]*seg[^"]*"/g) ?? []).length).toBe(2);
    const meter = /<span class="[^"]*meter[^"]*" aria-hidden="true">(.*?)<\/span><span class="[^"]*num/.exec(h)?.[1] ?? "";
    expect((meter.match(/seg/g) ?? []).length).toBe(5);
    expect((meter.match(/_on_/g) ?? []).length).toBe(3);
  });

  it("lost points link to the question cards; a 5/5 row lists none", () => {
    const h = html();
    expect(text(h)).toContain("Lost points in questions");
    for (const n of [1, 2, 4]) expect(h).toContain(`aria-label="Go to question ${n}"`);
    const own = h.split("<li ")[2]!;
    expect(own).toContain("Your part");
    expect(own).not.toContain("Lost points");
  });

  it("a row with nothing to judge says 'Not asked this time' and has no meter, score or links", () => {
    const li = html().split("<li ")[3]!;
    expect(text(li)).toContain("Lessons learned Not asked this time");
    expect(li).not.toContain("meter");
    expect(li).not.toContain("out of 5");
    expect(li).not.toContain("<button");
  });

  it("uses the singular for one question", () => {
    const h = renderToStaticMarkup(createElement(Scorecard, { rows: [{ key: "result", score: 2, answers: 1, lost: [2] }], id: "sc", onJump: noop }));
    expect(text(h)).toContain("Lost points in question 2");
  });

  it("the example fixture has a 'Not asked this time' row, and no grade anywhere", () => {
    const h = renderToStaticMarkup(createElement(Scorecard, { rows: exampleSam.scorecard!, id: "sc", onJump: noop }));
    expect(text(h)).toContain("Not asked this time");
    expect(h).not.toMatch(/Intern|Junior|Senior\+/);
  });
});

describe("weak-spot lines (D98, US-20 AC7)", () => {
  const spots = (over: Partial<(typeof interviewS2.weakSpots)[number]>) => ({ ...interviewS2, weakSpots: [{ ...interviewS2.weakSpots[0]!, ...over }] });
  const render = (model: typeof interviewS2) => renderToStaticMarkup(createElement(WeakSpots, { model, order: "content-first", onJump: noop, id: "ws" }));

  it("shows What you said (as a quote), How it lands and How to fix", () => {
    const h = render(spots({}));
    expect(text(h)).toMatch(/What you said .*How it lands .*How to fix/);
    expect(h).toMatch(/<q class="[^"]*quote[^"]*">Last year I, like, rebuilt/);
  });

  it("a metric is plain text, with no quote element or quote marks", () => {
    const h = render(spots({ said: { kind: "metric", text: "12 fillers in 3:40" } }));
    expect(h).not.toContain("<q ");
    expect(h).toContain(">12 fillers in 3:40<");
    expect(text(h)).not.toContain("“12 fillers");
  });

  it("a missing line leaves no empty label", () => {
    const h = render(spots({ said: undefined, lands: undefined }));
    expect(text(h)).not.toContain("What you said");
    expect(text(h)).not.toContain("How it lands");
    expect(text(h)).toContain("How to fix");
    const old = render(spots({ said: undefined, lands: undefined, fix: undefined }));
    expect(text(old)).not.toContain("How to fix");
  });
});

describe("plan markup (D98, US-20 AC8)", () => {
  const steps: PlanStepModel[] = [
    { id: "p1", layer: "content", text: "Write one number for each story.", drill: true },
    { id: "p2", layer: "language", text: "Drill the phrases out loud.", drill: false },
  ];
  const plan = (extra: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(Plan, { steps, id: "pl", onDrill: noop, ...extra }));

  it("is a numbered list of steps under 'Plan for the next session'", () => {
    const h = plan();
    expect(h).toContain("<ol ");
    expect((h.match(/<li /g) ?? []).length).toBe(2);
    expect(text(h)).toContain("Plan for the next session");
    expect(text(h)).toContain("Write one number for each story.");
  });

  it("only the first step has the drill button, with the drill track", () => {
    const h = plan({ drill: { questions: 3, points: 2, minutes: 8 } });
    expect((h.match(/Drill these weak spots/g) ?? []).length).toBe(1);
    expect(h).toContain('data-track="drill-start"');
    expect(h.indexOf("Drill these weak spots")).toBeLessThan(h.indexOf("Drill the phrases"));
    expect(text(h)).toContain("3 questions on these 2 points · about 8 min");
  });

  it("in the example the drill is off and says it is for the user's own debrief", () => {
    const h = plan({ example: true });
    expect(h).toMatch(/<button[^>]*disabled[^>]*>/);
    expect(text(h)).toContain("In your own debrief, you can drill these weak spots in a short session.");
  });
});

describe("one drill button on the page (D98)", () => {
  const actions = (drillInPlan: boolean) => renderToStaticMarkup(createElement(Actions, { variant: "interview", model: interviewS2, drillInPlan, id: "a", onDrill: noop }));
  it("the Actions block drops its drill when the plan has it, and keeps it without a plan", () => {
    expect(text(actions(true))).not.toContain("Drill these weak spots");
    expect(text(actions(true))).toContain("Practise again");
    expect(text(actions(false))).toContain("Drill these weak spots");
  });
  it("the example's hint moves to the plan with the button", () => {
    const ex = (drillInPlan: boolean) => text(renderToStaticMarkup(createElement(Actions, { variant: "example", model: exampleSam, drillInPlan, id: "a" })));
    expect(ex(true)).not.toContain("In your own debrief");
    expect(ex(false)).toContain("In your own debrief");
  });
});
