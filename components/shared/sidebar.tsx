import Link from "next/link";
import { usePathname } from "next/navigation"
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";


import { Button } from "@/components/ui/button";;

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wrench,
  UserCog,
  Activity,
  CreditCard,
  Package,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";

// ================================================================
// SIDEBAR – Left navigation panel (desktop + mobile drawer)
// ================================================================
export function NavLinks({ items, collapsed, onNavigate }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-none animate-in fade-in duration-500">
      <TooltipProvider delayDuration={0}>
        {items.map((item) => {
          const isActive =
            item.path === "/"
              ? pathname === "/"                         // Dashboard: only exact match
              : pathname === item.path || pathname.startsWith(item.path + "/");

          const Content = (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ease-out",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-x-1"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )}
              />
              {!collapsed && (
                <span className="whitespace-nowrap animate-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
              {isActive && collapsed && (
                <div className="absolute right-0 w-1 h-5 bg-primary-foreground rounded-l-full" />
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{Content}</TooltipTrigger>
                <TooltipContent side="right" className="font-semibold">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return Content;
        })}
      </TooltipProvider>
    </nav>
  );
}


export function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission, logout, user } = useAuth();

  // ================================================================
  // NAVIGATION CONFIGURATION
  // Adjust paths and icons to match your (main) route structure.
  // ================================================================
  const NAV_ITEMS = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      module: "dashboard",
    },
    {
      path: "/customers",
      label: "Customers",
      icon: Users,
      module: "customers",
    },
    {
      path: "/appointments",
      label: "Appointments",
      icon: CalendarDays,
      module: "appointments",
    },
    {
      path: "/services",
      label: "Services",
      icon: Wrench,
      module: "services",
    },
    {
      path: "/staffs",
      label: "Staffs",
      icon: UserCog,
      module: "staffs",
    },
    {
      path: "/service-tracking",
      label: "Service Tracking",
      icon: Activity,
      module: "serviceTracking",
    },
    {
      path: "/payments",
      label: "Payments",
      icon: CreditCard,
      module: "payments",
    },
    {
      path: "/inventory",
      label: "Inventory",
      icon: Package,
      module: "inventory",
    },
  ];

  // Filter navigation items based on user permissions (backend integration point)
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.module));

  const sidebarContent = (isCollapsed) => (
    <div className="flex flex-col h-full bg-card">
      {/* ---- Branding ---- */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 border-b border-border min-h-[72px] transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-start",
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md transform hover:rotate-12 transition-transform cursor-pointer">
          <Wrench className="w-5 h-5 text-primary-foreground" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden flex-1 animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-lg font-black tracking-tighter leading-none">
              <span className="text-primary">AUTO</span>{" "}
              <span className="text-foreground">PRO TECH</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-0.5">
              AUTOCARE SYSTEM
            </p>
          </div>
        )}
        {onMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="lg:hidden rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <NavLinks
        items={visibleItems}
        collapsed={isCollapsed}
        onNavigate={onMobileClose}
      />

      {/* ---- User & Actions ---- */}
      <div className="p-4 bg-accent/30 backdrop-blur-sm border-t border-border">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-2xl bg-background/50 border border-border/50 animate-in fade-in duration-500">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {user.name || "User Account"}
              </p>
              <p className="text-[10px] font-bold text-primary uppercase">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-col" : "flex-row",
          )}
        >
          {/* ---- Logout button ---- */}
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "default"}
            onClick={logout}
            className={cn(
              "rounded-xl transition-all duration-200 hover:bg-destructive/10 hover:text-destructive font-semibold",
              isCollapsed
                ? "w-10 h-10"
                : "flex-1 justify-start gap-2 text-muted-foreground",
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Logout</span>}
          </Button>

          {/* ---- Collapse toggle (desktop) ---- */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-10 h-10 rounded-xl border-border hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ---- Desktop sidebar ---- */}
      <aside
        className={cn(
          "h-screen text-foreground flex-col transition-all duration-500 border-r border-border sticky top-0 hidden lg:flex z-40",
          collapsed ? "w-[88px]" : "w-[280px]",
        )}
      >
        {sidebarContent(collapsed)}
      </aside>

      {/* ---- Mobile drawer ---- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 h-full w-[300px] shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] animate-in slide-in-from-left duration-500 ease-out">
            {sidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
