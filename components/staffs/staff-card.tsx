// components/staffs/staff-card.tsx
import { UserCircle2, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface StaffData {
  fullname: string;
  username: string;
  role: string;
  statusLabel: string; // e.g. "Confirmed by:"
  date?: string;       // ISO date string from history log
}

interface StaffCardProps {
  staff: StaffData;
  className?: string;
}

export default function StaffCard({ staff, className }: StaffCardProps) {
  const formattedDate = staff.date
    ? format(parseISO(staff.date), "MMM dd, yyyy hh:mm a")
    : null;

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border/60 bg-gradient-to-br from-card to-muted/30 p-3 shadow-sm transition-all",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Avatar + Name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <UserCircle2 className="w-5 h-5 text-primary" />
            </div>
            {/* Status dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{staff.fullname}</p>
            <p className="text-xs text-muted-foreground">@{staff.username}</p>
          </div>
        </div>

        {/* Right: Status label + Role badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {staff.statusLabel}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-tight border border-primary/20">
            <Shield className="w-3 h-3" />
            {staff.role}
          </span>
        </div>
      </div>

      {/* Date at the bottom (if available) */}
      {formattedDate && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/70 border-t border-border/40 pt-2">
          <Clock className="w-3 h-3" />
          <span>{formattedDate}</span>
        </div>
      )}
    </div>
  );
}