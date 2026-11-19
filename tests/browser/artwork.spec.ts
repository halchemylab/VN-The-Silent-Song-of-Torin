import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseManuscript } from "../../src/data/parser";

const { beats } = parseManuscript(
  readFileSync(new URL("../../story/manuscript.md", import.meta.url), "utf8"),
);

async function seek(page: Page, id: string) {
  const index = beats.findIndex((b) => b.artwork === id);
  expect(index).toBeGreaterThanOrEqual(0);
  await page.locator("#progress").fill(String(index));
  await expect(page.locator("#stage canvas")).toHaveAttribute(
    "data-artwork",
    id,
  );
  await expect(page.locator("#prose p")).toHaveText(beats[index].paragraphs[0]);
  await expect(page.locator("#page")).toHaveCSS("opacity", "1");
}

// Give each desktop capture its own test budget. Software WebGL rendering on
// CI can exhaust a single 60-second test when all twelve captures share it.
for (const id of [
  "exhibition_intact",
  "exhibition_unstable",
  "exhibition_aftermath",
  "gods_empty",
  "gods_steam",
  "gods_hecate",
  "gods_revealed",
  "aurora_waiting",
  "aurora_singing",
]) {
  test(`illustrated scene: ${id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.locator("#begin").click();
    await seek(page, id);
    await page.screenshot({ path: `test-results/art-${id}.png` });
    expect(errors).toEqual([]);
  });
}

test("illustrated scenes restore on seeks, reverse navigation, and resume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#begin").click();
  const canvas = page.locator("#stage canvas");
  await seek(page, "exhibition_aftermath");
  await page.locator("#previous").click();
  await expect(canvas).toHaveAttribute("data-artwork", "exhibition_unstable");
  await page.locator("#next").click();
  await expect(canvas).toHaveAttribute("data-artwork", "exhibition_aftermath");
  // Interrupt an active flash immediately, then revisit the same location.
  await seek(page, "gods_revealed");
  await seek(page, "exhibition_intact");
  await seek(page, "gods_hecate");
  await page.reload();
  await page.locator("#begin").click();
  await expect(canvas).toHaveAttribute("data-artwork", "gods_hecate");
  expect(errors).toEqual([]);
});

test("illustrated scenes remain navigable on mobile with reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#settings").click();
  await page.locator("#motion-setting").check();
  await page.keyboard.press("Escape");
  await seek(page, "aurora_singing");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#next")).toBeInViewport();
  await page.screenshot({ path: "test-results/art-aurora-mobile.png" });
  await seek(page, "gods_revealed");
  await page.screenshot({ path: "test-results/art-gods-mobile.png" });
  await seek(page, "exhibition_unstable");
  await page.screenshot({ path: "test-results/art-exhibition-mobile.png" });
  expect(errors).toEqual([]);
});
