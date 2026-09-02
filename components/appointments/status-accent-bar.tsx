'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const BAR_COLOR_CONFIG: Record<
  string,
  string
> = {
  PENDING: 'bg-red-500',
  CONFIRMED: 'bg-red-600',
  UNDER_INSPECTION: 'bg-blue-500',
  WAITING_FOR_APPROVAL: 'bg-yellow-500',
  WAITING_APPROVAL: 'bg-yellow-500',
  PENDING_APPROVAL: 'bg-yellow-500',
  IN_PROGRESS: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-500',
  APPROVED: 'bg-green-500',
  PAID: 'bg-green-600',
  ESTIMATE: 'bg-blue-500',
  FINAL: 'bg-green-500',
};

interface StatusAccentBarProps {
  status: string;
  className?: string;
}

export default function StatusAccentBar({
  status,
  className,
}: StatusAccentBarProps) {
  const lookupKey =
    (status || '').toUpperCase();

  const barColorClass =
    BAR_COLOR_CONFIG[lookupKey] ||
    'bg-primary';

  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-0 h-[3px]',
        'opacity-100 transition-opacity duration-200',
        barColorClass,
        className,
      )}
    />
  );
}