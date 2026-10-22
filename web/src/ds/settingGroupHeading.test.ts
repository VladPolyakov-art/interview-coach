import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingGroup } from "./SettingRow";

const group = (headingLevel?: 2 | 3) => renderToStaticMarkup(createElement(SettingGroup, { title: "Pick an engine", headingLevel, children: "rows" }));

describe("SettingGroup heading level (QA-12)", () => {
  it("is an h3 by default (under a Settings section heading)", () => {
    expect(group()).toMatch(/<h3[^>]*>Pick an engine<\/h3>/);
  });
  it("is an h2 straight under the page's h1 (Setup steps), so no level is skipped", () => {
    const html = group(2);
    expect(html).toMatch(/<h2[^>]*>Pick an engine<\/h2>/);
    expect(html).not.toContain("<h3");
  });
});
