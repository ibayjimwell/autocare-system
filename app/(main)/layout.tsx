"use client";

import { useState } from "react";

import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/Header";
import { Toaster } from "@/components/ui/sonner";
import { useStaffActivity } from "@/hooks/use-staff-activity";
import { usePushNotifications } from "@/hooks/notifications/use-push-notifications";

// ================================================================
// MAIN LAYOUT – Used by the (main) route group
// ================================================================
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useStaffActivity();
  usePushNotifications();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onMenuOpen={() => setMobileOpen(true)} />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1800px] p-4 pb-24 sm:p-6 sm:pb-24 md:pb-8 lg:p-8">
              {children}
            </div>
          </div>

          <Toaster />
        </main>
      </div>
    </div>
  );
}