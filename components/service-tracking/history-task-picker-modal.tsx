'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Check, Search, History, Clock3, Car, User } from 'lucide-react';
import { useHistoryTasks } from '@/hooks/service-tracking/useHistoryTasks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HistoryTaskPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTasks: (
    tasks: Array<{
      title: string;
      durationMinutes?: number;
    }>,
  ) => Promise<void>;
  isAdding: boolean;
  phase: 'INSPECTION' | 'WORK';
  currentAppointmentId?: string;
}

export default function HistoryTaskPickerModal({
  open,
  onOpenChange,
  onAddTasks,
  isAdding,
  phase,
  currentAppointmentId,
}: HistoryTaskPickerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    tasks,
    loading,
    refreshing,
  } = useHistoryTasks(
    search,
    phase,
    {
      enabled: open,
      excludeAppointmentId: currentAppointmentId,
      debounceMs: 250,
    },
  );

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIds(new Set());
      return;
    }

  }, [open]);

  const deduplicatedTasks = useMemo(() => {
    const seen = new Set<string>();

    return tasks.filter((task: any) => {
      const key = String(task?.title || '')
        .trim()
        .toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [tasks]);

  const handleToggle = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleSelectAll = () => {
    if (deduplicatedTasks.length === 0) return;

    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allSelected = deduplicatedTasks.every((task: any) =>
        next.has(task.id),
      );

      if (allSelected) {
        deduplicatedTasks.forEach((task: any) =>
          next.delete(task.id),
        );
      } else {
        deduplicatedTasks.forEach((task: any) =>
          next.add(task.id),
        );
      }

      return next;
    });
  };

  const handleAddSelected = async () => {
    const selected = deduplicatedTasks.filter((task: any) =>
      selectedIds.has(task.id),
    );

    if (selected.length === 0) {
      toast.warning('Select at least one historical task.');
      return;
    }

    const payload = selected
      .map((task: any) => {
        const duration = Number(task?.durationMinutes);

        return {
          title: String(task?.title || '').trim(),
          durationMinutes:
            Number.isFinite(duration) && duration > 0
              ? duration
              : undefined,
        };
      })
      .filter((task) => task.title.length > 0);

    if (payload.length === 0) {
      toast.error('The selected historical tasks are invalid.');
      return;
    }

    await onAddTasks(payload);
    setSelectedIds(new Set());
  };

  const allSelected =
    deduplicatedTasks.length > 0 &&
    deduplicatedTasks.every((task: any) =>
      selectedIds.has(task.id),
    );

  const phaseLabel =
    phase === 'INSPECTION'
      ? 'inspection'
      : 'repair';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          flex
          h-[92vh]
          w-[calc(100%-1rem)]
          max-w-3xl
          flex-col
          overflow-hidden
          rounded-xl
          border-border
          bg-card
          p-0
          shadow-xl
          sm:max-h-[88vh]
        "
      >
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Reuse Task History
              </DialogTitle>

              <DialogDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Reuse a completed {phaseLabel} task from another appointment.
                The current appointment is excluded.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-border bg-muted/20 p-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search task history..."
              className="h-11 rounded-md pl-10 text-base md:h-9 md:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {deduplicatedTasks.length} available
              </Badge>
              {selectedIds.size > 0 && (
                <Badge className="rounded-full text-[10px]">
                  {selectedIds.size} selected
                </Badge>
              )}
              {refreshing && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={deduplicatedTasks.length === 0}
              className="h-8 rounded-md px-2.5 text-xs"
            >
              {allSelected ? 'Clear visible' : 'Select visible'}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-2 p-3 sm:p-4">
            {loading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Loading task history...
                </p>
              </div>
            ) : deduplicatedTasks.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <History className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No reusable task history
                </p>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  {search.trim()
                    ? 'No historical tasks match your search.'
                    : 'Complete tasks on previous appointments to make them available here.'}
                </p>
              </div>
            ) : (
              deduplicatedTasks.map((task: any) => {
                const selected = selectedIds.has(task.id);
                const duration = Number(task?.durationMinutes);

                return (
                  <label
                    key={task.id}
                    htmlFor={`history-task-${task.id}`}
                    className={cn(
                      'block cursor-pointer rounded-lg border bg-background p-3 transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                        : 'border-border hover:border-primary/20 hover:bg-muted/20',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`history-task-${task.id}`}
                        checked={selected}
                        onCheckedChange={() =>
                          handleToggle(task.id)
                        }
                        className="mt-0.5"
                      />

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <History className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {task.title}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {task.customer?.fullname && (
                                <Badge variant="outline" className="rounded-md text-[9px] font-normal">
                                  <User className="mr-1 h-3 w-3" />
                                  {task.customer.fullname}
                                </Badge>
                              )}

                              {task.vehicle?.plateNumber && (
                                <Badge variant="outline" className="rounded-md text-[9px] font-normal">
                                  <Car className="mr-1 h-3 w-3" />
                                  {task.vehicle.plateNumber}
                                </Badge>
                              )}

                              {Number.isFinite(duration) && duration > 0 && (
                                <Badge variant="secondary" className="rounded-md text-[9px]">
                                  <Clock3 className="mr-1 h-3 w-3" />
                                  {duration} min
                                </Badge>
                              )}

                              <Badge variant="secondary" className="rounded-md text-[9px]">
                                {task.phase || phase}
                              </Badge>
                            </div>
                          </div>

                          {selected && (
                            <Badge className="shrink-0 rounded-full text-[9px]">
                              <Check className="mr-1 h-3 w-3" />
                              Selected
                            </Badge>
                          )}
                        </div>

                        {(task.appointment?.trackingNumber || task.completedAt) && (
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                            {task.appointment?.trackingNumber && (
                              <span>
                                #{task.appointment.trackingNumber}
                              </span>
                            )}

                            {task.completedAt && (
                              <span>
                                Completed {new Date(task.completedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-3 sm:p-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
              className="h-10 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleAddSelected}
              disabled={isAdding || selectedIds.size === 0}
              className="h-10 rounded-md md:h-9"
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}

              {isAdding
                ? 'Adding...'
                : `Add Selected (${selectedIds.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
