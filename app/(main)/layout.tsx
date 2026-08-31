"use client";

import { useState } from "react";

import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/Header";
import { Toaster } from "@/components/ui/sonner";
import { useStaffActivity } from "@/hooks/use-staff-activity";

import { usePushNotifications } from '@/hooks/notifications/use-push-notifications';

// ================================================================
// MAIN LAYOUT – Used by the (main) route group
// ================================================================
export default function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useStaffActivity();
  usePushNotifications();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header renders the menu trigger (< lg) that opens the sidebar drawer */}
        <Header onMenuOpen={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
        <Toaster />
      </main>
    </div>
  );
}