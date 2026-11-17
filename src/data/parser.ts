export type Act = 1 | 2 | 3 | 4;
export type Mood = 'warm_amber' | 'cerulean_crisis' | 'void_rift' | 'steam_brass' | 'divine_awe' | 'solemn_focus' | 'dissolution' | 'melancholy_silver' | 'hopeful_gold';
export type Effect = 'harmonic_pulse' | 'overheat_flash' | 'rift_tear' | 'memory_projection' | 'polarity_wave' | 'gods_arrival' | 'dissolve_particles' | 'aurora_song';
export interface Beat {
  id: string; act: Act; scene: string; location: string; mood: Mood;
  paragraphs: string[]; speaker: string; kind: 'narration' | 'dialogue' | 'written';
  camera: { zoom: number; panX: number; panY: number; shake?: number };
  effectTrigger?: Effect;
}
export interface Chapter { act: Act; title: string; firstBeat: number; }
type SceneCue = [string, string, string, Mood];
const cues: SceneCue[] = [
  ['Torin, the famed', 'torin_workshop_warm', 'A harmony of two', 'warm_amber'],
  ['They had met five', 'exhibition_hall', 'Where art meets science', 'warm_amber'],
  ['He had hired her', 'torin_workshop_warm', 'The shape of possibility', 'warm_amber'],
  ['But during the debut', 'exhibition_hall', 'The breaking point', 'cerulean_crisis'],
  ['Torin survived.', 'torin_workshop_moonlit', 'A room without her', 'melancholy_silver'],
  ['Finally, after months', 'aether_rift', 'The price of passage', 'void_rift'],
  ['The void between worlds', 'underworld_city', 'The city that breathes', 'steam_brass'],
  ["The Archivist's Hall", 'archivists_hall', 'The keepers of time', 'divine_awe'],
  ['That evening, finding', 'tarnished_gear_tavern', 'The Tarnished Gear', 'warm_amber'],
  ['The next morning, he set', 'molten_plains', 'Beyond the brass horizon', 'steam_brass'],
  ['On the third day', 'castle_gates', 'The guardians of passage', 'divine_awe'],
  ['The throne room doors', 'throne_room', 'The empty thrones', 'solemn_focus'],
  ['The silence shattered', 'throne_room', 'The Forged Gods', 'divine_awe'],
  ['They emerged into a vast', 'divine_workshop', 'A bargain with eternity', 'divine_awe'],
  ['Or not quite alone.', 'divine_workshop', 'The discipline of longing', 'solemn_focus'],
  ['As the deadline approached', 'divine_workshop', 'The Resonant Heart', 'hopeful_gold'],
  ['He turned, forgetting', 'divine_workshop', 'One last look', 'dissolution'],
  ['Torin’s return', 'torin_workshop_moonlit', 'The world that remained', 'melancholy_silver'],
  ['He dedicated himself', 'torin_workshop_warm', 'Instruments of connection', 'hopeful_gold'],
  ['Among his later works', 'concert_hall_aurora', 'Aurora Lyra', 'hopeful_gold'],
  ['He never spoke of Isolabella', 'torin_workshop_moonlit', 'An echo in the steam', 'melancholy_silver'],
];

export function parseManuscript(source: string): { title: string; chapters: Chapter[]; beats: Beat[] } {
  // Each manuscript line is a paragraph. Preserve its exact content, including trailing spaces.
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim().length > 0);
  const title = lines.shift()!;
  const chapters: Chapter[] = [];
  const beats: Beat[] = [];
  let act: Act = 1;
  let scene = cues[0];
  for (const paragraph of lines) {
    const heading = paragraph.match(/^Part ([1-4]): (.+)$/);
    if (heading) {
      act = Number(heading[1]) as Act;
      chapters.push({ act, title: heading[2], firstBeat: beats.length });
      continue;
    }
    scene = cues.find(cue => paragraph.startsWith(cue[0])) ?? scene;
    const written = (act === 2 || act === 3) && /(?:he wrote:|Torin scribbled|Torin wrote|held up the note—)/.test(paragraph);
    const spoken = /["“]/.test(paragraph);
    let speaker = 'Narrator';
    if (written) speaker = 'Torin';
    else if (spoken) {
      const attribution = paragraph.match(/(?:"|”)[, .]*\s*(?:the )?(Torin|Isolabella|Marcus|Hecate|Dagon|Archivist)\b/i)
        ?? paragraph.match(/\b(Torin|Isolabella|Marcus|Hecate|Dagon|Archivist)(?:’s|'s)?[^"“]{0,45}(?:said|replied|asked|voice|called|warned|countered|announced|whispered|snapped|muttered|completed)/i);
      speaker = attribution?.[1] ?? 'Voices';
      if (/"It works,"/.test(paragraph)) speaker = 'Isolabella';
    }
    let effectTrigger: Effect | undefined;
    if (/aetheric backlash/.test(paragraph)) effectTrigger = 'overheat_flash';
    else if (/Torin was pulled into/.test(paragraph)) effectTrigger = 'rift_tear';
    else if (/From its crystal aperture/.test(paragraph)) effectTrigger = 'memory_projection';
    else if (/He activated the Polarity/.test(paragraph)) effectTrigger = 'polarity_wave';
    else if (/twin columns of steam/.test(paragraph)) effectTrigger = 'gods_arrival';
    else if (/body begin to dissolve/.test(paragraph)) effectTrigger = 'dissolve_particles';
    else if (/Her performances were legendary/.test(paragraph)) effectTrigger = 'aurora_song';
    else if (/device hummed to life under/.test(paragraph)) effectTrigger = 'harmonic_pulse';
    beats.push({
      id: `act-${act}-beat-${beats.length + 1}`, act, scene: scene[2], location: scene[1], mood: scene[3],
      paragraphs: [paragraph], speaker, kind: written ? 'written' : spoken ? 'dialogue' : 'narration',
      camera: { zoom: scene[3] === 'dissolution' ? 1.12 : 1 + (beats.length % 4) * 0.012, panX: Math.sin(beats.length * .7) * 18, panY: Math.cos(beats.length * .5) * 8, shake: effectTrigger === 'overheat_flash' ? 12 : undefined },
      effectTrigger,
    });
  }
  if (chapters.length !== 4 || !beats.length) throw new Error('The manuscript must contain all four parts.');
  return { title, chapters, beats };
}
