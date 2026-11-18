import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseManuscript } from "../src/data/parser.ts";
import { phrase } from "../src/data/score.ts";

const { beats } = parseManuscript(
  readFileSync(new URL("../story/manuscript.md", import.meta.url), "utf8"),
);
const page = (prefix) => {
  const beat = beats.find((b) => b.paragraphs[0].startsWith(prefix));
  assert.ok(beat, `Missing narrative anchor: ${prefix}`);
  return beat;
};

test("musical loss and recovery follow the actual manuscript", () => {
  for (const [prefix, state, cue] of [
    ["Torin, the famed", "together", "duet"],
    ["But during the debut", "together", "interrupted"],
    ["Before he could respond", "grieving", "silence"],
    ["Torin survived.", "grieving", "solo"],
    ["He offered his voice", "voiceless", "outline"],
    ["As the engine hummed to life", "voiceless", "fragment"],
    ["Or not quite alone.", "presence", "answer"],
    ["Torin’s return", "voiceless", "outline"],
    ["Slowly, he regained his voice", "recovered", "solo"],
    ["Her performances were legendary", "remembrance", "reunion"],
    ["He never spoke of Isolabella", "recovered", "echo"],
  ]) {
    assert.equal(page(prefix).musicState, state, prefix);
    assert.equal(page(prefix).musicCue, cue, prefix);
  }
});

test("silent chapters never restore Torin's melody before his recovery", () => {
  const sacrifice = beats.indexOf(page("He offered his voice"));
  const recovery = beats.indexOf(page("Slowly, he regained his voice"));
  for (const beat of beats.slice(sacrifice, recovery)) {
    assert.ok(["voiceless", "presence"].includes(beat.musicState));
    assert.ok(
      phrase(beat.musicCue ?? "outline").every((n) => n.voice !== "torin"),
      beat.id,
    );
  }
});

test("the finale preserves both motifs and silence contains no notes", () => {
  const duet = phrase("duet");
  const reunion = phrase("reunion");
  const notes = (score, voice) =>
    score.filter((n) => n.voice === voice).map((n) => n.midi);
  assert.deepEqual(
    notes(reunion, "torin"),
    notes(duet, "torin").map((n) => n + 12),
  );
  assert.deepEqual(notes(reunion, "isolabella"), notes(duet, "isolabella"));
  assert.deepEqual(phrase("silence"), []);
  assert.equal(phrase("interrupted").length, 2);
});
