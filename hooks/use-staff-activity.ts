// hooks/use-staff-activity.ts
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { staffApi } from '@/lib/staffs/staffs';

// Map routes to module identifiers (must match db and MODULES list)
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/customers': 'customers',
  '/appointments': 'appointments',
  '/services': 'services',
  '/staffs': 'staffs',
  '/service-tracking': 'serviceTracking',
  '/payments': 'payments',
  '/inventory': 'inventory',
};

// Also mark staff as online when they first appear
export function useStaffActivity() {
  const pathname = usePathname();

  useEffect(() => {
    // Determine module from pathname
    let module = null;
    // Try exact match first
    if (ROUTE_MODULE_MAP[pathname]) {
      module = ROUTE_MODULE_MAP[pathname];
    } else {
      // Try prefix match (e.g., /customers/123 → customers)
      for (const [route, mod] of Object.entries(ROUTE_MODULE_MAP)) {
        if (route !== '/' && pathname.startsWith(route + '/')) {
          module = mod;
          break;
        }
      }
    }

    // Update backend: set isOnline = true and currentModule
    staffApi.updateOnlineStatus({
      isOnline: true,
      currentModule: module || undefined,
    }).catch(console.error);

    // When component unmounts (browser close) we can set isOnline = false,
    // but we'll handle logout explicitly in the logout button.
  }, [pathname]);
}