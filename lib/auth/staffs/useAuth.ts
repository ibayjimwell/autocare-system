import { useSession, signOut } from "next-auth/react";
import { staffApi } from "@/lib/staffs/staffs";

// Mapping from module names (as used in the sidebar / UI) to the actual keys in the `access` object
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
 * Client‑side authentication hook.
 * Provides the current user, permission checking, and logout.
 */
export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";

  const sessionUser = session?.user;
  const user = sessionUser
    ? {
        id: sessionUser.id,
        name: sessionUser.fullname || sessionUser.name || "User",
        role: sessionUser.role || "Staff",
        requiresPasswordChange: sessionUser.requiresPasswordChange || false,
      }
    : null;

  const access = (sessionUser?.access as Record<string, boolean>) || {};

  /**
   * Check if the current user has permission for a given module.
   * @param module - module name (e.g. "dashboard", "customers", "appointments")
   * @returns true if the user has access, false otherwise.
   */
  const hasPermission = (module: string): boolean => {
    const normalized = module.trim();
    const key = MODULE_KEY_MAP[normalized] || normalized;
    return access[key] === true;
  };

  /**
   * Logout: update online status, then sign out.
   */
  const logout = async () => {
    await staffApi.updateOnlineStatus({ isOnline: false, currentModule: "" });
    await signOut({ callbackUrl: "/login" });
  };

  return {
    user,
    hasPermission,
    logout,
    isLoading,
  };
}