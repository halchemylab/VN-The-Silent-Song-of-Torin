// Artwork is derived alongside the prose, so seeking never depends on a played animation.
export const sceneArt = {
  exhibition_intact: { composition: "exhibition", zoom: 1 },
  exhibition_unstable: { composition: "exhibition", zoom: 1.035 },
  exhibition_aftermath: { composition: "exhibition", zoom: 1 },
  gods_empty: { composition: "gods", zoom: 1 },
  gods_steam: { composition: "gods", zoom: 1 },
  gods_hecate: { composition: "gods", zoom: 1.015 },
  gods_revealed: { composition: "gods", zoom: 1 },
  aurora_waiting: { composition: "aurora", zoom: 1 },
  aurora_singing: { composition: "aurora", zoom: 1.025 },
} as const;

export type ArtworkId = keyof typeof sceneArt;

export function resolveArtwork(
  location: string,
  paragraph: string,
  previous?: ArtworkId,
): ArtworkId | undefined {
  if (location === "exhibition_hall") {
    if (paragraph.includes("aetheric backlash")) return "exhibition_aftermath";
    if (/pressure's rising|Warning lights/.test(paragraph))
      return "exhibition_unstable";
    return previous?.startsWith("exhibition_") ? previous : "exhibition_intact";
  }
  if (location === "throne_room") {
    if (paragraph.startsWith("The silence shattered")) return "gods_steam";
    if (paragraph.startsWith("From the left column")) return "gods_hecate";
    if (paragraph.startsWith("From the right column")) return "gods_revealed";
    return previous?.startsWith("gods_") ? previous : "gods_empty";
  }
  if (location === "concert_hall_aurora") {
    if (paragraph.startsWith("Her performances were legendary"))
      return "aurora_singing";
    return previous?.startsWith("aurora_") ? previous : "aurora_waiting";
  }
  return undefined;
}
