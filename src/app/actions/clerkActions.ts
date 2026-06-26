"use server";

import { clerkClient } from "@clerk/nextjs/server";

export async function createClerkUserAction(username: string, passwordHash: string) {
  try {
    const clerk = await clerkClient();
    
    const user = await clerk.users.createUser({
      username: `usr_${username}`,
      password: passwordHash, // We pass the requested password directly to Clerk
      skipPasswordChecks: true,
    });

    return { success: true, clerkId: user.id };
  } catch (error: any) {
    console.error("Clerk user creation error:", error);
    return { success: false, message: error.errors?.[0]?.longMessage || error.message || "Failed to create user in Clerk" };
  }
}

export async function deleteClerkUserAction(clerkId: string) {
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);
    return { success: true };
  } catch (error: any) {
    console.error("Clerk user deletion error:", error);
    return { success: false, message: error.errors?.[0]?.longMessage || error.message || "Failed to delete user in Clerk" };
  }
}

export async function updateClerkPasswordAction(clerkId: string, newPassword: string) {
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUser(clerkId, { password: newPassword });
    return { success: true };
  } catch (error: any) {
    console.error("Clerk password update error:", error);
    return { success: false, message: error.errors?.[0]?.longMessage || error.message || "Failed to update password in Clerk" };
  }
}

export async function enforceSingleSessionAction(currentSessionId: string) {
  try {
    const clerk = await clerkClient();
    
    // 1. Retrieve the current session to get the user ID
    const currentSession = await clerk.sessions.getSession(currentSessionId);
    const clerkUserId = currentSession.userId;
    
    // 2. Get all active sessions for the user
    const sessions = await clerk.sessions.getSessionList({
      userId: clerkUserId,
    });

    // 3. Revoke all other active sessions
    let revokedCount = 0;
    for (const session of sessions.data) {
      if (session.id !== currentSessionId && session.status === "active") {
        await clerk.sessions.revokeSession(session.id);
        revokedCount++;
      }
    }
    
    return { success: true, revokedCount };
  } catch (error: any) {
    console.error("Error enforcing single session:", error);
    return { success: false, message: error.message || "Failed to enforce single session" };
  }
}
