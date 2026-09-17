'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/shared/status-badge";
import LoadingSpinner from "@/components/shared/loading-spinner";
import ConfirmationDialog from "@/components/shared/confimation-dialog";
import AddTaskModal from "@/components/shared/add-task-modal";
import TaskCard from "./task-card";
import CustomerCard from "@/components/customers/customer-card";
import VehicleCard from "@/components/customers/vehicle-card";
import ServiceCard from "@/components/services/service-card";
import TaskCardSkeleton from "@/components/skeleton/task-card-skeleton";
import FindingModal from "./finding-modal";
import FindingsList from "./findings-list";
import OverallProgressBar from "./overall-progress-bar";
import DefaultGroupManagerModal from "./default-group-manager-modal";
import DefaultTaskPickerModal from "./default-task-picker-modal";
import HistoryTaskPickerModal from "./history-task-picker-modal";
import DefaultFindingManagerModal from "./default-finding-manager-modal";
import DefaultFindingPickerModal from "./default-finding-picker-modal";
import HistoryFindingPickerModal from "./history-finding-picker-modal";
import { useRealtimeTask } from "@/connections/useRealtimeTask";
import { useRealtimeAppointment } from "@/connections/useRealtimeAppointment";
import { appointmentsApi } from "@/lib/appointments/appointments";
import { inspectionTasksApi } from "@/lib/service-tracking/inspection-tasks";
import { workTasksApi } from "@/lib/service-tracking/work-tasks";
import { findingsApi } from "@/lib/service-tracking/findings";
import { estimatesApi } from "@/lib/service-tracking/estimates";
import { finalBillsApi } from "@/lib/payments/final-bills";
import { taskHistoryApi } from "@/lib/service-tracking/task-history";
import { historyFindingsApi } from "@/lib/service-tracking/history-findings";
import {
  ArrowLeft,
  User,
  Car,
  Wrench,
  Clock,
  CheckCircle2,
  Plus,
  Receipt,
  FileText,
  AlertCircle,
  Layers,
  Settings,
  History,
  Database,
  Archive,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TRACKING_STATUSES = [
  "PENDING",
  "UNDER_INSPECTION",
  "WAITING_FOR_APPROVAL",
  "IN_PROGRESS",
  "COMPLETED",
];

const STATUS_LABELS = {
  PENDING: "Pending",
  UNDER_INSPECTION: "Inspection",
  WAITING_FOR_APPROVAL: "Approval",
  IN_PROGRESS: "Working",
  COMPLETED: "Done",
};

interface ServiceDetailPanelProps {
  appointment: any;
  onBack: () => void;
  onStatusChanged: () => void;
}

export default function ServiceDetailPanel({
  appointment: initialAppointment,
  onBack,
  onStatusChanged,
}: ServiceDetailPanelProps) {
  const [appointment, setAppointment] = useState(initialAppointment);
  const [inspectionTasks, setInspectionTasks] = useState<any[]>([]);
  const [workTasks, setWorkTasks] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [estimate, setEstimate] = useState<any>(null);

  // History data is kept separate from active task/finding data so staff
  // can review completed work without mixing it into the current job.
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [findingHistory, setFindingHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [doneConfirmOpen, setDoneConfirmOpen] = useState(false);

  // Default groups states
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [isAddingTemplateTasks, setIsAddingTemplateTasks] = useState(false);

  // History tasks states
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [isAddingHistoryTasks, setIsAddingHistoryTasks] = useState(false);

  // Default findings manager
  const [defaultFindingManagerOpen, setDefaultFindingManagerOpen] = useState(false);
  const [defaultFindingPickerOpen, setDefaultFindingPickerOpen] = useState(false);
  const [historyFindingPickerOpen, setHistoryFindingPickerOpen] = useState(false);
  const [isAddingHistoryFindings, setIsAddingHistoryFindings] = useState(false);

  // Source refresh versions ensure open picker dialogs can be recreated
  // immediately after a manager dialog creates/updates/deactivates data.
  const [taskSourceVersion, setTaskSourceVersion] = useState(0);
  const [findingSourceVersion, setFindingSourceVersion] = useState(0);

  const isInspection = appointment.status === "UNDER_INSPECTION";
  const isWaitingForApproval = appointment.status === "WAITING_FOR_APPROVAL";
  const isInProgress = appointment.status === "IN_PROGRESS";
  const isCompleted = appointment.status === "COMPLETED";

  const isInspectionPhase =
    isInspection ||
    isWaitingForApproval ||
    appointment.status === "PENDING" ||
    appointment.status === "CONFIRMED";

  const taskPhase: "INSPECTION" | "WORK" =
    isInProgress || isCompleted
      ? "WORK"
      : "INSPECTION";

  const currentTasks =
    taskPhase === "INSPECTION"
      ? inspectionTasks
      : workTasks;
  const allTasksDone = currentTasks.length > 0 && currentTasks.every((t) => t.status === "DONE");

  // Ref to track if this is the initial load
  const isInitial = useRef(true);

  // Prevent the same phase from being archived multiple times during the
  // same detail-panel session. The backend schema has no source-task ID,
  // so the UI records history at phase finalization only.
  const historyRecordedPhasesRef = useRef<Set<"INSPECTION" | "WORK">>(new Set());
  const findingsHistoryRecordedRef = useRef(false);

  // Load data function – used for both initial and subsequent refreshes
  const loadData = useCallback(async (showSkeleton: boolean = false) => {
    if (showSkeleton) {
      setTasksLoading(true);
    }

    try {
      /* ----------------------------------------------------------
         CURRENT TASKS / FINDINGS

         Inspection tasks remain the active task set through the
         inspection and customer-approval stages. This fixes the old
         behavior where WAITING_FOR_APPROVAL accidentally switched to
         the work-task collection.
      ----------------------------------------------------------- */

      if (taskPhase === "INSPECTION") {
        const [tasksRes, findingsRes] = await Promise.all([
          inspectionTasksApi.list(appointment.id),
          findingsApi.list(appointment.id),
        ]);

        setInspectionTasks(
          tasksRes?.error ? [] : tasksRes?.data || [],
        );

        setFindings(
          findingsRes?.error ? [] : findingsRes?.data || [],
        );
      } else {
        const tasksRes = await workTasksApi.list(appointment.id);

        setWorkTasks(
          tasksRes?.error ? [] : tasksRes?.data || [],
        );
      }

      /* ----------------------------------------------------------
         HISTORY

         History is loaded independently so a history-picker failure
         never prevents current tasks from appearing.
      ----------------------------------------------------------- */

      setHistoryLoading(true);

      const taskHistoryRes = await taskHistoryApi.list({
        appointmentId: appointment.id,
        phase: taskPhase,
      });

      setTaskHistory(
        taskHistoryRes?.error
          ? []
          : Array.isArray(taskHistoryRes?.data)
            ? taskHistoryRes.data
            : [],
      );

      if (taskPhase === "INSPECTION") {
        const historyFindingsRes = await historyFindingsApi.list({
          appointmentId: appointment.id,
          phase: "INSPECTION",
        });

        setFindingHistory(
          historyFindingsRes?.error
            ? []
            : Array.isArray(historyFindingsRes?.data)
              ? historyFindingsRes.data
              : [],
        );
      } else {
        setFindingHistory([]);
      }

      setHistoryLoading(false);
    } catch (err) {
      console.error("Failed to load service tracking data", err);
      setHistoryLoading(false);
    } finally {
      if (isInitial.current) {
        setInitialLoading(false);
        isInitial.current = false;
      }
      setTasksLoading(false);
    }
  }, [appointment.id, taskPhase]);

  // Initial load on mount (full page spinner)
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Realtime subscription – refresh with skeleton cards
  useRealtimeTask({
    appointmentId: appointment.id,
    isInspection: taskPhase === "INSPECTION",
    onDataChanged: () => loadData(true),
  });

  useRealtimeAppointment({
    onDataChanged: async () => {
      try {
        const res = await appointmentsApi.get(appointment.id);

        if (!res?.error) {
          const nextAppointment = res?.data || res;

          if (nextAppointment) {
            setAppointment(nextAppointment);
          }
        }
      } catch (error) {
        console.error(
          "Failed to refresh appointment:",
          error,
        );
      } finally {
        void loadData(false);
      }
    },
  });

  // Helper: record completed tasks to history
  const recordTasksToHistory = useCallback(async (phase: 'INSPECTION' | 'WORK', tasks: any[]) => {
    if (historyRecordedPhasesRef.current.has(phase)) {
      return;
    }

    const doneTasks = tasks.filter(t => t.status === 'DONE');
    if (doneTasks.length === 0) return;
    try {
      const payload = {
        appointmentId: appointment.id,
        phase,
        tasks: doneTasks.map(t => ({
          title: t.title,
          durationMinutes: t.durationMinutes,
        })),
      };
      const res = await taskHistoryApi.createMany(payload);
      if (res?.error) {
        console.error('Failed to record task history:', res.errorMessage);
        // Do not block the phase transition; the current operation can continue.
      } else {
        historyRecordedPhasesRef.current.add(phase);
      }
    } catch (err) {
      console.error('Failed to record task history:', err);
    }
  }, [appointment.id]);

  // Handlers – current task operations stay on the captured phase so a
  // first inspection task changing CONFIRMED -> UNDER_INSPECTION does not
  // switch the API used by the remaining template/history tasks.
  const handleAddTask = async (
    title: string,
    durationMinutes?: number,
    phase: "INSPECTION" | "WORK" = taskPhase,
  ) => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      toast.error("Task title is required.");
      return false;
    }

    try {
      const res =
        phase === "INSPECTION"
          ? await inspectionTasksApi.create({
              appointmentId: appointment.id,
              title: trimmedTitle,
              durationMinutes,
            })
          : await workTasksApi.create({
              appointmentId: appointment.id,
              title: trimmedTitle,
              durationMinutes,
            });

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            `Failed to add task: ${trimmedTitle}`,
        );
        return false;
      }

      return true;
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Error adding task.",
      );
      return false;
    }
  };

  // Handle adding multiple tasks from a default template.
  const handleAddTasksFromTemplate = async (
    tasks: Array<{
      title: string;
      durationMinutes?: number;
    }>,
  ) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return;
    }

    setIsAddingTemplateTasks(true);

    try {
      const sourcePhase = taskPhase;
      let addedCount = 0;

      for (const task of tasks) {
        const added = await handleAddTask(
          task.title,
          task.durationMinutes,
          sourcePhase,
        );

        if (added) {
          addedCount += 1;
        }
      }

      setTaskPickerOpen(false);
      await loadData(false);

      if (addedCount > 0) {
        toast.success(
          `${addedCount} task(s) added from template.`,
        );
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Error adding tasks from template.",
      );
    } finally {
      setIsAddingTemplateTasks(false);
    }
  };

  // Handle adding multiple tasks from history.
  const handleAddTasksFromHistory = async (
    tasks: Array<{
      title: string;
      durationMinutes?: number;
    }>,
  ) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return;
    }

    setIsAddingHistoryTasks(true);

    try {
      const sourcePhase = taskPhase;
      let addedCount = 0;

      for (const task of tasks) {
        const added = await handleAddTask(
          task.title,
          task.durationMinutes,
          sourcePhase,
        );

        if (added) {
          addedCount += 1;
        }
      }

      setHistoryPickerOpen(false);
      await loadData(false);

      if (addedCount > 0) {
        toast.success(
          `${addedCount} task(s) added from history.`,
        );
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Error adding tasks from history.",
      );
    } finally {
      setIsAddingHistoryTasks(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, status: string) => {
    try {
      const res = taskPhase === "INSPECTION"
        ? await inspectionTasksApi.updateStatus(taskId, status)
        : await workTasksApi.updateStatus(taskId, status);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to update task.");
      }
      // Realtime will refresh
    } catch (err: any) {
      toast.error(err.message || "Error updating task.");
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const api =
        taskPhase === "INSPECTION"
          ? inspectionTasksApi
          : workTasksApi;

      if (typeof api.delete !== "function") {
        toast.error("Task deletion is not available.");
        return;
      }

      const res = await api.delete(taskId);

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            "Failed to delete task.",
        );
        return;
      }

      toast.success("Task deleted.");
      await loadData(true);
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Error deleting task.",
      );
    }
  };

  // Submit estimate to billing
  const handleSubmitToBilling = async () => {
    setIsSubmitting(true);

    try {
      await recordTasksToHistory(
        "INSPECTION",
        inspectionTasks,
      );

      /* ------------------------------------------------------------
         Findings are archived exactly once when the inspection is
         finalized. Editing findings before submission does not create
         duplicate history rows.
      ------------------------------------------------------------- */

      if (
        findings.length > 0 &&
        !findingsHistoryRecordedRef.current
      ) {
        const historyRes =
          await historyFindingsApi.createMany({
            appointmentId: appointment.id,
            phase: "INSPECTION",
            findings: findings.map((finding: any) => ({
              description: String(
                finding?.description ||
                  "",
              ).trim(),
              parts: Array.isArray(finding?.parts)
                ? finding.parts.map((part: any) => ({
                    partName: String(
                      part?.partName ||
                        "Part",
                    ).trim(),
                    quantity: Math.max(
                      1,
                      Number(part?.quantity) ||
                        1,
                    ),
                    priceAtTime: Math.max(
                      0,
                      Number(
                        part?.priceAtTime,
                      ) || 0,
                    ),
                    isPms: Boolean(
                      part?.isPms,
                    ),
                  }))
                : [],
            })),
          });

        if (!historyRes?.error) {
          findingsHistoryRecordedRef.current = true;
        }
      }

      let est = estimate;

      if (!est) {
        const genRes =
          await estimatesApi.create(
            appointment.id,
          );

        if (genRes?.error) {
          toast.error(
            genRes.errorMessage ||
              "Failed to generate estimate.",
          );
          return;
        }

        est = genRes.data;
        setEstimate(est);
      }

      await loadData(false);
      toast.success(
        "Estimate submitted to billing.",
      );
      onStatusChanged();
      onBack();
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Error submitting estimate.",
      );
    } finally {
      setIsSubmitting(false);
      setSendConfirmOpen(false);
    }
  };

  const handleInspectionDone = () => {
    setFindingModalOpen(true);
  };

  const handleFindingsSaved = async () => {
    setFindingModalOpen(false);
    await loadData(true);
    toast.success(
      "Findings saved. You can now generate the estimate by clicking 'Submit to Billing'.",
    );
  };

  /* ================================================================
     ADD FINDINGS FROM DEFAULT / HISTORY PICKERS
  ================================================================= */

  const handleAddFindings = async (
    selectedFindings: Array<{
      description: string;
      parts: Array<{
        partName: string;
        quantity: number;
        priceAtTime: number;
        isPms: boolean;
      }>;
    }>,
  ) => {
    if (selectedFindings.length === 0) {
      return;
    }

    try {
      const res = await findingsApi.create({
        appointmentId: appointment.id,
        findings: selectedFindings,
      });

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            "Failed to add findings.",
        );
        return;
      }

      await loadData(true);
      toast.success(
        `${selectedFindings.length} finding(s) added.`,
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Error adding findings.",
      );
    }
  };

  const handleAddHistoryFindings = async (
    selectedFindings: Array<{
      description: string;
      parts: Array<{
        partName: string;
        quantity: number;
        priceAtTime: number;
        isPms: boolean;
      }>;
    }>,
  ) => {
    setIsAddingHistoryFindings(true);

    try {
      await handleAddFindings(
        selectedFindings,
      );
      setHistoryFindingPickerOpen(false);
    } finally {
      setIsAddingHistoryFindings(false);
    }
  };



  const handleWorkDone = async () => {
    setIsSubmitting(true);
    try {
      const billRes = await finalBillsApi.generate(appointment.id);
      if (billRes.error) {
        toast.error(billRes.errorMessage || "Failed to generate final bill.");
      } else {
        toast.success("Job completed! Final bill generated.");
        // Record work tasks to history exactly once when work is finalized.
        await recordTasksToHistory('WORK', workTasks);

        await appointmentsApi.updateStatus(appointment.id, "COMPLETED");
        onStatusChanged();
        onBack();
      }
    } catch (err: any) {
      toast.error(err.message || "Error completing job.");
    } finally {
      setIsSubmitting(false);
      setDoneConfirmOpen(false);
    }
  };

  const currentStatusIdx = TRACKING_STATUSES.indexOf(appointment.status);

  if (initialLoading) return <LoadingSpinner />;

  const servicePrice = appointment.services?.reduce(
    (sum: number, s: any) => sum + parseFloat(s.basePrice || 0),
    0
  ) || 0;

  const findingsTotal = findings.reduce((sum, f) => {
    const partsTotal = (f.parts || []).reduce((s, p) => {
      if (p.isPms) return s;
      return s + (p.priceAtTime || 0) * (p.quantity || 1);
    }, 0);
    return sum + partsTotal;
  }, 0);
  const subtotal = servicePrice + findingsTotal;

  /* ==============================================================
     HISTORY DISPLAY DATA

     The history preview is intentionally compact. The dedicated
     History buttons still open the full reusable pickers, while this
     section gives staff an immediate audit view for this appointment.
  ============================================================== */

  const normalizedHistorySearch =
    historySearch.trim().toLowerCase();

  const filteredTaskHistory = taskHistory.filter((item) => {
    if (!normalizedHistorySearch) {
      return true;
    }

    return [
      item?.title,
      item?.appointment?.trackingNumber,
      item?.customer?.fullname,
      item?.vehicle?.make,
      item?.vehicle?.model,
      item?.vehicle?.plateNumber,
      item?.phase,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedHistorySearch);
  });

  const filteredFindingHistory = findingHistory.filter((item) => {
    if (!normalizedHistorySearch) {
      return true;
    }

    return [
      item?.description,
      item?.appointment?.trackingNumber,
      item?.customer?.fullname,
      item?.vehicle?.make,
      item?.vehicle?.model,
      item?.vehicle?.plateNumber,
      item?.phase,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedHistorySearch);
  });

  const displayedTaskHistory =
    filteredTaskHistory.slice(0, 8);

  const displayedFindingHistory =
    filteredFindingHistory.slice(0, 6);

  return (
  <div className="min-h-full bg-background">
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-2.5 sm:p-4 lg:p-5">
      {/* -------------------------------------------------------
       * WORK ORDER HEADER
       *
       * The customer name is no longer the dominant title in the
       * detail panel. The header now identifies the appointment
       * context, while the actual customer / vehicle / service
       * records are displayed using their official information
       * cards below.
       * ----------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onBack}
                className="h-11 w-11 shrink-0 rounded-md md:h-9 md:w-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    Booked Services
                  </h1>

                  <StatusBadge
                    status={appointment.status || 'PENDING'}
                    className="shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  />
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                  {appointment.trackingNumber
                    ? `Tracking #${appointment.trackingNumber}`
                    : 'Current service appointment'}
                </p>
              </div>
            </div>

            {/* ---------------------------------------------------
             * BOOKED SERVICES
             * ------------------------------------------------- */}
            <div className="mt-4">
              {Array.isArray(appointment.services) &&
              appointment.services.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {appointment.services.map((service: any) => (
                    <ServiceCard
                      key={service.id}
                      serviceId={service.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5">
                  <p className="text-sm font-medium text-foreground">
                    No booked service information
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    This appointment does not currently contain a linked service record.
                  </p>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------
             * OFFICIAL APPOINTMENT INFORMATION
             * ------------------------------------------------- */}
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <CustomerCard
                customerId={appointment.customerId}
              />

              <VehicleCard
                vehicleId={appointment.vehicleId}
                customerId={appointment.customerId}
              />
            </div>

            {/* ---------------------------------------------------
             * SCHEDULE INFORMATION
             * ------------------------------------------------- */}
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Appointment Schedule
                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {appointment.appointmentDate || '—'}
                      {appointment.appointmentTime
                        ? ` • ${appointment.appointmentTime}`
                        : ''}
                    </p>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="flex min-w-0 items-start gap-2 sm:max-w-[55%]">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                    <p className="text-xs leading-5 text-muted-foreground">
                      {appointment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col xl:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGroupManagerOpen(true)}
              className="h-11 rounded-md px-4 md:h-9"
            >
              <Settings className="mr-2 h-4 w-4" />
              Default Tasks
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDefaultFindingManagerOpen(true)}
              className="h-11 rounded-md px-4 md:h-9"
            >
              <Settings className="mr-2 h-4 w-4" />
              Default Findings
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------
       * SERVICE JOURNEY
       * ----------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-3 py-2.5 sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Service Journey
          </p>
        </div>

        <div className="overflow-x-auto px-3 py-3.5 sm:px-4">
          <div className="flex min-w-[620px] items-start">
            {TRACKING_STATUSES.map((s, i) => {
              const completed = currentStatusIdx > i;
              const current = currentStatusIdx === i;

              return (
                <React.Fragment key={s}>
                  <div className="flex min-w-[100px] flex-col items-center">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all',
                        completed || current
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted text-muted-foreground',
                        current && 'ring-4 ring-primary/10'
                      )}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>

                    <span
                      className={cn(
                        'mt-2 text-center text-[10px] font-semibold uppercase tracking-wide',
                        current
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </span>
                  </div>

                  {i < TRACKING_STATUSES.length - 1 && (
                    <div
                      className={cn(
                        'mt-5 h-px flex-1',
                        currentStatusIdx > i
                          ? 'bg-primary'
                          : 'bg-border'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------
       * MAIN WORKSPACE
       * ----------------------------------------------------- */}
      <div
        className={cn(
          'grid gap-3.5',
          (isInspection || isWaitingForApproval)
            ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]'
            : 'grid-cols-1'
        )}
      >
        {/* TASK WORKSPACE */}
        <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-3 sm:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Wrench className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {taskPhase === 'INSPECTION'
                      ? 'Inspection Checklist'
                      : 'Repair Operations'}
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    {
                      currentTasks.filter(
                        (t) => t.status === 'DONE'
                      ).length
                    }{' '}
                    of {currentTasks.length} tasks completed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setHistoryPickerOpen(true)}
                  className="h-11 rounded-md md:h-9"
                >
                  <History className="mr-2 h-4 w-4" />
                  History
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setTaskPickerOpen(true)}
                  className="h-11 rounded-md md:h-9"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Templates
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAddTaskModalOpen(true)}
                  className="h-11 rounded-md md:h-9"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 p-3 sm:p-4">
            {currentTasks.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <OverallProgressBar tasks={currentTasks} />
              </div>
            )}

            {tasksLoading && currentTasks.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TaskCardSkeleton key={i} />
                ))}
              </div>
            ) : tasksLoading && currentTasks.length > 0 ? (
              <div className="space-y-3">
                {currentTasks.map((_, i) => (
                  <TaskCardSkeleton key={i} />
                ))}
              </div>
            ) : currentTasks.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-background shadow-sm">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="mt-3 max-w-xs text-sm font-medium text-foreground">
                  No tasks defined yet
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  Create a new task or add one from a default template
                  to start this operation.
                </p>

                <Button
                  type="button"
                  onClick={() => setAddTaskModalOpen(true)}
                  className="mt-4 h-11 rounded-md md:h-9"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={handleTaskUpdate}
                    onDelete={handleTaskDelete}
                    onEdit={() => {}}
                    appointmentId={appointment.id}
                    isInProgress={isInProgress}
                  />
                ))}
              </div>
            )}

            {isInspection && allTasksDone && !isCompleted && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  onClick={handleInspectionDone}
                  className="h-11 w-full rounded-md sm:w-auto sm:px-6 md:h-9"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Done — Record Findings
                </Button>
              </div>
            )}

            {isInProgress && allTasksDone && !isCompleted && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  onClick={() => setDoneConfirmOpen(true)}
                  className="h-11 w-full rounded-md bg-green-600 text-white hover:bg-green-700 sm:w-auto sm:px-6 md:h-9"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Work
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ESTIMATE */}
        {(isInspection || isWaitingForApproval) && (
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </span>

                  <div>
                    <h2 className="text-sm font-semibold">
                      Estimated Cost
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Current service estimate
                    </p>
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-[520px]">
                <div className="space-y-3 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {appointment.services
                          ?.map((s: any) => s.name)
                          .join(', ') || 'Service'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Base service
                      </p>
                    </div>

                    <span className="shrink-0 font-mono text-sm font-medium">
                      ₱{servicePrice.toFixed(2)}
                    </span>
                  </div>

                  <Separator />

                  {findings.map((f) => (
                    <div key={f.id} className="space-y-2">
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {f.description}
                      </p>

                      {f.parts &&
                        f.parts.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                          >
                            <span className="min-w-0 truncate text-xs">
                              {p.quantity}x {p.partName || 'Part'}
                              {p.isPms ? ' (PMS)' : ''}
                            </span>

                            <span className="shrink-0 font-mono text-xs">
                              {p.isPms
                                ? '₱0.00'
                                : `₱${(
                                    p.priceAtTime * p.quantity
                                  ).toFixed(2)}`}
                            </span>
                          </div>
                        ))}
                    </div>
                  ))}

                  <Separator />

                  <div className="rounded-lg bg-primary/5 p-4">
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-sm font-semibold">
                        Subtotal
                      </span>

                      <span className="font-mono text-2xl font-bold tracking-tight text-primary">
                        ₱{subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="border-t border-border p-3 sm:p-4">
                {!isCompleted && (
                  <Button
                    type="button"
                    onClick={() => setSendConfirmOpen(true)}
                    className="h-11 w-full rounded-md md:h-9"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Submitting...'
                      : 'Submit to Billing'}
                  </Button>
                )}

                {isCompleted && (
                  <Button
                    type="button"
                    disabled
                    className="h-11 w-full rounded-md bg-green-600 text-white md:h-9"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Job Completed
                  </Button>
                )}
              </div>
            </section>
          </aside>
        )}
      </div>

      {/* =============================================================
          APPOINTMENT HISTORY

          Current task/finding history is separated from the active
          workflow so staff can audit what has already been recorded
          without confusing it with live tasks.
      ============================================================= */}

      {(taskHistory.length > 0 || findingHistory.length > 0) && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div
            className="
              border-b
              border-border
              p-3

              sm:p-4
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3

                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    bg-muted
                    text-muted-foreground
                  "
                >
                  <Archive className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    Appointment History
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    Previously completed tasks and recorded findings for this appointment.
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 lg:w-auto">
                <div className="relative min-w-0 flex-1 lg:w-[260px] lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    value={historySearch}
                    onChange={(event) =>
                      setHistorySearch(event.target.value)
                    }
                    placeholder="Search history..."
                    aria-label="Search appointment history"
                    className="
                      h-10
                      w-full
                      rounded-md
                      border
                      border-input
                      bg-background
                      pl-9
                      pr-3
                      text-base
                      shadow-sm
                      outline-none
                      transition-shadow
                      placeholder:text-muted-foreground
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-offset-2
                      md:h-9
                      md:text-sm
                    "
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setHistoryOpen((value) => !value)
                  }
                  className="
                    h-10
                    shrink-0
                    rounded-md
                    px-3
                    text-xs
                    md:h-9
                  "
                >
                  {historyOpen
                    ? 'Collapse'
                    : 'View History'}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {taskHistory.length} {taskHistory.length === 1 ? 'task' : 'tasks'}
              </Badge>

              {taskPhase === 'INSPECTION' && (
                <Badge
                  variant="secondary"
                  className="rounded-full text-[10px]"
                >
                  {findingHistory.length}{' '}
                  {findingHistory.length === 1 ? 'finding' : 'findings'}
                </Badge>
              )}

              {historyLoading && (
                <span className="text-[10px] text-muted-foreground">
                  Refreshing history...
                </span>
              )}
            </div>
          </div>

          {historyOpen && (
            <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
              {/* ------------------------------------------------------
                  TASK HISTORY
              ------------------------------------------------------- */}

              <section className="min-w-0 rounded-lg border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />

                    <p className="text-xs font-semibold text-foreground">
                      Task History
                    </p>
                  </div>

                  <span className="text-[10px] text-muted-foreground">
                    {filteredTaskHistory.length} shown
                  </span>
                </div>

                <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
                  {displayedTaskHistory.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      No task history matches this search.
                    </p>
                  ) : (
                    displayedTaskHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border border-border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">
                              {item.title || 'Task'}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span>
                                {item.phase || 'WORK'}
                              </span>

                              {item.durationMinutes != null && (
                                <span>
                                  {item.durationMinutes} min
                                </span>
                              )}
                            </div>
                          </div>

                          <Badge
                            variant="secondary"
                            className="shrink-0 rounded-full text-[9px]"
                          >
                            Completed
                          </Badge>
                        </div>

                        {item.completedAt && (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {new Date(item.completedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* ------------------------------------------------------
                  FINDING HISTORY
              ------------------------------------------------------- */}

              {taskPhase === 'INSPECTION' ? (
                <section className="min-w-0 rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />

                      <p className="text-xs font-semibold text-foreground">
                        Finding History
                      </p>
                    </div>

                    <span className="text-[10px] text-muted-foreground">
                      {filteredFindingHistory.length} shown
                    </span>
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
                    {displayedFindingHistory.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        No finding history matches this search.
                      </p>
                    ) : (
                      displayedFindingHistory.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border border-border bg-card p-3"
                        >
                          <p className="whitespace-pre-wrap text-xs font-medium leading-5 text-foreground">
                            {item.description || 'Finding'}
                          </p>

                          {item.parts?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.parts.slice(0, 6).map((part: any) => (
                                <Badge
                                  key={part.id}
                                  variant="secondary"
                                  className="rounded-md text-[9px]"
                                >
                                  {part.quantity}x {part.partName || 'Part'}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {item.recordedAt && (
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              {new Date(item.recordedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </section>
      )}

      {isInspection && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>

              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  Inspection Findings
                </h2>

                <p className="text-xs text-muted-foreground">
                  Record observations, reuse known findings, and review previous findings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryFindingPickerOpen(true)}
                className="h-10 rounded-md md:h-9"
              >
                <History className="mr-2 h-4 w-4" />
                Previous Findings
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setDefaultFindingPickerOpen(true)}
                className="h-10 rounded-md md:h-9"
              >
                <Database className="mr-2 h-4 w-4" />
                Default Findings
              </Button>

              <Button
                type="button"
                onClick={() => setFindingModalOpen(true)}
                className="h-10 rounded-md md:h-9"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Finding
              </Button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <FindingsList
              findings={findings}
              appointmentId={appointment.id}
              onFindingsUpdated={() => loadData(true)}
            />
          </div>
        </section>
      )}

      {/* Existing modal components remain exactly wired to their
          existing state and callbacks below. */}
      <AddTaskModal
        open={addTaskModalOpen}
        onOpenChange={setAddTaskModalOpen}
        onAddTask={handleAddTask}
      />

      <FindingModal
        open={findingModalOpen}
        onClose={() => setFindingModalOpen(false)}
        appointmentId={appointment.id}
        onSaved={handleFindingsSaved}
      />

      <DefaultGroupManagerModal
        open={groupManagerOpen}
        onOpenChange={setGroupManagerOpen}
        onSaved={() => {
          setTaskSourceVersion((value) => value + 1);
        }}
      />

      <DefaultTaskPickerModal
        key={`default-task-picker-${taskSourceVersion}`}
        open={taskPickerOpen}
        onOpenChange={setTaskPickerOpen}
        onAddTasks={handleAddTasksFromTemplate}
        isAdding={isAddingTemplateTasks}
        phase={taskPhase}
      />

      <HistoryTaskPickerModal
        open={historyPickerOpen}
        onOpenChange={setHistoryPickerOpen}
        onAddTasks={handleAddTasksFromHistory}
        isAdding={isAddingHistoryTasks}
        phase={taskPhase}
        currentAppointmentId={appointment.id}
      />

      <DefaultFindingManagerModal
        open={defaultFindingManagerOpen}
        onOpenChange={setDefaultFindingManagerOpen}
        onSaved={() => {
          setFindingSourceVersion((value) => value + 1);
        }}
      />

      <DefaultFindingPickerModal
        key={`default-finding-picker-${findingSourceVersion}`}
        open={defaultFindingPickerOpen}
        onOpenChange={setDefaultFindingPickerOpen}
        onAddFindings={handleAddFindings}
        isAdding={false}
      />

      <HistoryFindingPickerModal
        open={historyFindingPickerOpen}
        onOpenChange={setHistoryFindingPickerOpen}
        onAddFindings={handleAddHistoryFindings}
        isAdding={isAddingHistoryFindings}
        phase="INSPECTION"
        excludeAppointmentId={appointment.id}
      />

      <ConfirmationDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Submit to Billing"
        description="This will send the estimated cost to billing for customer approval. Continue?"
        onConfirm={handleSubmitToBilling}
        confirmText="Confirm & Submit"
      />

      <ConfirmationDialog
        open={doneConfirmOpen}
        onOpenChange={setDoneConfirmOpen}
        title="Complete Work"
        description="All repair tasks are done. This will generate the final bill and complete the job. Continue?"
        onConfirm={handleWorkDone}
        confirmText="Complete Job"
      />
    </div>
  </div>
);
}
