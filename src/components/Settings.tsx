"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClerkUserAction, deleteClerkUserAction, updateClerkPasswordAction } from "../app/actions/clerkActions";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, UserPlus, Users, Save, Loader2, Shield, Key, Eye, EyeOff, Percent } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "users" | "store">("profile");

  if (!user) return null;

  const canManageUsers = user.role === "admin" || user.role === "manager";
  const isAdmin = user.role === "admin";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">Settings</h1>
        <p className="text-on-surface-variant">Manage your account preferences and system settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 space-y-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left px-4 py-3 rounded-lg font-label-caps text-label-caps transition-all flex items-center gap-3 ${
              activeTab === "profile" 
                ? "bg-primary text-on-primary shadow-md" 
                : "text-on-surface-variant hover:bg-white/30"
            }`}
          >
            <Shield className="w-4 h-4" />
            My Profile
          </button>
          
          {canManageUsers && (
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full text-left px-4 py-3 rounded-lg font-label-caps text-label-caps transition-all flex items-center gap-3 ${
                activeTab === "users" 
                  ? "bg-primary text-on-primary shadow-md" 
                  : "text-on-surface-variant hover:bg-white/30"
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab("store")}
              className={`w-full text-left px-4 py-3 rounded-lg font-label-caps text-label-caps transition-all flex items-center gap-3 ${
                activeTab === "store"
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-white/30"
              }`}
            >
              <Percent className="w-4 h-4" />
              Store Settings
            </button>
          )}

          <div className="pt-4 mt-4 border-t border-outline-variant/50">
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 rounded-lg font-label-caps text-label-caps text-error hover:bg-error/10 transition-all flex items-center gap-3"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel p-8 rounded-2xl min-h-[500px]">
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "users" && canManageUsers && <UserManagementSection />}
          {activeTab === "store" && isAdmin && <StoreSettingsSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const resetPassword = useMutation(api.users.resetPassword);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 3) {
      toast.error("Password must be at least 3 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.clerkId) {
        const clerkRes = await updateClerkPasswordAction(user.clerkId, newPassword);
        if (!clerkRes.success) {
          throw new Error(clerkRes.message || "Failed to update password in Clerk");
        }
      }

      await resetPassword({ userId: user!._id as Id<"users">, newPassword });
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-headline-sm text-headline-sm text-primary mb-6 flex items-center gap-2">
        <KeyRound className="w-5 h-5" /> Change Password
      </h2>

      <div className="mb-8 p-4 bg-white/30 rounded-lg border border-white/50">
        <p className="text-sm text-on-surface-variant mb-1">Current User</p>
        <p className="font-bold text-on-surface">{user?.username} <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-label-caps bg-primary/10 text-primary">{user?.role}</span></p>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">New Password</label>
          <input
            type="password"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-2 px-0 focus:ring-0 focus:border-primary transition-colors outline-none"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Confirm New Password</label>
          <input
            type="password"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-2 px-0 focus:ring-0 focus:border-primary transition-colors outline-none"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-label-caps text-label-caps hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Password
        </button>
      </form>
    </motion.div>
  );
}

function UserManagementSection() {
  const { user } = useAuth();
  const users = useQuery(api.users.listUsers);
  const storeClerkUser = useMutation(api.users.storeClerkUser);
  const deleteUser = useMutation(api.users.deleteUser);
  const toggleBlockUser = useMutation(api.users.toggleBlockUser);
  const resetPassword = useMutation(api.users.resetPassword);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "POS">("POS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleToggleBlock = async (targetUser: any) => {
    if (!user) return;
    const isBlocking = !targetUser.blocked;
    try {
      await toggleBlockUser({ 
        userId: targetUser._id, 
        blocked: isBlocking,
      });
      toast.success(`User ${targetUser.username} has been ${isBlocking ? "blocked" : "unblocked"}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
      console.error(error);
    }
  };

  const handleResetPassword = (targetUser: any) => {
    setResetPasswordValue("");
    setShowResetPassword(false);
    setResetTarget(targetUser);
  };

  const confirmResetPassword = async () => {
    if (!user || !resetTarget) return;
    if (resetPasswordValue.length < 3) {
      toast.error("Password must be at least 3 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      if (resetTarget.clerkId) {
        const clerkRes = await updateClerkPasswordAction(resetTarget.clerkId, resetPasswordValue);
        if (!clerkRes.success) {
          throw new Error(clerkRes.message || "Failed to update password in Clerk");
        }
      }

      await resetPassword({ userId: resetTarget._id, newPassword: resetPasswordValue });
      toast.success(`Password for ${resetTarget.username} has been reset`);
      setResetTarget(null);
      setResetPasswordValue("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete user ${targetUser.username}?`)) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Delete from Clerk if they have a clerkId
      if (targetUser.clerkId) {
        const clerkRes = await deleteClerkUserAction(targetUser.clerkId);
        if (!clerkRes.success) {
          throw new Error(clerkRes.message || "Failed to delete user from Clerk");
        }
      }

      // 2. Delete from Convex
      await deleteUser({ 
        userId: targetUser._id,
      });
      toast.success(`User ${targetUser.username} deleted successfully!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Create user in Clerk Backend first
      const clerkRes = await createClerkUserAction(username, password);
      
      if (!clerkRes.success || !clerkRes.clerkId) {
        throw new Error(clerkRes.message || "Failed to create user in Clerk");
      }

      // Sync the user to Convex database with their newly generated Clerk ID
      await storeClerkUser({
        clerkId: clerkRes.clerkId,
        username: username,
        role: role,
      });
      toast.success(`User ${username} created!`);
      setUsername("");
      setPassword("");
      setRole("POS");
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-headline-sm text-headline-sm text-primary mb-6 flex items-center gap-2">
        <UserPlus className="w-5 h-5" /> Create New User
      </h2>

      <form onSubmit={handleCreateUser} className="space-y-6 max-w-md mb-12">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-transparent border-0 border-b border-outline-variant py-2 px-0 focus:ring-0 focus:border-primary transition-colors outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Password</label>
            <input
              type="password"
              className="w-full bg-transparent border-0 border-b border-outline-variant py-2 px-0 focus:ring-0 focus:border-primary transition-colors outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Role</label>
          <div className="flex gap-4">
            {user?.role === "admin" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={role === "manager"}
                  onChange={() => setRole("manager")}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Manager</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="POS"
                checked={role === "POS"}
                onChange={() => setRole("POS")}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm">POS</span>
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-label-caps text-label-caps hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Create Account
        </button>
      </form>

      <h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" /> Existing Users
      </h2>
      
      {users === undefined ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="bg-white/40 rounded-xl overflow-hidden border border-white/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/50 bg-white/20">
                <th className="py-3 px-4 font-label-caps text-[10px] text-outline tracking-wider">USERNAME</th>
                <th className="py-3 px-4 font-label-caps text-[10px] text-outline tracking-wider">ROLE</th>
                <th className="py-3 px-4 font-label-caps text-[10px] text-outline tracking-wider">STATUS</th>
                <th className="py-3 px-4 font-label-caps text-[10px] text-outline tracking-wider text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.clerkId === user?.clerkId;
                const performerRole = user?.role;
                const canManageTarget =
                  (performerRole === "admin" && !isSelf) ||
                  (performerRole === "manager" && u.role === "POS");
                return (
                  <tr key={u._id} className="border-b border-white/20 last:border-0 hover:bg-white/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-label-caps bg-primary/10 text-primary">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.blocked ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-label-caps bg-error/10 text-error">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-label-caps bg-success/15 text-success">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {canManageTarget && (
                        <div className="flex items-center justify-end gap-2 flex-nowrap">
                          <button
                            onClick={() => handleResetPassword(u)}
                            title="Reset Password"
                            className="shrink-0 px-3 py-1 rounded text-xs font-label-caps bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                            disabled={isSubmitting}
                          >
                            <Key className="w-3 h-3" /> Reset
                          </button>
                          <button
                            onClick={() => handleToggleBlock(u)}
                            className={`shrink-0 px-3 py-1 rounded text-xs font-label-caps transition-colors inline-flex items-center whitespace-nowrap ${
                              u.blocked
                                ? "bg-success/10 text-success hover:bg-success/20"
                                : "bg-warning/10 text-warning hover:bg-warning/20"
                            }`}
                            disabled={isSubmitting}
                          >
                            {u.blocked ? "Unblock" : "Block"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="shrink-0 px-3 py-1 rounded text-xs font-label-caps bg-error/10 text-error hover:bg-error/20 transition-colors inline-flex items-center whitespace-nowrap"
                            disabled={isSubmitting}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {resetTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setResetTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <h3 className="font-headline-sm text-headline-sm text-primary mb-1 flex items-center gap-2">
                <Key className="w-4 h-4" /> Reset Password
              </h3>
              <p className="text-sm text-on-surface-variant mb-5">
                Set a new password for <span className="font-bold text-on-surface">{resetTarget.username}</span>.
              </p>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                New Password
              </label>
              <div className="relative mb-6">
                <input
                  type={showResetPassword ? "text" : "password"}
                  autoFocus
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-2 pr-8 focus:ring-0 focus:border-primary transition-colors outline-none"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmResetPassword();
                  }}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors focus:outline-none"
                >
                  {showResetPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setResetTarget(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full text-sm font-label-caps text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetPassword}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-full text-sm font-label-caps hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StoreSettingsSection() {
  const currentLimit = useQuery(api.appSettings.getDailyDiscountLimit);
  const discountStatus = useQuery(api.appSettings.getDiscountStatus);
  const setDailyDiscountLimit = useMutation(api.appSettings.setDailyDiscountLimit);

  const [limitInput, setLimitInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayValue = limitInput !== "" ? limitInput : (currentLimit ?? "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(limitInput || String(currentLimit ?? ""));
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid, non-negative amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await setDailyDiscountLimit({ limit: parsed });
      toast.success(`Daily discount limit set to Mt ${parsed.toLocaleString()}`);
      setLimitInput("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update daily discount limit");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-headline-sm text-headline-sm text-primary mb-6 flex items-center gap-2">
        <Percent className="w-5 h-5" /> Daily Discount Limit
      </h2>
      <p className="text-sm text-on-surface-variant mb-6 max-w-md">
        Caps the total manual discount that can be given across every sale, by every
        cashier, per calendar day. Once reached, no more discount can be applied at
        checkout until the limit resets the next day.
      </p>

      {discountStatus && (
        <div className="mb-8 p-4 bg-white/30 rounded-lg border border-white/50 max-w-md">
          <p className="text-sm text-on-surface-variant mb-1">Used Today</p>
          <p className="font-bold text-on-surface">
            Mt {discountStatus.used.toLocaleString()} / Mt {discountStatus.limit.toLocaleString()}
            <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-label-caps bg-primary/10 text-primary">
              Mt {discountStatus.remaining.toLocaleString()} remaining
            </span>
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-md">
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
            Daily Limit (Mt)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full bg-transparent border-0 border-b border-outline-variant py-2 px-0 focus:ring-0 focus:border-primary transition-colors outline-none"
            value={displayValue}
            onChange={(e) => setLimitInput(e.target.value)}
            disabled={isSubmitting || currentLimit === undefined}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || currentLimit === undefined}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-label-caps text-label-caps hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Limit
        </button>
      </form>
    </motion.div>
  );
}
