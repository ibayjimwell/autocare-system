"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, ChevronRight } from "lucide-react";
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
        <NotificationBell />

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