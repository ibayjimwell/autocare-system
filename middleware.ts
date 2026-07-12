// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const routeToPermission: Record<string, string> = {
  "/dashboard": "dashboard",
  "/customers": "customers",
  "/appointments": "appointments",
  "/services": "services",
  "/staffs": "staffs",
  "/service-tracking": "serviceTracking",
  "/payments": "payments",
};

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 1. Always allow API routes – they handle their own auth
    if (pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // 2. Public frontend pages
    if (pathname === "/login" || pathname === "/unauthorized") {
      return NextResponse.next();
    }

    // 3. For all other pages, require token
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // 4. Check module access permissions
    const matchedRoute = Object.keys(routeToPermission).find((route) =>
      pathname.startsWith(route)
    );
    if (matchedRoute) {
      const requiredPermission = routeToPermission[matchedRoute];
      const userAccess = token.access;
      if (!userAccess || userAccess[requiredPermission] !== true) {
        const unauthorizedUrl = new URL("/unauthorized", req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;

        // Allow API routes and public pages without a token
        if (
          pathname.startsWith("/api") ||
          pathname === "/login" ||
          pathname === "/unauthorized"
        ) {
          return true;
        }

        // All other pages need a valid token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};