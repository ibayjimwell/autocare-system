'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, TimerReset } from 'lucide-react';
import { toast } from 'sonner';
import { isTaskDecisionDue } from '@/lib/service-journey/task-decision';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Task = {
  id: string;
  title: string;
  status: string;
  startedAt?: string | Date | null;
  durationMinutes?: number | null;
  extensionMinutes?: number | null;
};

type Props = {
  tasks: Task[];
  taskPhase: 'INSPECTION' | 'WORK';
  onFinish: (taskId: string) => Promise<boolean>;
  onExtended: () => Promise<void>;
};

/**
 * One staff decision dialog at a time, even if multiple task timers expire.
 * Expiring a time estimate is NOT proof that the work is completed.
 * Dismissal snoozes just that task for one minute, rather than silently
 * completing it or allowing multiple overlapping modal dialogs.
 */
export default function TaskTimerDecision({ tasks, taskPhase, onFinish, onExtended }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [extraMinutes, setExtraMinutes] = useState('15');
  const [busy, setBusy] = useState(false);
  const snoozedUntilRef = useRef(new Map<string, number>());

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNowMs(Date.now()); };
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const dueTasks = useMemo(
    () => tasks.filter(task => isTaskDecisionDue(task, nowMs)),
    [tasks, nowMs],
  );

  const activeTask = dueTasks.find(task => task.id === activeId) ?? null;

  useEffect(() => {
    if (busy) return;
    if (activeId && activeTask) return;
    const next = dueTasks.find(task => (snoozedUntilRef.current.get(task.id) ?? 0) <= nowMs);
    setActiveId(next?.id ?? null);
    if (next) setExtraMinutes('15');
  }, [activeId, activeTask, busy, dueTasks, nowMs]);

  const snooze = (taskId: string, milliseconds = 60_000) => {
    snoozedUntilRef.current.set(taskId, Date.now() + milliseconds);
    setActiveId(null);
  };

  const finish = async () => {
    if (!activeTask || busy) return;
    setBusy(true);
    try {
      const ok = await onFinish(activeTask.id);
      if (ok) {
        snooze(activeTask.id);
        toast.success(`Finished "${activeTask.title}".`);
      }
      // A failed update leaves the dialog open so staff can retry or extend.
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to finish task.');
    } finally {
      setBusy(false);
    }
  };

  const extend = async () => {
    if (!activeTask || busy) return;
    const minutes = Number(extraMinutes);
    const existing = Number(activeTask.extensionMinutes || 0);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240 || existing + minutes > 1440) {
      toast.error('Enter 5–240 whole minutes without exceeding 24 hours of total extensions.');
      return;
    }
    setBusy(true);
    try {
      const route = taskPhase === 'INSPECTION' ? 'inspection-tasks' : 'work-tasks';
      const response = await fetch(`/api/service-tracking/${route}/${encodeURIComponent(activeTask.id)}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalMinutes: minutes }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.errorMessage || 'Unable to extend task.');
      // Refresh the authoritative task list so the timer, Mobile API and Web UI agree.
      await onExtended();
      snooze(activeTask.id);
      toast.success(`Extended "${activeTask.title}" by ${minutes} minutes.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to extend task.');
    } finally {
      setBusy(false);
    }
  };

  const maxExtension = activeTask ? Math.max(0, 1440 - Number(activeTask.extensionMinutes || 0)) : 0;

  return (
    <Dialog open={Boolean(activeTask)} onOpenChange={open => {
      if (!open && activeTask && !busy) snooze(activeTask.id);
    }}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={event => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Task estimated time reached
          </DialogTitle>
          <DialogDescription>
            The progress bar for <strong>{activeTask?.title}</strong> has reached 100% of its estimated time.
            The task is still In Progress. Choose whether the actual work is finished or needs more time.
          </DialogDescription>
        </DialogHeader>

        {activeTask ? (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-medium"><Clock3 className="h-4 w-4" /> Estimated time exhausted</div>
            <p>Original: {Number(activeTask.durationMinutes || 0)} minutes · Extended: {Number(activeTask.extensionMinutes || 0)} minutes</p>
            <p className="text-xs">A full timer never finishes a task automatically. Finish records the actual completion time; Extend adds time to the existing estimate.</p>
          </div>
        ) : null}

        {maxExtension >= 5 ? (
          <div className="space-y-2">
            <label htmlFor="timed-task-extension" className="text-sm font-medium">Additional duration (minutes)</label>
            <Input id="timed-task-extension" type="number" min={5} max={Math.min(240, maxExtension)} step={1}
              value={extraMinutes} onChange={event => setExtraMinutes(event.target.value)} disabled={busy} />
          </div>
        ) : (
          <p className="text-sm text-amber-700">The 24-hour extension limit has been reached. You can finish the task when work is complete, or choose Remind me later.</p>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button type="button" variant="ghost" disabled={busy || !activeTask} onClick={() => activeTask && snooze(activeTask.id)}>
            Remind me in 1 minute
          </Button>
          {maxExtension >= 5 && (
            <Button type="button" variant="outline" disabled={busy || !activeTask} onClick={() => void extend()}>
              <TimerReset className="mr-2 h-4 w-4" /> {busy ? 'Saving…' : 'Extend'}
            </Button>
          )}
          <Button type="button" disabled={busy || !activeTask} className="bg-green-600 text-white hover:bg-green-700" onClick={() => void finish()}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> {busy ? 'Saving…' : 'Finish task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
