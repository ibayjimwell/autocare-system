import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getFirstAccessibleRoute } from "@/lib/auth/get-first-access-route";

const routeToPermission: Record<string, string> = {
  "/dashboard": "dashboard",
  "/customers": "customers",
  "/appointments": "appointments",
  "/services": "services",
  "/staffs": "staffs",
  "/service-tracking": "serviceTracking",
  "/payments": "payments",
  "/inventory": "inventory",
};

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 1. API routes handle their own authentication.
    if (pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // 2. Public frontend pages.
    if (
      pathname === "/login" ||
      pathname === "/unauthorized"
    ) {
      return NextResponse.next();
    }

    // 3. Every other frontend page requires an authenticated token.
    if (!token) {
      const loginUrl = new URL("/login", req.url);

      // Preserve a real destination when possible. The login page still
      // decides the authenticated landing page from RBAC permissions.
      if (pathname !== "/") {
        loginUrl.searchParams.set(
          "callbackUrl",
          pathname,
        );
      }

      return NextResponse.redirect(loginUrl);
    }

    const userAccess = token.access as
      | Record<string, boolean>
      | null
      | undefined;

    // 4. Root route: redirect to the first permitted sidebar module.
    // This prevents "/" from ever acting as an implicit Dashboard page.
    if (pathname === "/") {
      const firstRoute = getFirstAccessibleRoute(userAccess);

      if (firstRoute) {
        return NextResponse.redirect(
          new URL(firstRoute, req.url),
        );
      }

      // Authenticated but no enabled module.
      return NextResponse.redirect(
        new URL("/unauthorized", req.url),
      );
    }

    // 5. Normal module permission check.
    const matchedRoute = Object.keys(routeToPermission).find(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`),
    );

    if (matchedRoute) {
      const requiredPermission =
        routeToPermission[matchedRoute];

      if (
        !userAccess ||
        userAccess[requiredPermission] !== true
      ) {
        return NextResponse.redirect(
          new URL("/unauthorized", req.url),
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;

        if (
          pathname.startsWith("/api") ||
          pathname === "/login" ||
          pathname === "/unauthorized"
        ) {
          return true;
        }

        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
