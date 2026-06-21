import type { SoundName } from "../types";

export class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted = false;

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

  play(name: SoundName): void {
    const ctx = this.acquire();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case "shoot":
        this.tone(ctx, "triangle", 560, 0.12, t, t + 0.09, 280);
        break;
      case "bounce":
        this.tone(ctx, "sine", 380, 0.08, t, t + 0.07, 600);
        break;
      case "attach":
        this.tone(ctx, "sine", 480, 0.1, t, t + 0.12, 720);
        break;
      case "pop":
        this.noiseBurst(ctx, t, 0.13, 0.28, 1100, 0.5);
        this.tone(ctx, "sine", 760, 0.12, t, t + 0.09, 380);
        break;
      case "combo":
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(ctx, "sine", f, 0.18, t + i * 0.06, t + i * 0.06 + 0.1),
        );
        break;
      case "game_over":
        [400, 330, 280, 200].forEach((f, i) =>
          this.tone(ctx, "sawtooth", f, 0.1, t + i * 0.13, t + i * 0.13 + 0.18),
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

  private tone(
    ctx: AudioContext,
    type: OscillatorType,
    freq: number,
    gain: number,
    start: number,
    end: number,
    freqEnd?: number,
  ): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) o.frequency.linearRampToValueAtTime(freqEnd, end);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.start(start);
    o.stop(end + 0.02);
  }

  private noiseBurst(
    ctx: AudioContext,
    t: number,
    duration: number,
    gain: number,
    filterFreq: number,
    filterQ: number,
  ): void {
    const samples = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t);
    src.stop(t + duration + 0.01);
  }
}
