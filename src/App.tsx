import { useMutation, useQuery } from "convex/react";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "../convex/_generated/api";
import { Board, diskCounts } from "./Board";
import { clearSeat, loadSeat, saveSeat } from "./session";
import { withTimeout } from "./withTimeout";

const CONVEX_CALL_MS = 25_000;
const TIMEOUT_MSG =
  "Could not reach Convex (timed out). Confirm GitHub Actions secret VITE_CONVEX_URL is your " +
  ".convex.cloud URL (not .convex.site), check DevTools → Network for blocked WebSocket, and try " +
  "disabling ad blockers for this page.";

function readGameIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get("g");
  if (!id || !/^[a-z2-9]{8}$/.test(id)) return null;
  return id;
}

function writeGameIdToUrl(publicId: string) {
  const u = new URL(window.location.href);
  u.searchParams.set("g", publicId);
  window.history.replaceState({}, "", u.toString());
}

export default function App() {
  const [urlGameId, setUrlGameId] = useState<string | null>(() => readGameIdFromUrl());
  const [joinInput, setJoinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const publicId = urlGameId;
  const seat = publicId ? loadSeat(publicId) : null;

  const game = useQuery(
    api.games.getGameByPublicId,
    publicId ? { publicId } : "skip"
  );
  const validMoves = useQuery(
    api.games.validMovesForCurrentTurn,
    publicId ? { publicId } : "skip"
  );

  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);
  const makeMove = useMutation(api.games.makeMove);

  const counts = game ? diskCounts(game.cells) : { black: 0, white: 0 };

  const yourTurn = useMemo(() => {
    if (!game || !seat || game.status !== "active") return false;
    return seat.role === game.currentTurn;
  }, [game, seat]);

  const canClickBoard = Boolean(
    yourTurn &&
      seat &&
      game &&
      game.hasOpponent &&
      game.status === "active" &&
      validMoves &&
      validMoves.length > 0
  );

  const onCreate = useCallback(async () => {
    setBusy(true);
    setMoveError(null);
    try {
      const { publicId: id, blackToken } = await withTimeout(
        createGame({}),
        CONVEX_CALL_MS,
        TIMEOUT_MSG
      );
      saveSeat(id, { role: "black", token: blackToken });
      writeGameIdToUrl(id);
      setUrlGameId(id);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "Could not create game");
    } finally {
      setBusy(false);
    }
  }, [createGame]);

  const joinWithPublicId = useCallback(
    async (id: string) => {
      setBusy(true);
      setMoveError(null);
      try {
        const { whiteToken } = await withTimeout(
          joinGame({ publicId: id }),
          CONVEX_CALL_MS,
          TIMEOUT_MSG
        );
        saveSeat(id, { role: "white", token: whiteToken });
        writeGameIdToUrl(id);
        setUrlGameId(id);
        setJoinInput("");
      } catch (e) {
        setMoveError(e instanceof Error ? e.message : "Could not join");
      } finally {
        setBusy(false);
      }
    },
    [joinGame]
  );

  const onJoinSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const id = joinInput.trim().toLowerCase().replace(/[^a-z2-9]/g, "").slice(0, 8);
      if (id.length !== 8) {
        setMoveError("Enter an 8-character game code.");
        return;
      }
      await joinWithPublicId(id);
    },
    [joinInput, joinWithPublicId]
  );

  const onJoinAsWhite = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!publicId) return;
      await joinWithPublicId(publicId);
    },
    [publicId, joinWithPublicId]
  );

  const onPlay = useCallback(
    async (row: number, col: number) => {
      if (!publicId || !seat) return;
      setMoveError(null);
      setBusy(true);
      try {
        await withTimeout(
          makeMove({
            publicId,
            token: seat.token,
            row,
            col,
          }),
          CONVEX_CALL_MS,
          TIMEOUT_MSG
        );
      } catch (e) {
        setMoveError(e instanceof Error ? e.message : "Move failed");
      } finally {
        setBusy(false);
      }
    },
    [makeMove, publicId, seat]
  );

  const inviteHref = useMemo(() => {
    if (!publicId) return "";
    const u = new URL(window.location.href);
    u.searchParams.set("g", publicId);
    return u.toString();
  }, [publicId]);

  if (!publicId) {
    return (
      <main className="app">
        <header className="header">
          <h1>m-othello</h1>
          <p className="tagline">Realtime Othello for two players (Convex).</p>
        </header>
        <section className="panel">
          <button type="button" className="primary" disabled={busy} onClick={onCreate}>
            New game
          </button>
          <form className="join-form" onSubmit={onJoinSubmit}>
            <label>
              Join with code
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="8 letters / digits"
                maxLength={16}
                autoComplete="off"
              />
            </label>
            <button type="submit" className="secondary" disabled={busy}>
              Join
            </button>
          </form>
          {moveError ? <p className="error">{moveError}</p> : null}
        </section>
      </main>
    );
  }

  if (game === undefined) {
    return (
      <main className="app">
        <p className="loading">Loading game…</p>
      </main>
    );
  }

  if (game === null) {
    return (
      <main className="app">
        <p className="error">No game found for this code.</p>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            window.history.replaceState({}, "", window.location.pathname);
            setUrlGameId(null);
          }}
        >
          Back home
        </button>
      </main>
    );
  }

  const noSeat = !seat;

  return (
    <main className="app">
      <header className="header">
        <h1>m-othello</h1>
        <p className="meta">
          Code: <code className="code">{game.publicId}</code>
          {seat ? (
            <>
              {" · "}
              You are <strong>{seat.role === "black" ? "Black" : "White"}</strong>
            </>
          ) : null}
        </p>
      </header>

      {noSeat ? (
        <div className="banner warn">
          <p>
            This browser doesn’t have a seat token for this table. Open the link from the device
            that created or joined the game, or join again as White using the code (if Black is
            empty, create a new game).
          </p>
          <form className="join-inline" onSubmit={onJoinAsWhite}>
            <p className="join-hint">Join this table as White (Black is already taken).</p>
            <button type="submit" className="primary" disabled={busy}>
              Join as White
            </button>
          </form>
        </div>
      ) : null}

      <div className="status-bar">
        <span>
          Black <strong>{counts.black}</strong>
        </span>
        <span className="turn">
          {game.status === "finished" ? (
            <>
              Game over —{" "}
              {game.winner === "draw"
                ? "Draw"
                : `${game.winner === "black" ? "Black" : "White"} wins`}
            </>
          ) : !game.hasOpponent ? (
            <>Waiting for opponent…</>
          ) : (
            <>
              Turn: <strong>{game.currentTurn === "black" ? "Black" : "White"}</strong>
              {yourTurn ? " — your move" : ""}
            </>
          )}
        </span>
        <span>
          White <strong>{counts.white}</strong>
        </span>
      </div>

      <Board
        cells={game.cells}
        validMoves={validMoves ?? []}
        canClick={canClickBoard && !busy && !noSeat}
        onPlay={onPlay}
        lastError={moveError}
      />

      {!game.hasOpponent && seat?.role === "black" ? (
        <section className="panel invite">
          <p>Send this link to your opponent:</p>
          <div className="invite-row">
            <input readOnly className="invite-url" value={inviteHref} />
            <button
              type="button"
              className="secondary"
              onClick={() => navigator.clipboard.writeText(inviteHref)}
            >
              Copy
            </button>
          </div>
        </section>
      ) : null}

      <footer className="footer">
        <button
          type="button"
          className="linkish"
          onClick={() => {
            if (publicId) clearSeat(publicId);
            window.history.replaceState({}, "", window.location.pathname);
            setUrlGameId(null);
            setMoveError(null);
          }}
        >
          Leave table
        </button>
      </footer>
    </main>
  );
}
