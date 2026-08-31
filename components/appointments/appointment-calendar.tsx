import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  Settings,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Same branching logic as before; class strings mapped to AutoCare HIG tokens
// so badge tints stay synchronized with the legend below.
const getCountBadgeClass = (count: number, isSelected: boolean): string => {
  if (count === 0) return "hidden";
  if (isSelected) return "bg-primary-foreground text-primary shadow-sm";
  if (count <= 2) return "bg-muted text-muted-foreground border border-border";
  if (count <= 4) return "bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-400";
  return "bg-destructive/15 text-destructive border border-destructive/30";
};

interface AppointmentCalendarProps {
  currentMonth: Date;
  onMonthChange: (direction: number) => void;
  appointments: any[];
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  onConfigureDate?: () => void;
  closedDates?: string[]; // YYYY-MM-DD strings
}

export default function AppointmentCalendar({
  currentMonth,
  onMonthChange,
  appointments,
  selectedDate,
  onDateClick,
  onConfigureDate,
  closedDates = [],
}: AppointmentCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = monthStart.getDay();

  // Count total non-cancelled appointments per date
  const countMap: Record<string, number> = {};
  // Count pending appointments per date
  const pendingCountMap: Record<string, number> = {};
  appointments.forEach((apt) => {
    if (apt.status !== "CANCELLED") {
      const dateKey = apt.appointmentDate;
      countMap[dateKey] = (countMap[dateKey] || 0) + 1;
    }
    if (apt.status === "PENDING") {
      const dateKey = apt.appointmentDate;
      pendingCountMap[dateKey] = (pendingCountMap[dateKey] || 0) + 1;
    }
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full p-4 md:p-6">
      {/* ---- Calendar header: month identity + navigation ---- */}
      <div className="mb-4 flex items-center justify-between gap-2 md:mb-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold leading-none tracking-tight text-foreground">
              {format(currentMonth, "MMMM")}
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {format(currentMonth, "yyyy")} Schedule
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onConfigureDate && (
            <Button
              variant="outline"
              size="icon"
              onClick={onConfigureDate}
              title="Configure selected date"
              aria-label="Configure selected date"
              className="h-11 w-11 rounded-md md:h-9 md:w-9"
            >
              <Settings className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          )}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMonthChange(-1)}
              aria-label="Previous month"
              className="h-11 w-11 rounded-[5px] md:h-9 md:w-9"
            >
              <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMonthChange(1)}
              aria-label="Next month"
              className="h-11 w-11 rounded-[5px] md:h-9 md:w-9"
            >
              <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Weekday labels ---- */}
      <div className="mb-2 grid grid-cols-7 gap-1.5 md:gap-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* ---- Day grid ---- */}
      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" aria-hidden="true" />
        ))}

        {daysInMonth.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const count = countMap[dateKey] || 0;
          const pendingCount = pendingCountMap[dateKey] || 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isClosed = closedDates.includes(dateKey);

          return (
            <button
              key={dateKey}
              onClick={() => onDateClick(day)}
              aria-pressed={!!isSelected}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-md border transition-all duration-200 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !isCurrentMonth && "opacity-30",
                isSelected
                  ? "z-10 border-primary bg-primary text-primary-foreground shadow-md"
                  : isClosed
                    ? "border-border/50 bg-muted/50"
                    : "border-transparent bg-card hover:border-border hover:bg-accent",
              )}
            >
              {/* Today marker */}
              {isToday && !isSelected && (
                <span className="absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}

              <span
                className={cn(
                  "text-sm font-semibold tabular-nums md:text-base",
                  isSelected
                    ? "text-primary-foreground"
                    : isClosed
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>

              {/* Pending count badge (top-right) */}
              {!isClosed && pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full border-2 border-card bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground shadow-sm">
                  {pendingCount}
                </span>
              )}

              {/* Total count / closed indicator (bottom-right) */}
              {isClosed ? (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <XCircle className="h-3 w-3" />
                </span>
              ) : (
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold",
                    getCountBadgeClass(count, !!isSelected),
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---- Legend ---- */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border pt-4 md:mt-6 md:pt-5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Shop Load Intensity
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-border bg-muted" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Busy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Peak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border-2 border-card bg-destructive" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-muted-foreground/40 bg-muted" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
}