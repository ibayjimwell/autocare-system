"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Wrench,
  ChevronRight,
  X,
  Menu,
  Search,
  Bell,
} from "lucide-react";

// ------------------------------------------------------------------
// Helper: map route path to title & subtitle
// ------------------------------------------------------------------
function getPageInfo(pathname: string): { title: string; subtitle: string } {
  // Remove trailing slash and leading slash for matching
  const path = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/");

  // Home page
  if (path === "" || path === "dashboard") {
    return { title: "Dashboard", subtitle: "Overview of your AutoCare system" };
  }

  // Static pages
  const pageMap: Record<string, { title: string; subtitle: string }> = {
    customers: { title: "Customers", subtitle: "Manage your customer base" },
    appointments: { title: "Appointments", subtitle: "View and schedule appointments" },
    services: { title: "Services", subtitle: "Manage service offerings" },
    staffs: { title: "Staffs", subtitle: "Manage staff members" },
    "service-tracking": { title: "Service Tracking", subtitle: "Monitor service progress" },
    payments: { title: "Payments", subtitle: "Manage payments and invoices" },
    inventory: { title: "Inventory", subtitle: "Track parts and supplies" },
  };

  // If the first segment matches a known page, use it
  if (segments[0] && pageMap[segments[0]]) {
    return pageMap[segments[0]];
  }

  // Fallback: Capitalize the first segment
  const fallbackTitle = segments[0]
    ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " ")
    : "Page";
  return { title: fallbackTitle, subtitle: "" };
}

// ================================================================
// MOBILE HEADER – Top bar for small screens (unchanged)
// ================================================================
export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 bg-card backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:hidden sticky top-0 z-40 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="rounded-xl hover:bg-primary/5 active:scale-95 transition-all duration-200 h-10 w-10"
        >
          <Menu className="w-6 h-6 text-slate-700" />
          <span className="sr-only">Toggle Menu</span>
        </Button>

        <div className="flex items-center gap-2.5 ml-1">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20 rotate-0 hover:rotate-6 transition-transform">
            <Wrench className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-sm md:text-base tracking-tighter leading-none">
              <span className="text-primary uppercase">Auto</span>{" "}
              <span className="text-black uppercase">Pro Tech</span>
            </h1>
            <span className="text-[9px] font-bold text-muted-foreground tracking-[0.15em] uppercase">
              AutoCare System
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-slate-500 w-9 h-9"
        >
          <Search className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-slate-500 w-9 h-9 relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </Button>
      </div>
    </header>
  );
}

// ================================================================
// DESKTOP HEADER – Sticky page title + user chip (auto‑detects route)
// ================================================================
export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { title, subtitle } = getPageInfo(pathname);

  return (
    <header className="h-14 md:h-16 bg-card backdrop-blur-md border-b border-border min-h-[72px] px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 transition-all duration-300">
      <div className="flex flex-col justify-center min-w-0">
        <h2 className="font-black text-foreground md:text-xl tracking-tight leading-tight truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5 truncate opacity-80">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 group cursor-pointer select-none active:scale-95 transition-transform">
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-foreground leading-none group-hover:text-primary transition-colors">
              {user?.name || "Guest Account"}
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-y-0.5 transition-transform duration-200 rotate-90" />
          </div>
          <div className="mt-1">
            <Badge
              variant="secondary"
              className="text-[8px] px-1.5 py-0 h-3.5 font-black uppercase tracking-widest border-none bg-red-50 text-primary bg-opacity-10"
            >
              {user?.role || "GUEST"}
            </Badge>
          </div>
        </div>

        <div className="relative">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/10 transform group-hover:rotate-6 transition-transform duration-300">
            <span className="text-xs md:text-sm font-black text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
        </div>
      </div>
    </header>
  );
}