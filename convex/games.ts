import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  applyMove,
  getValidMoves,
  hasValidMove,
  initialBoard,
  opponent,
  resolveTurnAfterMove,
  type Player,
} from "./othelloEngine";

function randomHex(bytes: number): string {
  const u = new Uint8Array(bytes);
  crypto.getRandomValues(u);
  return Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
}

const PUBLIC_ID_CHARS = "abcdefghijklmnopqrstuvwxyz23456789";

function randomPublicId(length: number): string {
  const u = new Uint8Array(length);
  crypto.getRandomValues(u);
  return Array.from(u, (b) => PUBLIC_ID_CHARS[b % PUBLIC_ID_CHARS.length]).join("");
}

export const createGame = mutation({
  args: {},
  handler: async (ctx) => {
    let publicId = "";
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = randomPublicId(8);
      const clash = await ctx.db
        .query("games")
        .withIndex("by_publicId", (q) => q.eq("publicId", candidate))
        .first();
      if (!clash) {
        publicId = candidate;
        break;
      }
    }
    if (!publicId) throw new Error("Could not allocate game id");

    const now = Date.now();
    const blackToken = randomHex(24);
    const id = await ctx.db.insert("games", {
      publicId,
      cells: initialBoard(),
      currentTurn: "black",
      status: "waiting",
      blackToken,
      whiteToken: undefined,
      winner: undefined,
      updatedAt: now,
    });

    return { gameId: id, publicId, blackToken };
  },
});

export const joinGame = mutation({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!game) throw new Error("Game not found");
    if (game.status === "finished") throw new Error("Game already finished");
    if (game.whiteToken) throw new Error("Game is full");

    const whiteToken = randomHex(24);
    await ctx.db.patch(game._id, {
      whiteToken,
      status: "active",
      updatedAt: Date.now(),
    });
    return { whiteToken };
  },
});

function assertToken(game: { blackToken: string; whiteToken?: string }, token: string): Player {
  if (token === game.blackToken) return "black";
  if (game.whiteToken && token === game.whiteToken) return "white";
  throw new Error("Invalid seat token");
}

export const makeMove = mutation({
  args: {
    publicId: v.string(),
    token: v.string(),
    row: v.number(),
    col: v.number(),
  },
  handler: async (ctx, { publicId, token, row, col }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!game) throw new Error("Game not found");
    if (game.status !== "active") throw new Error("Game is not in progress");
    if (!game.whiteToken) throw new Error("Waiting for second player");

    const player = assertToken(game, token);
    if (player !== game.currentTurn) throw new Error("Not your turn");

    if (!Number.isInteger(row) || !Number.isInteger(col)) throw new Error("Bad coordinates");
    if (row < 0 || row > 7 || col < 0 || col > 7) throw new Error("Out of bounds");

    const board = applyMove(game.cells, row, col, player);
    const next = opponent(player);
    const resolved = resolveTurnAfterMove(board, next);

    await ctx.db.patch(game._id, {
      cells: board,
      currentTurn: resolved.currentTurn,
      status: resolved.finished ? "finished" : "active",
      winner: resolved.finished ? resolved.winner : undefined,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Host can start alone vs engine later; for now optional "open table" — skip. */

export const validMovesForCurrentTurn = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!game || game.status !== "active" || !game.whiteToken) return [];
    return getValidMoves(game.cells, game.currentTurn);
  },
});

export const getGameByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!game) return null;

    const blackCanMove = game.status === "active" && hasValidMove(game.cells, "black");
    const whiteCanMove = game.status === "active" && hasValidMove(game.cells, "white");

    return {
      publicId: game.publicId,
      cells: game.cells,
      currentTurn: game.currentTurn,
      status: game.status,
      winner: game.winner,
      hasOpponent: Boolean(game.whiteToken),
      blackCanMove,
      whiteCanMove,
      updatedAt: game.updatedAt,
    };
  },
});
