export interface PwOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  number: "0123456789",
  symbol: "!@#$%^&*()-_=+[]{};:,.?",
};

/** Cryptographically-random index in [0, max). */
function randInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function generatePassword(opts: PwOptions): string {
  const pool =
    (opts.upper ? SETS.upper : "") +
    (opts.lower ? SETS.lower : "") +
    (opts.number ? SETS.number : "") +
    (opts.symbol ? SETS.symbol : "");
  if (!pool) return "";
  let out = "";
  for (let i = 0; i < opts.length; i += 1) out += pool[randInt(pool.length)];
  return out;
}

export type Strength = "weak" | "fair" | "strong" | "veryStrong";

export function strength(opts: PwOptions): Strength {
  const poolSize =
    (opts.upper ? 26 : 0) + (opts.lower ? 26 : 0) + (opts.number ? 10 : 0) + (opts.symbol ? 22 : 0);
  if (poolSize === 0) return "weak";
  const entropy = opts.length * Math.log2(poolSize);
  if (entropy < 40) return "weak";
  if (entropy < 60) return "fair";
  if (entropy < 80) return "strong";
  return "veryStrong";
}
