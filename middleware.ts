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

    // Public routes – always allow
    if (
      pathname === "/login" ||
      pathname === "/unauthorized" ||
      pathname === "/api/staffs/login"   // <-- allow login API
    ) {
      return NextResponse.next();
    }

    // For all other routes, require token and check permissions
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

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
        // Allow public routes without token
        if (
          pathname === "/login" ||
          pathname === "/unauthorized" ||
          pathname === "/api/staffs/login"
        ) {
          return true;
        }
        // All other routes need a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};