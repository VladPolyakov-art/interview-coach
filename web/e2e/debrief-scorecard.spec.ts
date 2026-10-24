/* US-20 AC6–AC8 (D98, r2): verdict line, weak spots, plan, then the scorecard; "What you said / How it lands / How to fix"
 * ("Measured" for a number), the misheard note and the plan, on the built-in example
 * debrief (`/sessions/example`, fixtures: no server data needed). Runs on the desktop and the mobile project.
 * Live sessions (new server fields, dismissed flags, old sessions) are covered by the orchestrator's full run. */
import { expect, test, type Page } from "@playwright/test";
import { resetApp, skipSetup } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetApp(request);
  await skipSetup(page);
  await page.goto("/sessions/example");
  await expect(page.getByRole("region", { name: "Scorecard" })).toBeVisible();
});

const scorecard = (page: Page) => page.getByRole("region", { name: "Scorecard" });
const row = (page: Page, label: string) => scorecard(page).getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });

test.describe("US-20 AC6 Scorecard", () => {
  test("happy path: the scored rows in a fixed order, each a score out of 5, under a practice-score caption", async ({ page }) => {
    await expect(scorecard(page)).toContainText("Practice scores from this app's rubric, not a hiring prediction.");
    const rows = scorecard(page).getByRole("listitem");
    await expect(rows).toHaveCount(6);
    const labels = ["Structure (STAR)", "Your part", "Result", "On the question", "English", "Delivery"];
    for (const [i, label] of labels.entries()) await expect(rows.nth(i)).toContainText(label);

    // A row reads as "Result, 4 out of 5" to a screen reader; the meter is only decoration.
    await expect(row(page, "Result")).toContainText("4 out of 5");
    await expect(row(page, "On the question")).toContainText("5 out of 5");
    expect(await row(page, "Result").locator("[aria-hidden='true']").count()).toBeGreaterThan(0);
    // A row scored 5 lost nothing; the others say where.
    await expect(row(page, "On the question")).not.toContainText("Lost points");
    await expect(row(page, "Result")).toContainText("Lost points in questions");
  });

  test("negative: a row with nothing to judge is not a row; one line at the end names it", async ({ page }) => {
    await expect(row(page, "Lessons learned")).toHaveCount(0);
    const line = scorecard(page).getByText("Not asked this time: Lessons learned");
    await expect(line).toBeVisible();
    // It comes after the last row.
    const [last, note] = await Promise.all([row(page, "Delivery").boundingBox(), line.boundingBox()]);
    expect(note!.y).toBeGreaterThan(last!.y);
  });

  test("a footnote under the caption says possibly misheard words are not counted", async ({ page }) => {
    await expect(scorecard(page)).toContainText("Words the app may have misheard are not counted. You can check them in each question.");
  });

  test("negative: no grade anywhere on the page (D98)", async ({ page }) => {
    for (const grade of ["Intern", "Junior", "Senior+", "Mid-level"]) await expect(page.getByText(grade, { exact: false })).toHaveCount(0);
  });

  test("a 'Lost points in' link opens that question's card and moves focus to it", async ({ page }) => {
    await row(page, "Result").getByRole("button", { name: "Go to question 4" }).click();
    const card = page.getByRole("region", { name: "Breakdown" });
    await expect(card).toContainText("How do you prioritise when everything is urgent?");
    await expect(page.getByRole("radio", { name: "4", exact: true })).toBeChecked();
    await expect(card).toBeInViewport();
    // The same number from another row goes to its own question.
    await row(page, "English").getByRole("button", { name: "Go to question 5" }).click();
    await expect(card).toContainText("Why Brightline?");
  });

  test("no horizontal scroll", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    const box = await scorecard(page).boundingBox();
    const view = page.viewportSize()!;
    expect(box!.x + box!.width).toBeLessThanOrEqual(view.width);
  });
});

test.describe("US-20 AC7 Weak spot: what you said, how it lands, how to fix", () => {
  const spots = (page: Page) => page.getByRole("region", { name: "What to work on" });
  const spot = (page: Page, layer: string) => spots(page).getByRole("listitem").filter({ hasText: layer }).first();

  test("happy path: a content spot shows the quote, the interviewer's reading and the fix, in this order", async ({ page }) => {
    const content = spot(page, "Content");
    await expect(content).toContainText(/What you said\s*We looked at the data we had and picked the option with the lowest risk\./);
    await expect(content).toContainText(/How it lands\s*All “we” makes it hard to see your part/);
    await expect(content).toContainText(/How to fix\s*Name the call you made and why/);
    const text = (await content.innerText()).replace(/\s+/g, " ");
    expect(text.indexOf("What you said")).toBeLessThan(text.indexOf("How it lands"));
    expect(text.indexOf("How it lands")).toBeLessThan(text.indexOf("How to fix"));
    // The quote is marked up as a quote.
    await expect(content.locator("q")).toHaveCount(1);
    expect(await content.locator("q").evaluate((q) => getComputedStyle(q).quotes)).toBe('"“" "”"');
  });

  test("a delivery spot shows the number as plain text, not as a quote", async ({ page }) => {
    const delivery = spot(page, "Delivery");
    await expect(delivery).toContainText(/Measured\s*4:05 for one answer/);
    await expect(delivery).not.toContainText("What you said");
    await expect(delivery.locator("q")).toHaveCount(0);
    await expect(delivery).not.toContainText("“4:05");
  });

  test("the Language spot ends with the misheard note; 'each question' opens the first evidence question", async ({ page }) => {
    const language = spot(page, "Language");
    await expect(language).toContainText(/How to fix[\s\S]*Words the app may have misheard are not counted\. You can check them in each question\./);
    // Only the Language spot carries it.
    await expect(spots(page).getByText("may have misheard")).toHaveCount(1);
    await page.getByRole("radio", { name: "5", exact: true }).click();
    await language.getByRole("button", { name: "each question, starting with question 3" }).click();
    await expect(page.getByRole("region", { name: "Breakdown" })).toContainText("Tell me about a feature that failed");
    await expect(page.getByRole("radio", { name: "3", exact: true })).toBeChecked();
  });

  test("a question number in the evidence still jumps to its card", async ({ page }) => {
    await spot(page, "Language").getByRole("button", { name: "Go to question 4" }).click();
    await expect(page.getByRole("region", { name: "Breakdown" })).toContainText("How do you prioritise when everything is urgent?");
  });
});

test.describe("US-20 AC8 Plan for the next session", () => {
  const plan = (page: Page) => page.getByRole("region", { name: "Plan for the next session" });

  test("happy path: up to three numbered steps after the weak spots, one per weak spot", async ({ page }) => {
    await expect(plan(page)).toBeVisible();
    const steps = plan(page).getByRole("listitem");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("For each story, name the one decision that was yours.");
    await expect(steps.nth(1)).toContainText("Language");
    await expect(steps.nth(2)).toContainText("Delivery");
    const [spots, planBox] = await Promise.all([
      page.getByRole("region", { name: "What to work on" }).boundingBox(),
      plan(page).boundingBox(),
    ]);
    expect(planBox!.y).toBeGreaterThan(spots!.y);
  });

  test("the page order is verdict, what to work on, plan, scorecard, then the conversation (r2)", async ({ page }) => {
    const names = ["Verdict", "What to work on", "Plan for the next session", "Scorecard", "Conversation"];
    const tops: number[] = [];
    for (const name of names) tops.push((await page.getByRole("heading", { name, exact: true, level: 2 }).boundingBox())!.y);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(names.length);
  });

  test("the first step has the drill; the page has one drill button, not two", async ({ page }) => {
    const drills = page.getByRole("button", { name: "Drill these weak spots" });
    await expect(drills).toHaveCount(1);
    await expect(plan(page).getByRole("listitem").first().getByRole("button", { name: "Drill these weak spots" })).toBeVisible();
  });

  test("the example explains why the drill is off: it is for your own debrief", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Drill these weak spots" })).toBeDisabled();
    await expect(plan(page)).toContainText("In your own debrief, you can drill these weak spots in a short session.");
  });
});

test.describe("What moves the verdict (D99)", () => {
  test("happy path: the scale marks the computed step and one line under it states the rule", async ({ page }) => {
    const verdict = page.getByRole("region", { name: "Verdict" });
    // The example's scorecard: no content row at 1-2 (not "Not ready yet"), a row below 4 (not "Ready"): "Getting there".
    await expect(verdict.getByText("Getting there", { exact: true }).first()).toBeVisible();
    await expect(verdict.locator("ol[data-review-id='Debrief/VerdictScale'] li[aria-current='true']")).toHaveText("Getting there");
    // Only Your part (3 of 5) stands between the example and "Ready".
    const line = verdict.getByText("To reach “Ready”: get Your part to 4 of 5 or more.", { exact: true });
    await expect(line).toBeVisible();
    // The model's sentence stays under the headline; the rule's line comes after the scale.
    await expect(verdict).toContainText("Strong on the why, but 3 answers skip the decision you made yourself.");
    const [scale, below] = await Promise.all([verdict.getByText("Ready", { exact: true }).boundingBox(), line.boundingBox()]);
    expect(below!.y).toBeGreaterThan(scale!.y);
  });

  test("negative: the old wording is gone (the line no longer quotes the first weak spot's fix)", async ({ page }) => {
    await expect(page.getByText("The main thing between you and")).toHaveCount(0);
  });
});
