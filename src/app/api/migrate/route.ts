import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function GET() {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      username: "usr_mdk",
      password: "123",
      skipPasswordChecks: true,
    });
    
    // We need to update Convex, but convex client requires Convex URL.
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("No Convex URL");

    const convex = new ConvexHttpClient(convexUrl);
    
    // Get the MDK user from convex
    const mdkUser = await convex.query(api.users.getUserByUsername, { username: "mdk" });
    
    if (mdkUser) {
      await convex.mutation(api.users.updateClerkId, {
        userId: mdkUser._id,
        clerkId: user.id,
      });
      return NextResponse.json({ success: true, message: "Migrated MDK successfully!" });
    } else {
      return NextResponse.json({ success: false, message: "MDK user not found in Convex" });
    }
  } catch (error: any) {
    console.error("Migration error details:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || String(error),
      details: error.errors || null
    });
  }
}
