import type { BilliardsStrings, Group, ShotResult } from "./types";
import { fmt } from "./types";

export interface RuleContext {
  shooter: 0 | 1;
  /** 8-ball: table still open (groups unassigned). */
  open: boolean;
  /** 8-ball assigned groups per player. */
  groups: [Group, Group];
  /** Ball numbers on the table *before* this shot resolved. */
  remainingBefore: number[];
  shot: ShotResult;
}

export interface RuleVerdict {
  foul: boolean;
  ballInHand: boolean;
  turnPasses: boolean;
  gameOver: boolean;
  winner: 0 | 1 | null;
  message: string;
  /** Ball numbers to respot (e.g. 8/9 pocketed illegally). */
  respot: number[];
  /** Updated 8-ball state (echoed back to the game). */
  groups?: [Group, Group];
  open?: boolean;
}

const groupOf = (n: number): Group =>
  n >= 1 && n <= 7 ? "solids" : n >= 9 && n <= 15 ? "stripes" : null;

const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);

function countGroup(group: Group, remaining: number[]): number {
  if (!group) return 0;
  return remaining.filter((n) => groupOf(n) === group).length;
}

const gName = (g: Group, s: BilliardsStrings): string =>
  g === "solids" ? s.solids : g === "stripes" ? s.stripes : s.unknownGroup;

// ── 8-Ball ────────────────────────────────────────────────────────────────

export function evaluate8Ball(ctx: RuleContext, s: BilliardsStrings): RuleVerdict {
  const { shooter, shot } = ctx;
  let open = ctx.open;
  const groups: [Group, Group] = [...ctx.groups];
  const myGroup = groups[shooter];
  const pocketed = shot.pocketed;
  const eight = pocketed.includes(8);
  const p = shooter + 1;

  const myClearedBefore = myGroup ? countGroup(myGroup, ctx.remainingBefore) === 0 : false;

  // ── Determine fouls ──
  let foul = false;
  const reasons: string[] = [];

  if (shot.cueScratched) {
    foul = true;
    reasons.push(s.reasonScratch);
  }
  if (shot.firstContact === null) {
    foul = true;
    reasons.push(s.reasonNoContact);
  } else if (!open && myGroup) {
    if (myClearedBefore) {
      if (shot.firstContact !== 8) {
        foul = true;
        reasons.push(s.reasonMustHit8);
      }
    } else if (groupOf(shot.firstContact) !== myGroup) {
      foul = true;
      reasons.push(s.reasonWrongGroup);
    }
  } else if (shot.firstContact === 8) {
    foul = true;
    reasons.push(s.reasonCantHit8Open);
  }
  if (!foul && shot.firstContact !== null && pocketed.length === 0 && !shot.railAfterContact) {
    foul = true;
    reasons.push(s.reasonNoRail);
  }

  // ── 8 ball pocketed → win / loss (or respot on the break) ──
  if (eight) {
    if (shot.isBreak) {
      return {
        foul,
        ballInHand: foul,
        turnPasses: foul,
        gameOver: false,
        winner: null,
        respot: [8],
        message: foul ? s.eightBreakRespotFoul : s.eightBreakRespot,
        groups,
        open,
      };
    }
    const legalEight = !foul && !!myGroup && myClearedBefore;
    if (legalEight) {
      return {
        foul: false,
        ballInHand: false,
        turnPasses: false,
        gameOver: true,
        winner: shooter,
        respot: [],
        message: fmt(s.win8, { n: p }),
        groups,
        open,
      };
    }
    return {
      foul: true,
      ballInHand: false,
      turnPasses: true,
      gameOver: true,
      winner: other(shooter),
      respot: [],
      message: fmt(s.lose8, { n: p }),
      groups,
      open,
    };
  }

  // ── Assignment on an open table ──
  let assigned = false;
  if (open && !foul && !shot.isBreak) {
    const firstReal = pocketed.find((n) => n !== 8 && groupOf(n) !== null);
    if (firstReal !== undefined) {
      const g = groupOf(firstReal)!;
      groups[shooter] = g;
      groups[other(shooter)] = g === "solids" ? "stripes" : "solids";
      open = false;
      assigned = true;
    }
  }

  // ── Continue or pass ──
  let turnPasses: boolean;
  let message: string;
  if (foul) {
    turnPasses = true;
    message = fmt(s.foul, { reasons: reasons.join(s.reasonSep) });
  } else {
    const effGroup = assigned ? groups[shooter] : myGroup;
    const made = open
      ? pocketed.filter((n) => n !== 8).length > 0
      : pocketed.filter((n) => groupOf(n) === effGroup).length > 0;
    turnPasses = !made;
    message = made
      ? assigned
        ? fmt(s.takesGroup, { n: p, g: gName(groups[shooter], s) })
        : fmt(s.potContinue, { n: p })
      : s.nothingDropped;
  }

  return {
    foul,
    ballInHand: foul,
    turnPasses,
    gameOver: false,
    winner: null,
    respot: [],
    message,
    groups,
    open,
  };
}

// ── 9-Ball ──────────────────────────────────────────────────────────────────

export function evaluate9Ball(ctx: RuleContext, s: BilliardsStrings): RuleVerdict {
  const { shooter, shot } = ctx;
  const pocketed = shot.pocketed;
  const nine = pocketed.includes(9);
  const lowest = Math.min(...ctx.remainingBefore.filter((n) => n !== 0));
  const p = shooter + 1;

  let foul = false;
  const reasons: string[] = [];
  if (shot.cueScratched) {
    foul = true;
    reasons.push(s.reasonScratch);
  }
  if (shot.firstContact === null) {
    foul = true;
    reasons.push(s.reasonNoContact);
  } else if (shot.firstContact !== lowest) {
    foul = true;
    reasons.push(fmt(s.reasonMustHitLowest, { n: lowest }));
  }
  if (!foul && pocketed.length === 0 && !shot.railAfterContact) {
    foul = true;
    reasons.push(s.reasonNoRail);
  }

  if (nine) {
    if (!foul) {
      return {
        foul: false,
        ballInHand: false,
        turnPasses: false,
        gameOver: true,
        winner: shooter,
        respot: [],
        message: fmt(s.win9, { n: p }),
      };
    }
    return {
      foul: true,
      ballInHand: true,
      turnPasses: true,
      gameOver: false,
      winner: null,
      respot: [9],
      message: fmt(s.foul9, { reasons: reasons.join(s.reasonSep) }),
    };
  }

  const made = !foul && pocketed.length > 0;
  return {
    foul,
    ballInHand: foul,
    turnPasses: foul ? true : !made,
    gameOver: false,
    winner: null,
    respot: [],
    message: foul
      ? fmt(s.foul, { reasons: reasons.join(s.reasonSep) })
      : made
        ? fmt(s.potContinue, { n: p })
        : s.nothingDropped,
  };
}
