// lib/auth/staffs/useAuth.ts
import { useSession, signOut } from "next-auth/react";
import { staffApi } from "@/lib/staffs/staffs";

// Mapping from module names (as used in the sidebar) to the actual keys in the `access` object
const MODULE_KEY_MAP: Record<string, string> = {
  dashboard: "dashboard",
  customers: "customers",
  appointments: "appointments",
  services: "services",
  staffs: "staffs",
  serviceTracking: "serviceTracking",
  payments: "payments",
  inventory: "inventory",
};

/**
 * A client‑side authentication hook that provides the user, permission checking,
 * and logout functionality.
 *
 * @returns {Object} - { user, hasPermission, logout, isLoading }
 */
export function useAuth() {
  const { data: session, status } = useSession();

  // Session is loading
  const isLoading = status === "loading";

  // Extract user and access permissions from the session
  const sessionUser = session?.user;
  const user = sessionUser
    ? {
        name: sessionUser.fullname || sessionUser.name || "User",
        role: sessionUser.role || "Staff",
      }
    : null;

  const access = (sessionUser?.access as Record<string, boolean>) || {};

  /**
   * Check if the current user has permission for a given module.
   * @param module - The module name (e.g., "dashboard", "customers", "service tracking")
   * @returns {boolean} - true if the user has access, false otherwise.
   */
  const hasPermission = (module: string): boolean => {
    const normalized = module.trim();
    const key = MODULE_KEY_MAP[normalized] || normalized;
    return access[key] === true;
  };

  /**
   * Logout the current user and redirect to the login page.
   */
  const logout = async () => {
    await staffApi.updateOnlineStatus({ isOnline: false, currentModule: "" });
    await signOut({ callbackUrl: '/login' });
  };

  return {
    user,
    hasPermission,
    logout,
    isLoading,
  };
}