import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
} from "lucide-react";

// ================================================================
// NAVIGATION GROUPS — mirrors the grouped hierarchy of the
// reference design (section headers above clustered items).
// ================================================================
const NAV_GROUP_CONFIG = [
  { label: "Main", paths: ["/", "/customers", "/appointments"] },
  { label: "Operations", paths: ["/services", "/service-tracking", "/staffs"] },
  { label: "Business", paths: ["/payments", "/inventory"] },
];

function groupNavItems(items) {
  const groups = NAV_GROUP_CONFIG.map((group) => ({
    label: group.label,
    items: items.filter((item) => group.paths.includes(item.path)),
  })).filter((group) => group.items.length > 0);

  const groupedPaths = new Set(NAV_GROUP_CONFIG.flatMap((group) => group.paths));
  const ungrouped = items.filter((item) => !groupedPaths.has(item.path));
  if (ungrouped.length > 0) {
    groups.push({ label: "General", items: ungrouped });
  }
  return groups;
}

// ================================================================
// NAVLINKS — dual-mode navigation renderer
//   • collapsed=true  → compact icon rail (tooltips replace labels)
//   • collapsed=false → grouped menu panel with section headers
// ================================================================
export function NavLinks({ items, collapsed, onNavigate }) {
  const pathname = usePathname();
  const groups = groupNavItems(items);

  const isActive = (item) =>
    item.path === "/"
      ? pathname === "/" // Dashboard: only exact match
      : pathname === item.path || pathname.startsWith(item.path + "/");

  // ---- MODE A · Icon rail ----
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <nav
          aria-label="Primary navigation"
          className="scrollbar-none flex min-h-0 flex-1 animate-in flex-col items-center overflow-y-auto px-2 py-4 fade-in duration-500"
        >
          {groups.map((group, groupIndex) => (
            <div key={group.label} className="flex flex-col items-center gap-1">
              {groupIndex > 0 && (
                <div aria-hidden="true" className="my-2.5 h-px w-7 bg-border/70" />
              )}
              {group.items.map((item) => (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.path}
                      onClick={onNavigate}
                      aria-label={item.label}
                      aria-current={isActive(item) ? "page" : undefined}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive(item)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-semibold">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </nav>
      </TooltipProvider>
    );
  }

  // ---- MODE B · Grouped menu with labels ----
  return (
    <nav
      aria-label="Primary navigation"
      className="scrollbar-none min-h-0 flex-1 animate-in space-y-5 overflow-y-auto px-3 py-4 fade-in duration-500"
    >
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:h-10",
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ================================================================
// SIDEBAR — Dual-pane shell (desktop) + accessible Sheet (mobile)
// ================================================================
export function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission, logout, user } = useAuth();

  // ----------------------------------------------------------------
  // Responsive housekeeping: if the drawer is open and the viewport
  // grows to desktop (lg), close it — the persistent sidebar takes
  // over, so the sheet never sits on top of it (e.g. tablet rotated
  // to landscape, or a small window maximized).
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!mobileOpen) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => e.matches && onMobileClose?.();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mobileOpen, onMobileClose]);

  // ================================================================
  // NAVIGATION CONFIGURATION
  // ================================================================
  const NAV_ITEMS = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
    { path: "/customers", label: "Customers", icon: Users, module: "customers" },
    { path: "/appointments", label: "Appointments", icon: CalendarDays, module: "appointments" },
    { path: "/services", label: "Services", icon: Wrench, module: "services" },
    { path: "/staffs", label: "Staffs", icon: UserCog, module: "staffs" },
    { path: "/service-tracking", label: "Service Tracking", icon: Activity, module: "serviceTracking" },
    { path: "/payments", label: "Payments", icon: CreditCard, module: "payments" },
    { path: "/inventory", label: "Inventory", icon: Package, module: "inventory" },
  ];

  // Filter navigation items based on user permissions (backend integration point)
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.module));

  // ---- Shared brand pieces ----
  const brandMark = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <Wrench className="h-5 w-5" />
    </div>
  );

  const brandWordmark = (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-lg font-bold leading-none tracking-tight">
        <span className="text-primary">AUTO</span>{" "}
        <span className="text-foreground">PRO TECH</span>
      </h1>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Autocare System
      </p>
    </div>
  );

  // ---- Account card ----
  const userCard = user ? (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/50 p-3">
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
          {user.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {user.name || "User Account"}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-primary">
          {user.role}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* ==============================================================
          DESKTOP (lg+) — Dual-pane sidebar (unchanged behavior)
          ============================================================== */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen overflow-hidden border-r border-border bg-card text-foreground transition-[width] duration-300 ease-in-out lg:flex",
          collapsed ? "w-[72px]" : "w-[320px]",
        )}
      >
        <div className="flex h-full w-[72px] shrink-0 flex-col items-center bg-background">
          <div className="flex h-[72px] w-full shrink-0 items-center justify-center border-b border-border/60">
            {brandMark}
          </div>

          <NavLinks items={visibleItems} collapsed onNavigate={onMobileClose} />

          <div className="mt-auto flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-border/60 p-2">
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Log out"
                className="h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-10 w-10 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:flex"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>

            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex h-full w-[248px] shrink-0 flex-col border-l border-border/60 bg-card transition-[visibility] duration-300 ease-in-out",
            collapsed ? "invisible" : "visible",
          )}
        >
          <div className="flex h-[72px] shrink-0 items-center border-b border-border/60 px-5">
            {brandWordmark}
          </div>

          <NavLinks items={visibleItems} collapsed={false} onNavigate={onMobileClose} />

          <div className="shrink-0 space-y-2 border-t border-border/60 p-3">
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Account
            </p>
            {userCard}
            <Button
              variant="ghost"
              onClick={logout}
              className="h-10 w-full justify-start gap-2 px-3 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* ==============================================================
          MOBILE / TABLET (< lg) — accessible slide-over Sheet.
          Radix provides: role="dialog" + aria-modal, focus trap,
          ESC-to-close, scrim click, body scroll lock, and focus
          restoration. Opened via the Header menu trigger. All close
          paths (link tap, ESC, scrim, X) funnel through the same
          onMobileClose callback as before.
          ============================================================== */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          if (!open) onMobileClose?.();
        }}
      >
        <SheetContent
          side="left"
          className="flex w-[300px] max-w-[85vw] flex-col gap-0 border-r border-border/60 bg-card p-0 shadow-2xl sm:max-w-[300px]"
          onCloseAutoFocus={(e) => {
            // Return focus to the Header menu trigger on close (a11y).
            const trigger = document.querySelector<HTMLButtonElement>(
              '[aria-label="Open navigation menu"]'
            );
            if (trigger) {
              e.preventDefault();
              trigger.focus();
            }
          }}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="sr-only">
            AutoCare sections and account actions
          </SheetDescription>

          {/* ---- Branding (Sheet's built-in close button sits top-right) ---- */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-4 pr-12">
            {brandMark}
            {brandWordmark}
          </div>

          <NavLinks items={visibleItems} collapsed={false} onNavigate={onMobileClose} />

          {/* ---- Account footer with iOS safe-area inset ---- */}
          <div className="shrink-0 space-y-3 border-t border-border/60 p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))]">
            {userCard}
            <Button
              variant="ghost"
              onClick={logout}
              className="h-11 w-full justify-start gap-2 px-3 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}