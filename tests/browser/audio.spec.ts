import { test, expect } from "@playwright/test";

test("the narrative score schedules and cancels real Web Audio voices", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#begin").click();
  const result = await page.evaluate(async () => {
    const audioUrl = "/src/engine/AudioSynth.ts";
    const storyUrl = "/src/data/storyboard.ts";
    const { AudioSynth } = await import(audioUrl);
    const { beats } = await import(storyUrl);
    const audio = new AudioSynth();
    const beat = (prefix: string) =>
      beats.find((b: { paragraphs: string[] }) =>
        b.paragraphs[0].startsWith(prefix),
      );
    try {
      // Beginning or resuming can render a page before AudioContext.resume resolves.
      audio.setBeat(beats[0]);
      await audio.unlock();
      const duetVoices = audio.notes.size;
      const oldVoices = [...audio.notes.keys()];
      audio.setBeat(beat("He offered his voice"), false);
      const seekVoices = audio.notes.size;
      const seekState = audio.musicState;
      // Each superseded voice received a short stop, including future notes.
      await new Promise((resolve) => setTimeout(resolve, 160));
      const disconnectedVoices = oldVoices.every(
        (voice) => !audio.notes.has(voice),
      );
      audio.setBeat(beat("Before he could respond"));
      const silenceSeconds = audio.silenceUntil - audio.context.currentTime;
      const silenceVoices = audio.notes.size;
      audio.setBeat(beat("Her performances were legendary"));
      const finaleVoices = audio.notes.size;
      const finaleState = audio.musicState;
      audio.pause();
      return {
        duetVoices,
        seekVoices,
        seekState,
        disconnectedVoices,
        silenceSeconds,
        silenceVoices,
        finaleVoices,
        finaleState,
        pausedVoices: audio.notes.size,
      };
    } finally {
      audio.destroy();
    }
  });
  expect(result.duetVoices).toBe(12);
  expect(result.seekVoices).toBe(0);
  expect(result.seekState).toBe("voiceless");
  expect(result.disconnectedVoices).toBe(true);
  expect(result.silenceSeconds).toBeGreaterThan(1.5);
  expect(result.silenceVoices).toBe(0);
  expect(result.finaleVoices).toBe(15);
  expect(result.finaleState).toBe("remembrance");
  expect(result.pausedVoices).toBe(0);
});
