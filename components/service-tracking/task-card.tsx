'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Pencil,
  PlayCircle,
  Settings,
  Trash2,
} from 'lucide-react';

import ConfirmationDialog from '@/components/shared/confimation-dialog';

interface TaskCardProps {
  task: any;
  onUpdate: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: () => void;
  appointmentId: string;
  isInProgress: boolean;
}

export default function TaskCard({
  task,
  onUpdate,
  onDelete,
  onEdit,
  appointmentId,
  isInProgress,
}: TaskCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [markDoneConfirmOpen, setMarkDoneConfirmOpen] =
    useState(false);
  const [elapsed, setElapsed] = useState(0);

  const duration = task.durationMinutes;

  useEffect(() => {
    if (
      task.status !== 'IN_PROGRESS' ||
      !task.startedAt ||
      !duration
    ) {
      return;
    }

    const startTime = new Date(task.startedAt).getTime();
    const durationMs = duration * 60 * 1000;

    const update = () => {
      const now = Date.now();
      const diff = Math.min(durationMs, now - startTime);
      setElapsed(diff);
    };

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [task.status, task.startedAt, duration]);

  const progressPercent = (() => {
    if (task.status === 'DONE') return 100;
    if (task.status === 'PENDING' || !duration) return 0;

    return Math.min(
      100,
      Math.round(
        (elapsed / (duration * 60 * 1000)) * 100
      )
    );
  })();

  const isActive = task.status === 'IN_PROGRESS';
  const isDone = task.status === 'DONE';

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
                        {duration} min
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
              </div>
            </div>

            {/* Progress */}
            {duration && (
              <div className="rounded-md bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
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