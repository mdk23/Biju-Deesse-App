import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/api/migrate(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/support(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}, {
  // The local machine syncs time from a domain server that drifts (~80s seen).
  // Clerk's default 5s tolerance then rejects valid tokens and causes a
  // /login <-> / redirect loop, so allow up to 3 minutes of clock skew.
  clockSkewInMs: 3 * 60 * 1000,
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*"
  ],
};
