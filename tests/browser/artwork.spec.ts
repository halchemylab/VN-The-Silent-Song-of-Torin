import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseManuscript } from "../../src/data/parser";

const { beats } = parseManuscript(
  readFileSync(new URL("../../story/manuscript.md", import.meta.url), "utf8"),
);

test("illustrated scenes restore on seeks, reverse navigation, and resume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#begin").click();
  const canvas = page.locator("#stage canvas");
  const seek = async (id: string) => {
    const index = beats.findIndex((b) => b.artwork === id);
    expect(index).toBeGreaterThanOrEqual(0);
    await page.locator("#progress").fill(String(index));
    await expect(canvas).toHaveAttribute("data-artwork", id);
    await expect(page.locator("#prose p")).toHaveText(
      beats[index].paragraphs[0],
    );
    await expect(page.locator("#page")).toHaveCSS("opacity", "1");
  };
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
    await seek(id);
    await page.screenshot({ path: `test-results/art-${id}.png` });
  }
  await seek("exhibition_aftermath");
  await page.locator("#previous").click();
  await expect(canvas).toHaveAttribute("data-artwork", "exhibition_unstable");
  await page.locator("#next").click();
  await expect(canvas).toHaveAttribute("data-artwork", "exhibition_aftermath");
  // Interrupt an active flash immediately, then revisit the same location.
  await seek("gods_revealed");
  await seek("exhibition_intact");
  await seek("gods_hecate");
  await page.reload();
  await page.locator("#begin").click();
  await expect(canvas).toHaveAttribute("data-artwork", "gods_hecate");
  await page.locator("#settings").click();
  await page.locator("#motion-setting").check();
  await page.keyboard.press("Escape");
  await seek("aurora_singing");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#next")).toBeInViewport();
  await page.screenshot({ path: "test-results/art-aurora-mobile.png" });
  await seek("gods_revealed");
  await page.screenshot({ path: "test-results/art-gods-mobile.png" });
  await seek("exhibition_unstable");
  await page.screenshot({ path: "test-results/art-exhibition-mobile.png" });
  expect(errors).toEqual([]);
});
