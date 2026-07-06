"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import LuxuryLoader from "./LuxuryLoader";

export type UserSession = {
  _id: string;
  username: string;
  role: string;
  clerkId?: string;
};

type AuthContextType = {
  user: UserSession | null;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { signOut } = useClerk();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
  );

  const [finalUser, setFinalUser] = useState<UserSession | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isLoading = !isClerkLoaded || (clerkUser !== null && convexUser === undefined);

  console.log("AuthProvider Auth State:", {
    isClerkLoaded,
    clerkUserId: clerkUser?.id,
    clerkUsername: clerkUser?.username,
    convexUser,
    isLoading
  });

  useEffect(() => {
    if (isLoading) return;

    if (clerkUser && convexUser) {
      if (convexUser.blocked) {
        if (!isSigningOut) {
          toast.error("User is blocked, contact admin");
          setIsSigningOut(true);
          signOut().then(() => {
            setIsSigningOut(false);
          }).catch((err) => {
            console.error("Sign out error:", err);
            setIsSigningOut(false);
          });
        }
        return;
      }

      // Enforce POS role route protection
      if (convexUser.role === "POS") {
        const allowedPOSPaths = ["/", "/pos", "/caixa", "/login"];
        const isAllowed = allowedPOSPaths.some(path => {
          if (path === "/") return pathname === "/";
          return pathname.startsWith(path);
        });
        if (!isAllowed) {
          toast.error("Access denied. POS users only have access to Dashboard, POS, and Caixa.");
          window.location.href = "/";
          return;
        }
      }

      setFinalUser(convexUser as UserSession);
      if (pathname === "/login") {
        window.location.href = "/";
      }
    } else if (!clerkUser) {
      setFinalUser(null);
      if (pathname !== "/login") {
        window.location.href = "/login";
      }
    } else if (clerkUser && convexUser === null) {
      if (!isSigningOut) {
        console.warn("Clerk user has no Convex record, signing out");
        setIsSigningOut(true);
        signOut().then(() => {
          setIsSigningOut(false);
        }).catch((err) => {
          console.error("Sign out error:", err);
          setIsSigningOut(false);
        });
      }
    }
  }, [clerkUser, convexUser, isLoading, pathname, isSigningOut, signOut]);

  const logout = () => {
    signOut(() => {
      router.push("/login");
    });
  };

  return (
    <AuthContext.Provider value={{ user: finalUser, isLoading, logout }}>
      {isLoading && finalUser === null ? (
        <LuxuryLoader text="Synchronizing Session..." />
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
