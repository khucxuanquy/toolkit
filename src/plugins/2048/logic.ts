export type Board = number[]; // length 16, row-major
export type Direction = "up" | "down" | "left" | "right";

const toRows = (b: Board): number[][] => [0, 1, 2, 3].map((r) => b.slice(r * 4, r * 4 + 4));
const fromRows = (rows: number[][]): Board => rows.flat();
const transpose = (rows: number[][]): number[][] => [0, 1, 2, 3].map((c) => rows.map((r) => r[c]));
const reverseRows = (rows: number[][]): number[][] => rows.map((r) => r.slice().reverse());

function slideLeft(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((x) => x !== 0);
  const res: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i += 1) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const v = nums[i] * 2;
      res.push(v);
      gained += v;
      i += 1;
    } else {
      res.push(nums[i]);
    }
  }
  while (res.length < 4) res.push(0);
  return { row: res, gained };
}

export function move(
  board: Board,
  dir: Direction,
): { board: Board; gained: number; moved: boolean } {
  let rows = toRows(board);
  if (dir === "up" || dir === "down") rows = transpose(rows);
  if (dir === "right" || dir === "down") rows = reverseRows(rows);

  let gained = 0;
  rows = rows.map((r) => {
    const s = slideLeft(r);
    gained += s.gained;
    return s.row;
  });

  if (dir === "right" || dir === "down") rows = reverseRows(rows);
  if (dir === "up" || dir === "down") rows = transpose(rows);

  const next = fromRows(rows);
  const moved = next.some((v, i) => v !== board[i]);
  return { board: next, gained, moved };
}

export function spawn(board: Board): Board {
  const empty = board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (empty.length === 0) return board;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  const next = board.slice();
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function canMove(board: Board): boolean {
  if (board.includes(0)) return true;
  const rows = toRows(board);
  const cols = transpose(rows);
  for (const line of [...rows, ...cols]) {
    for (let i = 0; i < 3; i += 1) if (line[i] === line[i + 1]) return true;
  }
  return false;
}

export function newBoard(): Board {
  return spawn(spawn(Array(16).fill(0)));
}
