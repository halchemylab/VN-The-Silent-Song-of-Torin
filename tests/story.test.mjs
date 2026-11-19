import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseManuscript } from "../src/data/parser.ts";
const manuscript = readFileSync(
  new URL("../story/manuscript.md", import.meta.url),
  "utf8",
);
test("all four acts have ordered, unique beats and complete scene metadata", () => {
  const { beats, chapters } = parseManuscript(manuscript);
  assert.deepEqual(
    chapters.map((c) => c.act),
    [1, 2, 3, 4],
  );
  assert.equal(new Set(beats.map((b) => b.id)).size, beats.length);
  assert.ok(
    beats.every((b) => b.location && b.scene && b.mood && b.paragraphs.length),
  );
  assert.ok(beats.every((b, i) => i === 0 || b.act >= beats[i - 1].act));
});
test("every cinematic trigger occurs and written communication is identified", () => {
  const { beats } = parseManuscript(manuscript);
  assert.equal(
    new Set(beats.flatMap((b) => (b.effectTrigger ? [b.effectTrigger] : [])))
      .size,
    8,
  );
  for (const text of [
    "Anything.",
    "Why?",
    "I've come for Isolabella",
    "I'm looking for someone",
    "Gods?",
  ]) {
    assert.ok(
      beats.some((b) => b.paragraphs[0].includes(text) && b.kind === "written"),
      text,
    );
  }
});
test("malformed manuscripts fail explicitly", () =>
  assert.throws(() => parseManuscript("Incomplete")));

test("illustrated states follow the prose without revealing later events", () => {
  const { beats } = parseManuscript(manuscript);
  const artwork = (prefix) => {
    const beat = beats.find((b) => b.paragraphs[0].startsWith(prefix));
    assert.ok(beat, prefix);
    return beat.artwork;
  };
  assert.equal(artwork("They had met five"), "exhibition_intact");
  assert.equal(artwork("But during the debut"), "exhibition_intact");
  assert.equal(artwork('"The pressure'), "exhibition_unstable");
  assert.equal(artwork('"Torin," Isolabella'), "exhibition_unstable");
  assert.equal(artwork("Before he could respond"), "exhibition_aftermath");
  assert.equal(artwork("Torin survived."), undefined);
  assert.equal(artwork("The throne room doors"), "gods_empty");
  assert.equal(artwork("The silence shattered"), "gods_steam");
  assert.equal(artwork("From the left column"), "gods_hecate");
  assert.equal(artwork('"A fleshling seeks'), "gods_hecate");
  assert.equal(artwork("From the right column"), "gods_revealed");
  assert.equal(artwork("Among his later works"), "aurora_waiting");
  assert.equal(artwork("Her performances were legendary"), "aurora_singing");
  assert.equal(artwork("He never spoke of Isolabella"), undefined);
});
