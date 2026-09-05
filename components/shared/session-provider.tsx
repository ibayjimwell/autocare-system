'use client';

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useStaffStatusMonitor } from "@/connections/useStaffStatusMonitor";
import { useStaffAccessMonitor } from "@/connections/useStaffAccessMonitor";

/**
 * Component that monitors the staff status in real‑time.
 * If the staff is outboarded, it triggers an immediate logout.
 */
function StaffStatusMonitor() {
  useStaffStatusMonitor();
  return null;
}

/**
 * Component that monitors staff access changes in real‑time.
 * When access changes, it refreshes the session.
 */
function StaffAccessMonitor() {
  useStaffAccessMonitor();
  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
      <StaffStatusMonitor />
      <StaffAccessMonitor />
    </NextAuthSessionProvider>
  );
}