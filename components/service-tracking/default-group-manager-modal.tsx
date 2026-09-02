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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  AlertCircle,
  ClipboardList,
  Clock3,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  defaultGroupsApi,
} from '@/lib/service-tracking/default-groups';

import { toast } from 'sonner';

interface DefaultGroupManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function DefaultGroupManagerModal({
  open,
  onOpenChange,
  onSaved,
}: DefaultGroupManagerModalProps) {
  const [groups, setGroups] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [
    editingGroupId,
    setEditingGroupId,
  ] = useState<string | null>(
    null
  );

  const [formData, setFormData] =
    useState<{
      title: string;
      description: string;
      isActive: boolean;
      tasks: Array<{
        id?: string;
        title: string;
        durationMinutes?: number;
        taskType?: string;
      }>;
    }>({
      title: '',
      description: '',
      isActive: true,
      tasks: [],
    });

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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      isActive: true,
      tasks: [],
    });

    setEditingGroupId(null);
  };

  const handleEditGroup = (
    group: any
  ) => {
    setEditingGroupId(group.id);

    setFormData({
      title: group.title,
      description:
        group.description || '',
      isActive: group.isActive,

      tasks: group.tasks.map(
        (task: any) => ({
          id: task.id,
          title: task.title,
          durationMinutes:
            task.durationMinutes ||
            undefined,
          taskType:
            task.taskType ||
            'INSPECTION',
        })
      ),
    });
  };

  const handleDeleteGroup =
    async (id: string) => {
      if (
        !confirm(
          'Delete this group and all its tasks?'
        )
      ) {
        return;
      }

      try {
        const res =
          await defaultGroupsApi.delete(
            id
          );

        if (res.error) {
          toast.error(
            res.errorMessage ||
              'Failed to delete group.'
          );
        } else {
          toast.success(
            'Group deleted.'
          );

          loadGroups();
        }
      } catch (err) {
        toast.error(
          'Error deleting group.'
        );
      }
    };

  const handleSaveGroup =
    async () => {
      if (!formData.title.trim()) {
        toast.error(
          'Group title is required.'
        );
        return;
      }

      try {
        const payload = {
          title:
            formData.title.trim(),

          description:
            formData.description.trim() ||
            undefined,

          isActive:
            formData.isActive,

          tasks:
            formData.tasks.map(
              (task) => ({
                title:
                  task.title.trim(),

                durationMinutes:
                  task.durationMinutes,

                taskType:
                  task.taskType ||
                  'INSPECTION',
              })
            ),
        };

        let res;

        if (editingGroupId) {
          res =
            await defaultGroupsApi.update(
              editingGroupId,
              payload
            );
        } else {
          res =
            await defaultGroupsApi.create(
              payload
            );
        }

        if (res.error) {
          toast.error(
            res.errorMessage ||
              'Failed to save group.'
          );
        } else {
          toast.success(
            editingGroupId
              ? 'Group updated.'
              : 'Group created.'
          );

          resetForm();
          loadGroups();
          onSaved();
        }
      } catch (err) {
        toast.error(
          'Error saving group.'
        );
      }
    };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [
        ...formData.tasks,
        {
          title: '',
          durationMinutes:
            undefined,
          taskType: 'INSPECTION',
        },
      ],
    });
  };

  const removeTask = (
    index: number
  ) => {
    const newTasks = [
      ...formData.tasks,
    ];

    newTasks.splice(
      index,
      1
    );

    setFormData({
      ...formData,
      tasks: newTasks,
    });
  };

  const updateTask = (
    index: number,
    field: string,
    value: any
  ) => {
    const newTasks = [
      ...formData.tasks,
    ];

    newTasks[index] = {
      ...newTasks[index],
      [field]: value,
    };

    setFormData({
      ...formData,
      tasks: newTasks,
    });
  };

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
          sm:max-h-[92vh]
        "
      >
        {/* =====================================================
         * HEADER
         * =================================================== */}
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Default Task Groups
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Manage reusable inspection and repair task
                templates.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* =====================================================
         * BODY
         * =================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-5">
            {/* Existing groups */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    Existing Groups
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Reusable task collections.
                  </p>
                </div>

                {groups.length > 0 && (
                  <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    {groups.length}{' '}
                    {groups.length === 1
                      ? 'Group'
                      : 'Groups'}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-border bg-muted/20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    Loading groups
                  </p>
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">
                    No groups yet
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Create a reusable group below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map(
                    (group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <ClipboardList className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold">
                                  {group.title}
                                </p>

                                <span
                                  className={
                                    group.isActive
                                      ? 'rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-700'
                                      : 'rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground'
                                  }
                                >
                                  {group.isActive
                                    ? 'Active'
                                    : 'Inactive'}
                                </span>
                              </div>

                              {group.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {group.description}
                                </p>
                              )}

                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {group.tasks?.length ||
                                  0}{' '}
                                task
                                {group.tasks?.length ===
                                1
                                  ? ''
                                  : 's'}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleEditGroup(
                                  group
                                )
                              }
                              className="
                                h-10
                                w-10
                                rounded-md
                                text-muted-foreground
                                hover:bg-primary/5
                                hover:text-primary
                                md:h-8
                                md:w-8
                              "
                              aria-label="Edit group"
                            >
                              <Edit2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDeleteGroup(
                                  group.id
                                )
                              }
                              className="
                                h-10
                                w-10
                                rounded-md
                                text-muted-foreground
                                hover:bg-destructive/10
                                hover:text-destructive
                                md:h-8
                                md:w-8
                              "
                              aria-label="Delete group"
                            >
                              <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* =================================================
             * CREATE / EDIT FORM
             * =============================================== */}
            <section className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="border-b border-border bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {editingGroupId ? (
                      <Edit2 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {editingGroupId
                        ? 'Edit Group'
                        : 'Create Group'}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      Define the reusable task template.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title *
                  </Label>

                  <Input
                    value={
                      formData.title
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title:
                          e.target.value,
                      })
                    }
                    placeholder="e.g., Inspection PMS for Toyota Vios"
                    className="
                      h-11
                      rounded-md
                      text-base
                      md:h-9
                      md:text-sm
                    "
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </Label>

                  <Textarea
                    value={
                      formData.description
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description:
                          e.target.value,
                      })
                    }
                    placeholder="Optional description"
                    className="
                      min-h-[90px]
                      resize-none
                      rounded-md
                      text-base
                      md:text-sm
                    "
                  />
                </div>

                {/* Active */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-3">
                  <div>
                    <Label
                      htmlFor="group-active"
                      className="text-sm font-medium"
                    >
                      Active
                    </Label>

                    <p className="text-[11px] text-muted-foreground">
                      Allow this group to be reused in the workflow.
                    </p>
                  </div>

                  <Switch
                    id="group-active"
                    checked={
                      formData.isActive
                    }
                    onCheckedChange={(
                      checked
                    ) =>
                      setFormData({
                        ...formData,
                        isActive:
                          checked,
                      })
                    }
                  />
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tasks
                      </Label>

                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Define the operations included in this group.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={
                        addTask
                      }
                      className="h-10 rounded-md md:h-9"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Task
                    </Button>
                  </div>

                  {formData.tasks.length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
                      <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground" />

                      <p className="mt-2 text-xs font-medium">
                        No tasks configured
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Add tasks to this reusable group.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.tasks.map(
                        (
                          task,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                            className="rounded-lg border border-border bg-muted/20 p-3"
                          >
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_140px_auto] md:items-end">
                              {/* Task title */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Task
                                </Label>

                                <Input
                                  value={
                                    task.title
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateTask(
                                      index,
                                      'title',
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Task title"
                                  className="
                                    h-11
                                    rounded-md
                                    text-base
                                    md:h-9
                                    md:text-sm
                                  "
                                />
                              </div>

                              {/* Duration */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Minutes
                                </Label>

                                <div className="relative">
                                  <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                                  <Input
                                    type="number"
                                    min="1"
                                    value={
                                      task.durationMinutes ||
                                      ''
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateTask(
                                        index,
                                        'durationMinutes',
                                        e
                                          .target
                                          .value
                                          ? Number(
                                              e
                                                .target
                                                .value
                                            )
                                          : undefined
                                      )
                                    }
                                    placeholder="Min"
                                    className="
                                      h-11
                                      rounded-md
                                      pl-9
                                      text-base
                                      md:h-9
                                      md:text-sm
                                    "
                                  />
                                </div>
                              </div>

                              {/* Type */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Type
                                </Label>

                                <Select
                                  value={
                                    task.taskType ||
                                    'INSPECTION'
                                  }
                                  onValueChange={(
                                    value
                                  ) =>
                                    updateTask(
                                      index,
                                      'taskType',
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-11 rounded-md text-base md:h-9 md:text-sm">
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>

                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="INSPECTION">
                                      Inspection
                                    </SelectItem>

                                    <SelectItem value="WORK">
                                      Repair Work
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Delete */}
                              <div className="flex justify-end md:min-h-9 md:items-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removeTask(
                                      index
                                    )
                                  }
                                  className="
                                    h-10
                                    w-10
                                    rounded-md
                                    text-muted-foreground
                                    hover:bg-destructive/10
                                    hover:text-destructive
                                    md:h-8
                                    md:w-8
                                  "
                                  aria-label="Remove task"
                                >
                                  <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Inspection tasks are used during diagnosis.
                      Repair tasks are available during the work phase.
                    </p>
                  </div>
                </div>

                {/* Form actions */}
                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  {editingGroupId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={
                        resetForm
                      }
                      className="h-11 rounded-md sm:w-auto md:h-9"
                    >
                      Cancel Edit
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={
                      handleSaveGroup
                    }
                    className="h-11 rounded-md sm:w-auto md:h-9"
                  >
                    {editingGroupId
                      ? 'Update Group'
                      : 'Create Group'}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* =====================================================
         * FOOTER
         * =================================================== */}
        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(false)
            }
            className="h-11 w-full rounded-md sm:w-auto md:h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}