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
