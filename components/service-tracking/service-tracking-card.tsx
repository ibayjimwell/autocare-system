import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/status-badge";
import { ChevronRight, Clock, User, Wrench } from "lucide-react";

const TRACKING_STATUSES = ["PENDING", "UNDER_INSPECTION", "WAITING_FOR_APPROVAL", "IN_PROGRESS", "COMPLETED"];

export default function ServiceTrackingCard({ appointment, onClick }) {
  const statusIdx = TRACKING_STATUSES.indexOf(appointment.status);

  return (
    <Card className="hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold truncate">{appointment.customerName || "Customer"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{appointment.vehiclePlate}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <StatusBadge status={appointment.status || "PENDING"} />
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointment.serviceName && (
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{appointment.serviceName}</span>
          </div>
        )}
        {appointment.staffName && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{appointment.staffName}</span>
          </div>
        )}
        {appointment.appointmentTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">{appointment.appointmentDate} · {appointment.appointmentTime}</span>
          </div>
        )}
        <div>
          <div className="flex items-center gap-1 mb-1">
            {TRACKING_STATUSES.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`w-2 h-2 rounded-full transition-colors ${statusIdx >= i ? "bg-primary" : "bg-muted"}`} />
                {i < TRACKING_STATUSES.length - 1 && (
                  <div className={`flex-1 h-0.5 transition-colors ${statusIdx > i ? "bg-primary" : "bg-muted"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Step {Math.max(statusIdx + 1, 1)} of {TRACKING_STATUSES.length} · {(appointment.status || "PENDING").replace(/_/g, " ")}
          </p>
        </div>
        {appointment.notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2 truncate">{appointment.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}