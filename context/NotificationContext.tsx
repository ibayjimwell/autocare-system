'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  url?: string | null;
  read: boolean;
  timestamp: string;
  module?: string;
  event?: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  // Kept for NotificationListener compatibility. Notifications enter the UI
  // only after retrieval from the authenticated staff inbox.
  addNotification: (notification: Partial<NotificationItem>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const INBOX_URL = '/api/staffs/notifications';

async function parseResponse(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.error) {
    throw new Error(body?.errorMessage || `Notification request failed (${res.status}).`);
  }
  return body;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const staffId = session?.user?.id || null;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const staffRef = useRef<string | null>(null);
  const requestVersion = useRef(0);

  // Server-side authorization, not localStorage, determines which staff can
  // read or mutate each record. Never migrate the legacy shared cache: doing
  // so could leak other staff's notifications into the current user's inbox.
  const refreshNotifications = useCallback(async () => {
    const targetStaff = staffRef.current;
    if (!targetStaff) return;
    const requestId = ++requestVersion.current;
    setLoading(true);
    try {
      const res = await fetch(`${INBOX_URL}?limit=200`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await parseResponse(res);
      if (staffRef.current !== targetStaff || requestVersion.current !== requestId) return;
      setNotifications(Array.isArray(body.data) ? body.data : []);
      setUnreadCount(Number(body.unreadCount) || 0);
    } catch (error) {
      // Leave the last good snapshot in place during temporary connectivity
      // problems. It is never loaded from another user's shared localStorage.
      if (staffRef.current === targetStaff && requestVersion.current === requestId) {
        console.warn('[StaffNotifications] Synchronization failed:', error);
      }
    } finally {
      if (staffRef.current === targetStaff && requestVersion.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const currentStaff = status === 'authenticated' ? staffId : null;
    staffRef.current = currentStaff;
    requestVersion.current += 1;
    setNotifications([]);
    setUnreadCount(0);
    setLoading(Boolean(currentStaff));
    if (currentStaff) void refreshNotifications();
  }, [staffId, status, refreshNotifications]);

  useEffect(() => {
    if (status !== 'authenticated' || !staffId) return;
    const sync = () => { if (document.visibilityState === 'visible') void refreshNotifications(); };
    const onOnline = () => void refreshNotifications();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('online', onOnline);
    // Poll as a fallback when browser push is unsupported or missed.
    const interval = window.setInterval(sync, 30000);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('online', onOnline);
      window.clearInterval(interval);
    };
  }, [staffId, status, refreshNotifications]);

  const mutate = useCallback(async (action: 'read' | 'read-all' | 'clear-all', id?: string) => {
    const targetStaff = staffRef.current;
    if (!targetStaff) return;
    try {
      const res = await fetch(INBOX_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      await parseResponse(res);
      if (staffRef.current === targetStaff) await refreshNotifications();
    } catch (error) {
      if (staffRef.current === targetStaff) {
        toast.error(error instanceof Error ? error.message : 'Could not update notifications.');
        await refreshNotifications();
      }
    }
  }, [refreshNotifications]);

  const addNotification = useCallback((_notification: Partial<NotificationItem>) => {
    // The push message is only a hint that something was saved. Fetch it
    // from the authenticated API instead of trusting posted browser content.
    void refreshNotifications();
  }, [refreshNotifications]);
  const markAsRead = useCallback((id: string) => mutate('read', id), [mutate]);
  const markAllAsRead = useCallback(() => mutate('read-all'), [mutate]);
  const clearAll = useCallback(() => mutate('clear-all'), [mutate]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}
