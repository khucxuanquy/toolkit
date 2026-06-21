import type { Vec2 } from "./types";

const BOW_HALF = 52; // limb half-length
const ARROW_LEN = 46;

/**
 * The bow + nocked arrow. Driven by a slingshot-style draw: the nock follows
 * the pointer (clamped to a max pull), the launch direction points from the
 * nock back through the grip, and the limbs/string bend with draw strength.
 */
export class Bow {
  anchor: Vec2 = { x: 0, y: 0 };
  drawing = false;
  /** Draw strength 0..1. */
  power = 0;
  /** Launch direction angle (radians). */
  aim = 0;
  /** Nock position (the pulled string point). */
  private nock: Vec2 = { x: 0, y: 0 };

  setAnchor(p: Vec2): void {
    this.anchor = p;
    if (!this.drawing) this.nock = { x: p.x, y: p.y };
  }

  /** Update the draw from the current pointer position and a max pull length. */
  setDraw(pointer: Vec2, maxPull: number): void {
    const dx = pointer.x - this.anchor.x;
    const dy = pointer.y - this.anchor.y;
    const len = Math.hypot(dx, dy);
    const pull = Math.min(len, maxPull);
    this.power = pull / maxPull;
    // Launch direction = from nock toward (and past) the grip.
    this.aim = Math.atan2(-dy, -dx);
    const ux = len < 1e-6 ? 0 : dx / len;
    const uy = len < 1e-6 ? 0 : dy / len;
    this.nock = { x: this.anchor.x + ux * pull, y: this.anchor.y + uy * pull };
  }

  release(): void {
    this.drawing = false;
    this.power = 0;
    this.nock = { x: this.anchor.x, y: this.anchor.y };
  }

  /** Direction unit vector the arrow will travel. */
  direction(): Vec2 {
    return { x: Math.cos(this.aim), y: Math.sin(this.aim) };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const a = this.anchor;
    const dir = this.direction();
    // Perpendicular to aim → spreads the two limb tips.
    const perp = { x: -dir.y, y: dir.x };
    const bend = this.power * 18; // limbs flex forward with power
    const tipTop = {
      x: a.x + perp.x * BOW_HALF + dir.x * bend,
      y: a.y + perp.y * BOW_HALF + dir.y * bend,
    };
    const tipBot = {
      x: a.x - perp.x * BOW_HALF + dir.x * bend,
      y: a.y - perp.y * BOW_HALF + dir.y * bend,
    };
    // Riser curves forward (toward the shot) at the grip.
    const ctrl = { x: a.x + dir.x * (12 + bend), y: a.y + dir.y * (12 + bend) };

    // Limbs.
    ctx.save();
    ctx.strokeStyle = "#5b3a1a";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tipTop.x, tipTop.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, tipBot.x, tipBot.y);
    ctx.stroke();

    // Bowstring → pulled to the nock.
    ctx.strokeStyle = "rgba(240,240,240,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tipTop.x, tipTop.y);
    ctx.lineTo(this.nock.x, this.nock.y);
    ctx.lineTo(tipBot.x, tipBot.y);
    ctx.stroke();

    // Grip.
    ctx.fillStyle = "#3f2a14";
    ctx.beginPath();
    ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Nocked arrow (only while drawing).
    if (this.drawing) {
      const tail = this.nock;
      const head = { x: tail.x + dir.x * ARROW_LEN, y: tail.y + dir.y * ARROW_LEN };
      ctx.strokeStyle = "#7c4a2d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export { ARROW_LEN };
