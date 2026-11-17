import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parseManuscript } from '../src/data/parser.ts';
const manuscript = readFileSync(new URL('../story/manuscript.md', import.meta.url), 'utf8');
const original = readFileSync(new URL('../Story.txt', import.meta.url), 'utf8');
assert.equal(manuscript, original, 'The canonical manuscript must match the original byte for byte as UTF-8 text.');
const { title, beats, chapters } = parseManuscript(manuscript);
const actual = [title];
for (const [i, beat] of beats.entries()) {
  const chapter = chapters.find(c => c.firstBeat === i);
  if (chapter) actual.push(`Part ${chapter.act}: ${chapter.title}`);
  actual.push(...beat.paragraphs);
}
const expected = manuscript.replace(/^\uFEFF/, '').split(/\r?\n/).filter(p => p.trim());
assert.deepEqual(actual, expected, 'Paragraphs must be present verbatim, in order.');
console.log(`Verified ${beats.length} verbatim beats across ${chapters.length} acts; original text preserved.`);
