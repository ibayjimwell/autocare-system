'use client';

import { NotificationProvider } from '@/context/NotificationContext';
import NotificationListener from '@/components/shared/NotificationListener';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <NotificationListener />
      {children}
    </NotificationProvider>
  );
}