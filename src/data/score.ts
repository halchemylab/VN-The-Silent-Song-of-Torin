export type MusicState =
  | "together"
  | "grieving"
  | "voiceless"
  | "presence"
  | "recovered"
  | "remembrance";
export type MusicCue =
  | "duet"
  | "interrupted"
  | "silence"
  | "solo"
  | "outline"
  | "fragment"
  | "answer"
  | "reunion"
  | "echo";

/** Narrative anchors, independent of page numbers and reading history. */
export function scoreParagraph(
  text: string,
  previous: MusicState,
): { state: MusicState; cue?: MusicCue } {
  if (text.startsWith("But during the debut"))
    return { state: previous, cue: "interrupted" };
  if (text.startsWith("Before he could respond"))
    return { state: "grieving", cue: "silence" };
  if (text.startsWith("Torin survived."))
    return { state: "grieving", cue: "solo" };
  if (text.startsWith("He offered his voice"))
    return { state: "voiceless", cue: "outline" };
  if (text.startsWith("Or not quite alone."))
    return { state: "presence", cue: "answer" };
  if (text.startsWith("Torin’s return"))
    return { state: "voiceless", cue: "outline" };
  if (text.startsWith("Slowly, he regained his voice"))
    return { state: "recovered", cue: "solo" };
  if (text.startsWith("Her performances were legendary"))
    return { state: "remembrance", cue: "reunion" };
  if (text.startsWith("He never spoke of Isolabella"))
    return { state: "recovered", cue: "echo" };
  if (text.startsWith('"With your hands guiding mine?'))
    return { state: previous, cue: "duet" };
  if (text.startsWith("Torin, the famed"))
    return { state: "together", cue: "duet" };
  if (text.startsWith("As the engine hummed to life"))
    return { state: previous, cue: "fragment" };
  if (text.startsWith("Days turned to weeks"))
    return { state: previous, cue: "answer" };
  if (text.startsWith('"It works,"')) return { state: previous, cue: "answer" };
  return { state: previous };
}

// D–F–E–A: Torin's question; A–G–E–D: Isolabella's answer.
// Seconds are deliberately spacious so the phrases sit beneath the prose.
export interface ScoreNote {
  midi: number;
  at: number;
  duration: number;
  voice: "torin" | "isolabella" | "harmony";
  level: number;
}
export function phrase(cue: MusicCue): ScoreNote[] {
  const question = [62, 65, 64, 69];
  const answer = [81, 79, 76, 74];
  const line = (
    notes: number[],
    voice: ScoreNote["voice"],
    start = 0,
    level = 1,
    spacing = 0.85,
  ): ScoreNote[] =>
    notes.map((midi, i) => ({
      midi,
      at: start + i * spacing,
      duration: 2.2,
      voice,
      level,
    }));
  switch (cue) {
    case "silence":
      return [];
    case "interrupted":
      return line(question.slice(0, 2), "torin");
    case "solo":
      return line(question, "torin", 0, 0.8, 1.05);
    case "outline":
      return line([50, 57], "harmony", 0, 0.45, 2.5);
    case "fragment":
      return line(answer.slice(0, 2), "isolabella", 0, 0.45, 1.3);
    case "answer":
      return line(answer, "isolabella", 0, 0.5, 1.1);
    case "echo":
      return line(answer.slice(2), "isolabella", 0, 0.35, 1.5);
    case "duet":
      return [
        ...line(question, "torin"),
        ...line(answer, "isolabella", 3.6, 0.8),
      ];
    case "reunion":
      return [
        ...line(
          question.map((n) => n + 12),
          "torin",
          0,
          0.8,
          1.1,
        ),
        ...line(answer, "isolabella", 4.6, 0.85, 1.1),
        ...line([50, 57, 62], "harmony", 0, 0.6, 3),
      ];
  }
}
