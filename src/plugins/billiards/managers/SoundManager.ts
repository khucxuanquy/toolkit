import type { SoundName } from "../types";

/** All sounds synthesised at runtime via WebAudio — no asset files. */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private lastBall = 0;

  get isMuted(): boolean {
    return this._muted;
  }

  resume(): void {
    this.ctx?.resume().catch(() => {});
  }
  mute(): void {
    this._muted = true;
  }
  unmute(): void {
    this._muted = false;
  }

  /** @param strength 0..1 impact, scales gain & pitch for collisions. */
  play(name: SoundName, strength = 1): void {
    const ctx = this.acquire();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case "cue":
        this.click(ctx, t, 220 + strength * 80, 0.16 + strength * 0.1, "triangle");
        this.noise(ctx, t, 0.04, 0.12 * strength, 2600, 1);
        break;
      case "ball": {
        // de-dupe a burst of near-simultaneous contacts
        if (t - this.lastBall < 0.012) return;
        this.lastBall = t;
        const f = 540 + strength * 900;
        this.click(ctx, t, f, 0.05 + strength * 0.14, "sine");
        this.noise(ctx, t, 0.02, 0.05 * strength, 3200, 1);
        break;
      }
      case "cushion":
        this.click(ctx, t, 150 + strength * 60, 0.12 * strength + 0.04, "sine");
        this.noise(ctx, t, 0.03, 0.05 * strength, 900, 0.7);
        break;
      case "pocket":
        this.click(ctx, t, 320, 0.18, "sine", 120);
        this.click(ctx, t + 0.04, 200, 0.16, "sine", 90);
        this.noise(ctx, t, 0.12, 0.1, 600, 0.6);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((fr, i) =>
          this.click(ctx, t + i * 0.1, fr, 0.22, "triangle"),
        );
        break;
      case "lose":
        [392, 330, 262, 196].forEach((fr, i) =>
          this.click(ctx, t + i * 0.12, fr, 0.2, "sawtooth"),
        );
        break;
    }
  }

  dispose(): void {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }

  private acquire(): AudioContext | null {
    if (this._muted) return null;
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private click(
    ctx: AudioContext,
    start: number,
    freq: number,
    gain: number,
    type: OscillatorType,
    freqEnd?: number,
  ): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + 0.14);
    g.gain.setValueAtTime(Math.min(0.5, gain), start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(start);
    o.stop(start + 0.18);
  }

  private noise(
    ctx: AudioContext,
    t: number,
    duration: number,
    gain: number,
    filterFreq: number,
    q: number,
  ): void {
    if (gain <= 0.001) return;
    const samples = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.4, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t);
    src.stop(t + duration + 0.01);
  }
}
