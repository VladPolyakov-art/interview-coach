/* US-20 AC6–AC8 (D98): scorecard, "What you said / How it lands / How to fix" and the plan, on the built-in example
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
  test("happy path: seven rows in a fixed order, each a score out of 5, under a practice-score caption", async ({ page }) => {
    await expect(scorecard(page)).toContainText("Practice scores from this app's rubric, not a hiring prediction.");
    const rows = scorecard(page).getByRole("listitem");
    await expect(rows).toHaveCount(7);
    const labels = ["Structure (STAR)", "Your part", "Result", "On the question", "Lessons learned", "English", "Delivery"];
    for (const [i, label] of labels.entries()) await expect(rows.nth(i)).toContainText(label);

    // A row reads as "Result, 4 out of 5" to a screen reader; the meter is only decoration.
    await expect(row(page, "Result")).toContainText("4 out of 5");
    await expect(row(page, "On the question")).toContainText("5 out of 5");
    expect(await row(page, "Result").locator("[aria-hidden='true']").count()).toBeGreaterThan(0);
    // A row scored 5 lost nothing; the others say where.
    await expect(row(page, "On the question")).not.toContainText("Lost points");
    await expect(row(page, "Result")).toContainText("Lost points in questions");
  });

  test("negative: a row with nothing to judge says 'Not asked this time', with no score and no links", async ({ page }) => {
    const lessons = row(page, "Lessons learned");
    await expect(lessons).toContainText("Not asked this time");
    await expect(lessons).not.toContainText("out of 5");
    await expect(lessons.getByRole("button")).toHaveCount(0);
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
    await expect(delivery).toContainText(/What you said\s*4:05 for one answer/);
    await expect(delivery.locator("q")).toHaveCount(0);
    await expect(delivery).not.toContainText("“4:05");
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
