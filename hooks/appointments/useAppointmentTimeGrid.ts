'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  format,
} from 'date-fns';

interface TimeSlot {
  time: string;
  available?: boolean;
}

interface TimeGridAppointment {
  id: string;
  appointment: any;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columns: number;
}

interface UseAppointmentTimeGridOptions {
  selectedDate: Date;
  appointments: any[];
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parts = value.split(':').map(Number);

  if (parts.length < 2) {
    return null;
  }

  const [hour, minute] = parts;

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function parseTimeLabel(value: string): string {
  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return value;
  }

  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

function getAppointmentDurationMinutes(appointment: any): number {
  const directCandidates = [
    appointment?.durationMinutes,
    appointment?.estimatedDuration,
    appointment?.totalDuration,
  ];

  for (const candidate of directCandidates) {
    const value = Number(candidate);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  if (Array.isArray(appointment?.services)) {
    const serviceDuration = appointment.services.reduce(
      (sum: number, service: any) => {
        const duration = Number(
          service?.estimatedDuration ??
            service?.durationMinutes ??
            0,
        );

        return Number.isFinite(duration)
          ? sum + Math.max(0, duration)
          : sum;
      },
      0,
    );

    if (serviceDuration > 0) {
      return serviceDuration;
    }
  }

  /*
   * Appointments without duration metadata still receive one 30-minute
   * visual cell so they remain visible in the schedule. No database value
   * is changed by this fallback.
   */
  return 30;
}

function calculateOverlapColumns(
  appointments: Array<{
    id: string;
    appointment: any;
    startMinutes: number;
    endMinutes: number;
  }>,
): TimeGridAppointment[] {
  if (appointments.length === 0) {
    return [];
  }

  const sorted = [...appointments].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }

    if (a.endMinutes !== b.endMinutes) {
      return a.endMinutes - b.endMinutes;
    }

    return a.id.localeCompare(b.id);
  });

  const result: TimeGridAppointment[] = [];
  let group: typeof sorted = [];
  let groupEnd = -Infinity;

  const flushGroup = () => {
    if (group.length === 0) {
      return;
    }

    const columnEnds: number[] = [];
    const assignments = new Map<string, number>();

    for (const item of group) {
      let assignedColumn = -1;

      for (let column = 0; column < columnEnds.length; column += 1) {
        if (columnEnds[column] <= item.startMinutes) {
          assignedColumn = column;
          break;
        }
      }

      if (assignedColumn === -1) {
        assignedColumn = columnEnds.length;
        columnEnds.push(item.endMinutes);
      } else {
        columnEnds[assignedColumn] = item.endMinutes;
      }

      assignments.set(item.id, assignedColumn);
    }

    const columnCount = Math.max(1, columnEnds.length);

    for (const item of group) {
      result.push({
        ...item,
        column: assignments.get(item.id) ?? 0,
        columns: columnCount,
      });
    }

    group = [];
    groupEnd = -Infinity;
  };

  for (const item of sorted) {
    if (
      group.length > 0 &&
      item.startMinutes >= groupEnd
    ) {
      flushGroup();
    }

    group.push(item);
    groupEnd = Math.max(groupEnd, item.endMinutes);
  }

  flushGroup();

  return result.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }

    return a.id.localeCompare(b.id);
  });
}

export function useAppointmentTimeGrid({
  selectedDate,
  appointments,
}: UseAppointmentTimeGridOptions) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [openingTime, setOpeningTime] = useState<string | null>(null);
  const [closingTime, setClosingTime] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedDateKey = useMemo(
    () => format(selectedDate, 'yyyy-MM-dd'),
    [selectedDate],
  );

  useEffect(() => {
    let cancelled = false;

    const loadTimeGrid = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/appointments/available-slots?date=${encodeURIComponent(
            selectedDateKey,
          )}`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: {
              Accept: 'application/json',
            },
          },
        );

        const text = await response.text();

        let data: any;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(
            'The appointment time service returned an invalid response.',
          );
        }

        if (!response.ok || data?.error) {
          throw new Error(
            data?.errorMessage ||
              data?.message ||
              'Unable to load appointment times.',
          );
        }

        if (cancelled) {
          return;
        }

        setTimeSlots(
          Array.isArray(data?.data)
            ? data.data
            : [],
        );

        setOpeningTime(
          typeof data?.openingTime === 'string'
            ? data.openingTime
            : null,
        );

        setClosingTime(
          typeof data?.closingTime === 'string'
            ? data.closingTime
            : null,
        );

        setClosedReason(
          typeof data?.message === 'string' &&
            data?.data?.length === 0
            ? data.message
            : null,
        );
      } catch (requestError: any) {
        if (cancelled) {
          return;
        }

        console.error(
          '[useAppointmentTimeGrid] Failed to load time grid:',
          requestError,
        );

        setTimeSlots([]);
        setOpeningTime(null);
        setClosingTime(null);
        setClosedReason(null);
        setError(
          requestError?.message ||
            'Unable to load appointment times.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTimeGrid();

    return () => {
      cancelled = true;
    };
  }, [selectedDateKey]);

  const gridStartMinutes = useMemo(() => {
    if (timeSlots.length > 0) {
      return parseTimeToMinutes(timeSlots[0].time) ?? 0;
    }

    return parseTimeToMinutes(openingTime) ?? 0;
  }, [timeSlots, openingTime]);

  const gridEndMinutes = useMemo(() => {
    if (timeSlots.length > 0) {
      const lastSlot = timeSlots[timeSlots.length - 1];
      const lastStart = parseTimeToMinutes(lastSlot.time) ?? gridStartMinutes;
      return Math.max(
        lastStart + 30,
        parseTimeToMinutes(closingTime) ?? lastStart + 30,
      );
    }

    return (
      parseTimeToMinutes(closingTime) ??
      gridStartMinutes + 30
    );
  }, [timeSlots, closingTime, gridStartMinutes]);

  const dateAppointments = useMemo(() => {
    return appointments
      .filter((appointment: any) => {
        if (
          appointment?.status === 'CANCELLED' ||
          !appointment?.appointmentDate ||
          !appointment?.appointmentTime
        ) {
          return false;
        }

        return appointment.appointmentDate === selectedDateKey;
      })
      .map((appointment: any) => {
        const start = parseTimeToMinutes(
          appointment.appointmentTime,
        );

        if (start === null) {
          return null;
        }

        const duration = getAppointmentDurationMinutes(
          appointment,
        );

        return {
          id: String(
            appointment?.id ??
              `${selectedDateKey}-${appointment.appointmentTime}`,
          ),
          appointment,
          startMinutes: start,
          endMinutes: start + duration,
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          appointment: any;
          startMinutes: number;
          endMinutes: number;
        } => Boolean(item),
      );
  }, [appointments, selectedDateKey]);

  const appointmentBlocks = useMemo(() => {
    const visibleAppointments = dateAppointments
      .map(item => {
        const startMinutes = Math.max(
          item.startMinutes,
          gridStartMinutes,
        );

        const endMinutes = Math.min(
          item.endMinutes,
          gridEndMinutes,
        );

        if (endMinutes <= gridStartMinutes || startMinutes >= gridEndMinutes) {
          return null;
        }

        return {
          ...item,
          startMinutes,
          endMinutes: Math.max(
            startMinutes + 30,
            endMinutes,
          ),
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          appointment: any;
          startMinutes: number;
          endMinutes: number;
        } => Boolean(item),
      );

    return calculateOverlapColumns(
      visibleAppointments,
    );
  }, [
    dateAppointments,
    gridStartMinutes,
    gridEndMinutes,
  ]);

  return {
    selectedDateKey,
    timeSlots,
    appointmentBlocks,
    openingTime,
    closingTime,
    closedReason,
    gridStartMinutes,
    gridEndMinutes,
    loading,
    error,
    formatTimeLabel: parseTimeLabel,
  };
}
