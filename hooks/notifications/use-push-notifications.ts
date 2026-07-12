// hooks/notifications/use-push-notifications.ts
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function usePushNotifications() {
  useEffect(() => {
    // --- STEP 0: Basic feature detection ---
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser.');
      return;
    }

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local');
      return;
    }

    let isCancelled = false;

    const subscribeUser = async () => {
      try {
        // Wait until the service worker is fully active
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker ready:', registration);

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          console.log('Already subscribed, updating server…');
          await saveSubscription(subscription);
          return;
        }

        // Request notification permission (only if needed)
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast.info('Notifications are disabled. You can enable them in browser settings.');
            return;
          }
        }

        // Convert the VAPID key
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        console.log('VAPID key converted successfully');

        // SUBSCRIBE
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        console.log('Push subscription created:', subscription);
        await saveSubscription(subscription);
        toast.success('Push notifications enabled!');
      } catch (err: any) {
        console.error('Push subscription error:', err.name, err.message);
        // Common errors:
        // AbortError: registration failed - push service error → VAPID key or browser issue
        // NotAllowedError: permission denied → user didn't allow
        // InvalidStateError: registration not active → wait for SW ready (already done)
        if (err.name === 'AbortError') {
          toast.error('Push subscription failed. Is push messaging enabled in your browser?');
        } else {
          toast.error('Could not enable notifications.');
        }
      }
    };

    const saveSubscription = async (subscription: PushSubscription) => {
      const rawKey = subscription.getKey('p256dh');
      const rawAuth = subscription.getKey('auth');
      if (!rawKey || !rawAuth) return;

      const payload = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(rawKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(rawAuth))),
        },
      };

      const res = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to save subscription on server:', data);
        toast.error('Could not save notification subscription.');
      } else {
        console.log('Subscription saved successfully');
      }
    };

    function urlBase64ToUint8Array(base64String: string) {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    // Small delay to ensure everything is settled
    const timer = setTimeout(() => {
      if (!isCancelled) subscribeUser();
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, []);
}