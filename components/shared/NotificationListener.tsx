'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';

export default function NotificationListener() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_NOTIFICATION') {
        const { notification } = event.data;
        addNotification({
          title: notification.title,
          body: notification.body,
          url: notification.url,
          module: 'app',
          event: 'push',
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Request any missed notifications from the service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Optionally send a message to get missed notifications
      // navigator.serviceWorker.controller.postMessage({ type: 'GET_NOTIFICATIONS' });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [addNotification]);

  return null;
}