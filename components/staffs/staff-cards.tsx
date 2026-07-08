// components/staffs/staff-cards.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { appointmentsApi } from '@/lib/appointments/appointments';
import StaffCard from './staff-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StaffCardsProps {
  appointmentId: string;
  className?: string;
}

const STATUS_LABEL_MAP: Record<string, string> = {
  CONFIRMED: 'Confirmed by:',
  UNDER_INSPECTION: 'Inspecting by:',
  WAITING_FOR_APPROVAL: 'Send by:',
  IN_PROGRESS: 'Working by:',
  COMPLETED: 'Completed by:',
  CANCELLED: 'Cancelled by:',
};

export default function StaffCards({ appointmentId, className }: StaffCardsProps) {
  const [staffEntries, setStaffEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await appointmentsApi.getHistory(appointmentId);
        if (res.error) {
          setStaffEntries([]);
          return;
        }
        const history = res.data || [];

        // Group by toStatus, collect all staff entries with their dates
        const statusMap: Record<string, any[]> = {};
        history.forEach((entry: any) => {
          const status = entry.toStatus;
          if (!statusMap[status]) statusMap[status] = [];
          if (entry.staff) {
            statusMap[status].push({
              ...entry.staff,
              statusLabel: STATUS_LABEL_MAP[status] || `${status}:`,
              date: entry.createdAt, // timestamp from the history log
            });
          }
        });

        // Flatten to a single list, keep only the most recent entry per staff‑status combination
        const entries: any[] = [];
        for (const status of Object.keys(statusMap)) {
          const staffList = statusMap[status];
          // Deduplicate by staff id, keeping the entry with the latest date
          const uniqueMap = new Map<string, any>();
          staffList.forEach((entry) => {
            const existing = uniqueMap.get(entry.id);
            if (!existing || new Date(entry.date) > new Date(existing.date)) {
              uniqueMap.set(entry.id, entry);
            }
          });
          entries.push(...Array.from(uniqueMap.values()));
        }
        setStaffEntries(entries);
      } catch (err) {
        console.error('Failed to fetch appointment history', err);
        setStaffEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }

  if (staffEntries.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {staffEntries.map((staff) => (
        <StaffCard key={`${staff.id}-${staff.statusLabel}`} staff={staff} />
      ))}
    </div>
  );
}