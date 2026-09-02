'use client';

import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Wrench,
} from 'lucide-react';

interface TaskSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: any[];
  onSelectTask: (taskId: string) => void;
  title: string;
}

export default function TaskSelectorModal({
  open,
  onOpenChange,
  tasks,
  onSelectTask,
  title,
}: TaskSelectorModalProps) {
  const activeTasks = tasks.filter(
    (task) => task.status === 'IN_PROGRESS'
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          w-[calc(100%-1rem)]
          max-w-md
          rounded-xl
          border
          border-border
          bg-card
          p-0
          shadow-xl
          sm:w-full
        "
      >
        {/* -------------------------------------------------------
         * HEADER
         * ----------------------------------------------------- */}
        <DialogHeader className="border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Wrench className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold tracking-tight">
                {title}
              </DialogTitle>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Select an active task to continue
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* -------------------------------------------------------
         * TASK LIST
         * ----------------------------------------------------- */}
        <ScrollArea className="max-h-[60vh] px-4 py-4 sm:px-5">
          {activeTasks.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Clock3 className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-medium text-foreground">
                No active tasks
              </p>

              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                There are currently no tasks in progress
                that can be selected.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <Button
                  key={task.id}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onSelectTask(task.id)
                  }
                  className="
                    group
                    flex
                    h-auto
                    min-h-14
                    w-full
                    items-center
                    justify-between
                    rounded-lg
                    border-border
                    bg-background
                    px-3
                    py-3
                    text-left
                    hover:border-primary/30
                    hover:bg-primary/5
                    md:min-h-12
                    md:px-4
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {task.title}
                      </span>

                      <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-primary">
                        In Progress
                      </span>
                    </span>
                  </span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* -------------------------------------------------------
         * FOOTER
         * ----------------------------------------------------- */}
        <div className="border-t border-border bg-muted/20 p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="
              h-11
              w-full
              rounded-md
              md:h-9
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}