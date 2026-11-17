import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseManuscript } from '../src/data/parser.ts';
const manuscript = readFileSync(new URL('../story/manuscript.md', import.meta.url), 'utf8');
test('all four acts have ordered, unique beats and complete scene metadata', () => {
  const { beats, chapters } = parseManuscript(manuscript);
  assert.deepEqual(chapters.map(c => c.act), [1,2,3,4]);
  assert.equal(new Set(beats.map(b => b.id)).size, beats.length);
  assert.ok(beats.every(b => b.location && b.scene && b.mood && b.paragraphs.length));
  assert.ok(beats.every((b,i) => i === 0 || b.act >= beats[i-1].act));
});
test('every cinematic trigger occurs and written communication is identified', () => {
  const { beats } = parseManuscript(manuscript);
  assert.equal(new Set(beats.flatMap(b => b.effectTrigger ? [b.effectTrigger] : [])).size, 8);
  for (const text of ['Anything.', 'Why?', "I've come for Isolabella", "I'm looking for someone", 'Gods?']) {
    assert.ok(beats.some(b => b.paragraphs[0].includes(text) && b.kind === 'written'), text);
  }
});
test('malformed manuscripts fail explicitly', () => assert.throws(() => parseManuscript('Incomplete')));
