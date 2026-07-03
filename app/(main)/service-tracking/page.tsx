// app/(main)/service-tracking/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import PageContainer from "@/components/shared/page-container";
import EmptyState from "@/components/shared/empty-state";
import ConfirmationDialog from "@/components/shared/confimation-dialog";
import ServiceTrackingSkeleton from "@/components/skeleton/service-tracking-skeleton";
import { Button } from "@/components/ui/button";
import AppointmentCard from "@/components/appointments/appointment-card";
import CustomerCard from "@/components/customers/customer-card";
import VehicleCard from "@/components/customers/vehicle-card";
import ServiceCard from "@/components/services/service-card";
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
import { useRealtimeAppointment } from "@/connections/useRealtimeAppointment";

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
  const [initialLoading, setInitialLoading] = useState(true);   // only true on first mount
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("CONFIRMED");

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);

  const loadAppointments = useCallback(async () => {
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
    }
  }, [activeFilter]);

  // First mount: show skeleton, then load data
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await loadAppointments();
      setInitialLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filter changes (skip the initial mount because it's already handled)
  const isFirstFilterChange = useRef(true);
  useEffect(() => {
    if (isFirstFilterChange.current) {
      isFirstFilterChange.current = false;
      return;
    }
    loadAppointments();
  }, [activeFilter, loadAppointments]);

  // Realtime subscription – silently refresh the list when any appointment changes
  const handleRealtimeRefresh = useCallback(() => {
    loadAppointments();
  }, [loadAppointments]);

  useRealtimeAppointment({ onDataChanged: handleRealtimeRefresh });

  const handleInspect = (appt: any) => {
    if (appt.status === "CONFIRMED") {
      setPendingAppointment(appt);
      setConfirmDialogOpen(true);
    } else {
      setSelectedAppointment(appt);
    }
  };

  const handleConfirmStartInspection = async () => {
    if (!pendingAppointment) return;

    try {
      const res = await appointmentsApi.updateStatus(pendingAppointment.id, "UNDER_INSPECTION");
      if (res.error) {
        toast.error(res.errorMessage || "Failed to start inspection.");
      } else {
        toast.success("Inspection started!");
        setConfirmDialogOpen(false);
        setSelectedAppointment(pendingAppointment);
        // Realtime will refresh the list
      }
    } catch (err: any) {
      toast.error(err.message || "Error starting inspection.");
    } finally {
      setPendingAppointment(null);
    }
  };

  const handleBack = () => {
    setSelectedAppointment(null);
    // No need to manually call loadAppointments – realtime will keep it updated
  };

  // Show skeleton only on initial page load
  if (initialLoading) {
    return (
      <PageContainer
        title="Service Tracking"
        subtitle="Monitor and manage real‑time workshop operations"
      >
        <ServiceTrackingSkeleton />
      </PageContainer>
    );
  }

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
            <AppointmentCard
              key={appt.id}
              appointment={appt}                // pass full object
              className="h-full"
            >
              <div className="space-y-3">
                <CustomerCard customerId={appt.customerId} />
                <VehicleCard
                  vehicleId={appt.vehicleId}
                  customerId={appt.customerId}
                />
                {/* Service Cards */}
                {appt.services && appt.services.length > 0 ? (
                  appt.services.map((service: any) => (
                    <ServiceCard key={service.id} serviceId={service.id} />
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No services selected.
                  </div>
                )}
                {/* Action Button */}
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
            </AppointmentCard>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Starting Inspection */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Start Inspection"
        description={`Begin inspection for ${pendingAppointment?.vehicle?.make || "Unknown"} ${pendingAppointment?.vehicle?.model || ""} (${pendingAppointment?.vehicle?.plateNumber || "N/A"})?`}
        onConfirm={handleConfirmStartInspection}
        confirmText="Confirm & Start"
      />
    </PageContainer>
  );
}