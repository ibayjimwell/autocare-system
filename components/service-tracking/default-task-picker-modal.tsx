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
import {
  Check,
  ClipboardList,
  Clock3,
  Layers,
  Loader2,
  Search,
} from 'lucide-react';
import { defaultGroupsApi } from '@/lib/service-tracking/default-groups';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ================================================================
   TYPES
================================================================ */

type TaskPhase = 'INSPECTION' | 'WORK';

interface DefaultTaskPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTasks: (
    tasks: Array<{
      title: string;
      durationMinutes?: number;
    }>,
  ) => Promise<void>;
  isAdding: boolean;
  phase: TaskPhase;
}

/* ================================================================
   NORMALIZERS
================================================================ */

function normalizeTaskType(
  task: any,
): TaskPhase {
  /*
   * Existing records created before taskType was enforced may have
   * a missing value. Treat those as inspection tasks because the
   * database model's historical default is INSPECTION.
   */
  return task?.taskType === 'WORK'
    ? 'WORK'
    : 'INSPECTION';
}

function taskDuration(
  task: any,
): number | undefined {
  const value = Number(
    task?.durationMinutes,
  );

  return Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function DefaultTaskPickerModal({
  open,
  onOpenChange,
  onAddTasks,
  isAdding,
  phase,
}: DefaultTaskPickerModalProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );

  /* ==============================================================
     LOAD
  ============================================================== */

  const loadGroups = async () => {
    setLoading(true);

    try {
      const res = await defaultGroupsApi.list();

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to load default task groups.',
        );
        setGroups([]);
        return;
      }

      setGroups(
        Array.isArray(res?.data)
          ? res.data
          : [],
      );
    } catch (error: any) {
      console.error(
        '[DefaultTaskPickerModal] load error:',
        error,
      );

      toast.error(
        error?.message ||
          'Error loading default task groups.',
      );

      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedGroupId(null);
      setSelectedTaskIds(new Set());
      return;
    }

    void loadGroups();
  }, [open]);

  /* ==============================================================
     ACTIVE GROUPS
  ============================================================== */

  const activeGroups = useMemo(
    () =>
      groups.filter(
        (group) => group?.isActive !== false,
      ),
    [groups],
  );

  /* ==============================================================
     FILTER GROUPS
  ============================================================== */

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return activeGroups;
    }

    return activeGroups.filter((group) => {
      const groupText = [
        group?.title,
        group?.description,
        ...(Array.isArray(group?.tasks)
          ? group.tasks.map((task: any) => task?.title)
          : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return groupText.includes(query);
    });
  }, [activeGroups, search]);

  /* ==============================================================
     SELECT DEFAULT GROUP WHEN AVAILABLE
  ============================================================== */

  useEffect(() => {
    if (filteredGroups.length === 0) {
      setSelectedGroupId(null);
      return;
    }

    const stillVisible = filteredGroups.some(
      (group) => group.id === selectedGroupId,
    );

    if (!stillVisible) {
      setSelectedGroupId(
        filteredGroups[0].id,
      );
    }
  }, [filteredGroups, selectedGroupId]);

  /* ==============================================================
     SELECTED GROUP
  ============================================================== */

  const selectedGroup = useMemo(
    () =>
      filteredGroups.find(
        (group) => group.id === selectedGroupId,
      ) || null,
    [filteredGroups, selectedGroupId],
  );

  const phaseTasks = useMemo(
    () =>
      Array.isArray(selectedGroup?.tasks)
        ? [...selectedGroup.tasks]
            .sort(
              (left, right) =>
                Number(left?.order ?? 0) -
                Number(right?.order ?? 0),
            )
            .filter(
              (task: any) =>
                normalizeTaskType(task) === phase,
            )
        : [],
    [selectedGroup, phase],
  );

  /* ==============================================================
     RESET TASK SELECTION WHEN GROUP CHANGES
  ============================================================== */

  useEffect(() => {
    setSelectedTaskIds(new Set());
  }, [selectedGroupId, phase]);

  /* ==============================================================
     TOGGLE
  ============================================================== */

  const handleToggleTask = (
    taskId: string,
  ) => {
    setSelectedTaskIds((previous) => {
      const next = new Set(previous);

      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }

      return next;
    });
  };

  /* ==============================================================
     SELECT ALL
  ============================================================== */

  const allVisibleSelected =
    phaseTasks.length > 0 &&
    phaseTasks.every((task: any) =>
      selectedTaskIds.has(task.id),
    );

  const handleSelectAll = () => {
    if (phaseTasks.length === 0) {
      return;
    }

    setSelectedTaskIds((previous) => {
      const next = new Set(previous);

      if (allVisibleSelected) {
        phaseTasks.forEach((task: any) =>
          next.delete(task.id),
        );
      } else {
        phaseTasks.forEach((task: any) =>
          next.add(task.id),
        );
      }

      return next;
    });
  };

  /* ==============================================================
     ADD
  ============================================================== */

  const handleAddSelected = async () => {
    const selectedTasks = phaseTasks.filter(
      (task: any) =>
        selectedTaskIds.has(task.id),
    );

    if (selectedTasks.length === 0) {
      toast.warning(
        'Select at least one task.',
      );
      return;
    }

    const payload = selectedTasks
      .map((task: any) => ({
        title: String(task?.title || '').trim(),
        durationMinutes: taskDuration(task),
      }))
      .filter((task) => task.title.length > 0);

    if (payload.length === 0) {
      toast.error(
        'The selected tasks are invalid.',
      );
      return;
    }

    await onAddTasks(payload);

    setSelectedTaskIds(new Set());
  };

  /* ==============================================================
     RENDER
  ============================================================== */

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
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DialogHeader
          className="
            shrink-0
            border-b
            border-border
            p-4

            sm:p-5
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-md
                bg-primary/10
                text-primary
              "
            >
              <Layers className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add Tasks from Templates
              </DialogTitle>

              <DialogDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Select reusable {phaseLabel} tasks and add them to this appointment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            SEARCH
        ========================================================= */}

        <div
          className="
            shrink-0
            space-y-3
            border-b
            border-border
            bg-muted/20
            p-3

            sm:p-4
          "
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search groups or task names..."
              className="
                h-11
                rounded-md
                pl-10
                text-base

                md:h-9
                md:text-sm
              "
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {filteredGroups.length} active group
                {filteredGroups.length === 1 ? '' : 's'}
              </Badge>

              {selectedGroup && (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/20 bg-primary/5 text-[10px] text-primary"
                >
                  {phaseTasks.length} {phaseLabel} task
                  {phaseTasks.length === 1 ? '' : 's'}
                </Badge>
              )}

              {selectedTaskIds.size > 0 && (
                <Badge className="rounded-full text-[10px]">
                  {selectedTaskIds.size} selected
                </Badge>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={phaseTasks.length === 0}
              className="h-8 rounded-md px-2.5 text-xs"
            >
              {allVisibleSelected
                ? 'Clear visible'
                : 'Select visible'}
            </Button>
          </div>
        </div>

        {/* ========================================================
            CONTENT
        ========================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-hidden
          "
        >
          <div
            className="
              grid
              h-full
              min-h-0
              grid-cols-1

              lg:grid-cols-[260px_minmax(0,1fr)]
            "
          >
            {/* ====================================================
                GROUPS
            ===================================================== */}

            <aside
              className="
                min-h-0
                overflow-y-auto
                border-b
                border-border
                p-3

                lg:border-b-0
                lg:border-r
                lg:p-4
              "
            >
              <div className="mb-2 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Task Groups
                </p>
              </div>

              {loading ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
                  <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-xs font-medium text-foreground">
                    No active groups found
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Create or activate a task group in Default Tasks.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredGroups.map((group: any) => {
                    const groupTasks = Array.isArray(group?.tasks)
                      ? group.tasks.filter(
                          (task: any) =>
                            normalizeTaskType(task) === phase,
                        )
                      : [];

                    const active =
                      selectedGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() =>
                          setSelectedGroupId(group.id)
                        }
                        className={cn(
                          `
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
                          active
                            ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                            : 'border-border bg-background hover:border-primary/20 hover:bg-muted/30',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                              active
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-xs font-semibold text-foreground">
                                {group.title}
                              </span>
                            </span>

                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              {groupTasks.length}{' '}
                              {phaseLabel} task
                              {groupTasks.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* ====================================================
                TASKS
            ===================================================== */}

            <section className="min-h-0 overflow-y-auto p-3 sm:p-4">
              {selectedGroup ? (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Selected group
                      </p>

                      <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {selectedGroup.title}
                      </h3>

                      {selectedGroup.description && (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {selectedGroup.description}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="secondary"
                      className="shrink-0 rounded-full text-[10px]"
                    >
                      {phaseTasks.length} available
                    </Badge>
                  </div>

                  {phaseTasks.length === 0 ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 text-center">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        No {phaseLabel} tasks in this group
                      </p>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                        Edit this group in Default Tasks and add at least one
                        {` `}{phaseLabel} task.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {phaseTasks.map((task: any, index: number) => {
                        const selected =
                          selectedTaskIds.has(task.id);

                        const duration =
                          taskDuration(task);

                        return (
                          <label
                            key={task.id}
                            htmlFor={`default-task-${task.id}`}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                              selected
                                ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                                : 'border-border bg-background hover:border-primary/20 hover:bg-muted/20',
                            )}
                          >
                            <Checkbox
                              id={`default-task-${task.id}`}
                              checked={selected}
                              onCheckedChange={() =>
                                handleToggleTask(task.id)
                              }
                              className="mt-0.5"
                            />

                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <span className="text-[11px] font-bold tabular-nums">
                                {index + 1}
                              </span>
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {task.title}
                                </span>

                                {duration !== undefined && (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-md text-[9px]"
                                  >
                                    <Clock3 className="mr-1 h-3 w-3" />
                                    {duration} min
                                  </Badge>
                                )}

                                {selected && (
                                  <Badge className="rounded-full text-[9px]">
                                    <Check className="mr-1 h-3 w-3" />
                                    Selected
                                  </Badge>
                                )}
                              </span>

                              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                                {phase === 'INSPECTION'
                                  ? 'Inspection task'
                                  : 'Repair task'}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Select a task group
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    Choose a reusable task group from the left to see its
                    {` `}{phaseLabel} tasks.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DialogFooter
          className="
            shrink-0
            border-t
            border-border
            bg-muted/20
            p-3

            sm:p-4
          "
        >
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
              disabled={isAdding}
              className="h-10 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleAddSelected}
              disabled={
                isAdding ||
                selectedTaskIds.size === 0
              }
              className="h-10 rounded-md md:h-9"
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
