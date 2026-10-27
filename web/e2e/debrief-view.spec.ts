/* The saved-session page is chat-first (owner request 2026-10-27): the conversation is the default view, a "Conversation |
 * Debrief" switch sits under the title, `?view=debrief` deep-links the debrief, one "Practise again" sits next to the
 * switch in both views, and nothing scrolls sideways. Runs on the desktop and the mobile project. */
import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, resetApp, seedReturningUser, skipSetup } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetApp(request);
  await skipSetup(page);
});

const log = (page: Page) => page.getByRole("log", { name: "Conversation with Mike" });
const verdict = (page: Page) => page.getByRole("region", { name: /^Verdict/ });
const radio = (page: Page, name: "Conversation" | "Debrief") => page.getByRole("radio", { name, exact: true });

/** The newest seeded session's id. */
async function openSession(page: Page, request: Parameters<typeof seedReturningUser>[0], search = "") {
  const { sessions } = await seedReturningUser(request);
  await page.goto(`/sessions/${sessions[0]!.id}${search}`);
}

/** Sideways wheel (a trackpad swipe) over the page: nothing may move. */
async function swipeSideways(page: Page) {
  const box = (await page.locator("main").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(300, 0);
  await page.waitForTimeout(150);
  const moved = await page.evaluate(() => {
    const scrollers = [document.scrollingElement!, ...Array.from(document.querySelectorAll("main, main *"))];
    return scrollers.filter((el) => el.scrollLeft !== 0).length;
  });
  expect(moved).toBe(0);
}

test.describe("Chat-first saved session", () => {
  test("happy path: opens on the conversation, full width, with the switch under the title", async ({ page, request }) => {
    await openSession(page, request);
    await expect(page.getByRole("heading", { name: "Kestrel Pay · Product Manager", level: 1 })).toBeVisible();
    await expect(log(page)).toBeVisible();
    await expect(radio(page, "Conversation")).toBeChecked();
    await expect(radio(page, "Debrief")).toBeVisible();
    await expect(verdict(page)).toHaveCount(0);
    // The conversation takes the main area's width instead of a narrow column.
    const [main, chat] = await Promise.all([page.locator("main").boundingBox(), log(page).boundingBox()]);
    expect(chat!.width).toBeGreaterThanOrEqual(main!.width * 0.8);
    // The switch is under the title.
    const [title, sw] = await Promise.all([
      page.getByRole("heading", { level: 1 }).boundingBox(),
      page.getByRole("radiogroup", { name: "View" }).boundingBox(),
    ]);
    expect(sw!.y).toBeGreaterThan(title!.y);
  });

  test("the switch moves to the debrief and back, and keeps the view in the URL", async ({ page, request }) => {
    await openSession(page, request);
    await radio(page, "Debrief").click();
    await expect(page).toHaveURL(/\?view=debrief$/);
    await expect(verdict(page)).toBeVisible();
    await expect(log(page)).toHaveCount(0);
    await radio(page, "Conversation").click();
    await expect(page).not.toHaveURL(/view=/);
    await expect(log(page)).toBeVisible();
    await expect(verdict(page)).toHaveCount(0);
  });

  test("a deep link ?view=debrief opens the debrief, with no conversation", async ({ page, request }) => {
    await openSession(page, request, "?view=debrief");
    await expect(verdict(page)).toBeVisible();
    await expect(radio(page, "Debrief")).toBeChecked();
    await expect(log(page)).toHaveCount(0);
    await page.reload();
    await expect(verdict(page)).toBeVisible();
  });

  test("negative: an unknown ?view= value falls back to the conversation", async ({ page, request }) => {
    await openSession(page, request, "?view=nonsense");
    await expect(log(page)).toBeVisible();
    await expect(radio(page, "Conversation")).toBeChecked();
  });

  test("one 'Practise again' near the top in both views, with the hint as a description", async ({ page, request }) => {
    await openSession(page, request);
    const again = page.getByRole("button", { name: "Practise again" });
    for (const view of ["Conversation", "Debrief"] as const) {
      await radio(page, view).click();
      await expect(radio(page, view)).toBeChecked();
      await expect(again).toHaveCount(1);
      await expect(again).toHaveAttribute("aria-description", "Same job and round, new questions");
      // Next to the switch, above the content.
      const [btn, sw] = await Promise.all([again.boundingBox(), page.getByRole("radiogroup", { name: "View" }).boundingBox()]);
      expect(Math.abs(btn!.y - sw!.y)).toBeLessThan(120);
    }
    // The old lower copy and its hint line are gone.
    await expect(page.getByRole("region", { name: "What next" })).toHaveCount(0);
    await expect(page.getByText("Same job and round, new questions", { exact: true })).toHaveCount(0);
  });

  test("the question jump bar in the conversation scrolls to that question", async ({ page, request }) => {
    await openSession(page, request);
    const jump = page.getByRole("radiogroup", { name: "Jump to question" });
    await expect(jump).toBeVisible();
    await jump.getByRole("radio").nth(1).click();
    await expect(jump.getByRole("radio").nth(1)).toBeChecked();
    await expect(page.locator("[data-question='2']")).toBeInViewport();
  });
});

test.describe("Nothing scrolls sideways", () => {
  for (const view of ["", "?view=debrief"]) {
    test(`no horizontal overflow and no sideways scroll (${view || "conversation"})`, async ({ page, request }) => {
      await openSession(page, request, view);
      await expect(view ? verdict(page) : log(page)).toBeVisible();
      await expectNoHorizontalScroll(page);
      await swipeSideways(page);
    });
  }
});
