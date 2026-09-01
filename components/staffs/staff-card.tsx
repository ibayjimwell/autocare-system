'use client';

import {
  UserCircle2,
  Clock,
  Shield,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  format,
  parseISO,
} from 'date-fns';

interface StaffData {
  fullname: string;
  username: string;
  role: string;
  statusLabel: string;
  date?: string;
}

interface StaffCardProps {
  staff: StaffData;
  className?: string;
}

export default function StaffCard({
  staff,
  className,
}: StaffCardProps) {
  const formattedDate = staff.date
    ? format(
        parseISO(staff.date),
        'MMM dd, yyyy hh:mm a'
      )
    : null;

  return (
    <div
      className={cn(
        `
        w-full rounded-lg
        border border-border
        bg-card p-3
        shadow-sm transition-colors
        `,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="
                flex h-10 w-10
                items-center justify-center
                rounded-full
                bg-primary/10
                ring-1 ring-primary/10
              "
            >
              <UserCircle2 className="h-5 w-5 text-primary" />
            </div>

            <span
              className="
                absolute -bottom-0.5 -right-0.5
                h-3 w-3 rounded-full
                border-2 border-card
                bg-emerald-500
              "
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {staff.fullname}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              @{staff.username}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {staff.statusLabel}
          </span>

          <span
            className="
              inline-flex items-center gap-1
              rounded-full
              border border-primary/20
              bg-primary/5
              px-2 py-0.5
              text-[10px]
              font-semibold uppercase
              tracking-tight text-primary
            "
          >
            <Shield className="h-3 w-3" />
            {staff.role}
          </span>
        </div>
      </div>

      {formattedDate && (
        <div
          className="
            mt-2 flex items-center gap-1.5
            border-t border-border
            pt-2
            text-[10px]
            text-muted-foreground
          "
        >
          <Clock className="h-3 w-3" />
          <span>{formattedDate}</span>
        </div>
      )}
    </div>
  );
}