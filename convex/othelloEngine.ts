/** Board: 64 cells, row-major. 0 empty, 1 black, 2 white. */

export const SIZE = 8;
export type Player = "black" | "white";
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export function playerCell(p: Player): number {
  return p === "black" ? BLACK : WHITE;
}

export function opponent(p: Player): Player {
  return p === "black" ? "white" : "black";
}

export function initialBoard(): number[] {
  const b = Array<number>(64).fill(EMPTY);
  b[idx(3, 3)] = WHITE;
  b[idx(3, 4)] = BLACK;
  b[idx(4, 3)] = BLACK;
  b[idx(4, 4)] = WHITE;
  return b;
}

export function idx(r: number, c: number): number {
  return r * SIZE + c;
}

const DIRS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

/** Disks that would flip if player places at (r,c), excluding the new disk. */
export function flippedIfMove(board: number[], r: number, c: number, player: Player): number[] {
  if (board[idx(r, c)] !== EMPTY) return [];
  const mine = playerCell(player);
  const theirs = player === "black" ? WHITE : BLACK;
  const toFlip: number[] = [];

  for (const [dr, dc] of DIRS) {
    let nr = r + dr;
    let nc = c + dc;
    const line: number[] = [];
    while (inBounds(nr, nc) && board[idx(nr, nc)] === theirs) {
      line.push(idx(nr, nc));
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && inBounds(nr, nc) && board[idx(nr, nc)] === mine) {
      toFlip.push(...line);
    }
  }
  return toFlip;
}

export function isValidMove(board: number[], r: number, c: number, player: Player): boolean {
  return flippedIfMove(board, r, c, player).length > 0;
}

export function getValidMoves(board: number[], player: Player): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isValidMove(board, r, c, player)) out.push({ r, c });
    }
  }
  return out;
}

export function hasValidMove(board: number[], player: Player): boolean {
  return getValidMoves(board, player).length > 0;
}

export function applyMove(board: number[], r: number, c: number, player: Player): number[] {
  const flips = flippedIfMove(board, r, c, player);
  if (flips.length === 0) throw new Error("Illegal move");
  const next = [...board];
  const mine = playerCell(player);
  next[idx(r, c)] = mine;
  for (const i of flips) next[i] = mine;
  return next;
}

/** After `player` just moved; board already updated and turn should become opponent. */
export function resolveTurnAfterMove(
  board: number[],
  nextPlayer: Player
): { currentTurn: Player; finished: boolean; winner?: "black" | "white" | "draw" } {
  let turn: Player = nextPlayer;
  let passes = 0;
  while (!hasValidMove(board, turn)) {
    passes++;
    if (passes >= 2) {
      return { currentTurn: turn, finished: true, winner: scoreWinner(board) };
    }
    turn = opponent(turn);
  }
  return { currentTurn: turn, finished: false };
}

export function scoreWinner(board: number[]): "black" | "white" | "draw" {
  let b = 0;
  let w = 0;
  for (const cell of board) {
    if (cell === BLACK) b++;
    else if (cell === WHITE) w++;
  }
  if (b > w) return "black";
  if (w > b) return "white";
  return "draw";
}
