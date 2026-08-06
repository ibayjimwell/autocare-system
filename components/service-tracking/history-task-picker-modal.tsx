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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAllTaskHistory } from '@/hooks/service-tracking/useTaskHistory';
import { Search, Loader2, Car, User } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryTaskPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTasks: (tasks: Array<{ title: string; durationMinutes?: number }>) => Promise<void>;
  isAdding: boolean;
  phase: 'INSPECTION' | 'WORK'; // which phase to pick from
}

export default function HistoryTaskPickerModal({
  open,
  onOpenChange,
  onAddTasks,
  isAdding,
  phase,
}: HistoryTaskPickerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const { history, loading, loadHistory } = useAllTaskHistory(search, phase);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  useEffect(() => {
    // Reload when search changes (debounce)
    const timer = setTimeout(loadHistory, 300);
    return () => clearTimeout(timer);
  }, [search, loadHistory]);

  const handleToggleTask = (taskId: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setSelectedTaskIds(newSet);
  };

  const handleAddSelected = async () => {
    const selectedTasks = history
      .filter((item) => selectedTaskIds.has(item.id))
      .map((item) => ({
        title: item.title,
        durationMinutes: item.durationMinutes || undefined,
      }));
    if (selectedTasks.length === 0) {
      toast.warning('Please select at least one task.');
      return;
    }
    await onAddTasks(selectedTasks);
    setSelectedTaskIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-xl font-bold">Add Tasks from History</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tasks previously used in other appointments ({phase === 'INSPECTION' ? 'Inspection' : 'Repair'} phase)
          </p>
        </DialogHeader>

        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tasks found in history.
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`task-${item.id}`}
                    checked={selectedTaskIds.has(item.id)}
                    onCheckedChange={() => handleToggleTask(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`task-${item.id}`} className="font-medium cursor-pointer">
                      {item.title}
                      {item.durationMinutes && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({item.durationMinutes} min)
                        </span>
                      )}
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{item.customer?.fullname || 'Unknown Customer'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        <span>
                          {item.vehicle?.make} {item.vehicle?.model} ({item.vehicle?.plateNumber})
                        </span>
                      </div>
                      <div>
                        Used on: {item.appointmentDate ? format(new Date(item.appointmentDate), 'MMM d, yyyy') : 'N/A'}
                        {item.appointmentTime && ` at ${item.appointmentTime}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {item.phase === 'INSPECTION' ? 'Inspection' : 'Repair'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 border-t shrink-0 gap-2">
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