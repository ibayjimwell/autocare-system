"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Menu, ChevronRight } from "lucide-react";
import NotificationBell from "./NotificationBell";

function getPageInfo(pathname: string): { title: string; subtitle: string } {
  const path = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/");
  if (path === "" || path === "dashboard") {
    return { title: "Dashboard", subtitle: "Overview of your AutoCare system" };
  }
  const pageMap: Record<string, { title: string; subtitle: string }> = {
    customers: { title: "Customers", subtitle: "Manage your customer base" },
    appointments: { title: "Appointments", subtitle: "View and schedule appointments" },
    services: { title: "Services", subtitle: "Manage service offerings" },
    staffs: { title: "Staffs", subtitle: "Manage staff members" },
    "service-tracking": { title: "Service Tracking", subtitle: "Monitor service progress" },
    payments: { title: "Payments", subtitle: "Manage payments and invoices" },
    inventory: { title: "Inventory", subtitle: "Track parts and supplies" },
  };
  if (segments[0] && pageMap[segments[0]]) {
    return pageMap[segments[0]];
  }
  const fallbackTitle = segments[0]
    ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " ")
    : "Page";
  return { title: fallbackTitle, subtitle: "" };
}

interface HeaderProps {
  /** Opens the sidebar drawer on screens below lg. Supplied by MainLayout. */
  onMenuOpen?: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { title, subtitle } = getPageInfo(pathname);

  return (
    // Sticky chrome → the one place vibrancy is sanctioned (Rule 5).
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 shadow-sm backdrop-blur-xl md:h-[72px] md:bg-background/70 md:px-6 lg:px-8">
      {/* ---- Left: menu trigger (< lg) + page context ---- */}
      <div className="flex min-w-0 items-center gap-1 md:gap-2">
        {onMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            className="-ml-2 h-11 w-11 shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground md:-ml-1 md:h-10 md:w-10 lg:hidden"
          >
            <Menu className="h-6 w-6 md:h-5 md:w-5" />
          </Button>
        )}

        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="truncate text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-xl lg:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ---- Notifications + identity ---- */}
      <div className="group flex shrink-0 cursor-pointer select-none items-center gap-2 transition-transform active:scale-95 md:gap-3">
        <NotificationBell />

        <div className="hidden flex-col items-end text-right sm:flex">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold leading-none text-foreground transition-colors group-hover:text-primary">
              {user?.name || "Guest Account"}
            </span>
            <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground transition-transform duration-200 group-hover:translate-y-0.5" />
          </div>
          <Badge
            variant="secondary"
            className="mt-1 h-5 max-w-[140px] truncate rounded-md border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
          >
            {user?.role || "GUEST"}
          </Badge>
        </div>

        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105 md:h-10 md:w-10">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
        </div>
      </div>
    </header>
  );
}