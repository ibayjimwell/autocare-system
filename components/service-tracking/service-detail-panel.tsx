'use client';

import React, { useState, useEffect } from "react";
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
import FindingModal from "./finding-modal";
import FindingsList from "./findings-list";
import { appointmentsApi } from "@/lib/appointments/appointments";
import { inspectionTasksApi } from "@/lib/service-tracking/inspection-tasks";
import { workTasksApi } from "@/lib/service-tracking/work-tasks";
import { findingsApi } from "@/lib/service-tracking/findings";
import { estimatesApi } from "@/lib/service-tracking/estimates";
import { finalBillsApi } from "@/lib/payments/final-bills";
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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [doneConfirmOpen, setDoneConfirmOpen] = useState(false);

  const isInspection = appointment.status === "UNDER_INSPECTION";
  const isInProgress = appointment.status === "IN_PROGRESS";
  const isCompleted = appointment.status === "COMPLETED";

  const currentTasks = isInspection ? inspectionTasks : workTasks;
  const allTasksDone = currentTasks.length > 0 && currentTasks.every((t) => t.status === "DONE");

  // Load data
  const loadData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [appointment.id, appointment.status]);

  // Handlers
  const handleAddTask = async (title: string) => {
    try {
      const res = isInspection
        ? await inspectionTasksApi.create({ appointmentId: appointment.id, title })
        : await workTasksApi.create({ appointmentId: appointment.id, title });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to add task.");
      } else {
        toast.success("Task added.");
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding task.");
    }
  };

  const handleTaskUpdate = async (taskId: string, status: string) => {
    try {
      const res = isInspection
        ? await inspectionTasksApi.updateStatus(taskId, status)
        : await workTasksApi.updateStatus(taskId, status);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to update task.");
      } else {
        await loadData();
      }
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
      }
      const sendRes = await estimatesApi.sendForApproval(est.id);
      if (sendRes.error) {
        toast.error(sendRes.errorMessage || "Failed to submit estimate.");
      } else {
        toast.success("Estimate submitted to billing.");
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
    await loadData();
    try {
      const genRes = await estimatesApi.create(appointment.id);
      if (genRes.error) {
        toast.error(genRes.errorMessage || "Failed to generate estimate.");
      } else {
        setEstimate(genRes.data);
        toast.success("Estimate generated. You can now submit to billing.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error generating estimate.");
    }
  };

  const handleWorkDone = async () => {
    setIsSubmitting(true);
    try {
      // Generate final bill
      const billRes = await finalBillsApi.generate(appointment.id);
      if (billRes.error) {
        toast.error(billRes.errorMessage || "Failed to generate final bill.");
      } else {
        toast.success("Job completed! Final bill generated.");
        // Update appointment status to COMPLETED
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

  if (loading) return <LoadingSpinner />;

  // Compute service price & findings subtotal only for inspection
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      {/* ----- Header ----- */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-full h-10 w-10 shrink-0 shadow-sm border-primary/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight truncate">
                {appointment.customer?.fullname || "Customer"}
              </h2>
              <StatusBadge
                status={appointment.status || "PENDING"}
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wider shrink-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                <Car className="w-4 h-4 text-primary" /> {appointment.vehicle?.plateNumber || "N/A"}
              </span>
              <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                <Wrench className="w-4 h-4 text-primary" />{" "}
                {appointment.services?.map((s: any) => s.name).join(", ") || "Service"}
              </span>
              {appointment.appointmentDate && (
                <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                  <Clock className="w-4 h-4 text-primary" /> {appointment.appointmentDate} • {appointment.appointmentTime}
                </span>
              )}
              {appointment.notes && (
                <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md max-w-full truncate">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Note: {appointment.notes}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ----- Stepper ----- */}
      <div className="bg-card border shadow-sm rounded-2xl p-4 sm:p-6 overflow-hidden">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Service Journey
        </p>
        <div className="relative flex items-center justify-between gap-1 sm:gap-2">
          {TRACKING_STATUSES.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1.5 relative z-10">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm text-sm font-bold ${
                    currentStatusIdx > i
                      ? "bg-primary text-white"
                      : currentStatusIdx === i
                      ? "bg-primary text-white ring-4 sm:ring-8 ring-primary/10 scale-110"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStatusIdx > i ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[8px] sm:text-[10px] font-bold uppercase text-center ${
                    currentStatusIdx === i ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < TRACKING_STATUSES.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-[-4px] sm:mx-[-8px] transition-colors duration-500 ${
                    currentStatusIdx > i ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ----- Tasks Column ----- */}
        <div className={cn(
          "space-y-6",
          isInProgress ? "lg:col-span-12" : "lg:col-span-7"
        )}>
          <div className="bg-card border shadow-sm rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b pb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {isInspection ? "Inspection Checklist" : "Repair Operations"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {currentTasks.filter((t) => t.status === "DONE").length} of {currentTasks.length} tasks completed
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setAddTaskModalOpen(true)}
                className="rounded-full shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </div>

            {currentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-muted/20 rounded-xl border border-dashed">
                <div className="p-3 bg-background rounded-full shadow-sm">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  No tasks defined yet. Click "New Task" to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {currentTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={handleTaskUpdate}
                    onDelete={handleTaskDelete}
                    appointmentId={appointment.id}
                    isInProgress={isInProgress}
                  />
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {isInspection && allTasksDone && !isCompleted && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleInspectionDone}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 sm:px-8"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Done – Record Findings
                </Button>
              </div>
            )}
            {isInProgress && allTasksDone && !isCompleted && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setDoneConfirmOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 sm:px-8"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Work
                </Button>
              </div>
            )}
          </div>

          {/* Findings List (only for inspection) */}
          {isInspection && (
            <FindingsList
              findings={findings}
              appointmentId={appointment.id}
              onFindingsUpdated={loadData}
            />
          )}
        </div>

        {/* ----- Estimated Cost Sidebar (only for inspection) ----- */}
        {isInspection && (
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border shadow-md rounded-2xl overflow-hidden flex flex-col h-full">
              <div className="p-4 sm:p-5 border-b bg-muted/30 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary shrink-0" />
                <h3 className="font-bold text-sm sm:text-base">Estimated Cost</h3>
              </div>

              <ScrollArea className="flex-1 max-h-[400px] sm:max-h-[500px]">
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Service Fee */}
                  <div className="flex justify-between items-start text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {appointment.services?.map((s: any) => s.name).join(", ") || "Service"}
                      </p>
                      <p className="text-xs text-muted-foreground">Base Service(s)</p>
                    </div>
                    <span className="font-mono font-medium shrink-0 ml-4">
                      ₱{servicePrice.toFixed(2)}
                    </span>
                  </div>
                  <Separator />

                  {/* Findings */}
                  {findings.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {f.description}
                      </p>
                      {f.parts && f.parts.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm pl-4">
                          <span className="truncate">
                            {p.quantity}x {p.partName || "Part"} {p.isPms && "(PMS)"}
                          </span>
                          <span className="font-mono shrink-0 ml-4">
                            {p.isPms ? "₱0.00" : `₱${(p.priceAtTime * p.quantity).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base sm:text-lg">Subtotal</span>
                    <span className="text-xl sm:text-2xl font-black text-primary font-mono tracking-tighter">
                      ₱{subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 sm:p-5 bg-primary/5 border-t">
                {!isCompleted && (
                  <Button
                    onClick={() => setSendConfirmOpen(true)}
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 shadow-lg shadow-primary/20"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit to Billing"}
                  </Button>
                )}
                {isCompleted && (
                  <Button disabled className="w-full bg-green-600 text-white rounded-xl h-12">
                    Job Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
  );
}