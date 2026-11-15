'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatDurationMinutes } from '@/app-utils/services/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import {
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Pencil,
  PlayCircle,
  TimerReset,
  Settings,
  Trash2,
} from 'lucide-react';

import ConfirmationDialog from '@/components/shared/confimation-dialog';

interface TaskCardProps {
  task: any;
  onUpdate: (taskId: string, status: string) => Promise<boolean>;
  onDelete: (taskId: string) => void;
  onEdit: () => void;
  appointmentId: string;
  isInProgress: boolean;
  taskPhase: 'INSPECTION' | 'WORK';
  onExtended: () => void | Promise<void>;
  promptAllowed: boolean;
}

export default function TaskCard({
  task,
  onUpdate,
  onDelete,
  onEdit,
  appointmentId,
  isInProgress,
  taskPhase,
  onExtended,
  promptAllowed,
}: TaskCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [markDoneConfirmOpen, setMarkDoneConfirmOpen] =
    useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState('15');
  const [extending, setExtending] = useState(false);
  const [finishingExpired, setFinishingExpired] = useState(false);
  const [expiredExtraMinutes, setExpiredExtraMinutes] = useState('15');
  const baseDuration = Number(task.durationMinutes) || 0;
  const extensionMinutes = Number(task.extensionMinutes) || 0;
  const duration = baseDuration + extensionMinutes;

  const extend = async (fromExpiredModal = false) => {
    const additionalMinutes = Number(fromExpiredModal ? expiredExtraMinutes : extraMinutes);
    if (!Number.isInteger(additionalMinutes) || additionalMinutes < 5 || additionalMinutes > 240) {
      toast.error('Enter a whole number between 5 and 240 minutes.');
      return;
    }
    setExtending(true);
    try {
      const route = taskPhase === 'INSPECTION' ? 'inspection-tasks' : 'work-tasks';
      const response = await fetch(`/api/service-tracking/${route}/${encodeURIComponent(task.id)}/extend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalMinutes }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.errorMessage || 'Unable to extend task.');
      toast.success(result.message || 'Estimated duration extended.');
      setExtendOpen(false);
      await onExtended();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to extend task.');
    } finally { setExtending(false); }
  };

  useEffect(() => {
    if (task.status !== 'IN_PROGRESS' || !task.startedAt) {
      setElapsed(0);
      return;
    }
    const started = new Date(task.startedAt).getTime();
    if (!Number.isFinite(started)) return;
    const update = () => setElapsed(Math.max(0, Date.now() - started));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [task.status, task.startedAt]);

  const elapsedMinutes = elapsed / 60000;
  const startedMs = task.startedAt ? new Date(task.startedAt).getTime() : NaN;
  const finishedMs = task.completedAt ? new Date(task.completedAt).getTime() : NaN;
  const hasRecordedFinish = task.status === 'DONE' && baseDuration > 0 &&
    Number.isFinite(startedMs) && Number.isFinite(finishedMs) && finishedMs >= startedMs;
  const finishedMinutes = hasRecordedFinish ? (finishedMs - startedMs) / 60000 : null;
  // Completed tasks use their ORIGINAL estimate, even if their duration was extended.
  // Active tasks use their current effective estimate to decide when Extend appears.
  const finishedPercent = finishedMinutes === null ? null : finishedMinutes / baseDuration * 100;
  const finishedEarly = finishedPercent !== null && finishedPercent < 80;
  const progressPercent = task.status === 'DONE'
    ? (finishedPercent === null ? 0 : Math.min(100, Math.round(finishedPercent)))
    : task.status === 'PENDING' || duration <= 0 ? 0
      : Math.min(100, Math.floor(elapsedMinutes / duration * 100));
  const nearFinish = task.status === 'IN_PROGRESS' && duration > 0 && elapsedMinutes >= duration * 0.8;
  const effectiveRemaining = Math.max(0, Math.ceil(duration - elapsedMinutes));

  const isActive = task.status === 'IN_PROGRESS';
  const isDone = task.status === 'DONE';
  const expiredNeedsDecision = promptAllowed && isActive && duration > 0 &&
    elapsed >= duration * 60_000;
  const availableExtension = Math.max(0, 1440 - extensionMinutes);
  const canExtendExpired = availableExtension >= 5;

  const finishExpiredTask = async () => {
    if (finishingExpired || extending || !expiredNeedsDecision) return;
    setFinishingExpired(true);
    try {
      const saved = await onUpdate(task.id, 'DONE');
      if (saved) toast.success(`Finished "${task.title}".`);
      // A rejected API call keeps the task IN_PROGRESS and the prompt open.
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to finish task.');
    } finally {
      setFinishingExpired(false);
    }
  };


  return (
    <>
      <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-none transition-shadow hover:shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={[
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                    isDone
                      ? 'bg-green-500/10 text-green-600'
                      : isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive ? (
                    <Settings className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3
                    className={[
                      'text-sm font-semibold leading-5',
                      isDone
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground',
                    ].join(' ')}
                  >
                    {task.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className="h-5 rounded-md px-1.5 text-[10px]"
                    >
                      {isDone
                        ? 'Completed'
                        : isActive
                          ? 'In Progress'
                          : 'Pending'}
                    </Badge>

                    {duration && (
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDurationMinutes(duration)}
                      </Badge>
                    )}

                    {extensionMinutes > 0 && (
                      <Badge variant="outline" className="h-5 rounded-md border-amber-300 px-1.5 text-[10px] text-amber-700">
                        Extended · Delay
                      </Badge>
                    )}
                    {isDone && finishedEarly && extensionMinutes === 0 && (
                      <Badge variant="outline" className="h-5 rounded-md border-green-300 px-1.5 text-[10px] text-green-700">
                        Finished early
                      </Badge>
                    )}
                    {isDone && extensionMinutes === 0 && !finishedEarly && finishedPercent !== null && (
                      <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                        Completed · Not early
                      </Badge>
                    )}
                    {isDone && extensionMinutes === 0 && finishedPercent === null && (
                      <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                        Completion timing unavailable
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!isDone && (
                  <>
                    {task.status === 'PENDING' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setStartDialogOpen(true)}
                        className="h-11 rounded-md px-3 md:h-9"
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start
                      </Button>
                    )}

                    {task.status === 'IN_PROGRESS' && nearFinish && extensionMinutes < 1440 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setExtendOpen(true)} className="h-11 rounded-md px-3 md:h-9">
                        <TimerReset className="mr-1 h-4 w-4" /> Extend
                      </Button>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          setMarkDoneConfirmOpen(true)
                        }
                        className="h-11 rounded-md bg-green-600 px-3 text-white hover:bg-green-700 md:h-9"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Finish
                      </Button>
                    )}
                  </>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={onEdit}
                  className="h-11 w-11 rounded-md md:h-9 md:w-9"
                  aria-label="Edit task"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                {task.status === 'PENDING' && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="h-11 w-11 rounded-md text-destructive hover:text-destructive md:h-9 md:w-9"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress */}
            {duration && (
              <div className="rounded-md bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                  <span>{isDone ? 'Original estimated time used' : 'Estimated time elapsed (not task completion)'}</span>
                  <span>{isDone ? (finishedPercent === null ? 'Unknown' : `${Math.round(finishedPercent)}%`) : `${progressPercent}%`}</span>
                </div>

                <p className="mb-2 text-xs text-muted-foreground">
                  Original estimate {formatDurationMinutes(baseDuration)}
                  {extensionMinutes > 0 ? ` · Extended +${formatDurationMinutes(extensionMinutes)}` : ''}
                  {task.status === 'IN_PROGRESS'
                    ? ` · Elapsed ${Math.floor(elapsedMinutes)} min · ${effectiveRemaining ? `About ${effectiveRemaining} min remaining` : 'Estimated time reached'}`
                    : task.status === 'DONE' && task.startedAt && task.completedAt
                      ? ` · Finished in ${Math.round(finishedMinutes ?? 0)} min${finishedEarly ? ' (early)' : ''}`
                      : ''}
                </p>
                {isActive && progressPercent >= 100 && (
                  <p role="status" className="mb-2 text-xs font-semibold text-amber-700">
                    Estimated time reached. This task is still In Progress until staff choose Finish or Extend.
                  </p>
                )}
                {(!isDone || finishedPercent !== null) && (
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Findings */}
            {task.findings && task.findings.length > 0 && (
              <>
                <Separator />

                <div className="space-y-3">
                  {task.findings.map(
                    (f: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-md border border-border bg-muted/20 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Finding
                            </p>

                            <p className="mt-1 text-xs leading-5 text-foreground">
                              {f.description}
                            </p>
                          </div>
                        </div>

                        {f.products?.length > 0 && (
                          <div className="mt-3 border-t border-border pt-3">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <Package className="h-3.5 w-3.5" />
                              Materials Used
                            </div>

                            <div className="space-y-1.5">
                              {f.products.map(
                                (p: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between gap-3 rounded-md bg-background px-2.5 py-2"
                                  >
                                    <span className="min-w-0 truncate text-xs">
                                      <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                        {p.quantity}x
                                      </span>
                                      {p.name}
                                    </span>

                                    <span className="shrink-0 font-mono text-xs">
                                      ₱
                                      {Number(
                                        p.priceAtTime
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Same elapsed clock as the progress bar: no independent prompt timer.
          Keep the dialog open until staff finish or extend the task. */}
      <Dialog open={expiredNeedsDecision} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-lg"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{task.title} is finished?</DialogTitle>
            <DialogDescription>
              The estimated duration is 100% used, but this task is still In Progress.
              Confirm it is finished or extend the estimated duration.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Estimated task time reached (100%).</p>
            <p className="mt-1">
              Original: {formatDurationMinutes(baseDuration)}
              {extensionMinutes > 0 ? ` · Extended: ${formatDurationMinutes(extensionMinutes)}` : ''}
            </p>
            <p className="mt-1 text-xs">The timer cannot decide if the actual work is complete.</p>
          </div>
          {canExtendExpired ? (
            <div className="space-y-2">
              <label htmlFor={`decision-extra-${task.id}`} className="text-sm font-medium">
                Additional estimated minutes (5–{Math.min(240, availableExtension)})
              </label>
              <Input
                id={`decision-extra-${task.id}`}
                type="number" min={5} max={Math.min(240, availableExtension)} step={1}
                value={expiredExtraMinutes}
                onChange={(event) => setExpiredExtraMinutes(event.target.value)}
                disabled={extending || finishingExpired}
              />
            </div>
          ) : <p className="text-sm text-amber-800">Maximum extension limit reached. Staff must resolve this task manually.</p>}
          <DialogFooter className="gap-2 sm:justify-end">
            {canExtendExpired && (
              <Button
                type="button" variant="outline" disabled={extending || finishingExpired}
                onClick={() => void extend(true)}
              >
                <TimerReset className="mr-2 h-4 w-4" />
                {extending ? 'Extending…' : 'Extend'}
              </Button>
            )}
            <Button
              type="button" className="bg-green-600 text-white hover:bg-green-700"
              disabled={finishingExpired || extending}
              onClick={() => void finishExpiredTask()}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {finishingExpired ? 'Finishing…' : 'Finish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend estimated task duration</DialogTitle>
            <DialogDescription>
              {task.title} is nearing the end of its current estimate. Add extra minutes without changing the original estimate or recorded start time. This may affect the projected service delay.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm font-medium" htmlFor={`extend-${task.id}`}>
            Additional minutes (5–240)
            <Input id={`extend-${task.id}`} type="number" min={5} max={240} step={5}
              value={extraMinutes} onChange={event => setExtraMinutes(event.target.value)} />
          </label>
          <p className="text-xs text-muted-foreground">Current: {formatDurationMinutes(duration)} · Original: {formatDurationMinutes(baseDuration)} · Total extension limit: 24 hours.</p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={extending} onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button type="button" disabled={extending} onClick={() => void extend()}>{extending ? 'Saving…' : 'Extend duration'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        title="Start Operation"
        description={`Begin working on "${task.title}"?`}
        onConfirm={() => {
          onUpdate(task.id, 'IN_PROGRESS');
          setStartDialogOpen(false);
        }}
        confirmText="Confirm Start"
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Task"
        description={`Delete "${task.title}"? This cannot be undone.`}
        onConfirm={() => {
          onDelete(task.id);
          setDeleteDialogOpen(false);
        }}
        confirmText="Delete Task"
        variant="destructive"
      />

      <ConfirmationDialog
        open={markDoneConfirmOpen}
        onOpenChange={setMarkDoneConfirmOpen}
        title="Complete Task"
        description={`Mark "${task.title}" as completed?`}
        onConfirm={() => {
          onUpdate(task.id, 'DONE');
          setMarkDoneConfirmOpen(false);
        }}
        confirmText="Mark as Completed"
      />
    </>
  );
}