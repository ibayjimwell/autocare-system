'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotificationModal({ open, onOpenChange }: NotificationModalProps) {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();

  if (notifications.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">Notifications</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm font-medium">No notifications yet.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="font-black flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs font-bold"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear all
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer hover:bg-muted/50",
                  !notif.read ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex items-start gap-2">
                  {!notif.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">{notif.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{notif.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}