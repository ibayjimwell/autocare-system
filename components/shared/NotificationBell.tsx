'use client';

import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';

import { Bell } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useNotifications } from '@/context/NotificationContext';

import NotificationModal from './NotificationModal';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isPulsing, setIsPulsing] =
    useState(unreadCount > 0);

  useEffect(() => {
    setIsPulsing(
      unreadCount > 0 && !isModalOpen
    );
  }, [unreadCount, isModalOpen]);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <NotificationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        anchor={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : 'Notifications'
            }
            aria-haspopup="dialog"
            aria-expanded={isModalOpen}
            onClick={handleClick}
            className={cn(
              `
              relative
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-foreground
              transition-colors
              hover:bg-accent
              hover:text-accent-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              `,
              `
              md:h-10
              md:w-10
              `
            )}
          >
            <Bell
              className="
                h-5 w-5
                md:h-4 md:w-4
              "
            />

            {unreadCount > 0 && (
              <>
                <span
                  className={cn(
                    `
                    absolute
                    right-1.5
                    top-1.5
                    flex
                    h-4
                    min-w-4
                    items-center
                    justify-center
                    rounded-full
                    bg-primary
                    px-1
                    text-[9px]
                    font-semibold
                    leading-none
                    text-primary-foreground
                    shadow-sm
                    ring-2
                    ring-card
                    `,
                    isPulsing &&
                      'animate-pulse'
                  )}
                >
                  {unreadCount > 99
                    ? '99+'
                    : unreadCount}
                </span>

                <span className="sr-only">
                  {unreadCount}{' '}
                  {unreadCount === 1
                    ? 'unread notification'
                    : 'unread notifications'}
                </span>
              </>
            )}
          </Button>
        }
      />
    </>
  );
}