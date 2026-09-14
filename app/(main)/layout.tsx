'use client';

import {
  useState,
} from 'react';

import {
  Sidebar,
} from '@/components/shared/sidebar';

import {
  Header,
} from '@/components/shared/Header';

import {
  Toaster,
} from '@/components/ui/sonner';

import {
  useStaffActivity,
} from '@/hooks/use-staff-activity';

import {
  usePushNotifications,
} from '@/hooks/notifications/use-push-notifications';

/* ================================================================
   MAIN LAYOUT
================================================================ */

/**
 * MainLayout
 *
 * Used by the `(main)` route group.
 *
 * Application shell:
 *
 * ┌──────────────────┬─────────────────────────────────────────┐
 * │                  │ FIXED NAVBAR                            │
 * │                  │                                         │
 * │    SIDEBAR       ├─────────────────────────────────────────┤
 * │                  │                                         │
 * │                  │ SCROLLABLE PAGE CONTENT                 │
 * │                  │                                         │
 * │                  │                                         │
 * └──────────────────┴─────────────────────────────────────────┘
 *
 * Important stacking order:
 *
 *   Sidebar / Navbar / App navigation = z-40
 *   Dialogs / Modals                   = z-50+
 *
 * This allows any Radix/shadcn modal to cover the navbar.
 */
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* ==============================================================
     MOBILE SIDEBAR STATE
  ============================================================== */

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(
    false,
  );

  /* ==============================================================
     GLOBAL ACTIVITY
  ============================================================== */

  useStaffActivity();

  /* ==============================================================
     PUSH NOTIFICATIONS
  ============================================================== */

  usePushNotifications();

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <div
      className="
        h-screen
        min-h-screen
        w-full
        overflow-hidden
        bg-background
        text-foreground
      "
    >
      {/* ==========================================================
          APPLICATION SHELL
      =========================================================== */}

      <div
        className="
          flex
          h-screen
          min-h-0
          w-full
          overflow-hidden
        "
      >
        {/* ========================================================
            SIDEBAR
        ========================================================= */}

        <Sidebar
          mobileOpen={
            mobileOpen
          }
          onMobileClose={() =>
            setMobileOpen(
              false,
            )
          }
        />

        {/* ========================================================
            MAIN COLUMN
        ========================================================= */}

        <main
          className="
            relative
            flex
            h-screen
            min-h-0
            min-w-0
            flex-1
            flex-col
            overflow-hidden
            bg-background
          "
        >
          {/* ======================================================
              FIXED NAVBAR WRAPPER

              IMPORTANT:

              This is z-40.

              DO NOT use z-[100] here.

              shadcn/Radix dialogs use a higher stacking level,
              normally z-50, so dialogs can cover this navbar.
          ======================================================= */}

          <div
            className="
              fixed
              inset-x-0
              top-0
              z-40
              w-full

              lg:left-64
              lg:right-0
              lg:w-auto
            "
          >
            <Header
              onMenuOpen={() =>
                setMobileOpen(
                  true,
                )
              }
            />
          </div>

          {/* ======================================================
              PAGE SCROLL REGION

              The page itself scrolls here.

              The navbar above remains fixed.
          ======================================================= */}

          <div
            className="
              h-screen
              min-h-0
              flex-1
              overflow-x-hidden
              overflow-y-auto
              overscroll-contain

              pt-16

              [-webkit-overflow-scrolling:touch]

              md:pt-[72px]
            "
          >
            {/* ====================================================
                PAGE CONTAINER
            ===================================================== */}

            <div
              className="
                mx-auto
                w-full
                max-w-[1800px]
                p-4
                pb-24

                sm:p-6
                sm:pb-24

                md:pb-8

                lg:p-8
              "
            >
              {children}
            </div>
          </div>

          {/* ======================================================
              TOASTER

              Outside the scroll region.
          ======================================================= */}

          <Toaster />
        </main>
      </div>
    </div>
  );
}