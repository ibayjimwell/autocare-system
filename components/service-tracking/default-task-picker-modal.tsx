'use client';

import React, { useState, useEffect } from 'react';
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
import { defaultGroupsApi } from '@/lib/service-tracking/default-groups';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DefaultTaskPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTasks: (tasks: Array<{ title: string; durationMinutes?: number }>) => Promise<void>;
  isAdding: boolean;
}

export default function DefaultTaskPickerModal({
  open,
  onOpenChange,
  onAddTasks,
  isAdding,
}: DefaultTaskPickerModalProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await defaultGroupsApi.list();
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load groups.');
      } else {
        setGroups(res.data || []);
      }
    } catch (err) {
      toast.error('Error loading groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadGroups();
  }, [open]);

  // Reset selections when group changes
  useEffect(() => {
    setSelectedTaskIds(new Set());
  }, [selectedGroupId]);

  const handleToggleTask = (taskId: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setSelectedTaskIds(newSet);
  };

  const handleAddSelected = async () => {
    if (!selectedGroupId) return;
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;
    const tasksToAdd = group.tasks
      .filter((t: any) => selectedTaskIds.has(t.id))
      .map((t: any) => ({
        title: t.title,
        durationMinutes: t.durationMinutes || undefined,
      }));
    if (tasksToAdd.length === 0) {
      toast.warning('Please select at least one task.');
      return;
    }
    await onAddTasks(tasksToAdd);
    // Don't close; let the parent decide.
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Tasks from Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group selection */}
          <div>
            <Label>Select a group</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {groups.map((g) => (
                <Button
                  key={g.id}
                  variant={selectedGroupId === g.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGroupId(g.id)}
                  className="rounded-full"
                >
                  {g.title}
                </Button>
              ))}
              {groups.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">No groups available.</p>
              )}
            </div>
          </div>

          {/* Tasks list */}
          {selectedGroup && (
            <div>
              <Label>Tasks</Label>
              <ScrollArea className="max-h-60 border rounded-md p-2">
                {selectedGroup.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks in this group.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedGroup.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={selectedTaskIds.has(task.id)}
                          onCheckedChange={() => handleToggleTask(task.id)}
                        />
                        <Label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">
                          {task.title}
                          {task.durationMinutes && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({task.durationMinutes} min)
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={isAdding || selectedTaskIds.size === 0}
          >
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Add Selected ({selectedTaskIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}