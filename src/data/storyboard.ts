import manuscript from "../../story/manuscript.md?raw";
import { parseManuscript } from "./parser";
export type { Act, Beat, Mood, Effect } from "./parser";
export const { title, chapters, beats } = parseManuscript(manuscript);
export const scenes = beats.filter(
  (beat, i) => i === 0 || beat.scene !== beats[i - 1].scene,
);
