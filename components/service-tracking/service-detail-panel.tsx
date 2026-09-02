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
import TaskCardSkeleton from "@/components/skeleton/task-card-skeleton";
import FindingModal from "./finding-modal";
import FindingsList from "./findings-list";
import OverallProgressBar from "./overall-progress-bar";
import DefaultGroupManagerModal from "./default-group-manager-modal";
import DefaultTaskPickerModal from "./default-task-picker-modal";
import HistoryTaskPickerModal from "./history-task-picker-modal";
import DefaultFindingManagerModal from "./default-finding-manager-modal";
import { useRealtimeTask } from "@/connections/useRealtimeTask";
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
  IN_PROGRESS: "Repairing",
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

  const isInspection = appointment.status === "UNDER_INSPECTION";
  const isInProgress = appointment.status === "IN_PROGRESS";
  const isCompleted = appointment.status === "COMPLETED";

  const currentTasks = isInspection ? inspectionTasks : workTasks;
  const allTasksDone = currentTasks.length > 0 && currentTasks.every((t) => t.status === "DONE");

  // Ref to track if this is the initial load
  const isInitial = useRef(true);

  // Load data function – used for both initial and subsequent refreshes
  const loadData = useCallback(async (showSkeleton: boolean = false) => {
    if (showSkeleton) {
      setTasksLoading(true);
    }

    try {
      if (isInspection) {
        const tasksRes = await inspectionTasksApi.list(appointment.id);
        setInspectionTasks(tasksRes.error ? [] : (tasksRes.data || []));
        const findingsRes = await findingsApi.list(appointment.id);
        setFindings(findingsRes.error ? [] : (findingsRes.data || []));
      } else if (isInProgress) {
        const tasksRes = await workTasksApi.list(appointment.id);
        setWorkTasks(tasksRes.error ? [] : (tasksRes.data || []));
      }
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      if (isInitial.current) {
        setInitialLoading(false);
        isInitial.current = false;
      }
      setTasksLoading(false);
    }
  }, [appointment.id, isInspection, isInProgress]);

  // Initial load on mount (full page spinner)
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Realtime subscription – refresh with skeleton cards
  useRealtimeTask({
    appointmentId: appointment.id,
    isInspection,
    onDataChanged: () => loadData(true),
  });

  // Helper: record completed tasks to history
  const recordTasksToHistory = useCallback(async (phase: 'INSPECTION' | 'WORK', tasks: any[]) => {
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
      if (res.error) {
        console.error('Failed to record task history:', res.errorMessage);
        // Don't block the flow, just log
      }
    } catch (err) {
      console.error('Failed to record task history:', err);
    }
  }, [appointment.id]);

  // Handlers – API calls fire-and-forget, realtime refreshes the list
  const handleAddTask = async (title: string, durationMinutes?: number) => {
    try {
      const res = isInspection
        ? await inspectionTasksApi.create({
            appointmentId: appointment.id,
            title,
            durationMinutes,
          })
        : await workTasksApi.create({
            appointmentId: appointment.id,
            title,
            durationMinutes,
          });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to add task.");
      } else {
        toast.success("Task added.");
        // Realtime will refresh the list
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding task.");
    }
  };

  // Handle adding multiple tasks from default template
  const handleAddTasksFromTemplate = async (tasks: Array<{ title: string; durationMinutes?: number }>) => {
    setIsAddingTemplateTasks(true);
    try {
      for (const task of tasks) {
        await handleAddTask(task.title, task.durationMinutes);
      }
      toast.success(`${tasks.length} task(s) added from template.`);
      setTaskPickerOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error adding tasks from template.");
    } finally {
      setIsAddingTemplateTasks(false);
    }
  };

  // Handle adding multiple tasks from history
  const handleAddTasksFromHistory = async (tasks: Array<{ title: string; durationMinutes?: number }>) => {
    setIsAddingHistoryTasks(true);
    try {
      for (const task of tasks) {
        await handleAddTask(task.title, task.durationMinutes);
      }
      toast.success(`${tasks.length} task(s) added from history.`);
      setHistoryPickerOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error adding tasks from history.");
    } finally {
      setIsAddingHistoryTasks(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, status: string) => {
    try {
      const res = isInspection
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
    toast.info("Delete functionality not yet implemented.");
  };

  // Submit estimate to billing
  const handleSubmitToBilling = async () => {
    setIsSubmitting(true);
    try {
      let est = estimate;
      if (!est) {
        const genRes = await estimatesApi.create(appointment.id);
        if (genRes.error) {
          toast.error(genRes.errorMessage || "Failed to generate estimate.");
          return;
        }
        est = genRes.data;
        setEstimate(est);
        // Record inspection tasks to history
        await recordTasksToHistory('INSPECTION', inspectionTasks);
        onStatusChanged();
        onBack();
      }
    } catch (err: any) {
      toast.error(err.message || "Error submitting estimate.");
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
    toast.success("Findings saved. You can now generate estimate by clicking 'Submit to Billing'.");

    // Record findings to history
    try {
      if (findings.length > 0) {
        const payload = {
          appointmentId: appointment.id,
          phase: 'INSPECTION',
          findings: findings.map(f => ({
            description: f.description,
            parts: f.parts.map(p => ({
              partName: p.partName,
              quantity: p.quantity,
              priceAtTime: p.priceAtTime,
              isPms: p.isPms,
            })),
          })),
        };
        const res = await historyFindingsApi.createMany(payload);
        if (res.error) {
          console.error('Failed to record findings history:', res.errorMessage);
        }
      }
    } catch (err) {
      console.error('Failed to record findings history:', err);
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
        // Record work tasks to history
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

  return (
  <div className="min-h-full bg-background">
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-8">
      {/* -------------------------------------------------------
       * WORK ORDER HEADER
       * ----------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onBack}
              className="h-11 w-11 shrink-0 rounded-md md:h-9 md:w-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground md:text-xl lg:text-2xl">
                  {appointment.customer?.fullname || 'Customer'}
                </h1>

                <StatusBadge
                  status={appointment.status || 'PENDING'}
                  className="shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                  <Car className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Vehicle
                    </p>
                    <p className="truncate text-xs font-semibold text-foreground">
                      {appointment.vehicle?.plateNumber || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                  <Wrench className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Service
                    </p>
                    <p className="truncate text-xs font-semibold text-foreground">
                      {appointment.services
                        ?.map((s: any) => s.name)
                        .join(', ') || 'Service'}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Appointment
                    </p>
                    <p className="truncate text-xs font-semibold text-foreground">
                      {appointment.appointmentDate || '—'}
                      {appointment.appointmentTime
                        ? ` • ${appointment.appointmentTime}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                  <User className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Customer
                    </p>
                    <p className="truncate text-xs font-semibold text-foreground">
                      {appointment.customer?.fullname || 'Customer'}
                    </p>
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {appointment.notes}
                    </p>
                  </div>
                </div>
              )}
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
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Service Journey
          </p>
        </div>

        <div className="overflow-x-auto px-4 py-5 sm:px-6">
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
          'grid gap-5',
          isInspection
            ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]'
            : 'grid-cols-1'
        )}
      >
        {/* TASK WORKSPACE */}
        <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Wrench className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {isInspection
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

          <div className="space-y-5 p-4 sm:p-5">
            {currentTasks.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
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
        {isInspection && (
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
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
                <div className="space-y-4 p-4 sm:p-5">
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

              <div className="border-t border-border p-4 sm:p-5">
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

      {isInspection && (
        <FindingsList
          findings={findings}
          appointmentId={appointment.id}
          onFindingsUpdated={() => loadData(true)}
        />
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
        onSaved={() => {}}
      />

      <DefaultTaskPickerModal
        open={taskPickerOpen}
        onOpenChange={setTaskPickerOpen}
        onAddTasks={handleAddTasksFromTemplate}
        isAdding={isAddingTemplateTasks}
        phase={isInspection ? 'INSPECTION' : 'WORK'}
      />

      <HistoryTaskPickerModal
        open={historyPickerOpen}
        onOpenChange={setHistoryPickerOpen}
        onAddTasks={handleAddTasksFromHistory}
        isAdding={isAddingHistoryTasks}
        phase={isInspection ? 'INSPECTION' : 'WORK'}
      />

      <DefaultFindingManagerModal
        open={defaultFindingManagerOpen}
        onOpenChange={setDefaultFindingManagerOpen}
        onSaved={() => {}}
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