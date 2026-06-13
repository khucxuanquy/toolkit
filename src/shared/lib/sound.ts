"use client";

import { useSoundStore } from "@/core/services/sound-store";

/**
 * App-wide Web Audio sound helper. Generates short tones on the fly so there
 * are no audio assets and everything works fully offline. All methods no-op
 * when the Web Audio API is unavailable or the user has muted sound.
 *
 * Use the named helpers (click/flip/win/...) from games and interactive tools.
 */
class Sound {
  private ctx: AudioContext | null = null;

  private get enabled(): boolean {
    try {
      return useSoundStore.getState().enabled;
    } catch {
      return true;
    }
  }

  private context(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Low-level single tone. */
  blip(frequency: number, duration: number, type: OscillatorType = "triangle", gain = 0.05) {
    if (!this.enabled) return;
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

  /** Play a short sequence of [freq, duration] tones. */
  private sequence(notes: [number, number][], gain = 0.06, type: OscillatorType = "triangle") {
    if (!this.enabled) return;
    let delay = 0;
    for (const [f, d] of notes) {
      setTimeout(() => this.blip(f, d, type, gain), delay * 1000);
      delay += d * 0.8;
    }
  }

  /* ---- Named interaction sounds ---- */

  /** Generic UI click / tap. */
  click() {
    this.blip(520, 0.05, "triangle", 0.03);
  }
  /** A passing tick (e.g. wheel slice, slider). */
  tick() {
    this.blip(880, 0.05, "square", 0.025);
  }
  /** Placing a piece / dropping a block. */
  place() {
    this.blip(300, 0.08, "sine", 0.05);
    this.blip(180, 0.12, "sine", 0.04);
  }
  /** A flap / hop. */
  flap() {
    this.blip(620, 0.07, "square", 0.03);
  }
  /** Coin flip whoosh-ish. */
  flip() {
    this.blip(440, 0.12, "sawtooth", 0.02);
  }
  /** Dice tumble. */
  roll() {
    this.blip(160, 0.18, "square", 0.035);
  }
  /** A successful match / point. */
  match() {
    this.sequence(
      [
        [523.25, 0.12],
        [783.99, 0.16],
      ],
      0.05,
    );
  }
  /** Win / completion flourish. */
  win() {
    this.sequence([
      [523.25, 0.16],
      [659.25, 0.16],
      [783.99, 0.28],
    ]);
  }
  /** Failure / game over. */
  lose() {
    this.sequence(
      [
        [392, 0.18],
        [311.13, 0.18],
        [233.08, 0.32],
      ],
      0.06,
      "sawtooth",
    );
  }
}

export const sound = new Sound();
