import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseManuscript } from "../../src/data/parser";
const story = parseManuscript(
  readFileSync(new URL("../../story/manuscript.md", import.meta.url), "utf8"),
);

test("the entire four-act manuscript is playable verbatim through the ending", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#begin")).toBeVisible();
  await expect(page.locator("#stage canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/cover-desktop.png" });
  await page.locator("#begin").click();
  for (let i = 0; i < story.beats.length; i++) {
    await expect(page.locator("#prose p")).toHaveText(
      story.beats[i].paragraphs[0],
    );
    await expect(page.locator("#page-count")).toHaveText(
      `${String(i + 1).padStart(3, "0")} / ${story.beats.length}`,
    );
    if (i === 0)
      await page.screenshot({ path: "test-results/reader-desktop.png" });
    if (story.beats[i].effectTrigger) {
      await page.waitForTimeout(1400);
      await page.screenshot({
        path: `test-results/effect-${story.beats[i].effectTrigger}.png`,
      });
    }
    await page.locator("#next").click();
  }
  await expect(page.locator("#ending")).toBeVisible();
  await page.locator("#ending-back").click();
  await expect(page.locator("#page-count")).toHaveText("143 / 143");
  await page.locator("#previous").click();
  await expect(page.locator("#page-count")).toHaveText("142 / 143");
  expect(errors).toEqual([]);
});

test("chapters, notebook styling, scrubbing, preferences, and resume work", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#chapters").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator(".chapter-choice").nth(2).click();
  await expect(page.locator("#act-title")).toHaveText("The Challenge");
  const note = story.beats.findIndex(
    (b) => b.kind === "written" && b.act === 3,
  );
  await page.locator("#progress").fill(String(note));
  await page.locator("#progress").dispatchEvent("input");
  await expect(page.locator("#page")).toHaveAttribute("data-kind", "written");
  await page.locator("#settings").click();
  await page.locator("#font-size").fill("30");
  await page.locator("#font-size").dispatchEvent("input");
  await page.locator("#mute-setting").check();
  await page.locator("#motion-setting").check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page.locator("#begin").click();
  await expect(page.locator("#prose p")).toHaveText(
    story.beats[note].paragraphs[0],
  );
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
  await expect(page.locator("#sound")).toHaveAttribute(
    "aria-label",
    "Unmute ambient sound",
  );
  await page.locator("#reading-area").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#prose p")).toHaveText(
    story.beats[note + 1].paragraphs[0],
  );
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#prose p")).toHaveText(
    story.beats[note].paragraphs[0],
  );
  await page.locator("#chapters").click();
  await page
    .locator(".chapter-entry details")
    .nth(3)
    .locator("summary")
    .click();
  await page.getByRole("button", { name: "Aurora Lyra ↗" }).click();
  await expect(page.locator("#scene-name")).toHaveText("Aurora Lyra");
});

test("auto-read advances and pauses while a panel is open", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#autoplay").click();
  await page.clock.fastForward(60000);
  await expect(page.locator("#page-count")).toHaveText("002 / 143");
  await page.locator("#settings").click();
  await page.clock.fastForward(120000);
  await expect(page.locator("#page-count")).toHaveText("002 / 143");
  await page.keyboard.press("Escape");
  await page.clock.fastForward(60000);
  await expect(page.locator("#page-count")).toHaveText("003 / 143");
  await page.locator("#previous").click();
  await expect(page.locator("#autoplay")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

for (const viewport of [
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
]) {
  test(`readable and navigable at ${viewport.width} by ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("#begin")).toBeInViewport();
    await page.screenshot({ path: `test-results/cover-${viewport.width}.png` });
    await page.locator("#begin").click();
    const long = story.beats.findIndex((b) =>
      b.paragraphs[0].startsWith("The vibrant hum"),
    );
    await page.locator("#progress").fill(String(long));
    await page.locator("#progress").dispatchEvent("input");
    await expect(page.locator("#next")).toBeInViewport();
    expect(
      await page.locator("#reading-area").evaluate((el) => el.clientHeight),
    ).toBeGreaterThan(100);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: `test-results/reader-${viewport.width}.png`,
    });
    await page
      .locator("#reading-area")
      .evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.locator("#next").click();
    await expect(page.locator("#page-count")).toHaveText(
      `${String(long + 2).padStart(3, "0")} / 143`,
    );
  });
}

test("story remains readable without WebGL or persistent storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  });
  await page.goto("/");
  await page.locator("#begin").click();
  await expect(page.locator("#prose p")).toHaveText(
    story.beats[0].paragraphs[0],
  );
  await page.locator("#next").click();
  await expect(page.locator("#page-count")).toHaveText("002 / 143");
});
