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
  ClipboardCheck,
  Clock3,
  Send,
  UserRound,
} from 'lucide-react';

function formatDateTime(
  value: any
) {
  if (!value) {
    return 'Not recorded';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return date.toLocaleString(
    'en-PH',
    {
      dateStyle:
        'medium',
      timeStyle:
        'short',
    }
  );
}

function Person({
  person,
}: {
  person: any;
}) {
  if (!person) {
    return null;
  }

  if (
    typeof person ===
    'string'
  ) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <UserRound className="h-3 w-3 text-primary" />

        <span>
          {person}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <UserRound className="h-3 w-3 text-primary" />

      <span className="font-semibold text-foreground">
        {person.fullname ||
          person.name ||
          person.username ||
          'Unknown'}
      </span>

      {person.username &&
        person.fullname && (
          <span>
            @
            {
              person.username
            }
          </span>
        )}
    </div>
  );
}

function Milestone({
  icon,
  title,
  date,
  person,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  date?: any;
  person?: any;
  status?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>

            {status && (
              <Badge
                variant="outline"
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
              >
                {
                  status
                }
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm font-semibold text-foreground">
            {date
              ? formatDateTime(
                  date
                )
              : 'Not recorded'}
          </p>

          <Person
            person={
              person
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function AppointmentMilestonesCard({
  confirmationLog,
  inspectionLog,
  waitingApprovalLog,
  inProgressLog,
  completedLog,
  estimateSentAt,
  estimateSentBy,
  estimateApprovedAt,
  estimateApprovedBy,
  enabled,
}: {
  confirmationLog: any;
  inspectionLog: any;
  waitingApprovalLog: any;
  inProgressLog: any;
  completedLog: any;

  estimateSentAt?: any;
  estimateSentBy?: any;

  estimateApprovedAt?: any;
  estimateApprovedBy?: any;

  enabled: boolean;
}) {
  return (
    <Card
      className={[
        'rounded-xl border-border bg-card shadow-sm',
        !enabled &&
          'opacity-50',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Milestone
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            title="Appointment Confirmed"
            date={
              confirmationLog?.createdAt
            }
            person={
              confirmationLog?.staff
            }
            status={
              confirmationLog
                ?.toStatus
            }
          />

          <Milestone
            icon={
              <ClipboardCheck className="h-4 w-4" />
            }
            title="Inspection Started"
            date={
              inspectionLog?.createdAt
            }
            person={
              inspectionLog?.staff
            }
            status={
              inspectionLog
                ?.toStatus
            }
          />

          <Milestone
            icon={
              <Send className="h-4 w-4" />
            }
            title="Estimate Sent"
            date={
              estimateSentAt ||
              waitingApprovalLog?.createdAt
            }
            person={
              estimateSentBy
            }
            status={
              waitingApprovalLog
                ?.toStatus
            }
          />

          <Milestone
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            title="Estimate Approved"
            date={
              estimateApprovedAt ||
              inProgressLog?.createdAt
            }
            person={
              estimateApprovedBy ||
              inProgressLog?.staff
            }
            status={
              inProgressLog
                ?.toStatus
            }
          />

          <Milestone
            icon={
              <Clock3 className="h-4 w-4" />
            }
            title="Work Started"
            date={
              inProgressLog?.createdAt
            }
            person={
              inProgressLog?.staff
            }
            status={
              inProgressLog
                ?.toStatus
            }
          />

          <Milestone
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            title="Appointment Completed"
            date={
              completedLog?.createdAt
            }
            person={
              completedLog?.staff
            }
            status={
              completedLog
                ?.toStatus
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}