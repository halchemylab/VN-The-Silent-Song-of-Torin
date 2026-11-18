import type { Act, Beat, Effect } from "../data/storyboard";
import { phrase, type MusicCue, type MusicState } from "../data/score";

/** Quiet, entirely synthesized ambience. No network requests or audio assets. */
export class AudioSynth {
  private context?: AudioContext;
  private master?: GainNode;
  private drone?: GainNode;
  private ambience?: GainNode;
  private notes = new Map<OscillatorNode, GainNode>();
  private musicState: MusicState = "together";
  private pendingCue?: MusicCue;
  private silenceUntil = 0;
  private nextPhraseAt = 0;
  private visibilityHandler?: () => void;
  private voices: OscillatorNode[] = [];
  private filter?: BiquadFilterNode;
  private timer?: ReturnType<typeof setInterval>;
  private act: Act = 1;
  private step = 0;
  private running = false;
  private muted = false;
  private volume = 0.45;
  async unlock() {
    if (!this.context) this.create();
    this.running = true;
    await this.context!.resume();
    this.setAct(this.act);
    this.applyVolume();
    if (this.pendingCue) {
      this.playPhrase(this.pendingCue);
      this.pendingCue = undefined;
    }
  }
  private create() {
    const context = new AudioContext();
    this.context = context;
    const master = context.createGain();
    this.master = master;
    master.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.ratio.value = 5;
    master.connect(limiter);
    limiter.connect(context.destination);
    this.ambience = context.createGain();
    this.ambience.connect(master);
    const drone = context.createGain();
    drone.gain.value = 0.13;
    this.drone = drone;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    this.filter = filter;
    drone.connect(filter);
    filter.connect(this.ambience);
    for (let i = 0; i < 4; i++) {
      const voice = context.createOscillator();
      voice.type = i === 0 ? "sine" : "triangle";
      const gain = context.createGain();
      gain.gain.value = [0.6, 0.16, 0.08, 0.04][i];
      voice.frequency.value = 55 * [1, 1.5, 2, 3][i];
      voice.detune.value = (i - 1.5) * 2;
      voice.connect(gain);
      gain.connect(drone);
      voice.start();
      this.voices.push(voice);
    }
    // Air passing through machinery, made from a reusable two-second noise buffer.
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random() - 0.5) * 0.12;
    const air = context.createBufferSource();
    air.buffer = buffer;
    air.loop = true;
    const airFilter = context.createBiquadFilter();
    airFilter.type = "lowpass";
    airFilter.frequency.value = 220;
    const airGain = context.createGain();
    airGain.gain.value = 0.15;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(this.ambience);
    air.start();
    this.timer = setInterval(() => this.clock(), 1100);
    this.visibilityHandler = () => {
      if (document.hidden) void context.suspend().catch(() => {});
      else if (this.running) void context.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }
  setAct(act: Act) {
    this.act = act;
    if (!this.context) return;
    const base = [55, 41.203, 65.406, 73.416][act - 1];
    const ratios =
      act === 3 ? [1, 2, 3, 5] : act === 4 ? [1, 1.5, 2.5, 3] : [1, 1.5, 2, 3];
    this.voices.forEach((voice, i) =>
      voice.frequency.setTargetAtTime(
        base * ratios[i],
        this.context!.currentTime,
        2,
      ),
    );
    this.filter!.frequency.setTargetAtTime(
      [450, 320, 1200, 850][act - 1],
      this.context.currentTime,
      2,
    );
  }
  setVolume(volume: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    this.applyVolume();
  }
  private applyVolume() {
    if (this.context)
      this.master!.gain.setTargetAtTime(
        this.running && !this.muted ? this.volume * 0.55 : 0,
        this.context.currentTime,
        0.15,
      );
  }
  pause() {
    this.running = false;
    this.pendingCue = undefined;
    this.cancelNotes();
    this.applyVolume();
  }
  /** Restore the score from this page, including after a seek or a reload. */
  setBeat(beat: Beat, trigger = true) {
    this.cancelNotes();
    this.setAct(beat.act);
    this.musicState = beat.musicState;
    const c = this.context;
    this.silenceUntil = 0;
    this.nextPhraseAt = (c?.currentTime ?? 0) + 32;
    if (c && this.ambience) {
      this.ambience.gain.cancelScheduledValues(c.currentTime);
      this.ambience.gain.setTargetAtTime(1, c.currentTime, 0.15);
    }
    // A seek restores the musical state without replaying cinematic accents.
    const cue = trigger ? beat.musicCue : undefined;
    this.pendingCue = undefined;
    if (cue) {
      if (c?.state === "running" && this.running) this.playPhrase(cue);
      else this.pendingCue = cue;
    }
  }
  private cancelNotes() {
    const c = this.context;
    if (!c) return;
    for (const [voice, gain] of this.notes) {
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setTargetAtTime(0, c.currentTime, 0.015);
      voice.stop(c.currentTime + 0.06);
    }
    this.notes.clear();
  }
  private playPhrase(cue: MusicCue) {
    const c = this.context;
    if (!c || !this.running) return;
    if (cue === "silence") {
      this.cancelNotes();
      this.silenceUntil = c.currentTime + 1.8;
      this.ambience!.gain.cancelScheduledValues(c.currentTime);
      this.ambience!.gain.setTargetAtTime(0, c.currentTime, 0.025);
      this.ambience!.gain.setTargetAtTime(1, this.silenceUntil, 0.8);
      return;
    }
    for (const n of phrase(cue)) {
      const frequency = 440 * 2 ** ((n.midi - 69) / 12);
      const level = n.level * 0.045;
      this.note(
        frequency,
        n.duration,
        level,
        n.voice === "torin" ? "triangle" : "sine",
        n.at,
      );
      if (n.voice === "isolabella")
        this.note(frequency * 2, n.duration * 0.55, level * 0.14, "sine", n.at);
    }
  }
  private note(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    offset = 0,
  ) {
    const c = this.context;
    if (!c || !this.master || !this.running) return;
    const at = c.currentTime + offset,
      voice = c.createOscillator(),
      gain = c.createGain();
    voice.type = type;
    voice.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    voice.connect(gain);
    gain.connect(this.master);
    voice.start(at);
    voice.stop(at + duration + 0.1);
    this.notes.set(voice, gain);
    voice.onended = () => {
      this.notes.delete(voice);
      voice.disconnect();
      gain.disconnect();
    };
  }
  private clock() {
    if (
      !this.running ||
      document.hidden ||
      this.muted ||
      this.context?.state !== "running"
    )
      return;
    this.step++;
    if (this.context!.currentTime < this.silenceUntil) return;
    if (this.act === 1)
      this.note(this.step % 2 ? 660 : 880, 0.055, 0.017, "triangle");
    if (this.context!.currentTime >= this.nextPhraseAt) {
      this.nextPhraseAt = this.context!.currentTime + 42;
      const cue: MusicCue =
        this.musicState === "together"
          ? "duet"
          : this.musicState === "presence"
            ? "answer"
            : this.musicState === "voiceless"
              ? "outline"
              : this.musicState === "remembrance"
                ? "reunion"
                : "solo";
      this.playPhrase(cue);
    }
  }
  trigger(effect: Effect) {
    // These moments have their own narrative score; generic swells would
    // obscure the silence, remembered fragments, or the final duet.
    if (["overheat_flash", "memory_projection", "aurora_song"].includes(effect))
      return;
    const root =
      effect === "dissolve_particles"
        ? 293.66
        : effect === "overheat_flash"
          ? 82.4
          : 220;
    [1, 1.5, 2, 3].forEach((ratio, i) =>
      this.note(root * ratio, 4 + i * 0.3, 0.025 / (i + 1), "sine", i * 0.13),
    );
  }
  destroy() {
    clearInterval(this.timer);
    this.running = false;
    if (this.visibilityHandler)
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.cancelNotes();
    void this.context?.close();
  }
}
