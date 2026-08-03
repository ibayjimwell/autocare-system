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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { defaultGroupsApi } from '@/lib/service-tracking/default-groups';
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
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    isActive: boolean;
    tasks: Array<{ id?: string; title: string; durationMinutes?: number }>;
  }>({
    title: '',
    description: '',
    isActive: true,
    tasks: [],
  });

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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      isActive: true,
      tasks: [],
    });
    setEditingGroupId(null);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setFormData({
      title: group.title,
      description: group.description || '',
      isActive: group.isActive,
      tasks: group.tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        durationMinutes: t.durationMinutes || undefined,
      })),
    });
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group and all its tasks?')) return;
    try {
      const res = await defaultGroupsApi.delete(id);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to delete group.');
      } else {
        toast.success('Group deleted.');
        loadGroups();
      }
    } catch (err) {
      toast.error('Error deleting group.');
    }
  };

  const handleSaveGroup = async () => {
    if (!formData.title.trim()) {
      toast.error('Group title is required.');
      return;
    }
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        tasks: formData.tasks.map(t => ({
          title: t.title.trim(),
          durationMinutes: t.durationMinutes,
        })),
      };
      let res;
      if (editingGroupId) {
        res = await defaultGroupsApi.update(editingGroupId, payload);
      } else {
        res = await defaultGroupsApi.create(payload);
      }
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to save group.');
      } else {
        toast.success(editingGroupId ? 'Group updated.' : 'Group created.');
        resetForm();
        loadGroups();
        onSaved();
      }
    } catch (err) {
      toast.error('Error saving group.');
    }
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { title: '', durationMinutes: undefined }],
    });
  };

  const removeTask = (index: number) => {
    const newTasks = [...formData.tasks];
    newTasks.splice(index, 1);
    setFormData({ ...formData, tasks: newTasks });
  };

  const updateTask = (index: number, field: 'title' | 'durationMinutes', value: string) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = {
      ...newTasks[index],
      [field]: field === 'durationMinutes' ? (value ? parseInt(value) : undefined) : value,
    };
    setFormData({ ...formData, tasks: newTasks });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="text-xl font-bold">Default Task Groups</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* List of groups */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Existing Groups</h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{group.title}</p>
                      <p className="text-xs text-muted-foreground">{group.tasks.length} tasks</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditGroup(group)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit / Create form */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {editingGroupId ? 'Edit Group' : 'Create Group'}
            </h4>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Inspection PMS for Toyota Vios"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <div>
                <Label>Tasks</Label>
                <div className="space-y-2 mt-2">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                        placeholder="Task title"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={task.durationMinutes || ''}
                        onChange={(e) => updateTask(index, 'durationMinutes', e.target.value)}
                        placeholder="Min"
                        className="w-20"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeTask(index)}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTask}>
                    <Plus className="w-4 h-4 mr-1" /> Add Task
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGroup}>
                  {editingGroupId ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}