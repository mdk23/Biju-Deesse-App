import { DatabaseReader, DatabaseWriter } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Validates the JWT auth token and resolves the matching Convex user document.
 * Throws a ConvexError if authentication fails, the user record is missing, or the account is blocked.
 */
export async function requireUser(db: DatabaseReader | DatabaseWriter, ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated. Please log in to proceed.");
  }

  const user = await db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new ConvexError("User profile not found in database. Please register your account first.");
  }

  if (user.blocked) {
    throw new ConvexError("Access Denied: Your account is currently blocked.");
  }

  return user;
}
