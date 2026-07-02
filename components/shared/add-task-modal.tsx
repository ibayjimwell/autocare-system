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

          {/* Duration Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Duration (minutes, optional)
            </Label>
            <Input
              type="number"
              min="1"
              value={durationMinutes ?? ""}
              onChange={(e) =>
                setDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="e.g., 30"
              className="rounded-xl border-slate-200"
            />
            <p className="text-[10px] text-muted-foreground">
              Estimated time to complete this task.
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