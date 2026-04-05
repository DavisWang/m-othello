import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    publicId: v.string(),
    cells: v.array(v.number()),
    currentTurn: v.union(v.literal("black"), v.literal("white")),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("finished")
    ),
    blackToken: v.string(),
    whiteToken: v.optional(v.string()),
    winner: v.optional(
      v.union(v.literal("black"), v.literal("white"), v.literal("draw"))
    ),
    updatedAt: v.number(),
  }).index("by_publicId", ["publicId"]),
});
