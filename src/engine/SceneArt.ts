import { Container, Graphics } from "pixi.js";
import { sceneArt, type ArtworkId } from "../data/sceneArt";

const ink = "#101d19";
const brass = "#c5a56c";
const silver = "#b6d5d4";

// Local coordinates describe an engraved plate, centered on the subject rather
// than the viewport. The stage can reframe the whole plate for portrait screens.
function plate(parent: Container, label: string) {
  const layer = new Container();
  layer.label = label;
  parent.addChild(layer);
  return layer;
}

function pen(parent: Container) {
  const g = new Graphics();
  parent.addChild(g);
  return g;
}

function ring(
  parent: Container,
  x: number,
  y: number,
  r: number,
  color = brass,
) {
  const g = pen(parent);
  g.circle(x, y, r).stroke({ color, width: 1.4, alpha: 0.65 });
  g.circle(x, y, r - 7).stroke({ color, width: 0.7, alpha: 0.3 });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const length = i % 4 === 0 ? 12 : 5;
    g.moveTo(x + Math.cos(a) * (r - length), y + Math.sin(a) * (r - length))
      .lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      .stroke({ color, width: 1, alpha: 0.5 });
  }
  return g;
}

function human(parent: Container, x: number, y: number, woman: boolean) {
  const layer = plate(parent, woman ? "isolabella" : "torin");
  layer.position.set(x, y);
  const g = pen(layer);
  g.ellipse(0, -67, 17, 23)
    .fill(ink)
    .stroke({ color: brass, width: 1.5, alpha: 0.8 });
  if (woman) {
    g.moveTo(0, -89).bezierCurveTo(24, -92, 24, -46, 12, -39).stroke({
      color: brass,
      width: 2,
      alpha: 0.65,
    });
    g.poly([-12, -41, 14, -41, 22, 8, 43, 93, -36, 93, -18, 5])
      .fill(ink)
      .stroke({ color: brass, width: 1.5, alpha: 0.7 });
  } else {
    g.poly([-22, -39, 18, -39, 29, 66, -30, 66])
      .fill(ink)
      .stroke({ color: brass, width: 1.5, alpha: 0.7 });
    g.moveTo(-16, 66)
      .lineTo(-19, 106)
      .moveTo(15, 66)
      .lineTo(19, 106)
      .stroke({ color: brass, width: 6, alpha: 0.4 });
    g.moveTo(-9, -35)
      .lineTo(0, -12)
      .lineTo(9, -35)
      .stroke({ color: brass, width: 1, alpha: 0.7 });
  }
  const direction = woman ? -1 : 1;
  g.moveTo(direction * 19, -25)
    .lineTo(direction * 38, 2)
    .lineTo(direction * 70, -12)
    .stroke({ color: brass, width: 4, alpha: 0.6 });
  for (let i = 0; i < 7; i++)
    g.moveTo(-16 + i * 5, 24)
      .lineTo(-22 + i * 6, 62)
      .stroke({ color: brass, width: 0.6, alpha: 0.22 });
}

function exhibition(root: Container, id: ArtworkId) {
  const broken = id === "exhibition_aftermath";
  const unstable = id === "exhibition_unstable";
  const light = broken || unstable ? "#84e6f5" : brass;
  const back = plate(root, "exhibition-backdrop");
  const g = pen(back);
  // A scalloped exhibition arch and radial construction lines.
  ring(back, 0, -30, 258, brass);
  for (let i = 0; i < 13; i++) {
    const x = -300 + i * 50;
    g.moveTo(x, -310)
      .lineTo(x * 0.82, -210)
      .stroke({ color: brass, width: 1, alpha: 0.2 });
  }
  g.roundRect(-300, -320, 600, 650, 150).stroke({
    color: brass,
    width: 2,
    alpha: 0.22,
  });
  const subjects = plate(root, "exhibition-subjects");
  human(subjects, -206, 145, false);
  if (!broken) human(subjects, 207, 145, true);
  const machine = plate(root, "resonator");
  const m = pen(machine);
  m.poly([-135, 196, -112, -120, -80, -150, 80, -150, 112, -120, 135, 196])
    .fill({ color: ink, alpha: 0.94 })
    .stroke({ color: brass, width: 2, alpha: 0.7 });
  for (const side of [-1, 1]) {
    m.roundRect(side * 153 - 13, -73, 26, 210, 12)
      .fill(ink)
      .stroke({ color: brass, width: 2, alpha: 0.6 });
    for (let i = 0; i < 9; i++)
      m.moveTo(side * 153 - 17, i * 19 - 58)
        .lineTo(side * 153 + 17, i * 19 - 58)
        .stroke({ color: brass, width: 1, alpha: 0.4 });
  }
  if (!broken) {
    ring(machine, 0, -28, 100, light);
    ring(machine, 0, -28, 72, light);
    m.ellipse(0, -28, 28, 64).stroke({ color: light, width: 2, alpha: 0.8 });
    m.ellipse(0, -28, 64, 23).stroke({ color: light, width: 1.2, alpha: 0.65 });
    m.circle(0, -28, 13).fill({ color: light, alpha: unstable ? 0.95 : 0.5 });
    for (let i = 0; i < 6; i++)
      m.circle(0, -28, 32 + i * 13).fill({
        color: light,
        alpha: unstable ? 0.025 : 0.008,
      });
  } else {
    // The broken aperture and abandoned engraving tool remain after the flash.
    m.poly([-80, -92, -28, -65, -46, -18, 10, 8, -15, 56, 70, 73]).stroke({
      color: light,
      width: 2,
      alpha: 0.7,
    });
    for (let i = 0; i < 13; i++) {
      const x = -105 + i * 19;
      const y = 244 + (i % 3) * 17;
      m.poly([x, y, x + 15, y - 11, x + 19, y + 6]).stroke({
        color: brass,
        width: 1,
        alpha: 0.65,
      });
    }
    m.moveTo(178, 255)
      .lineTo(231, 269)
      .stroke({ color: brass, width: 3, alpha: 0.7 });
  }
  const front = plate(root, "exhibition-console");
  const f = pen(front);
  f.poly([-170, 142, 170, 142, 199, 207, -199, 207])
    .fill(ink)
    .stroke({ color: brass, width: 1.5, alpha: 0.75 });
  for (const x of [-100, 0, 100]) {
    ring(front, x, 174, 22, light);
    f.moveTo(x, 174)
      .lineTo(x + (unstable ? 15 : -12), 160)
      .stroke({ color: light, width: 1.5, alpha: 0.9 });
  }
  f.rect(-210, 210, 420, 12).fill({ color: brass, alpha: 0.4 });
  for (const x of [-178, 178])
    f.moveTo(x, 222)
      .lineTo(x, 310)
      .stroke({ color: brass, width: 5, alpha: 0.35 });
  if (unstable) {
    for (const side of [-1, 1])
      f.moveTo(side * 152, -85)
        .bezierCurveTo(side * 250, -135, side * 130, -170, side * 208, -240)
        .stroke({ color: silver, width: 9, alpha: 0.15 });
  }
}

function deity(parent: Container, x: number, industrial: boolean) {
  const layer = plate(parent, industrial ? "dagon" : "hecate");
  layer.position.set(x, industrial ? -30 : -80);
  const g = pen(layer);
  const color = industrial ? brass : silver;
  ring(layer, 0, -142, industrial ? 78 : 65, color);
  if (industrial) {
    g.poly([-74, -65, -109, -25, -86, 129, 86, 129, 109, -25, 74, -65])
      .fill(ink)
      .stroke({ color, width: 2, alpha: 0.8 });
    g.roundRect(-37, -174, 74, 67, 10)
      .fill(ink)
      .stroke({ color, width: 2, alpha: 0.85 });
    for (const s of [-1, 1]) {
      g.rect(s * 102 - 18, -14, 36, 148)
        .fill(ink)
        .stroke({ color, width: 2, alpha: 0.65 });
      g.rect(s * 47 - 21, 130, 42, 89)
        .fill(ink)
        .stroke({ color, width: 2, alpha: 0.65 });
      g.moveTo(s * 24, -148)
        .lineTo(s * 9, -148)
        .stroke({ color: "#f1cc88", width: 3, alpha: 0.9 });
    }
    g.ellipse(0, 25, 41, 65)
      .fill({ color: "#c4833e", alpha: 0.2 })
      .stroke({ color, width: 2, alpha: 0.8 });
    for (let i = 0; i < 7; i++)
      g.moveTo(-43, -24 + i * 16)
        .lineTo(43, -24 + i * 16)
        .stroke({ color, width: 3, alpha: 0.65 });
  } else {
    g.poly([
      0, -93, -39, -59, -23, 29, -66, 177, 0, 201, 66, 177, 23, 29, 39, -59,
    ])
      .fill({ color: ink, alpha: 0.88 })
      .stroke({ color, width: 1.6, alpha: 0.9 });
    g.ellipse(0, -133, 24, 33)
      .fill(ink)
      .stroke({ color, width: 1.5, alpha: 0.9 });
    for (let i = 0; i < 11; i++) {
      const x = (i - 5) * 8;
      g.moveTo(x * 0.4, -165)
        .bezierCurveTo(x * 2, -205, x * 2.4, -95, x * 1.6, -66)
        .stroke({ color: brass, width: 1, alpha: 0.6 });
    }
    for (const s of [-1, 1])
      g.moveTo(s * 37, -48)
        .lineTo(s * 66, 22)
        .lineTo(s * 89, 55)
        .stroke({ color, width: 3, alpha: 0.75 });
    for (let i = 0; i < 5; i++) {
      ring(layer, (i % 2 ? 1 : -1) * 10, -33 + i * 43, 13, color);
      g.moveTo(-27, 56 + i * 23)
        .lineTo(27, 83 + i * 23)
        .stroke({ color, width: 0.6, alpha: 0.35 });
    }
  }
}

function gods(root: Container, id: ArtworkId) {
  const back = plate(root, "celestial-thrones");
  const g = pen(back);
  for (let i = 0; i < 4; i++)
    g.ellipse(0, -230, 285 - i * 38, 95 - i * 13).stroke({
      color: silver,
      width: 1,
      alpha: 0.28,
    });
  for (const x of [-155, 155]) {
    g.poly([x - 112, 183, x - 98, -205, x, -270, x + 98, -205, x + 112, 183])
      .fill({ color: ink, alpha: 0.7 })
      .stroke({ color: brass, width: 2, alpha: 0.45 });
    for (let i = 0; i < 7; i++)
      g.moveTo(x - 85 + i * 28, -180)
        .lineTo(x - 85 + i * 28, 140)
        .stroke({ color: brass, width: 0.7, alpha: 0.2 });
    ring(back, x, -97, 62, brass);
    g.rect(x - 113, 145, 226, 22)
      .fill(ink)
      .stroke({ color: brass, width: 1.5, alpha: 0.55 });
  }
  if (id === "gods_hecate" || id === "gods_revealed") deity(root, -155, false);
  if (id === "gods_revealed") deity(root, 155, true);
  const front = plate(root, "audience-floor");
  const f = pen(front);
  for (let i = 0; i < 4; i++)
    f.ellipse(0, 255 + i * 16, 190 + i * 47, 30 + i * 7).stroke({
      color: brass,
      width: 1,
      alpha: 0.3,
    });
  const torin = plate(front, "mortal-scale");
  torin.position.set(0, 218);
  torin.scale.set(0.52);
  human(torin, 0, 0, false);
  if (id !== "gods_empty") {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const x = side * 155 + (i - 2.5) * 17;
        f.moveTo(x, 160)
          .bezierCurveTo(x - 50, 5, x + 60, -135, x - 15, -330)
          .stroke({
            color: silver,
            width: 12,
            alpha: id === "gods_steam" ? 0.12 : 0.035,
          });
      }
    }
  }
}

function aurora(root: Container, singing: boolean) {
  const back = plate(root, "concert-shell");
  const g = pen(back);
  // Paired resonance curves recall the exhibition's shared invention.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = side * (105 + i * 22);
      g.moveTo(x, 130)
        .lineTo(x, -210 + i * 20)
        .stroke({ color: brass, width: 5, alpha: 0.22 });
      g.circle(x, -212 + i * 20, 5).stroke({
        color: brass,
        width: 1,
        alpha: 0.65,
      });
    }
    for (let i = 0; i < 4; i++)
      g.ellipse(side * 95, -55, 100 + i * 30, 180 + i * 25).stroke({
        color: side < 0 ? silver : brass,
        width: 1,
        alpha: singing ? 0.32 : 0.09,
      });
  }
  ring(back, 0, -83, 114, brass);
  const performer = plate(root, "aurora-lyra");
  const a = pen(performer);
  a.ellipse(0, -145, 26, 34)
    .fill(ink)
    .stroke({ color: silver, width: 1.7, alpha: 0.9 });
  a.poly([0, -110, -35, -76, -24, 8, -84, 170, 0, 196, 84, 170, 24, 8, 35, -76])
    .fill(ink)
    .stroke({ color: brass, width: 2, alpha: 0.9 });
  for (let i = 0; i < 9; i++)
    a.moveTo(0, -6)
      .lineTo((i - 4) * 18, 166)
      .stroke({ color: brass, width: 0.8, alpha: 0.4 });
  for (const side of [-1, 1]) {
    const handY = singing ? -88 : 39;
    a.moveTo(side * 34, -73)
      .lineTo(side * 69, -20)
      .lineTo(side * 112, handY)
      .stroke({ color: silver, width: 4, alpha: 0.8 });
    ring(performer, side * 69, -20, 8, brass);
    a.circle(side * 112, handY, 5).fill({ color: brass, alpha: 0.8 });
    a.moveTo(side * 7, -151)
      .lineTo(side * 17, -151)
      .stroke({ color: brass, width: 1.5, alpha: 0.9 });
  }
  ring(performer, 0, -46, 20, singing ? silver : brass);
  a.circle(0, -46, 8).fill({ color: singing ? silver : brass, alpha: 0.75 });
  for (let i = 0; i < 7; i++) {
    a.moveTo((i - 3) * 7, -173)
      .lineTo((i - 3) * 13, -195 + Math.abs(i - 3) * 8)
      .stroke({ color: brass, width: 1.5, alpha: 0.7 });
  }
  const front = plate(root, "concert-stage");
  const f = pen(front);
  for (let i = 0; i < 3; i++)
    f.ellipse(0, 214 + i * 14, 190 + i * 40, 32)
      .fill({ color: ink, alpha: 0.7 })
      .stroke({ color: brass, width: 1, alpha: 0.45 });
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 52;
    const y = 320 + (i % 2) * 21;
    f.circle(x, y, 12)
      .fill(ink)
      .stroke({ color: brass, width: 1, alpha: 0.25 });
    f.ellipse(x, y + 32, 23, 27)
      .fill(ink)
      .stroke({ color: brass, width: 1, alpha: 0.2 });
  }
}

export function createSceneArt(id: ArtworkId) {
  const root = new Container();
  root.label = "story-art";
  const composition = sceneArt[id].composition;
  if (composition === "exhibition") exhibition(root, id);
  else if (composition === "gods") gods(root, id);
  else aurora(root, id === "aurora_singing");
  return root;
}

export function frameSceneArt(scene: Container, portrait: boolean) {
  const art = scene.getChildByLabel("story-art");
  if (!art) return;
  art.position.set(portrait ? 800 : 1130, portrait ? 440 : 490);
  art.scale.set(portrait ? 0.72 : 1);
  // On small screens the text occupies the same area; preserve its contrast.
  art.alpha = portrait ? 0.48 : 1;
}
