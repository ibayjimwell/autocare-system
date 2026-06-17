"use client";

import { useState } from "react";

import { Sidebar } from "@/components/shared/sidebar";
import { Header, MobileHeader } from "@/components/shared/header";

// ================================================================
// MAIN LAYOUT – Used by the (main) route group
// ================================================================
export default function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MobileHeader onMenuClick={() => setMobileOpen(true)} />
        {/* Header receives page‑specific title/subtitle from the page */}
        <Header />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}