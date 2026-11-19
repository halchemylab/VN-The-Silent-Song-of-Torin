import { beats, chapters, scenes } from "../data/storyboard";
import { Choreographer } from "../engine/Choreographer";
import type { StageManager } from "../engine/StageManager";
import type { AudioSynth } from "../engine/AudioSynth";

const paths: Record<string, string> = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  chapters: '<path d="M4 5h6v15H4zm10 0h6v15h-6z"/>',
  sound:
    '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
};
const icon = (name: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const roman = ["I", "II", "III", "IV"];
const descriptions = [
  "Two minds. One impossible invention. A silence that changes everything.",
  "Beyond the veil, a city of brass remembers what it means to be alive.",
  "The Forged Gods offer a bargain. Love asks the impossible.",
  "What remains of a song when its singer is gone?",
];
interface Preferences {
  index: number;
  volume: number;
  muted: boolean;
  fontSize: number;
  speed: number;
  reduced: boolean;
}
const storageKey = "torin-storybook-v1";
const clamp = (v: unknown, low: number, high: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(low, Math.min(high, v))
    : fallback;

export class StoryReader {
  private index = 0;
  private reading = false;
  private ended = false;
  private auto = false;
  private timer?: ReturnType<typeof setTimeout>;
  private prefs: Preferences;
  private choreography: Choreographer;
  private dialog: HTMLDialogElement;
  private article: HTMLElement;
  private page: HTMLElement;
  constructor(
    private host: HTMLElement,
    private stage: StageManager | undefined,
    private audio: AudioSynth,
  ) {
    this.prefs = this.load();
    this.index = this.prefs.index;
    this.choreography = stage?.choreographer ?? new Choreographer();
    this.choreography.reduced = this.prefs.reduced;
    this.audio.setVolume(this.prefs.volume, this.prefs.muted);
    host.innerHTML = `
      <header class="topbar"><button class="wordmark" id="home" aria-label="Return to title screen"><span class="emblem">✧</span><span>THE SILENT SONG <i>of</i> TORIN</span></button><div class="top-actions"><button class="quiet-button" id="chapters">${icon("chapters")}<span>Chapters</span></button><span class="separator"></span><button class="icon-button" id="sound" aria-label="Mute ambient sound" title="Mute ambient sound">${icon("sound")}</button><button class="icon-button" id="settings" aria-label="Reading settings" title="Reading settings">${icon("settings")}</button></div></header>
      <main>
        <section class="cover" id="cover" aria-labelledby="book-title"><div class="eyebrow"><span class="short-rule"></span>A CLOCKWORK FABLE</div><h1 id="book-title"><span>The Silent</span><span>Song <em>of</em></span><span class="title-torin">Torin<span class="title-period">.</span></span></h1><p class="cover-description">Some songs outlive their singers.<br>Some love defies the machinery of the world.</p><div class="cover-buttons"><button id="begin" class="primary-button">${this.index > 0 ? "Continue reading" : "Begin reading"}${icon("arrow")}</button><button id="cover-chapters" class="text-button">Explore the chapters</button></div><div class="cover-meta"><span>FOUR PARTS</span><span class="tiny-diamond">◆</span><span id="reading-time"></span><span class="tiny-diamond">◆</span><span>AN ANIMATED STORYBOOK</span></div><button id="restart" class="restart-link" ${this.index > 0 ? "" : "hidden"}>Start again from the beginning</button></section>
        <section id="reader" class="reader" hidden aria-label="Story reader"><div class="chapter-heading"><span class="eyebrow" id="act-label"></span><h2 id="act-title"></h2><span class="chapter-rule"></span></div><div class="reading-area" id="reading-area" tabindex="0" aria-label="Story text. Use arrow keys to turn pages."><article id="page" aria-labelledby="scene-name"><div class="page-kicker"><span id="scene-name"></span><span id="speaker"></span></div><div id="prose" class="prose"></div></article></div><div class="page-bottom"><span class="reading-hint">A quiet moment. Take your time.</span><button id="next-inline" class="inline-next">Continue ${icon("arrow")}</button></div></section>
        <section id="ending" class="ending" hidden aria-labelledby="ending-title"><span class="eyebrow">THE LAST NOTE LINGERS</span><h2 id="ending-title">Some songs<br>never fall silent.</h2><p>The end of <em>The Silent Song of Torin</em>.<br>Thank you for listening.</p><button id="ending-home" class="primary-button">Return to the beginning ${icon("arrow")}</button><button id="ending-back" class="text-button">Read the last page again</button></section>
      </main>
      <aside class="art-caption" aria-hidden="true"><span class="caption-index" id="art-index">FIG. 01</span><span class="caption-line"></span><span id="art-name">THE HARMONIC ENGINE</span><span class="caption-sub" id="art-sub">A study in resonance & memory</span></aside>
      <footer id="cover-footer" class="cover-footer"><span>LOVE · LOSS · THE ECHOES WE LEAVE BEHIND</span><span>A WORLD OF STEAM & STARS <span class="small-star">✦</span></span></footer>
      <footer id="reading-controls" class="reading-controls" hidden><div class="progress-labels"><span id="progress-label"></span><span id="page-count" role="status" aria-live="polite"></span></div><div class="timeline"><input id="progress" type="range" min="0" max="${beats.length - 1}" value="0" aria-label="Story position"/><div class="act-markers">${chapters.map((c) => `<button data-jump="${c.firstBeat}" style="left:${(c.firstBeat / (beats.length - 1)) * 100}%" aria-label="Jump to Part ${c.act}: ${c.title}" title="Part ${roman[c.act - 1]} · ${c.title}"><span>${roman[c.act - 1]}</span></button>`).join("")}</div></div><div class="navigation-row"><button id="previous" class="quiet-button">${icon("back")}<span>Previous</span></button><div class="center-controls"><button id="autoplay" class="quiet-button" aria-pressed="false">${icon("play")}<span>Auto-read</span></button><span class="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> to turn the page</span></div><button id="next" class="quiet-button"><span>Next page</span>${icon("arrow")}</button></div></footer>
      <dialog id="drawer" class="drawer"><div class="drawer-top"><span class="eyebrow" id="drawer-label">THE CONTENTS</span><button class="icon-button" id="close-dialog" aria-label="Close panel">${icon("close")}</button></div><div id="drawer-body"></div></dialog><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;
    this.dialog = this.el<HTMLDialogElement>("drawer");
    this.article = this.el("reading-area");
    this.page = this.el("page");
    const words = beats.reduce(
      (n, b) => n + b.paragraphs.join(" ").split(/\s+/).length,
      0,
    );
    this.el("reading-time").textContent = `${Math.ceil(words / 180)} MIN READ`;
    this.bind();
    this.applyPreferences();
    this.updateSound();
    if (!stage)
      this.el("art-sub").textContent =
        "Stillness edition · animation unavailable";
  }
  private el<T extends HTMLElement = HTMLElement>(id: string) {
    return this.host.querySelector<T>(`#${id}`)!;
  }
  private bind() {
    this.el("begin").onclick = () => this.begin(this.index);
    this.el("restart").onclick = () => this.begin(0);
    this.el("home").onclick = () => this.home();
    this.el("chapters").onclick = this.el("cover-chapters").onclick = () =>
      this.openChapters();
    this.el("settings").onclick = () => this.openSettings();
    this.el("sound").onclick = () => {
      if (this.prefs.volume === 0) {
        this.prefs.volume = 0.45;
        this.prefs.muted = false;
      } else this.prefs.muted = !this.prefs.muted;
      this.updateSound();
      this.save();
      if (this.reading)
        void this.audio.unlock().catch(() => this.audioFailure());
    };
    this.el("next").onclick = this.el("next-inline").onclick = () =>
      this.advance(1);
    this.el("previous").onclick = () => this.advance(-1);
    this.el("autoplay").onclick = () => {
      this.auto = !this.auto;
      this.syncAuto();
    };
    this.el<HTMLInputElement>("progress").oninput = (e) =>
      this.jump(Number((e.target as HTMLInputElement).value));
    this.host
      .querySelectorAll<HTMLButtonElement>("[data-jump]")
      .forEach((b) => (b.onclick = () => this.jump(Number(b.dataset.jump))));
    this.el("ending-home").onclick = () => {
      this.index = 0;
      this.save();
      this.home();
    };
    this.el("ending-back").onclick = () => this.jump(beats.length - 1);
    this.el("close-dialog").onclick = () => this.dialog.close();
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) {
        const r = this.dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          this.dialog.close();
      }
    });
    this.dialog.addEventListener("close", () => this.schedule());
    this.article.addEventListener("click", () => {
      if (
        !window.getSelection()?.toString() &&
        this.article.scrollHeight -
          this.article.scrollTop -
          this.article.clientHeight <
          12
      )
        this.advance(1);
    });
    this.article.addEventListener(
      "wheel",
      () => {
        if (this.auto) {
          this.auto = false;
          this.syncAuto();
        }
      },
      { passive: true },
    );
    this.article.addEventListener(
      "touchstart",
      () => {
        if (this.auto) {
          this.auto = false;
          this.syncAuto();
        }
      },
      { passive: true },
    );
    this.article.addEventListener("scroll", () => this.scrollHint(), {
      passive: true,
    });
    window.addEventListener("resize", () => this.scrollHint());
    document.addEventListener("keydown", (e) => {
      if (
        !this.reading ||
        this.dialog.open ||
        this.ended ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if ((e.target as HTMLElement).closest("input,select,a,textarea")) return;
      if (e.code === "Space" && (e.target as HTMLElement).closest("button"))
        return;
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.code === "Space"
      ) {
        e.preventDefault();
        if (
          e.code === "Space" &&
          this.article.scrollHeight -
            this.article.scrollTop -
            this.article.clientHeight >
            12
        ) {
          this.article.scrollBy({
            top: this.article.clientHeight * 0.7,
            behavior: this.prefs.reduced ? "instant" : "smooth",
          });
          return;
        }
        this.advance(e.key === "ArrowLeft" ? -1 : 1);
      }
    });
    document.addEventListener("visibilitychange", () => {
      clearTimeout(this.timer);
      this.choreography.stopScroll(this.article);
      if (!document.hidden) this.schedule();
    });
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => {
        this.prefs.reduced = e.matches;
        this.applyPreferences();
        this.save();
      },
    );
  }
  private begin(index: number) {
    this.reading = true;
    this.ended = false;
    this.el("cover").hidden = true;
    this.el("ending").hidden = true;
    this.el("reader").hidden = false;
    this.el("cover-footer").hidden = true;
    this.el("reading-controls").hidden = false;
    document.body.classList.add("is-reading");
    this.audio.setAct(beats[index].act);
    void this.audio.unlock().catch(() => this.audioFailure());
    this.index = index;
    this.render(index === 0);
    this.article.focus({ preventScroll: true });
  }
  private home() {
    this.reading = false;
    this.ended = false;
    this.auto = false;
    this.syncAuto();
    this.audio.pause();
    this.stage?.cover();
    this.el("cover").hidden = false;
    this.el("reader").hidden = true;
    this.el("ending").hidden = true;
    this.el("reading-controls").hidden = true;
    this.el("cover-footer").hidden = false;
    document.body.classList.remove("is-reading");
    delete document.body.dataset.artwork;
    this.el("begin").innerHTML =
      `${this.index > 0 ? "Continue reading" : "Begin reading"}${icon("arrow")}`;
    this.el("restart").hidden = this.index === 0;
    this.updateCaption(true);
    this.el("begin").focus();
  }
  private advance(direction: number) {
    this.auto = false;
    this.syncAuto();
    if (this.index === beats.length - 1 && direction > 0) {
      this.finish();
      return;
    }
    this.index = Math.max(
      0,
      Math.min(beats.length - 1, this.index + direction),
    );
    this.render(direction > 0);
  }
  private jump(index: number) {
    this.auto = false;
    this.syncAuto();
    if (this.dialog.open) this.dialog.close();
    if (!this.reading) {
      this.begin(index);
      return;
    }
    this.ended = false;
    this.el("ending").hidden = true;
    this.el("reader").hidden = false;
    this.el("reading-controls").hidden = false;
    this.index = index;
    this.render(false);
  }
  private render(trigger = true) {
    const beat = beats[this.index],
      chapter = chapters[beat.act - 1];
    if (this.stage && beat.artwork)
      document.body.dataset.artwork = beat.artwork;
    else delete document.body.dataset.artwork;
    this.el("act-label").textContent =
      `PART ${roman[beat.act - 1]} · ${String(beat.act).padStart(2, "0")} / 04`;
    this.el("act-title").textContent = chapter.title;
    this.el("scene-name").textContent = beat.scene;
    this.el("speaker").textContent =
      beat.kind === "written"
        ? "TORIN’S NOTEBOOK"
        : beat.kind === "dialogue"
          ? beat.speaker
          : "";
    const prose = this.el("prose");
    prose.replaceChildren();
    for (const paragraph of beat.paragraphs) {
      const p = document.createElement("p");
      p.textContent = paragraph;
      prose.append(p);
    }
    this.page.dataset.kind = beat.kind;
    this.page.dataset.speaker = beat.speaker;
    this.article.scrollTop = 0;
    this.choreography.reveal(this.page);
    this.el("progress-label").textContent =
      `PART ${roman[beat.act - 1]} · ${beat.scene.toUpperCase()}`;
    this.el("page-count").textContent =
      `${String(this.index + 1).padStart(3, "0")} / ${beats.length}`;
    const range = this.el<HTMLInputElement>("progress");
    range.value = String(this.index);
    range.style.setProperty(
      "--progress",
      `${(this.index / (beats.length - 1)) * 100}%`,
    );
    range.setAttribute(
      "aria-valuetext",
      `Part ${beat.act}, page ${this.index + 1} of ${beats.length}: ${beat.scene}`,
    );
    this.el<HTMLButtonElement>("previous").disabled = this.index === 0;
    this.el("next").innerHTML =
      `<span>${this.index === beats.length - 1 ? "Finish story" : "Next page"}</span>${icon("arrow")}`;
    this.el("next-inline").innerHTML =
      `${this.index === beats.length - 1 ? "The final note" : "Continue"} ${icon("arrow")}`;
    this.stage?.show(beat, trigger);
    this.audio.setBeat(beat, trigger);
    if (trigger && beat.effectTrigger) this.audio.trigger(beat.effectTrigger);
    this.updateCaption();
    this.save();
    this.schedule();
    requestAnimationFrame(() => this.scrollHint());
  }
  private scrollHint() {
    const more =
      this.article.scrollHeight -
        this.article.scrollTop -
        this.article.clientHeight >
      12;
    this.article.classList.toggle("has-more", more);
    this.el("next-inline").innerHTML =
      `${more ? "Read on" : this.index === beats.length - 1 ? "The final note" : "Continue"} ${icon("arrow")}`;
    this.el("next-inline").setAttribute(
      "aria-label",
      more
        ? "Scroll to continue reading this page"
        : this.index === beats.length - 1
          ? "Finish story"
          : "Next page",
    );
    this.el("next-inline").onclick = () => {
      if (more)
        this.article.scrollBy({
          top: this.article.clientHeight * 0.7,
          behavior: this.prefs.reduced ? "instant" : "smooth",
        });
      else this.advance(1);
    };
  }
  private updateCaption(cover = false) {
    const beat = beats[this.index];
    this.el("art-index").textContent =
      `FIG. ${String(cover ? 1 : scenes.findIndex((s) => s.scene === beat.scene) + 1).padStart(2, "0")}`;
    this.el("art-name").textContent = cover
      ? "THE HARMONIC ENGINE"
      : beat.location
          .replaceAll("_", " ")
          .replace("torin workshop", "the workshop")
          .toUpperCase();
    if (this.stage)
      this.el("art-sub").textContent = cover
        ? "A study in resonance & memory"
        : beat.scene;
  }
  private finish() {
    this.ended = true;
    this.auto = false;
    this.syncAuto();
    this.el("reader").hidden = true;
    this.el("reading-controls").hidden = true;
    this.el("ending").hidden = false;
    this.choreography.reveal(this.el("ending"));
    this.el("ending-home").focus();
  }
  private syncAuto() {
    this.el("autoplay").innerHTML =
      `${icon(this.auto ? "pause" : "play")}<span>${this.auto ? "Pause auto-read" : "Auto-read"}</span>`;
    this.el("autoplay").setAttribute("aria-pressed", String(this.auto));
    this.schedule();
  }
  private schedule() {
    clearTimeout(this.timer);
    this.choreography.stopScroll(this.article);
    if (
      !this.auto ||
      !this.reading ||
      this.ended ||
      this.dialog.open ||
      document.hidden
    )
      return;
    const words = beats[this.index].paragraphs.join(" ").split(/\s+/).length;
    const duration = Math.max(4500, (words / this.prefs.speed) * 60000 + 1800);
    this.choreography.autoScroll(this.article, duration);
    this.timer = setTimeout(() => {
      if (this.index === beats.length - 1) {
        this.finish();
        return;
      }
      this.index++;
      this.render();
    }, duration);
  }
  private openChapters() {
    this.el("drawer-label").textContent = "THE CONTENTS";
    this.el("drawer-body").innerHTML =
      `<h2 id="panel-title">A journey in<br>four movements.</h2><p class="panel-intro">Every invention begins with a question.<br>Every story, with a first step.</p><div class="chapter-list">${chapters
        .map((c, i) => {
          const end = chapters[i + 1]?.firstBeat ?? beats.length;
          const time = Math.ceil(
            beats
              .slice(c.firstBeat, end)
              .reduce((n, b) => n + b.paragraphs[0].split(/\s+/).length, 0) /
              180,
          );
          return `<div class="chapter-entry"><button class="chapter-choice ${this.reading && beats[this.index].act === c.act ? "current" : ""}" data-chapter="${c.firstBeat}"><span class="chapter-numeral">${roman[i]}</span><span><span class="chapter-choice-title">${c.title}</span><span class="chapter-description">${descriptions[i]}</span><span class="chapter-duration">${time} MIN · ${end - c.firstBeat} PAGES</span></span>${icon("arrow")}</button><details><summary>Browse scenes</summary>${scenes
            .filter((s) => s.act === c.act)
            .map(
              (s) =>
                `<button class="scene-choice" data-chapter="${beats.indexOf(s)}">${s.scene}<span>↗</span></button>`,
            )
            .join("")}</details></div>`;
        })
        .join(
          "",
        )}</div><p class="panel-footnote">Your place is saved automatically on this device.</p>`;
    this.dialog.querySelectorAll<HTMLButtonElement>("[data-chapter]").forEach(
      (b) =>
        (b.onclick = () => {
          this.dialog.close();
          this.jump(Number(b.dataset.chapter));
        }),
    );
    this.openDialog();
  }
  private openSettings() {
    this.el("drawer-label").textContent = "MAKE YOURSELF AT HOME";
    this.el("drawer-body").innerHTML =
      `<h2 id="panel-title">Your reading<br>room.</h2><p class="panel-intro">Settle into a pace that feels like yours.</p>
      <div class="setting"><label for="font-size">Text size <output id="font-output">${this.prefs.fontSize}px</output></label><input id="font-size" type="range" min="20" max="32" step="1" value="${this.prefs.fontSize}"/><p>A little more space for every word.</p></div>
      <div class="setting"><label for="read-speed">Auto-read pace <output id="speed-output">${this.prefs.speed} wpm</output></label><input id="read-speed" type="range" min="100" max="300" step="10" value="${this.prefs.speed}"/><p>Each page lingers according to its word count.</p></div>
      <div class="setting"><label for="volume">Ambient volume <output id="volume-output">${Math.round(this.prefs.volume * 100)}%</output></label><input id="volume" type="range" min="0" max="1" step="0.05" value="${this.prefs.volume}"/><p>A soundscape of clockwork and quiet harmonics.</p></div>
      <label class="toggle-setting"><span>Mute sound</span><input id="mute-setting" type="checkbox" ${this.prefs.muted ? "checked" : ""}/></label><label class="toggle-setting"><span>Reduce motion<small>Still scenery, without camera motion or flashes.</small></span><input id="motion-setting" type="checkbox" ${this.prefs.reduced ? "checked" : ""}/></label>
      <div class="keyboard-guide"><span class="eyebrow">AT YOUR FINGERTIPS</span><p><kbd>→</kbd> / <kbd>Space</kbd> Next page<br><kbd>←</kbd> Previous page<br><kbd>Esc</kbd> Close this panel</p><p>Click the story to continue. Longer pages scroll before turning. Use the timeline to revisit any moment.</p></div>`;
    this.el<HTMLInputElement>("font-size").oninput = (e) => {
      this.prefs.fontSize = Number((e.target as HTMLInputElement).value);
      this.el("font-output").textContent = `${this.prefs.fontSize}px`;
      this.applyPreferences();
      this.save();
    };
    this.el<HTMLInputElement>("read-speed").oninput = (e) => {
      this.prefs.speed = Number((e.target as HTMLInputElement).value);
      this.el("speed-output").textContent = `${this.prefs.speed} wpm`;
      this.save();
    };
    this.el<HTMLInputElement>("volume").oninput = (e) => {
      this.prefs.volume = Number((e.target as HTMLInputElement).value);
      this.el("volume-output").textContent =
        `${Math.round(this.prefs.volume * 100)}%`;
      this.updateSound();
      this.save();
    };
    this.el<HTMLInputElement>("mute-setting").onchange = (e) => {
      this.prefs.muted = (e.target as HTMLInputElement).checked;
      this.updateSound();
      this.save();
    };
    this.el<HTMLInputElement>("motion-setting").onchange = (e) => {
      this.prefs.reduced = (e.target as HTMLInputElement).checked;
      this.applyPreferences();
      this.save();
      if (this.reading) this.stage?.show(beats[this.index], false);
    };
    this.openDialog();
  }
  private openDialog() {
    this.dialog.setAttribute("aria-labelledby", "panel-title");
    clearTimeout(this.timer);
    this.choreography.stopScroll(this.article);
    this.dialog.showModal();
    this.dialog.scrollTop = 0;
  }
  private updateSound() {
    this.audio.setVolume(this.prefs.volume, this.prefs.muted);
    const muted = this.prefs.muted || this.prefs.volume === 0;
    this.el("sound").innerHTML = icon(muted ? "mute" : "sound");
    this.el("sound").setAttribute(
      "aria-label",
      muted ? "Unmute ambient sound" : "Mute ambient sound",
    );
    this.el("sound").setAttribute(
      "title",
      muted ? "Unmute ambient sound" : "Mute ambient sound",
    );
    this.el("sound").setAttribute("aria-pressed", String(muted));
  }
  private audioFailure() {
    this.el("announcement").textContent =
      "Ambient audio is unavailable. You can continue reading.";
  }
  private applyPreferences() {
    this.host.style.setProperty("--reading-size", `${this.prefs.fontSize}px`);
    this.choreography.reduced = this.prefs.reduced;
    document.body.classList.toggle("reduced-motion", this.prefs.reduced);
  }
  private load(): Preferences {
    let saved: Partial<Preferences> = {};
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {};
    } catch {
      /* Storage may be unavailable. */
    }
    return {
      index: Math.floor(clamp(saved.index, 0, beats.length - 1, 0)),
      volume: clamp(saved.volume, 0, 1, 0.45),
      muted: typeof saved.muted === "boolean" ? saved.muted : false,
      fontSize: clamp(saved.fontSize, 20, 32, 25),
      speed: clamp(saved.speed, 100, 300, 180),
      reduced:
        typeof saved.reduced === "boolean"
          ? saved.reduced
          : matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  }
  private save() {
    this.prefs.index = this.index;
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.prefs));
    } catch {
      /* Reading works without persistence. */
    }
  }
}
