'use client';

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useStaffStatusMonitor } from "@/connections/useStaffStatusMonitor";

/**
 * Component that monitors the staff status in real‑time.
 * If the staff is outboarded, it triggers an immediate logout.
 */
function StaffStatusMonitor() {
  useStaffStatusMonitor();
  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
      <StaffStatusMonitor />
    </NextAuthSessionProvider>
  );
}