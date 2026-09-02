'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
  CalendarDays,
  Car,
  Check,
  Clock3,
  FileText,
  Loader2,
  Search,
  User,
} from 'lucide-react';

import {
  useAllTaskHistory,
} from '@/hooks/service-tracking/useTaskHistory';

import {
  format,
  parseISO,
} from 'date-fns';

import { toast } from 'sonner';

interface HistoryTaskPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTasks: (
    tasks: Array<{
      title: string;
      durationMinutes?: number;
    }>
  ) => Promise<void>;
  isAdding: boolean;
  phase: 'INSPECTION' | 'WORK';
}

export default function HistoryTaskPickerModal({
  open,
  onOpenChange,
  onAddTasks,
  isAdding,
  phase,
}: HistoryTaskPickerModalProps) {
  const [search, setSearch] =
    useState('');

  const [
    selectedTaskIds,
    setSelectedTaskIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const {
    history,
    loading,
    loadHistory,
  } = useAllTaskHistory(
    search,
    phase
  );

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, loadHistory]);

  useEffect(() => {
    const timer = setTimeout(
      loadHistory,
      300
    );

    return () =>
      clearTimeout(timer);
  }, [search, loadHistory]);

  const groupedHistory =
    React.useMemo(() => {
      const groups: Record<
        string,
        any[]
      > = {};

      for (const item of history) {
        const date =
          item.appointmentDate ||
          'No Date';

        if (!groups[date]) {
          groups[date] = [];
        }

        groups[date].push(item);
      }

      return Object.entries(groups).sort(
        (a, b) =>
          b[0].localeCompare(
            a[0]
          )
      );
    }, [history]);

  const handleToggleTask = (
    taskId: string
  ) => {
    const newSet = new Set(
      selectedTaskIds
    );

    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }

    setSelectedTaskIds(newSet);
  };

  const handleAddSelected =
    async () => {
      const selectedTasks =
        history
          .filter((item) =>
            selectedTaskIds.has(
              item.id
            )
          )
          .map((item) => ({
            title: item.title,
            durationMinutes:
              item.durationMinutes ||
              undefined,
          }));

      if (selectedTasks.length === 0) {
        toast.warning(
          'Please select at least one task.'
        );
        return;
      }

      await onAddTasks(
        selectedTasks
      );

      setSelectedTaskIds(
        new Set()
      );
    };

  const phaseLabel =
    phase === 'INSPECTION'
      ? 'Inspection'
      : 'Repair';

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent
        className="
          flex
          h-[94vh]
          w-[calc(100%-1rem)]
          max-w-2xl
          flex-col
          rounded-xl
          border
          border-border
          bg-card
          p-0
          shadow-xl
          sm:h-auto
          sm:max-h-[90vh]
        "
      >
        {/* =======================================================
         * HEADER
         * ===================================================== */}
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add Tasks from History
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Reuse {phaseLabel.toLowerCase()}{' '}
                tasks from previous appointments.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* =======================================================
         * SEARCH
         * ===================================================== */}
        <div className="shrink-0 border-b border-border bg-muted/20 p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search tasks by title..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="
                h-11
                rounded-md
                pl-10
                text-base
                md:h-9
                md:text-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {phaseLabel} task history
            </p>

            {selectedTaskIds.size >
              0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedTaskIds(
                    new Set()
                  )
                }
                className="h-8 rounded-md px-2 text-xs"
              >
                Clear selection
              </Button>
            )}
          </div>
        </div>

        {/* =======================================================
         * CONTENT
         * ===================================================== */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 p-4 sm:p-5">
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>

                <p className="mt-3 text-sm font-medium">
                  Loading task history
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Retrieving previous appointment tasks...
                </p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Clock3 className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-medium">
                  No tasks found
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {search.trim()
                    ? 'No historical tasks match your search.'
                    : `There are no previous ${phaseLabel.toLowerCase()} tasks available.`}
                </p>
              </div>
            ) : (
              groupedHistory.map(
                ([date, items]) => (
                  <section
                    key={date}
                    className="space-y-3"
                  >
                    {/* Date heading */}
                    <div className="sticky top-0 z-10 bg-card/95 py-1 backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />

                        <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />

                          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
                            {date ===
                            'No Date'
                              ? 'No Date'
                              : format(
                                  parseISO(
                                    date
                                  ),
                                  'EEE, MMM d, yyyy'
                                )}
                          </span>

                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {items.length}
                          </span>
                        </div>

                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      {items.map(
                        (item) => {
                          const selected =
                            selectedTaskIds.has(
                              item.id
                            );

                          return (
                            <div
                              key={item.id}
                              className="
                                overflow-hidden
                                rounded-lg
                                border
                                border-border
                                bg-background
                              "
                            >
                              <label
                                htmlFor={`task-${item.id}`}
                                className="
                                  flex
                                  cursor-pointer
                                  items-start
                                  gap-3
                                  p-4
                                "
                              >
                                <Checkbox
                                  id={`task-${item.id}`}
                                  checked={
                                    selected
                                  }
                                  onCheckedChange={() =>
                                    handleToggleTask(
                                      item.id
                                    )
                                  }
                                  className="mt-1"
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-2.5">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <FileText className="h-4 w-4" />
                                      </div>

                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                          Historical task
                                        </p>

                                        <p className="mt-1 text-sm font-medium leading-5 text-foreground">
                                          {item.title}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                      {item.durationMinutes && (
                                        <Badge
                                          variant="secondary"
                                          className="rounded-md text-[10px]"
                                        >
                                          <Clock3 className="mr-1 h-3 w-3" />
                                          {
                                            item.durationMinutes
                                          }{' '}
                                          min
                                        </Badge>
                                      )}

                                      {selected && (
                                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                          <Check className="h-3.5 w-3.5" />
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Metadata */}
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                                      <span className="truncate text-xs text-muted-foreground">
                                        {item.customer
                                          ?.fullname ||
                                          'Unknown Customer'}
                                      </span>
                                    </div>

                                    <div className="flex min-w-0 items-center gap-2">
                                      <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                                      <span className="truncate text-xs text-muted-foreground">
                                        {item.vehicle
                                          ?.make}{' '}
                                        {item
                                          .vehicle
                                          ?.model}{' '}
                                        (
                                        {item
                                          .vehicle
                                          ?.plateNumber ||
                                          'N/A'}
                                        )
                                      </span>
                                    </div>

                                    {item.appointmentTime && (
                                      <div className="flex min-w-0 items-center gap-2">
                                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                                        <span className="truncate text-xs text-muted-foreground">
                                          {item.appointmentTime}
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex min-w-0 items-center gap-2">
                                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                                      <span className="truncate text-xs text-muted-foreground">
                                        {date ===
                                        'No Date'
                                          ? 'No date'
                                          : format(
                                              parseISO(
                                                date
                                              ),
                                              'MMM d, yyyy'
                                            )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <Badge
                                      variant="outline"
                                      className="rounded-md text-[10px]"
                                    >
                                      {item.phase ===
                                      'INSPECTION'
                                        ? 'Inspection'
                                        : 'Repair'}
                                    </Badge>
                                  </div>
                                </div>
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>
                )
              )
            )}
          </div>
        </ScrollArea>

        {/* =======================================================
         * FOOTER
         * ===================================================== */}
        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
              disabled={isAdding}
              className="h-11 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={
                handleAddSelected
              }
              disabled={
                isAdding ||
                selectedTaskIds.size ===
                  0
              }
              className="
                h-11
                rounded-md
                md:h-9
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}

              {isAdding
                ? 'Adding...'
                : `Add Selected (${selectedTaskIds.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}