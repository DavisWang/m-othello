import { BLACK, EMPTY, SIZE, WHITE } from "./boardConstants";

type Props = {
  cells: number[];
  validMoves: { r: number; c: number }[];
  canClick: boolean;
  onPlay: (row: number, col: number) => void;
  lastError: string | null;
};

function key(r: number, c: number) {
  return `${r},${c}`;
}

export function Board({ cells, validMoves, canClick, onPlay, lastError }: Props) {
  const validSet = new Set(validMoves.map((m) => key(m.r, m.c)));

  return (
    <div className="board-wrap">
      {lastError ? <p className="board-error">{lastError}</p> : null}
      <div className="board" role="grid" aria-label="Othello board">
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const cell = cells[r * SIZE + c];
          const isHint = validSet.has(key(r, c));
          const clickable = canClick && isHint;
          return (
            <button
              key={key(r, c)}
              type="button"
              role="gridcell"
              className={[
                "cell",
                cell === BLACK ? "black" : "",
                cell === WHITE ? "white" : "",
                cell === EMPTY && isHint ? "hint" : "",
                clickable ? "clickable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!clickable}
              aria-label={`Row ${r + 1}, column ${c + 1}`}
              onClick={() => onPlay(r, c)}
            >
              {cell !== EMPTY ? <span className="disk" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function diskCounts(cells: number[]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const x of cells) {
    if (x === BLACK) black++;
    else if (x === WHITE) white++;
  }
  return { black, white };
}
