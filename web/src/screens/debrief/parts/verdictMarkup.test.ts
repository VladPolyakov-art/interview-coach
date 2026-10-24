import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VerdictModel, WeakSpotModel } from "../types";
import { Verdict, VerdictBar } from "./Sections";
import { verdictLine } from "./verdictLine";

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

describe("what moves the verdict (D98 r2, rubric §9.4)", () => {
  const spot = (layer: WeakSpotModel["layer"], fix?: string): WeakSpotModel => ({ id: layer, layer, title: layer, fix });
  const spots = [spot("content", "Name the call you made and why: “I chose to cut the referral flow because…”."), spot("delivery", "One sentence of context.")];

  it("Getting there: the next step's name and the first weak spot's fix, as written", () => {
    expect(verdictLine(verdict, spots)).toBe("The main thing between you and “Ready”: Name the call you made and why: “I chose to cut the referral flow because…”.");
  });
  it("Not ready yet points to Getting there; a fix without a full stop gets one", () => {
    expect(verdictLine({ ...verdict, step: 0 }, [spot("content", "End with a number")])).toBe("The main thing between you and “Getting there”: End with a number.");
  });
  it("Ready: keeps the strength when there is one, else no line", () => {
    expect(verdictLine({ ...verdict, step: 2, strength: "Clear results." }, spots)).toBe("Keep it: Clear results.");
    expect(verdictLine({ ...verdict, step: 2 }, spots)).toBeNull();
  });
  it("no step, or no weak spot with a fix: no line", () => {
    expect(verdictLine({ headline: "Clear answers." }, spots)).toBeNull();
    expect(verdictLine(verdict, [])).toBeNull();
    expect(verdictLine(verdict, [spot("content")])).toBeNull();
  });
  it("is shown under the scale in the page and in the opened bar's verdict", () => {
    const line = "The main thing between you and “Ready”: Fix it.";
    const html = renderToStaticMarkup(createElement(Verdict, { verdict, id: "v", next: line }));
    expect(text(html)).toContain(line);
    expect(html.indexOf("Not ready yet")).toBeLessThan(html.indexOf(line));
    const bare = renderToStaticMarkup(createElement(Verdict, { verdict, id: "v", bare: true, next: line }));
    expect(text(bare)).toContain(line);
    expect(text(renderToStaticMarkup(createElement(Verdict, { verdict, id: "v" })))).not.toContain("The main thing");
  });
});
