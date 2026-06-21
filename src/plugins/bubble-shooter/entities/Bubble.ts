import type { BubbleColor, BubbleType, GridPos, Vec2 } from "../types";
import { COLOR_FILL, COLOR_LIGHT } from "../types";

export const BUBBLE_RADIUS = 22;
export const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
export const ROW_HEIGHT = Math.round(BUBBLE_RADIUS * Math.sqrt(3));

export class Bubble {
  color: BubbleColor;
  type: BubbleType;
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };

  active = false;
  stuck = false;
  gridPos: GridPos | null = null;

  // Attach bounce animation
  attachScale = 1;
  attachTimer = 0;

  // Pop animation
  popping = false;
  popScale = 1;
  popAlpha = 1;
  popTimer = 0;

  // Drop animation (floating clusters)
  dropping = false;
  dropVy = 0;

  constructor(color: BubbleColor = "red", type: BubbleType = "normal") {
    this.color = color;
    this.type = type;
    this.pos = { x: 0, y: 0 };
  }

  get fillColor(): string {
    return this.type !== "normal" ? COLOR_FILL[this.type] : COLOR_FILL[this.color];
  }

  get lightColor(): string {
    return this.type !== "normal" ? COLOR_LIGHT[this.type] : COLOR_LIGHT[this.color];
  }

  reset(color: BubbleColor, type: BubbleType = "normal"): this {
    this.color = color;
    this.type = type;
    this.vel = { x: 0, y: 0 };
    this.active = true;
    this.stuck = false;
    this.popping = false;
    this.dropping = false;
    this.dropVy = 0;
    this.attachScale = 1;
    this.attachTimer = 0;
    this.popScale = 1;
    this.popAlpha = 1;
    this.popTimer = 0;
    this.gridPos = null;
    return this;
  }
}
