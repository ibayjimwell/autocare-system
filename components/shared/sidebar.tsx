"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";

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
  LogOut,
} from "lucide-react";

// ================================================================
// NAVIGATION GROUPS
// ================================================================
const NAV_GROUP_CONFIG = [
  {
    label: "Main",
    paths: ["/", "/customers", "/appointments"],
  },
  {
    label: "Operations",
    paths: ["/services", "/service-tracking", "/staffs"],
  },
  {
    label: "Business",
    paths: ["/payments", "/inventory"],
  },
];

// ================================================================
// GROUP NAVIGATION ITEMS
// ================================================================
function groupNavItems(items: any[]) {
  const groups = NAV_GROUP_CONFIG.map((group) => ({
    label: group.label,
    items: items.filter((item) =>
      group.paths.includes(item.path),
    ),
  })).filter((group) => group.items.length > 0);

  const groupedPaths = new Set(
    NAV_GROUP_CONFIG.flatMap((group) => group.paths),
  );

  const ungrouped = items.filter(
    (item) => !groupedPaths.has(item.path),
  );

  if (ungrouped.length > 0) {
    groups.push({
      label: "General",
      items: ungrouped,
    });
  }

  return groups;
}

// ================================================================
// NAVIGATION LINKS
// ================================================================
export function NavLinks({
  items,
  onNavigate,
}: {
  items: any[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = groupNavItems(items);

  const isActive = (item: any) =>
    item.path === "/"
      ? pathname === "/"
      : pathname === item.path ||
        pathname.startsWith(item.path + "/");

  return (
    <nav
      aria-label="Primary navigation"
      className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-4"
    >
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            {/* ==================================================
                SECTION HEADER
                ================================================== */}
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>

            {/* ==================================================
                NAVIGATION ITEMS
                ================================================== */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-11 items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors duration-200 md:h-10 md:text-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {/* Icon */}
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-5 w-5 md:h-4 md:w-4" />
                    </span>

                    {/* Label */}
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>

                    {/* Active indicator */}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}

// ================================================================
// MOBILE BOTTOM NAVIGATION
// ================================================================
function MobileBottomNav({
  items,
}: {
  items: any[];
}) {
  const pathname = usePathname();

  const isActive = (item: any) =>
    item.path === "/"
      ? pathname === "/"
      : pathname === item.path ||
        pathname.startsWith(item.path + "/");

  const primaryItems = items.slice(0, 5);

  if (primaryItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
      <nav
        aria-label="Mobile primary navigation"
        className={cn(
          "mx-auto flex max-w-xl items-center justify-between gap-1",
          "rounded-2xl border border-border/60",
          "bg-card p-1.5 shadow-sm",
        )}
      >
        {primaryItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />

              <span className="max-w-full truncate px-1 text-[10px] font-medium">
                {item.label}
              </span>

              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 h-1 w-1 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ================================================================
// SIDEBAR
// ================================================================
export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose?: () => void;
}) {
  const { hasPermission, logout, user } = useAuth();

  // ==============================================================
  // RESPONSIVE HOUSEKEEPING
  // ==============================================================
  useEffect(() => {
    if (!mobileOpen) return;

    const mq = window.matchMedia("(min-width: 1024px)");

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        onMobileClose?.();
      }
    };

    mq.addEventListener("change", onChange);

    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, [mobileOpen, onMobileClose]);

  // ==============================================================
  // NAVIGATION CONFIGURATION
  // ==============================================================
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

  // ==============================================================
  // PERMISSION FILTER
  // ==============================================================
  const visibleItems = NAV_ITEMS.filter((item) =>
    hasPermission(item.module),
  );

  // ==============================================================
  // BRAND MARK
  // ==============================================================
  const brandMark = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <Wrench className="h-5 w-5" />
    </div>
  );

  // ==============================================================
  // BRAND WORDMARK
  // ==============================================================
  const brandWordmark = (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[17px] font-bold leading-none tracking-tight">
        <span className="text-primary">AUTO</span>{" "}
        <span className="text-foreground">PRO TECH</span>
      </h1>

      <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Autocare System
      </p>
    </div>
  );

  // ==============================================================
  // ACCOUNT CARD
  // ==============================================================
  const userCard = user ? (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
          {user.name?.charAt(0).toUpperCase() || "U"}
        </div>

        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
      </div>

      {/* User info */}
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
      {/* ============================================================
          DESKTOP SIDEBAR
          
          IMPORTANT:
          This is now ONE sidebar only.
          No icon rail / secondary sidebar.
          ============================================================ */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 lg:flex",
          "w-72 flex-col",
          "border-r border-border",
          "bg-card text-card-foreground",
          "shadow-sm",
        )}
      >
        {/* ========================================================
            BRAND HEADER
            ======================================================== */}
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border/60 px-5">
          {brandMark}
          {brandWordmark}
        </div>

        {/* ========================================================
            NAVIGATION
            ======================================================== */}
        <NavLinks
          items={visibleItems}
          onNavigate={onMobileClose}
        />

        {/* ========================================================
            ACCOUNT FOOTER
            ======================================================== */}
        <div className="shrink-0 space-y-3 border-t border-border/60 p-3">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Account
          </p>

          {userCard}

          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "h-10 w-full justify-start gap-2 rounded-xl px-3",
              "text-sm font-medium text-muted-foreground",
              "hover:bg-destructive/10 hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* ============================================================
          MOBILE / TABLET SHEET
          ============================================================ */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          if (!open) {
            onMobileClose?.();
          }
        }}
      >
        <SheetContent
          side="left"
          className={cn(
            "flex h-full w-[320px] max-w-[88vw] flex-col gap-0",
            "rounded-none border-r border-border",
            "bg-card p-0 text-card-foreground",
            "shadow-sm",
            "sm:max-w-[340px]",
          )}
          onCloseAutoFocus={(e) => {
            const trigger =
              document.querySelector<HTMLButtonElement>(
                '[aria-label="Open navigation menu"]',
              );

            if (trigger) {
              e.preventDefault();
              trigger.focus();
            }
          }}
        >
          <SheetTitle className="sr-only">
            Navigation menu
          </SheetTitle>

          <SheetDescription className="sr-only">
            AutoCare sections and account actions
          </SheetDescription>

          {/* ======================================================
              MOBILE BRANDING
              ====================================================== */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-4 pr-12">
            {brandMark}
            {brandWordmark}
          </div>

          {/* ======================================================
              MOBILE NAVIGATION
              ====================================================== */}
          <NavLinks
            items={visibleItems}
            onNavigate={onMobileClose}
          />

          {/* ======================================================
              MOBILE ACCOUNT
              ====================================================== */}
          <div className="shrink-0 space-y-3 border-t border-border/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {userCard}

            <Button
              variant="ghost"
              onClick={logout}
              className={cn(
                "h-11 w-full justify-start gap-2 rounded-xl px-3",
                "text-sm font-medium text-muted-foreground",
                "hover:bg-destructive/10 hover:text-destructive",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================
          MOBILE BOTTOM NAVIGATION
          ============================================================ */}
      <MobileBottomNav items={visibleItems} />
    </>
  );
}