import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/history(.*)",
  "/connections(.*)",
  "/scheduled(.*)",
  "/batch(.*)",
  "/analytics(.*)",
  "/extension(.*)",
  "/team(.*)",
  "/api/me",
  "/api/history(.*)",
  "/api/style-profile(.*)",
  "/api/social(.*)",
  "/api/publications(.*)",
  "/api/batch(.*)",
  "/api/analytics(.*)",
  "/api/extension(.*)",
  "/api/teams(.*)",
  "/api/posts/(.*)/publish",
  "/api/posts/(.*)/carousel",
  "/api/posts/(.*)/thumbnail",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return;

  const { userId, redirectToSignIn } = await auth();
  if (userId) return;

  // API clients get JSON 401 — avoid HTML redirect loops for fetch().
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Sign in required" },
      },
      { status: 401 },
    );
  }

  // Pages: send to branded sign-in, then back to the original URL.
  return redirectToSignIn({ returnBackUrl: request.url });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
