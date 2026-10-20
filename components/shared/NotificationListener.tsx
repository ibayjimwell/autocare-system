'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/context/NotificationContext';

export default function NotificationListener() {
  const { data: session } = useSession();
  const staffId = session?.user?.id || null;
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    if (!staffId || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'NEW_NOTIFICATION') return;
      const notification = event.data.notification;
      // The SW may control tabs belonging to different accounts. Never
      // show another staff member's browser push in this account's inbox.
      if (!notification?.staffId || notification.staffId !== staffId) return;
      void refreshNotifications();
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [staffId, refreshNotifications]);

  return null;
}
