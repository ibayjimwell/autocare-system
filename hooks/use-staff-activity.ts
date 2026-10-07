'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { staffApi } from '@/lib/staffs/staffs';

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/': 'dashboard', '/dashboard': 'dashboard', '/customers': 'customers',
  '/appointments': 'appointments', '/services': 'services', '/staffs': 'staffs',
  '/service-tracking': 'serviceTracking', '/payments': 'payments', '/inventory': 'inventory',
};

function moduleForPath(pathname: string) {
  if (ROUTE_MODULE_MAP[pathname]) return ROUTE_MODULE_MAP[pathname];
  for (const [route, moduleName] of Object.entries(ROUTE_MODULE_MAP)) {
    if (route !== '/' && pathname.startsWith(`${route}/`)) return moduleName;
  }
  return undefined;
}

export function useStaffActivity() {
  const pathname = usePathname();
  useEffect(() => {
    const currentModule = moduleForPath(pathname);
    let disposed = false;
    const heartbeat = () => {
      if (disposed || document.visibilityState === 'hidden') return;
      void staffApi.updateOnlineStatus({ isOnline: true, currentModule }).catch(() => undefined);
    };
    const markOffline = () => {
      void fetch('/api/staffs/online-status', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: false, currentModule: '' }), keepalive: true,
      }).catch(() => undefined);
    };
    const onVisibilityChange = () => document.visibilityState === 'visible' ? heartbeat() : markOffline();
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', markOffline);
    return () => {
      disposed = true; window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', markOffline);
    };
  }, [pathname]);
}
