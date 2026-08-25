'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import NotificationModal from './NotificationModal';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(unreadCount > 0);

  useEffect(() => {
    setIsPulsing(unreadCount > 0 && !isModalOpen);
  }, [unreadCount, isModalOpen]);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-slate-500 w-9 h-9 relative hover:bg-slate-100 transition-colors"
        onClick={handleClick}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border-2 border-white shadow-sm",
            isPulsing && "animate-pulse"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      <NotificationModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}