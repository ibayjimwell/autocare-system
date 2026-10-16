'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X, Clock } from "lucide-react";
import { splitDurationMinutes, combineDurationMinutes, formatDurationMinutes } from "@/app-utils/services/helpers";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (title: string, durationMinutes?: number) => void;   // extended signature
  editingTask?: { id: string; title: string; durationMinutes?: number } | null;
  onEditTask?: (id: string, title: string, durationMinutes?: number) => void;
  isLoading?: boolean;
}

export default function AddTaskModal({
  open,
  onOpenChange,
  onAddTask,
  editingTask,
  onEditTask,
  isLoading = false,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDurationMinutes(editingTask.durationMinutes ?? undefined);
    } else {
      setTitle("");
      setDurationMinutes(undefined);
    }
  }, [editingTask, open]);

  const durationParts = splitDurationMinutes(durationMinutes);
  const updateDuration = (hours: unknown, minutes: unknown) => {
    const combined = combineDurationMinutes(hours, minutes);
    setDurationMinutes(combined || undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editingTask && onEditTask) {
      onEditTask(editingTask.id, title.trim(), durationMinutes);
    } else {
      onAddTask(title.trim(), durationMinutes);
    }
    setTitle("");
    setDurationMinutes(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">
            {editingTask ? "Edit Task" : "Add New Task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Task Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Check engine oil level"
              className="rounded-xl border-slate-200 h-12"
              autoFocus
            />
          </div>

          {/* Hours and minutes are converted into total minutes for the API. */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm font-semibold">
              <Clock className="h-4 w-4" /> Estimated Duration (optional)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="task-hours" className="mb-1 block text-xs text-muted-foreground">Hours</Label>
                <Input id="task-hours" type="number" min="0" step="1" inputMode="numeric"
                  value={durationMinutes === undefined ? '' : durationParts.hours}
                  onChange={(e) => updateDuration(e.target.value, durationParts.minutes)}
                  placeholder="0" className="h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="task-minutes" className="mb-1 block text-xs text-muted-foreground">Minutes (0–59)</Label>
                <Input id="task-minutes" type="number" min="0" max="59" step="1" inputMode="numeric"
                  value={durationMinutes === undefined ? '' : durationParts.minutes}
                  onChange={(e) => updateDuration(durationParts.hours, e.target.value)}
                  placeholder="30" className="h-11 rounded-xl" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {durationMinutes ? `Estimated: ${formatDurationMinutes(durationMinutes)}`
                : 'Leave both fields empty for a task without a time estimate.'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="font-bold"
            >
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingTask ? "Update Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}