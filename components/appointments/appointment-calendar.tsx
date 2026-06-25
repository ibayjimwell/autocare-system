
// =============================================================================
// /components/appointments/AppointmentCalendar.jsx
//
// Reusable calendar component that visualises appointment density.
// It is purely presentational – all appointment data and date selection
// are passed via props. No API calls are required.
// =============================================================================

import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Utility to determine the badge style based on the number of appointments
 * and whether the day is selected.
 */
const getCountBadgeClass = (count, isSelected) => {
  if (count === 0) return "hidden";
  if (isSelected) return "bg-white text-primary shadow-sm";
  if (count <= 2) return "bg-slate-100 text-slate-600 border border-slate-200";
  if (count <= 4) return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-red-100 text-red-600 border border-red-200 animate-pulse-subtle";
};

export default function AppointmentCalendar({
  currentMonth,
  onMonthChange,
  appointments,
  selectedDate,
  onDateClick,
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = monthStart.getDay(); // 0 = Sunday

  // Build a count map of non-cancelled appointments per date
  const countMap = {};
  appointments.forEach((apt) => {
    if (apt.status !== "CANCELLED") {
      const dateKey = apt.appointmentDate;
      countMap[dateKey] = (countMap[dateKey] || 0) + 1;
    }
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-[2rem] p-5 md:p-8 w-full transition-all duration-300">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {format(currentMonth, "MMMM")}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
              {format(currentMonth, "yyyy")} Schedule
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(-1)}
            className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-500 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(1)}
            className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-500 active:scale-90 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* ---------- Weekday Labels ---------- */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
          >
            {day}
          </div>
        ))}
      </div>

      {/* ---------- Date Grid ---------- */}
      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {/* Empty cells for alignment */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square opacity-0 pointer-events-none"
          />
        ))}

        {daysInMonth.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const count = countMap[dateKey] || 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dateKey}
              onClick={() => onDateClick(day)}
              className={cn(
                "relative group aspect-square rounded-[1.25rem] transition-all duration-300",
                "flex flex-col items-center justify-center border-2",
                "active:scale-95",
                !isCurrentMonth && "opacity-20",
                isSelected
                  ? "bg-primary border-primary text-white shadow-xl shadow-primary/30 z-10 scale-105"
                  : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
              )}
            >
              {/* Today indicator */}
              {isToday && !isSelected && (
                <span className="absolute top-2 w-1 h-1 bg-primary rounded-full" />
              )}

              <span
                className={cn(
                  "text-sm md:text-lg font-black tracking-tighter transition-colors",
                  isSelected ? "text-white" : "text-slate-800"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Appointment count badge */}
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 text-[9px] w-5 h-5 rounded-lg flex items-center justify-center font-black",
                  getCountBadgeClass(count, isSelected)
                )}
              >
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* ---------- Legend ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-10 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2 text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Shop Load Intensity
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Available
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Busy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Peak
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}