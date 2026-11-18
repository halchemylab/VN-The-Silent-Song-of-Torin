# The Silent Song of Torin

A four-part kinetic storybook about love, invention, and the memories that survive us. The entire manuscript is presented verbatim across 143 pages, with procedural clockwork scenery and a synthesized ambient score.

## Run locally

Use Node.js **22.18+** (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm run build
npm run preview
```

The production build is written to `dist/`. Serve that directory with a static web host; opening `index.html` directly from the filesystem is unsupported. Asset paths are relative, so the build can be hosted at a domain root or a repository subdirectory. This repository does not automatically publish a public website.

## Reading

- Select **Begin reading**, or continue from your saved page.
- Use **Right Arrow**, **Space**, **Next page**, or click the story text to advance. Space scrolls a long page before advancing; clicking only advances when its bottom is visible. **Left Arrow** goes back.
- **Chapters** opens all four acts, with expandable scene lists. The bottom timeline jumps to any page, and the Roman numeral markers jump to chapter beginnings.
- **Auto-read** paces each page by word count and gently scrolls overflowing text. Manual navigation or manual scrolling pauses it. Opening a panel or hiding the tab pauses its timer.
- **Reading settings** controls text size, auto-read speed, sound volume, mute, and reduced motion. Settings and your last page are saved locally when browser storage is available.
- Sound begins only after a reading action. Returning to the title fades it out. No MP3 files or external audio services are used.
- A shared musical theme follows Torin and Isolabella: paired phrases in their early workshop, an interrupted phrase and brief silence at the accident, an unanswered melody in grief, and only harmonic traces after his sacrifice. Memories and the forbidden collaboration reveal fragments of her answer. Torin's phrase returns when his voice recovers; Aurora Lyra carries both themes in a new arrangement. Page changes cancel unfinished notes, and chapter jumps restore the appropriate musical state.

The reader works without WebGL using a still background. Reduced motion disables camera movement, particles, flashes, and text reveals. Longer paragraphs remain scrollable at large text sizes and small viewports. Google Fonts enhance the typography when reachable; system serif and monospace fallbacks keep the reader usable without them.

## Source and structure

`Story.txt` is the unmodified original. `story/manuscript.md` is its canonical application copy, with identical prose, punctuation, paragraph order, and whitespace within paragraphs. Verification allows Windows/Unix line-ending differences. `Prompt.txt` contains the original creative brief.

| File                          | Responsibility                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/data/parser.ts`          | Lossless paragraph parsing, scene boundaries, dialogue/notebook metadata, cinematic cues                           |
| `src/data/storyboard.ts`      | Imports the complete manuscript and exports all beats, chapters, and scenes                                        |
| `src/engine/StageManager.ts`  | PixiJS v8 stage, architectural compositions, gears, glow, steam, particles, custom vignette/grain/chromatic shader |
| `src/engine/Choreographer.ts` | GSAP camera movement, crossfades, text reveals, and auto-scroll                                                    |
| `src/engine/AudioSynth.ts`    | Web Audio drones, clock ticks, chimes, and cue-triggered harmonics                                                 |
| `src/ui/StoryReader.ts`       | Reading flow, dialogs, accessibility controls, progress, persistence                                               |
| `src/style.css`               | Responsive layout, literary typography, brass accents, and still-background fallback                               |

Beats are derived directly from the manuscript rather than maintaining a second, duplicated copy of the prose. Each beat carries an act, location, mood, camera, speaker, and presentation kind, with effect triggers where appropriate. The manuscript stays independent of visual direction. When editing the story deliberately, update both manuscript copies and review the scene prefixes and cue matching in the parser.

Scenery uses a logical 1600 × 1000 composition, centered and scaled to cover the viewport. Camera motion and pointer parallax use separate depth layers. Particle count, display resolution (capped at 1.5×), and the render loop (capped at 60 fps) are bounded. Rendering and sound suspend in hidden tabs. Frame rate varies with hardware, screen size, and browser; 60 fps is a target rather than a guarantee.

## Verification

```sh
npm run verify:story
npm test
npm run test:browser
```

The production build includes manuscript verification and strict TypeScript checking. Unit tests check act ordering, metadata, written communication, and all eight cinematic cues. Playwright reads every page against the manuscript through the ending and tests navigation, persistence, autoplay, responsive layouts, and unavailable WebGL/storage. Screenshots are generated in the ignored `test-results/` directory.

Browser tests use an installed Chrome by default on local machines. To use Playwright's Chromium instead:

```sh
npx playwright install chromium
```

Set `PLAYWRIGHT_CHANNEL=chromium` in your shell before `npm run test:browser`. CI installs Chromium and runs all checks on Node 24. No browser downloads are needed to read the story itself.

Implementation references: [PixiJS v8 application lifecycle](https://pixijs.com/8.x/guides/components/application), [custom filters](https://pixijs.com/8.x/guides/components/filters), and [Vite static hosting](https://vite.dev/guide/static-deploy).
