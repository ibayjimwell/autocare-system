'use client';

import React, { useState, useEffect } from "react";
import PageContainer from "@/components/shared/page-container";
import LoadingSpinner from "@/components/shared/loading-spinner";
import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  User,
  Car,
  Wrench,
  Eye,
  Play,
  ArrowRight,
  Search,
  ClipboardCheck,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { appointmentsApi } from "@/lib/appointments/appointments";
import { toast } from "sonner";
import ServiceDetailPanel from "@/components/service-tracking/service-detail-panel";

const FILTER_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmed", icon: ClipboardCheck },
  { value: "UNDER_INSPECTION", label: "Inspecting", icon: Search },
  { value: "IN_PROGRESS", label: "In Progress", icon: Wrench },
];

const formatTime12h = (time24: string) => {
  if (!time24) return "";
  const [hour, minute] = time24.split(":");
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
};

export default function ServiceTracking() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("CONFIRMED");

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.list({ status: activeFilter });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to load appointments.");
        setAppointments([]);
      } else {
        setAppointments(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Error loading appointments.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [activeFilter]);

  const handleInspect = (appt: any) => {
    setSelectedAppointment(appt);
  };

  const handleBack = () => {
    setSelectedAppointment(null);
    loadAppointments(); // refresh list on return
  };

  if (loading) return <LoadingSpinner />;

  if (selectedAppointment) {
    return (
      <ServiceDetailPanel
        appointment={selectedAppointment}
        onBack={handleBack}
        onStatusChanged={loadAppointments}
      />
    );
  }

  return (
    <PageContainer
      title="Service Tracking"
      subtitle="Monitor and manage real‑time workshop operations"
    >
      {/* Filter Bar */}
      <div className="mb-8 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap",
                  isActive
                    ? "bg-white text-primary shadow-sm ring-1 ring-black/5 scale-100"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-slate-400")} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments Grid */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No active jobs"
          description={`No appointments marked as ${FILTER_OPTIONS.find(f => f.value === activeFilter)?.label.toLowerCase()}.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((appt) => (
            <Card
              key={appt.id}
              className="group relative overflow-hidden rounded-[2rem] border-slate-200/60 bg-white hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 group-hover:bg-primary/20 transition-colors" />
              <CardHeader className="pt-7 pb-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-xl font-black tracking-tight text-slate-800 truncate uppercase">
                      {appt.vehicle?.make || "Unknown"} {appt.vehicle?.model || ""}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{appt.vehicle?.year || "N/A"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {appt.customer?.fullname || "Walk-in"}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={appt.status || "PENDING"} className="rounded-xl px-3 border-none shadow-sm" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <Wrench className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Requested Job</p>
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {appt.serviceType?.name || "General Service"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">{appt.appointmentDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">{formatTime12h(appt.appointmentTime)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    className={cn(
                      "w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                      appt.status === "CONFIRMED"
                        ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        : "bg-slate-900 hover:bg-black text-white"
                    )}
                    onClick={() => handleInspect(appt)}
                  >
                    {appt.status === "CONFIRMED" ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" /> Start Inspection
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Continue Work
                      </>
                    )}
                    <ArrowRight className="w-4 h-4 ml-auto opacity-50" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}