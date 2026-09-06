'use client';

import React from 'react';

import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useNotifications } from '@/context/NotificationContext';

import { formatDistanceToNow } from 'date-fns';

import {
  CheckCheck,
  Trash2,
  Bell,
  Inbox,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor?: React.ReactNode;
}

export default function NotificationModal({
  open,
  onOpenChange,
  anchor,
}: NotificationModalProps) {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
    >
      {anchor && (
        <PopoverAnchor asChild>
          {anchor}
        </PopoverAnchor>
      )}

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={10}
        collisionPadding={12}
        className="
          z-50
          w-[calc(100vw-1.5rem)]
          max-w-[420px]
          overflow-hidden
          rounded-xl
          border border-border/50
          bg-background/80
          p-0
          shadow-2xl
          backdrop-blur-xl
        "
      >
        {/* ============================================================
            HEADER
        ============================================================ */}
        <div
          className="
            flex shrink-0 items-center justify-between
            border-b border-border/50
            bg-background/70
            px-4 py-3
            backdrop-blur-xl
          "
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-lg
                bg-primary/10
                text-primary
              "
            >
              <Bell className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
                Notifications
              </h3>

              <p className="truncate text-[11px] text-muted-foreground">
                {notifications.length === 0
                  ? 'No recent activity'
                  : `${notifications.length} ${
                      notifications.length === 1
                        ? 'notification'
                        : 'notifications'
                    }`}
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="
                  h-8 rounded-md
                  px-2
                  text-[11px]
                  font-medium
                  text-muted-foreground
                  hover:bg-secondary
                  hover:text-foreground
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                "
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Mark all read
                </span>
                <span className="sm:hidden">
                  Read all
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearAll}
                aria-label="Clear all notifications"
                className="
                  h-8 w-8 rounded-md
                  text-muted-foreground
                  hover:bg-red-500/10
                  hover:text-red-600
                  dark:hover:text-red-400
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                "
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* ============================================================
            CONTENT
        ============================================================ */}
        {notifications.length === 0 ? (
          <div
            className="
              flex min-h-[260px]
              flex-col items-center
              justify-center
              px-6 py-10
              text-center
            "
          >
            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-xl
                border border-border
                bg-card
                text-muted-foreground
                shadow-sm
              "
            >
              <Inbox className="h-5 w-5" />
            </div>

            <h4 className="mt-4 text-sm font-semibold text-foreground">
              No notifications yet
            </h4>

            <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
              When there is new activity, your notifications will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea
            className="
              h-[min(520px,calc(100vh-190px))]
              w-full
            "
          >
            <div className="space-y-2.5 p-3">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    `
                    group relative
                    w-full
                    rounded-lg
                    border
                    p-3
                    text-left
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    `,
                    !notif.read
                      ? `
                        border-primary/15
                        bg-primary/5
                        hover:bg-primary/10
                      `
                      : `
                        border-border/70
                        bg-card/80
                        hover:bg-card
                      `
                  )}
                >
                  {!notif.read && (
                    <span
                      className="
                        absolute
                        right-3
                        top-3
                        h-2
                        w-2
                        rounded-full
                        bg-primary
                      "
                      aria-label="Unread"
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        `
                        flex h-9 w-9
                        shrink-0
                        items-center justify-center
                        rounded-lg
                        border
                      `,
                        !notif.read
                          ? 'border-primary/15 bg-primary/10 text-primary'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      <Bell className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            `
                            truncate
                            text-sm
                            leading-5
                            text-foreground
                          `,
                            !notif.read
                              ? 'font-semibold'
                              : 'font-medium'
                          )}
                        >
                          {notif.title}
                        </p>
                      </div>

                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {notif.body}
                      </p>

                      <p className="mt-2 text-[10px] font-medium text-muted-foreground/70">
                        {formatDistanceToNow(
                          new Date(notif.timestamp),
                          {
                            addSuffix: true,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* ============================================================
            FOOTER
        ============================================================ */}
        <div
          className="
            flex shrink-0
            items-center justify-between
            border-t border-border/50
            bg-background/70
            px-4 py-2.5
            backdrop-blur-xl
          "
        >
          <p className="text-[10px] text-muted-foreground">
            {notifications.length > 0
              ? 'Click a notification to mark it as read.'
              : 'You are all caught up.'}
          </p>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="
              h-8
              rounded-md
              px-2.5
              text-xs
              font-medium
              text-foreground
              hover:bg-secondary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}