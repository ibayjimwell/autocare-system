"use client";

import { cn } from "@/lib/utils";

import { useAuth } from "@/hooks/use-auth";

import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import {
  Menu,
  ChevronRight,
} from "lucide-react";

import NotificationBell from "./NotificationBell";

// ================================================================
// PAGE INFORMATION
// ================================================================
function getPageInfo(
  pathname: string,
): { title: string; subtitle: string } {
  const path = pathname
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const segments = path.split("/");

  if (path === "" || path === "dashboard") {
    return {
      title: "Dashboard",
      subtitle: "Overview of your AutoCare system",
    };
  }

  const pageMap: Record<
    string,
    { title: string; subtitle: string }
  > = {
    customers: {
      title: "Customers",
      subtitle: "Manage your customer base",
    },

    appointments: {
      title: "Appointments",
      subtitle: "View and schedule appointments",
    },

    services: {
      title: "Services",
      subtitle: "Manage service offerings",
    },

    staffs: {
      title: "Staffs",
      subtitle: "Manage staff members",
    },

    "service-tracking": {
      title: "Service Tracking",
      subtitle: "Monitor service progress",
    },

    payments: {
      title: "Payments",
      subtitle: "Manage payments and invoices",
    },

    inventory: {
      title: "Inventory",
      subtitle: "Track parts and supplies",
    },
  };

  if (segments[0] && pageMap[segments[0]]) {
    return pageMap[segments[0]];
  }

  const fallbackTitle = segments[0]
    ? segments[0]
        .charAt(0)
        .toUpperCase() +
      segments[0]
        .slice(1)
        .replace(/-/g, " ")
    : "Page";

  return {
    title: fallbackTitle,
    subtitle: "",
  };
}

// ================================================================
// HEADER
// ================================================================
interface HeaderProps {
  /**
   * Opens the sidebar drawer on screens below lg.
   * Supplied by MainLayout.
   */
  onMenuOpen?: () => void;
}

export function Header({
  onMenuOpen,
}: HeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const { title, subtitle } = getPageInfo(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3",
        "h-16 md:h-[72px]",
        "border-b border-border",
        "bg-card text-card-foreground",
        "px-4 shadow-sm md:px-6 lg:px-8",
      )}
    >
      {/* ============================================================
          LEFT SIDE
          ============================================================ */}
      <div className="flex min-w-0 items-center gap-1 md:gap-2">
        {/* Mobile menu */}
        {onMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            className={cn(
              "-ml-2 h-11 w-11 shrink-0 rounded-xl",
              "text-foreground",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "md:-ml-1 md:h-10 md:w-10 lg:hidden",
            )}
          >
            <Menu className="h-6 w-6 md:h-5 md:w-5" />
          </Button>
        )}

        {/* Page context */}
        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="truncate text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-xl lg:text-2xl">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ============================================================
          RIGHT SIDE
          ============================================================ */}
      <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
        {/* Notifications */}
        <NotificationBell />

        {/* Account */}
        <div className="group flex cursor-pointer select-none items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-accent/60 md:gap-3 md:px-2">
          {/* ======================================================
              USER DETAILS
              ====================================================== */}
          <div className="hidden flex-col items-end text-right sm:flex">
            <div className="flex max-w-[190px] items-center gap-1">
              <span className="truncate text-sm font-semibold leading-none text-foreground transition-colors group-hover:text-primary">
                {user?.name || "Guest Account"}
              </span>

              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 rotate-90",
                  "text-muted-foreground",
                  "transition-transform duration-200",
                  "group-hover:translate-y-0.5",
                )}
              />
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "mt-1 h-5 max-w-[140px] truncate rounded-md",
                "border border-primary/20 bg-primary/10",
                "px-1.5 text-[10px] font-semibold uppercase tracking-wider",
                "text-primary",
              )}
            >
              {user?.role || "GUEST"}
            </Badge>
          </div>

          {/* ======================================================
              AVATAR
              ====================================================== */}
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-[1.03]">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>
        </div>
      </div>
    </header>
  );
}