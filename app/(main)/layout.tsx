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
 * Layout structure:
 *
 * ┌──────────────────┬───────────────────────────────────────────┐
 * │                  │                                           │
 * │                  │ FIXED NAVBAR                              │
 * │     SIDEBAR      │                                           │
 * │                  ├───────────────────────────────────────────┤
 * │                  │                                           │
 * │                  │                                           │
 * │                  │ SCROLLABLE PAGE CONTENT                   │
 * │                  │                                           │
 * │                  │                                           │
 * └──────────────────┴───────────────────────────────────────────┘
 *
 * IMPORTANT:
 *
 * - The navbar is fixed to the viewport.
 * - The page content is the only scrolling region.
 * - The overall application shell does not scroll.
 * - On desktop the navbar starts after the 256px sidebar.
 * - On mobile the navbar spans the full viewport.
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
  ] = useState(false);

  /* ==============================================================
     GLOBAL ACTIVITY / PUSH NOTIFICATIONS
  ============================================================== */

  useStaffActivity();

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
            MAIN APPLICATION AREA
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
              FIXED NAVBAR
              
              IMPORTANT:
              
              The navbar is intentionally wrapped in a fixed
              container.
              
              This makes it independent from the page-content
              scrolling container below.
              
              Desktop:
                left = 256px (lg:left-64)
              
              Mobile/tablet:
                left = 0
          ======================================================= */}

          <div
            className="
              fixed
              inset-x-0
              top-0
              z-[100]
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
              SCROLLABLE PAGE CONTENT
              
              ONLY THIS REGION SHOULD SCROLL.
              
              The top padding reserves the exact navbar height:
              
              mobile  = 64px
              desktop = 72px
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
              
              Kept outside the scroll region so toast notifications
              are attached to the application shell rather than the
              individual page scroll container.
          ======================================================= */}

          <Toaster />
        </main>
      </div>
    </div>
  );
}