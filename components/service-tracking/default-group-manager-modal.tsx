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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { defaultGroupsApi } from '@/lib/service-tracking/default-groups';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ================================================================
   TYPES
================================================================ */

interface DefaultGroupManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

type TaskType = 'INSPECTION' | 'WORK';

interface TaskForm {
  id?: string;
  title: string;
  durationMinutes?: number;
  taskType: TaskType;
  order?: number;
}

interface GroupForm {
  title: string;
  description: string;
  isActive: boolean;
  tasks: TaskForm[];
}

const EMPTY_FORM: GroupForm = {
  title: '',
  description: '',
  isActive: true,
  tasks: [],
};

/* ================================================================
   COMPONENT
================================================================ */

export default function DefaultGroupManagerModal({
  open,
  onOpenChange,
  onSaved,
}: DefaultGroupManagerModalProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupForm>(EMPTY_FORM);

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
        '[DefaultGroupManagerModal] load error:',
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
    if (open) {
      void loadGroups();
    }
  }, [open]);

  /* ==============================================================
     FILTER
  ============================================================== */

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return groups.filter((group: any) => {
      if (!showInactive && group?.isActive === false) {
        return false;
      }

      if (!query) {
        return true;
      }

      const text = [
        group?.title,
        group?.description,
        ...(Array.isArray(group?.tasks)
          ? group.tasks.map((task: any) => task?.title)
          : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [groups, search, showInactive]);

  /* ==============================================================
     FORM
  ============================================================== */

  const resetForm = () => {
    setFormData({
      ...EMPTY_FORM,
      tasks: [],
    });

    setEditingGroupId(null);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroupId(group.id);

    setFormData({
      title: String(group?.title || ''),
      description: String(group?.description || ''),
      isActive: group?.isActive !== false,
      tasks: (Array.isArray(group?.tasks) ? group.tasks : [])
        .sort(
          (left: any, right: any) =>
            Number(left?.order ?? 0) -
            Number(right?.order ?? 0),
        )
        .map((task: any, index: number) => ({
          id: task.id,
          title: String(task?.title || ''),
          durationMinutes:
            task?.durationMinutes === null ||
            task?.durationMinutes === undefined
              ? undefined
              : Number(task.durationMinutes),
          taskType:
            task?.taskType === 'WORK'
              ? 'WORK'
              : 'INSPECTION',
          order: Number(task?.order ?? index),
        })),
    });
  };

  const handleAddTask = () => {
    setFormData((previous) => ({
      ...previous,
      tasks: [
        ...previous.tasks,
        {
          title: '',
          durationMinutes: undefined,
          taskType: 'INSPECTION',
          order: previous.tasks.length,
        },
      ],
    }));
  };

  const handleRemoveTask = (index: number) => {
    setFormData((previous) => ({
      ...previous,
      tasks: previous.tasks.filter(
        (_, taskIndex) => taskIndex !== index,
      ),
    }));
  };

  const handleTaskChange = (
    index: number,
    field: keyof TaskForm,
    value: any,
  ) => {
    setFormData((previous) => {
      const tasks = [...previous.tasks];

      tasks[index] = {
        ...tasks[index],
        [field]: value,
      };

      return {
        ...previous,
        tasks,
      };
    });
  };

  /* ==============================================================
     SAVE
  ============================================================== */

  const handleSave = async () => {
    const title = formData.title.trim();

    if (!title) {
      toast.error('Group title is required.');
      return;
    }

    const validTasks = formData.tasks
      .map((task, index) => ({
        title: task.title.trim(),
        durationMinutes:
          task.durationMinutes &&
          Number(task.durationMinutes) > 0
            ? Number(task.durationMinutes)
            : undefined,
        taskType:
          task.taskType === 'WORK'
            ? 'WORK'
            : 'INSPECTION',
        order: index,
      }))
      .filter((task) => task.title.length > 0);

    setSaving(true);

    try {
      const payload = {
        title,
        description:
          formData.description.trim() || undefined,
        isActive: formData.isActive,
        tasks: validTasks,
      };

      const res = editingGroupId
        ? await defaultGroupsApi.update(
            editingGroupId,
            payload,
          )
        : await defaultGroupsApi.create(
            payload,
          );

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to save task group.',
        );
        return;
      }

      toast.success(
        editingGroupId
          ? 'Default task group updated.'
          : 'Default task group created.',
      );

      resetForm();
      await loadGroups();
      onSaved();
    } catch (error: any) {
      console.error(
        '[DefaultGroupManagerModal] save error:',
        error,
      );

      toast.error(
        error?.message ||
          'Error saving task group.',
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==============================================================
     DELETE
  ============================================================== */

  const handleDeleteGroup = async (group: any) => {
    const confirmed = window.confirm(
      `Delete “${group.title}” and all of its template tasks?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const res = await defaultGroupsApi.delete(
        group.id,
      );

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to delete task group.',
        );
        return;
      }

      toast.success('Default task group deleted.');

      if (editingGroupId === group.id) {
        resetForm();
      }

      await loadGroups();
      onSaved();
    } catch (error: any) {
      console.error(
        '[DefaultGroupManagerModal] delete error:',
        error,
      );

      toast.error(
        error?.message ||
          'Error deleting task group.',
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==============================================================
     COUNTS
  ============================================================== */

  const activeCount = groups.filter(
    (group) => group?.isActive !== false,
  ).length;

  const inactiveCount =
    groups.length - activeCount;

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) {
          resetForm();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          !flex
          !h-[min(92vh,900px)]
          !max-h-[92vh]
          !w-[calc(100vw-1rem)]
          !max-w-[1400px]
          sm:!w-[calc(100vw-2rem)]
          lg:!w-[92vw]
          xl:!w-[88vw]
          !flex-col
          !overflow-hidden
          !rounded-2xl
          !border-border
          !bg-card
          !p-0
          !shadow-2xl
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5 lg:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Default Task Library
              </DialogTitle>

              <DialogDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Build reusable inspection and repair task groups for faster service setup.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            TOOLBAR
        ========================================================= */}

        <div className="shrink-0 space-y-3 border-b border-border bg-muted/20 p-3 sm:p-4 lg:px-6">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search groups or tasks..."
                className="h-11 rounded-md pl-10 text-base md:h-9 md:text-sm"
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {activeCount} active
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full text-[10px]"
              >
                {inactiveCount} inactive
              </Badge>

              <label className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs">
                <Checkbox
                  checked={showInactive}
                  onCheckedChange={(checked) =>
                    setShowInactive(Boolean(checked))
                  }
                />

                Show inactive
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================
            BODY
        ========================================================= */}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className="
              grid
              gap-4
              p-3
              sm:p-4
              lg:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.8fr)]
              lg:items-start
              lg:p-5
              xl:grid-cols-[minmax(0,1.45fr)_minmax(480px,0.8fr)]
            "
          >
            {/* ====================================================
                EXISTING GROUPS
            ===================================================== */}

            <section className="min-w-0 rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Task Groups
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Select a group to edit its reusable tasks.
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="rounded-full text-[10px]"
                >
                  {filteredGroups.length} shown
                </Badge>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="flex min-h-[280px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />

                    <p className="mt-3 text-sm font-semibold text-foreground">
                      No task groups found
                    </p>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                      Create a group or adjust the current search/filter.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredGroups.map((group: any) => (
                      <div
                        key={group.id}
                        className={cn(
                          'rounded-lg border bg-card p-3 transition-colors',
                          editingGroupId === group.id
                            ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                            : 'border-border hover:border-primary/20',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <ClipboardList className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {group.title}
                                </p>

                                <Badge
                                  variant={
                                    group.isActive
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="rounded-full text-[9px]"
                                >
                                  {group.isActive
                                    ? 'Active'
                                    : 'Inactive'}
                                </Badge>
                              </div>

                              {group.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                  {group.description}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="rounded-md text-[9px]"
                                >
                                  {group.tasks?.length || 0} tasks
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="rounded-md text-[9px]"
                                >
                                  {group.tasks?.filter(
                                    (task: any) =>
                                      task?.taskType !== 'WORK',
                                  ).length || 0}{' '}
                                  inspection
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="rounded-md text-[9px]"
                                >
                                  {group.tasks?.filter(
                                    (task: any) =>
                                      task?.taskType === 'WORK',
                                  ).length || 0}{' '}
                                  repair
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleEditGroup(group)
                              }
                              className="h-9 w-9 rounded-md md:h-8 md:w-8"
                              aria-label={`Edit ${group.title}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                void handleDeleteGroup(group)
                              }
                              disabled={saving}
                              className="h-9 w-9 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8"
                              aria-label={`Delete ${group.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ====================================================
                EDITOR
            ===================================================== */}

            <section
              className="
                min-w-0
                rounded-xl
                border
                border-border
                bg-background
                lg:sticky
                lg:top-0
              "
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {editingGroupId ? (
                      <Edit2 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {editingGroupId
                        ? 'Edit Group'
                        : 'New Group'}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {editingGroupId
                        ? 'Update this reusable task collection.'
                        : 'Create a reusable task collection.'}
                    </p>
                  </div>
                </div>

                {editingGroupId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-8 rounded-md px-2 text-xs"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>

              <div className="space-y-4 p-4 lg:p-5">
                {/* Group title */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Group Title
                  </Label>

                  <Input
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    placeholder="e.g. Standard PMS Inspection"
                    className="h-11 rounded-md text-base md:h-9 md:text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </Label>

                  <Textarea
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Optional explanation of when this group should be used."
                    className="min-h-[74px] resize-none rounded-md text-base md:text-sm"
                  />
                </div>

                {/* Active */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Active
                      </Label>

                      <p className="text-[10px] leading-4 text-muted-foreground">
                        Active groups appear in task pickers.
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((previous) => ({
                        ...previous,
                        isActive: checked,
                      }))
                    }
                  />
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Template Tasks
                      </p>

                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Define the order and operational phase for each task.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTask}
                      className="h-9 rounded-md px-2.5 text-xs"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Task
                    </Button>
                  </div>

                  {formData.tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
                      <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground" />

                      <p className="mt-2 text-xs font-medium text-foreground">
                        No template tasks yet
                      </p>

                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                        Add inspection or repair tasks to make this group reusable.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.tasks.map((task, index) => (
                        <div
                          key={task.id || `task-${index}`}
                          className="rounded-lg border border-border bg-muted/20 p-2.5"
                        >
                          <div
                            className="
                              grid
                              gap-2
                              md:grid-cols-[minmax(0,1fr)_90px_120px_36px]
                              md:items-end
                            "
                          >
                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Task {index + 1}
                              </Label>

                              <Input
                                value={task.title}
                                onChange={(event) =>
                                  handleTaskChange(
                                    index,
                                    'title',
                                    event.target.value,
                                  )
                                }
                                placeholder="Task title"
                                className="h-10 rounded-md text-base md:h-9 md:text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Minutes
                              </Label>

                              <div className="relative">
                                <Clock3 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                  type="number"
                                  min="1"
                                  value={
                                    task.durationMinutes ?? ''
                                  }
                                  onChange={(event) =>
                                    handleTaskChange(
                                      index,
                                      'durationMinutes',
                                      event.target.value
                                        ? Number(
                                            event.target.value,
                                          )
                                        : undefined,
                                    )
                                  }
                                  placeholder="Min"
                                  className="h-10 rounded-md pl-8 text-base md:h-9 md:text-sm"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Type
                              </Label>

                              <Select
                                value={task.taskType}
                                onValueChange={(
                                  value: TaskType,
                                ) =>
                                  handleTaskChange(
                                    index,
                                    'taskType',
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger className="h-10 rounded-md md:h-9">
                                  <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectItem value="INSPECTION">
                                    Inspection
                                  </SelectItem>

                                  <SelectItem value="WORK">
                                    Repair Work
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveTask(index)
                              }
                              className="h-10 w-10 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8"
                              aria-label={`Remove task ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                  <p className="text-[10px] leading-4 text-muted-foreground">
                    Inspection tasks are used during diagnosis. Repair tasks are
                    available once the job enters the work phase.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
                  {editingGroupId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={saving}
                      className="h-10 rounded-md md:h-9"
                    >
                      Cancel Edit
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="h-10 rounded-md md:h-9"
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}

                    {editingGroupId
                      ? 'Update Group'
                      : 'Create Group'}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-3 sm:p-4 lg:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-10 w-full rounded-md sm:w-auto md:h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}