/**
 * Tiny Web Audio sound helper — generates tones on the fly so the plugin needs
 * no audio assets and works fully offline. All methods no-op gracefully when
 * the Web Audio API is unavailable.
 */
class WheelSound {
  private ctx: AudioContext | null = null;

  private context(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    // Browsers may suspend the context until a user gesture.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private blip(
    frequency: number,
    duration: number,
    type: OscillatorType = "triangle",
    gain = 0.05,
  ) {
    const ctx = this.context();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** Short click as the pointer passes a slice. */
  tick() {
    this.blip(880, 0.05, "square", 0.025);
  }

  /** Ascending three-note flourish on win. */
  win() {
    const ctx = this.context();
    if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.25, "triangle", 0.06), i * 110),
    );
  }
}

export const wheelSound = new WheelSound();
