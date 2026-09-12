'use client';

import React from 'react';

import {
  Badge,
} from '@/components/ui/badge';

interface AppointmentSectionHeaderProps {
  number: string;
  title: string;
  description?: string;
  enabled?: boolean;
  live?: boolean;
}

export default function AppointmentSectionHeader({
  number,
  title,
  description,
  enabled = true,
  live = false,
}: AppointmentSectionHeaderProps) {
  return (
    <div
      className={[
        'flex items-start justify-between gap-4',
        !enabled &&
          'opacity-50',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="pt-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
          {number}
        </span>

        <div className="min-w-0">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {live &&
        enabled && (
          <Badge
            variant="outline"
            className="
              shrink-0
              rounded-full
              border-primary/20
              bg-primary/5
              px-2
              py-0.5
              text-[9px]
              font-semibold
              uppercase
              tracking-wide
              text-primary
            "
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            Live
          </Badge>
        )}
    </div>
  );
}