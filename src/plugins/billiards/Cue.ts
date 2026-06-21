import { clamp } from "./types";

/** Max pull distance (logical units) for full power. */
export const MAX_PULL = 340;

/**
 * Cue stick state. Power is set by pulling back (slingshot): the shot travels
 * opposite the pull, with power proportional to pull distance. Spin (English) is
 * an offset on the cue-ball face, applied on first object-ball contact.
 */
export class Cue {
  /** Direction (radians) the cue ball will travel. */
  angle = 0;
  /** 0..1 charge level. */
  power = 0;
  charging = false;

  /** Spin offset on the ball face, each -1..1. */
  spinX = 0;
  spinY = 0;

  /** Recoil animation progress after a strike, 0..1 (1 = fully extended). */
  recoil = 0;

  setPull(pullDist: number): void {
    this.power = clamp(pullDist / MAX_PULL, 0, 1);
  }

  reset(): void {
    this.power = 0;
    this.charging = false;
    this.recoil = 0;
  }

  resetSpin(): void {
    this.spinX = 0;
    this.spinY = 0;
  }
}
