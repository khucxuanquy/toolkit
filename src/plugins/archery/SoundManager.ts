import type { SoundName } from "./types";

/**
 * WebAudio sound manager. All sounds are synthesised at runtime (no asset
 * files) so the plugin is immediately runnable. Exposes play / stop / mute /
 * unmute and disposes the AudioContext on teardown.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  /** Currently-sustaining "fly" voices, so stop() can cancel them. */
  private flying = new Set<{ src: AudioBufferSourceNode; gain: GainNode }>();

  /** Lazily create the context (must follow a user gesture on most browsers). */
  private ensure(): boolean {
    if (this.ctx) return true;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    // Pre-bake a 1s white-noise buffer reused by noise-based sounds.
    const len = Math.floor(this.ctx.sampleRate);
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  /** Resume a suspended context (call from the first pointer event). */
  resume(): void {
    if (this.ensure() && this.ctx?.state === "suspended") void this.ctx.resume();
  }

  private tone(opts: {
    freq: number;
    to?: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
  }): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  private noise(opts: { dur: number; freq: number; q?: number; gain?: number; sweepTo?: number }): {
    src: AudioBufferSourceNode;
    gain: GainNode;
  } | null {
    if (!this.ctx || !this.master || !this.noiseBuffer) return null;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(opts.freq, t0);
    if (opts.sweepTo !== undefined) filter.frequency.linearRampToValueAtTime(opts.sweepTo, t0 + opts.dur);
    filter.Q.value = opts.q ?? 1;
    const g = this.ctx.createGain();
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
    return { src, gain: g };
  }

  play(name: SoundName): void {
    if (!this.ensure()) return;
    switch (name) {
      case "draw":
        this.tone({ freq: 180, to: 320, dur: 0.5, type: "triangle", gain: 0.12 });
        break;
      case "release":
        this.tone({ freq: 520, to: 120, dur: 0.18, type: "triangle", gain: 0.35 });
        this.noise({ dur: 0.12, freq: 1800, q: 0.7, gain: 0.18 });
        break;
      case "arrow_fly": {
        const voice = this.noise({ dur: 0.55, freq: 600, sweepTo: 2600, q: 0.8, gain: 0.16 });
        if (voice) {
          this.flying.add(voice);
          voice.src.onended = () => this.flying.delete(voice);
        }
        break;
      }
      case "hit":
        this.tone({ freq: 140, to: 60, dur: 0.22, type: "sine", gain: 0.4 });
        this.noise({ dur: 0.1, freq: 320, q: 0.6, gain: 0.25 });
        break;
      case "bullseye":
        this.tone({ freq: 880, dur: 0.5, type: "sine", gain: 0.3 });
        this.tone({ freq: 1320, dur: 0.5, type: "sine", gain: 0.18, delay: 0.04 });
        this.tone({ freq: 1760, dur: 0.45, type: "sine", gain: 0.12, delay: 0.08 });
        break;
    }
  }

  stop(name: SoundName): void {
    if (name === "arrow_fly") {
      for (const v of this.flying) {
        try {
          v.src.stop();
        } catch {
          /* already stopped */
        }
      }
      this.flying.clear();
    }
  }

  mute(): void {
    this.muted = true;
    if (this.master) this.master.gain.value = 0;
  }

  unmute(): void {
    this.muted = false;
    if (this.master) this.master.gain.value = 0.9;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Release all audio resources. */
  dispose(): void {
    this.stop("arrow_fly");
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
    }
  }
}
