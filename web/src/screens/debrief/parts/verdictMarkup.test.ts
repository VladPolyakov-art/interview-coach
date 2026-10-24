import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "../../../i18n";
import type { VerdictModel } from "../types";
import { Verdict, VerdictBar } from "./Sections";
import { rowsText, verdictLine } from "./verdictLine";

const verdict: VerdictModel = { headline: "Getting there", step: 1, line: "Clear answers." };
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("verdict screen-reader text (13, QA-20)", () => {
  it("the hidden step text reads as part of the headline: no stray leading period", () => {
    const html = renderToStaticMarkup(createElement(Verdict, { verdict, id: "v" }));
    expect(html).toContain('<span class="visually-hidden">, step 2 of 3</span>');
    expect(text(html)).not.toMatch(/ \. /);
    expect(text(html)).not.toContain("Verdict: Getting there");
  });
  it("the folded bar says it once: label, headline, step", () => {
    const html = renderToStaticMarkup(createElement(VerdictBar, { verdict, id: "v", children: null }));
    expect(html).toContain('<span class="visually-hidden">, step 2 of 3</span>');
    expect(text(html)).not.toMatch(/ \. /);
  });
});

describe("what moves the verdict (D99, rubric §9.4)", () => {
  const at = (step: 0 | 1 | 2, gap: VerdictModel["gap"], extra: Partial<VerdictModel> = {}): VerdictModel =>
    ({ headline: "x", step, gap, target: step === 0 ? 3 : step === 1 ? 4 : undefined, ...extra });

  it("Not ready yet: the rule for “Getting there”, 3 of 5, the named rows", () => {
    expect(verdictLine(at(0, ["structure"]))).toBe("To reach “Getting there”: get Structure (STAR) to 3 of 5 or more.");
    expect(verdictLine(at(0, ["structure", "result"]))).toBe("To reach “Getting there”: get Structure (STAR) and Result to 3 of 5 or more.");
    expect(verdictLine(at(0, ["structure", "result", "relevance"]))).toBe("To reach “Getting there”: get Structure (STAR), Result and On the question to 3 of 5 or more.");
  });
  it("Getting there: the rule for “Ready”, 4 of 5; one, two, three rows", () => {
    expect(verdictLine(at(1, ["delivery"]))).toBe("To reach “Ready”: get Delivery to 4 of 5 or more.");
    expect(verdictLine(at(1, ["reflection", "language"]))).toBe("To reach “Ready”: get Lessons learned and English to 4 of 5 or more.");
    expect(verdictLine(at(1, ["own_part", "result", "delivery"]))).toBe("To reach “Ready”: get Your part, Result and Delivery to 4 of 5 or more.");
  });
  it("more than three rows: the two lowest and “N more”", () => {
    expect(verdictLine(at(1, ["reflection", "structure", "result", "delivery"]))).toBe("To reach “Ready”: get Lessons learned, Structure (STAR) and 2 more to 4 of 5 or more.");
    expect(verdictLine(at(1, ["structure", "own_part", "result", "relevance", "delivery"]))).toBe("To reach “Ready”: get Structure (STAR), Your part and 3 more to 4 of 5 or more.");
  });
  it("Ready: keeps the strength when there is one, else no line", () => {
    expect(verdictLine(at(2, [], { strength: "Clear results." }))).toBe("Keep it: Clear results.");
    expect(verdictLine(at(2, []))).toBeNull();
    expect(verdictLine(at(2, [], { strength: "  " }))).toBeNull();
  });
  it("no step, or a step 0/1 without a gap or a target: no line", () => {
    expect(verdictLine({ headline: "Clear answers.", strength: "Clear results." })).toBeNull();
    expect(verdictLine(at(1, []))).toBeNull();
    expect(verdictLine(at(0, undefined))).toBeNull();
    expect(verdictLine({ headline: "x", step: 1, gap: ["delivery"] })).toBeNull();
  });
  it("names the rows with the scorecard's own labels", () => {
    expect(rowsText(["On the question"])).toBe("On the question");
    for (const key of ["structure", "own_part", "result", "relevance", "reflection", "language", "delivery"] as const) {
      expect(verdictLine(at(1, [key]))).toContain(`get ${t(`debrief.score.row.${key}`)} to`);
    }
  });
  it("is shown under the scale in the page and in the opened bar's verdict", () => {
    const line = "To reach “Ready”: get Delivery to 4 of 5 or more.";
    const html = renderToStaticMarkup(createElement(Verdict, { verdict, id: "v", next: line }));
    expect(text(html)).toContain(line);
    expect(html.indexOf("Not ready yet")).toBeLessThan(html.indexOf(line));
    const bare = renderToStaticMarkup(createElement(Verdict, { verdict, id: "v", bare: true, next: line }));
    expect(text(bare)).toContain(line);
    expect(text(renderToStaticMarkup(createElement(Verdict, { verdict, id: "v" })))).not.toContain("To reach");
  });
});
