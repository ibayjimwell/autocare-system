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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import {
  Badge,
} from '@/components/ui/badge';

import {
  ClipboardList,
  Clock3,
  Layers,
  Loader2,
  Check,
  Wrench,
  Search,
} from 'lucide-react';

import {
  defaultGroupsApi,
} from '@/lib/service-tracking/default-groups';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DefaultTaskPickerModalProps {
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

export default function DefaultTaskPickerModal({
  open,
  onOpenChange,
  onAddTasks,
  isAdding,
  phase,
}: DefaultTaskPickerModalProps) {
  const [groups, setGroups] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [
    selectedGroupId,
    setSelectedGroupId,
  ] = useState<string | null>(
    null
  );

  const [
    selectedTaskIds,
    setSelectedTaskIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const loadGroups = async () => {
    setLoading(true);

    try {
      const res =
        await defaultGroupsApi.list();

      if (res.error) {
        toast.error(
          res.errorMessage ||
            'Failed to load groups.'
        );
      } else {
        setGroups(
          res.data || []
        );
      }
    } catch (err) {
      toast.error(
        'Error loading groups.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  useEffect(() => {
    setSelectedTaskIds(
      new Set()
    );
  }, [selectedGroupId]);

  const handleToggleTask = (
    taskId: string
  ) => {
    const newSet = new Set(
      selectedTaskIds
    );

    if (
      newSet.has(taskId)
    ) {
      newSet.delete(
        taskId
      );
    } else {
      newSet.add(
        taskId
      );
    }

    setSelectedTaskIds(
      newSet
    );
  };

  const handleSelectAll = () => {
    if (!selectedGroupId) {
      return;
    }

    const group = groups.find(
      (g) =>
        g.id ===
        selectedGroupId
    );

    if (!group) {
      return;
    }

    const filteredTasks =
      (
        group.tasks || []
      ).filter(
        (task: any) =>
          task.taskType ===
          phase
      );

    const allIds =
      filteredTasks.map(
        (task: any) =>
          task.id
      );

    if (
      selectedTaskIds.size ===
        allIds.length &&
      allIds.length > 0
    ) {
      setSelectedTaskIds(
        new Set()
      );
    } else {
      setSelectedTaskIds(
        new Set(allIds)
      );
    }
  };

  const handleAddSelected =
    async () => {
      if (!selectedGroupId) {
        return;
      }

      const group = groups.find(
        (g) =>
          g.id ===
          selectedGroupId
      );

      if (!group) {
        return;
      }

      const tasksToAdd =
        (
          group.tasks || []
        )
          .filter(
            (task: any) =>
              selectedTaskIds.has(
                task.id
              ) &&
              task.taskType ===
                phase
          )
          .map(
            (task: any) => ({
              title:
                task.title,

              durationMinutes:
                task.durationMinutes ||
                undefined,
            })
          );

      if (
        tasksToAdd.length === 0
      ) {
        toast.warning(
          'Please select at least one task.'
        );
        return;
      }

      await onAddTasks(
        tasksToAdd
      );
    };

  const selectedGroup =
    groups.find(
      (group) =>
        group.id ===
        selectedGroupId
    );

  const phaseLabel =
    phase === 'INSPECTION'
      ? 'Inspection'
      : 'Repair';

  const filteredTasks =
    selectedGroup
      ? (
          selectedGroup.tasks ||
          []
        ).filter(
          (task: any) =>
            task.taskType ===
            phase
        )
      : [];

  const allSelected =
    filteredTasks.length >
      0 &&
    selectedTaskIds.size ===
      filteredTasks.length;

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
          max-w-xl
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
        {/* =====================================================
         * HEADER
         * =================================================== */}
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add Tasks from Template
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Choose reusable {phaseLabel.toLowerCase()} tasks
                for this service.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* =====================================================
         * CONTENT
         * =================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-4 sm:p-5">
            {/* Group selector */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Task Group
                  </Label>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Select a template to view its tasks.
                  </p>
                </div>

                {selectedGroup && (
                  <Badge
                    variant="secondary"
                    className="rounded-md text-[10px]"
                  >
                    {selectedGroup.tasks?.length ||
                      0}{' '}
                    total
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-border bg-muted/20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <Layers className="mx-auto h-5 w-5 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">
                    No groups available
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Create a default task group first.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {groups.map(
                    (group) => {
                      const active =
                        selectedGroupId ===
                        group.id;

                      return (
                        <Button
                          key={
                            group.id
                          }
                          type="button"
                          variant={
                            active
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            setSelectedGroupId(
                              group.id
                            )
                          }
                          className="
                            h-auto
                            min-h-14
                            justify-start
                            rounded-lg
                            px-3
                            py-3
                            text-left
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        >
                          <span
                            className={`
                              mr-3
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-md
                              ${
                                active
                                  ? 'bg-primary-foreground/15 text-primary-foreground'
                                  : 'bg-primary/10 text-primary'
                              }
                            `}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {
                                group.title
                              }
                            </span>

                            <span
                              className={cn(
                                'mt-0.5 block text-[10px]',
                                active
                                  ? 'text-primary-foreground/75'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {group.tasks
                                ?.length ||
                                0}{' '}
                              task
                              {group.tasks
                                ?.length ===
                              1
                                ? ''
                                : 's'}
                            </span>
                          </span>
                        </Button>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* Task selector */}
            {selectedGroup && (
              <section className="overflow-hidden rounded-lg border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {phaseLabel} Tasks
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        {filteredTasks.length}{' '}
                        available
                      </p>
                    </div>
                  </div>

                  {filteredTasks.length >
                    0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={
                        handleSelectAll
                      }
                      className="h-8 rounded-md px-2 text-xs"
                    >
                      {allSelected
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  )}
                </div>

                <ScrollArea className="max-h-[42vh]">
                  <div className="space-y-2 p-3">
                    {filteredTasks.length ===
                    0 ? (
                      <div className="px-4 py-10 text-center">
                        <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground" />

                        <p className="mt-3 text-sm font-medium">
                          No {phaseLabel.toLowerCase()}{' '}
                          tasks
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          This group does not contain tasks for the current phase.
                        </p>
                      </div>
                    ) : (
                      filteredTasks.map(
                        (
                          task: any
                        ) => {
                          const selected =
                            selectedTaskIds.has(
                              task.id
                            );

                          return (
                            <label
                              key={
                                task.id
                              }
                              htmlFor={`task-${task.id}`}
                              className="
                                flex
                                cursor-pointer
                                items-center
                                gap-3
                                rounded-lg
                                border
                                border-border
                                bg-background
                                px-3
                                py-3
                                transition-colors
                                hover:border-primary/30
                                hover:bg-primary/5
                              "
                            >
                              <Checkbox
                                id={`task-${task.id}`}
                                checked={
                                  selected
                                }
                                onCheckedChange={() =>
                                  handleToggleTask(
                                    task.id
                                  )
                                }
                              />

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {
                                    task.title
                                  }
                                </p>

                                {task.durationMinutes && (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <Clock3 className="h-3 w-3 text-muted-foreground" />

                                    <span className="text-[10px] text-muted-foreground">
                                      {
                                        task.durationMinutes
                                      }{' '}
                                      minutes
                                    </span>
                                  </div>
                                )}
                              </div>

                              {selected && (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </label>
                          );
                        }
                      )
                    )}
                  </div>
                </ScrollArea>

                {/* Selection summary */}
                <div className="border-t border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      {selectedTaskIds.size}{' '}
                      selected
                    </p>

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {phaseLabel} phase
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* =====================================================
         * FOOTER
         * =================================================== */}
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