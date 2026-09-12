'use client';

import React from 'react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Badge,
} from '@/components/ui/badge';

import {
  CheckCircle2,
  Clock3,
  ListChecks,
  PlayCircle,
  Settings,
} from 'lucide-react';

function getStatusLabel(
  status: any
) {
  switch (
    String(
      status || ''
    ).toUpperCase()
  ) {
    case 'DONE':
      return 'Completed';

    case 'IN_PROGRESS':
      return 'In Progress';

    case 'PENDING':
      return 'Pending';

    default:
      return status ||
        'Unknown';
  }
}

function StatusIcon({
  status,
}: {
  status: any;
}) {
  switch (
    String(
      status || ''
    ).toUpperCase()
  ) {
    case 'DONE':
      return (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      );

    case 'IN_PROGRESS':
      return (
        <Settings className="h-4 w-4 animate-spin text-primary" />
      );

    default:
      return (
        <PlayCircle className="h-4 w-4 text-muted-foreground" />
      );
  }
}

function getStatusClass(
  status: any
) {
  switch (
    String(
      status || ''
    ).toUpperCase()
  ) {
    case 'DONE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'IN_PROGRESS':
      return 'border-primary/20 bg-primary/5 text-primary';

    default:
      return 'border-border bg-muted/30 text-muted-foreground';
  }
}

export default function AppointmentTasksCard({
  title,
  tasks,
  enabled,
}: {
  title: string;
  tasks: any[];
  enabled: boolean;
}) {
  return (
    <Card
      className={[
        'overflow-hidden rounded-xl border-border bg-card shadow-sm',
        !enabled &&
          'opacity-50',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CardContent className="p-0">
        {tasks.length ===
        0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No {title.toLowerCase()} have been recorded.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map(
              (
                task,
                index
              ) => (
                <div
                  key={
                    task?.id ||
                    index
                  }
                  className="flex items-start gap-3 p-4 sm:p-5"
                >
                  <div className="mt-0.5">
                    <StatusIcon
                      status={
                        task?.status
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {task?.title ||
                          'Task'}
                      </h4>

                      <Badge
                        variant="outline"
                        className={[
                          'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                          getStatusClass(
                            task?.status
                          ),
                        ].join(' ')}
                      >
                        {getStatusLabel(
                          task?.status
                        )}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {task?.durationMinutes !==
                        undefined &&
                        task?.durationMinutes !==
                          null && (
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />

                            {
                              task.durationMinutes
                            }{' '}
                            min
                          </span>
                        )}

                      {task?.startedAt && (
                        <span>
                          Started:{' '}
                          {new Date(
                            task.startedAt
                          ).toLocaleString(
                            'en-PH',
                            {
                              dateStyle:
                                'medium',
                              timeStyle:
                                'short',
                            }
                          )}
                        </span>
                      )}

                      {task?.completedAt && (
                        <span>
                          Completed:{' '}
                          {new Date(
                            task.completedAt
                          ).toLocaleString(
                            'en-PH',
                            {
                              dateStyle:
                                'medium',
                              timeStyle:
                                'short',
                            }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}