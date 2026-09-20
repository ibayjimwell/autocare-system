'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Label,
} from "@/components/ui/label";

import {
  ScrollArea,
} from "@/components/ui/scroll-area";

import {
  Separator,
} from "@/components/ui/separator";

import StatusBadge from "@/components/shared/status-badge";

import LoadingSpinner from "@/components/shared/loading-spinner";

import ConfirmationDialog from "@/components/shared/confimation-dialog";

import AddTaskModal from "@/components/shared/add-task-modal";

import ServiceTrackingLoadingModal from "./service-tracking-loading-modal";

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

import {
  useRealtimeTask,
} from "@/connections/useRealtimeTask";

import {
  useRealtimeAppointment,
} from "@/connections/useRealtimeAppointment";

import {
  useRealtimeTable,
} from "@/connections/useRealtimeTable";

import {
  appointmentsApi,
} from "@/lib/appointments/appointments";

import {
  inspectionTasksApi,
} from "@/lib/service-tracking/inspection-tasks";

import {
  workTasksApi,
} from "@/lib/service-tracking/work-tasks";

import {
  findingsApi,
} from "@/lib/service-tracking/findings";

import {
  estimatesApi,
} from "@/lib/service-tracking/estimates";

import {
  finalBillsApi,
} from "@/lib/payments/final-bills";

import {
  taskHistoryApi,
} from "@/lib/service-tracking/task-history";

import {
  historyFindingsApi,
} from "@/lib/service-tracking/history-findings";

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

import {
  toast,
} from "sonner";

import {
  cn,
} from "@/lib/utils";

/* ================================================================
   TRACKING STATUSES
================================================================ */

const TRACKING_STATUSES = [
  "PENDING",
  "UNDER_INSPECTION",
  "WAITING_FOR_APPROVAL",
  "IN_PROGRESS",
  "COMPLETED",
];

/* ================================================================
   STATUS LABELS
================================================================ */

const STATUS_LABELS = {
  PENDING: "Pending",
  UNDER_INSPECTION: "Inspection",
  WAITING_FOR_APPROVAL: "Approval",
  IN_PROGRESS: "Working",
  COMPLETED: "Done",
};

/* ================================================================
   PROCESSING ACTION
================================================================ */

type ProcessingAction =
  | "SUBMIT_TO_BILLING"
  | "COMPLETE_WORK"
  | null;

/* ================================================================
   PROPS
================================================================ */

interface ServiceDetailPanelProps {
  appointment: any;
  onBack: () => void;
  onStatusChanged: () => void;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function ServiceDetailPanel({
  appointment: initialAppointment,
  onBack,
  onStatusChanged,
}: ServiceDetailPanelProps) {
  const [
    appointment,
    setAppointment,
  ] = useState(
    initialAppointment
  );

  const [
    inspectionTasks,
    setInspectionTasks,
  ] = useState<any[]>(
    []
  );

  const [
    workTasks,
    setWorkTasks,
  ] = useState<any[]>(
    []
  );

  /*
   * Findings remain independent from task phase.
   *
   * They are inspection findings, but they continue to belong to
   * the appointment after the appointment moves into IN_PROGRESS.
   */
  const [
    findings,
    setFindings,
  ] = useState<any[]>(
    []
  );

  const [
    estimate,
    setEstimate,
  ] = useState<any>(
    null
  );

  /* ==============================================================
     HISTORY
  ============================================================== */

  const [
    taskHistory,
    setTaskHistory,
  ] = useState<any[]>(
    []
  );

  const [
    findingHistory,
    setFindingHistory,
  ] = useState<any[]>(
    []
  );

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(
    false
  );

  const [
    historySearch,
    setHistorySearch,
  ] = useState(
    ''
  );

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(
    false
  );

  /* ==============================================================
     LOADING
  ============================================================== */

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(
    true
  );

  const [
    tasksLoading,
    setTasksLoading,
  ] = useState(
    false
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false
  );

  const [
    processingAction,
    setProcessingAction,
  ] = useState<ProcessingAction>(
    null
  );

  /* ==============================================================
     MODAL STATES
  ============================================================== */

  const [
    addTaskModalOpen,
    setAddTaskModalOpen,
  ] = useState(
    false
  );

  const [
    findingModalOpen,
    setFindingModalOpen,
  ] = useState(
    false
  );

  const [
    sendConfirmOpen,
    setSendConfirmOpen,
  ] = useState(
    false
  );

  const [
    doneConfirmOpen,
    setDoneConfirmOpen,
  ] = useState(
    false
  );

  /* ==============================================================
     DEFAULT GROUPS
  ============================================================== */

  const [
    groupManagerOpen,
    setGroupManagerOpen,
  ] = useState(
    false
  );

  const [
    taskPickerOpen,
    setTaskPickerOpen,
  ] = useState(
    false
  );

  const [
    isAddingTemplateTasks,
    setIsAddingTemplateTasks,
  ] = useState(
    false
  );

  /* ==============================================================
     HISTORY TASKS
  ============================================================== */

  const [
    historyPickerOpen,
    setHistoryPickerOpen,
  ] = useState(
    false
  );

  const [
    isAddingHistoryTasks,
    setIsAddingHistoryTasks,
  ] = useState(
    false
  );

  /* ==============================================================
     DEFAULT FINDINGS
  ============================================================== */

  const [
    defaultFindingManagerOpen,
    setDefaultFindingManagerOpen,
  ] = useState(
    false
  );

  const [
    defaultFindingPickerOpen,
    setDefaultFindingPickerOpen,
  ] = useState(
    false
  );

  const [
    historyFindingPickerOpen,
    setHistoryFindingPickerOpen,
  ] = useState(
    false
  );

  const [
    isAddingHistoryFindings,
    setIsAddingHistoryFindings,
  ] = useState(
    false
  );

  /* ==============================================================
     SOURCE REFRESH VERSIONS
  ============================================================== */

  const [
    taskSourceVersion,
    setTaskSourceVersion,
  ] = useState(
    0
  );

  const [
    findingSourceVersion,
    setFindingSourceVersion,
  ] = useState(
    0
  );

  /* ==============================================================
     STATUS FLAGS
  ============================================================== */

  const isInspection =
    appointment.status ===
    "UNDER_INSPECTION";

  const isWaitingForApproval =
    appointment.status ===
    "WAITING_FOR_APPROVAL";

  const isInProgress =
    appointment.status ===
    "IN_PROGRESS";

  const isCompleted =
    appointment.status ===
    "COMPLETED";

  const isInspectionPhase =
    isInspection ||
    isWaitingForApproval ||
    appointment.status ===
      "PENDING" ||
    appointment.status ===
      "CONFIRMED";

  /*
   * Findings are available from inspection onward.
   */
  const showFindings =
    isInspection ||
    isWaitingForApproval ||
    isInProgress;

  /*
   * Once work has started, findings are informational only.
   */
  const findingsReadOnly =
    isInProgress;

  /* ==============================================================
     TASK PHASE
  ============================================================== */

  const taskPhase:
    | "INSPECTION"
    | "WORK" =
    isInProgress ||
    isCompleted
      ? "WORK"
      : "INSPECTION";

  const currentTasks =
    taskPhase ===
    "INSPECTION"
      ? inspectionTasks
      : workTasks;

  const allTasksDone =
    currentTasks.length >
      0 &&
    currentTasks.every(
      (
        task
      ) =>
        task.status ===
        "DONE"
    );

  /* ==============================================================
     INITIAL LOAD REF
  ============================================================== */

  const isInitial =
    useRef(true);

  /* ==============================================================
     HISTORY REFS
  ============================================================== */

  const historyRecordedPhasesRef =
    useRef<
      Set<
        | "INSPECTION"
        | "WORK"
      >
    >(
      new Set()
    );

  const findingsHistoryRecordedRef =
    useRef(false);

  /* ==============================================================
     LOAD DATA
     
     IMPORTANT:
     
     Findings are now fetched independently of taskPhase.
     
     Previously findings were only fetched inside the INSPECTION
     branch. When the appointment moved to IN_PROGRESS, only
     workTasks were loaded, which left the findings state stale or
     empty.
  ============================================================== */

  const loadData =
    useCallback(
      async (
        showSkeleton: boolean = false
      ) => {
        if (
          showSkeleton
        ) {
          setTasksLoading(
            true
          );
        }

        try {
          /* --------------------------------------------------------
             CURRENT FINDINGS

             Findings remain attached to the appointment throughout
             the service lifecycle.

             Fetch them for both inspection and work phases.
          --------------------------------------------------------- */

          const findingsPromise =
            findingsApi.list(
              appointment.id
            );

          /* --------------------------------------------------------
             CURRENT TASKS
          --------------------------------------------------------- */

          if (
            taskPhase ===
            "INSPECTION"
          ) {
            const [
              tasksRes,
              findingsRes,
            ] =
              await Promise.all([
                inspectionTasksApi.list(
                  appointment.id
                ),
                findingsPromise,
              ]);

            setInspectionTasks(
              tasksRes?.error
                ? []
                : tasksRes?.data ||
                    []
            );

            setFindings(
              findingsRes?.error
                ? []
                : findingsRes?.data ||
                    []
            );
          } else {
            const [
              tasksRes,
              findingsRes,
            ] =
              await Promise.all([
                workTasksApi.list(
                  appointment.id
                ),
                findingsPromise,
              ]);

            setWorkTasks(
              tasksRes?.error
                ? []
                : tasksRes?.data ||
                    []
            );

            setFindings(
              findingsRes?.error
                ? []
                : findingsRes?.data ||
                    []
            );
          }

          /* --------------------------------------------------------
             HISTORY
          --------------------------------------------------------- */

          setHistoryLoading(
            true
          );

          const taskHistoryRes =
            await taskHistoryApi.list({
              appointmentId:
                appointment.id,

              phase:
                taskPhase,
            });

          setTaskHistory(
            taskHistoryRes?.error
              ? []
              : Array.isArray(
                  taskHistoryRes?.data
                )
                ? taskHistoryRes.data
                : []
          );

          /*
           * Historical findings remain INSPECTION history only.
           * Active findings are handled separately above.
           */
          if (
            taskPhase ===
            "INSPECTION"
          ) {
            const historyFindingsRes =
              await historyFindingsApi.list({
                appointmentId:
                  appointment.id,

                phase:
                  "INSPECTION",
              });

            setFindingHistory(
              historyFindingsRes?.error
                ? []
                : Array.isArray(
                    historyFindingsRes?.data
                  )
                  ? historyFindingsRes.data
                  : []
            );
          } else {
            setFindingHistory(
              []
            );
          }

          setHistoryLoading(
            false
          );
        } catch (
          err
        ) {
          console.error(
            "Failed to load service tracking data",
            err
          );

          setHistoryLoading(
            false
          );
        } finally {
          if (
            isInitial.current
          ) {
            setInitialLoading(
              false
            );

            isInitial.current =
              false;
          }

          setTasksLoading(
            false
          );
        }
      },
      [
        appointment.id,
        taskPhase,
      ]
    );

  /* ==============================================================
     INITIAL LOAD
  ============================================================== */

  useEffect(() => {
    void loadData(
      false
    );
  }, [
    loadData,
  ]);

  /* ==============================================================
     REALTIME TASKS
  ============================================================== */

  useRealtimeTask({
    appointmentId:
      appointment.id,

    isInspection:
      taskPhase ===
      "INSPECTION",

    onDataChanged: () =>
      loadData(true),
  });

  /* ==============================================================
     REALTIME APPOINTMENT
  ============================================================== */

  useRealtimeAppointment({
    onDataChanged:
      async () => {
        try {
          const res =
            await appointmentsApi.get(
              appointment.id
            );

          if (
            !res?.error
          ) {
            const nextAppointment =
              res?.data ||
              res;

            if (
              nextAppointment
            ) {
              setAppointment(
                nextAppointment
              );
            }
          }
        } catch (
          error
        ) {
          console.error(
            "Failed to refresh appointment:",
            error
          );
        } finally {
          void loadData(
            false
          );
        }
      },
  });

  /* ==============================================================
     REALTIME ACTIVE FINDINGS
     
     Changes to findings are reflected immediately in the desktop
     Service Tracking panel.
  ============================================================== */

  const findingsRealtimeReload =
    useCallback(
      () => {
        void loadData(
          true
        );
      },
      [
        loadData,
      ]
    );

  useRealtimeTable(
    "inspection_findings",
    `appointment_id=eq.${appointment.id}`,
    findingsRealtimeReload
  );

  /*
   * inspection_finding_parts contains inspection_finding_id rather
   * than appointment_id.
   *
   * Subscribe only to the findings currently belonging to this
   * appointment.
   */
  const findingIds =
    findings
      .map(
        (
          finding
        ) =>
          finding?.id
      )
      .filter(
        (
          id
        ): id is string =>
          Boolean(id)
      );

  const findingPartsFilter =
    findingIds.length >
    0
      ? `inspection_finding_id=in.(${findingIds.join(
          ","
        )})`
      : "inspection_finding_id=eq.00000000-0000-0000-0000-000000000000";

  useRealtimeTable(
    "inspection_finding_parts",
    findingPartsFilter,
    findingsRealtimeReload
  );

  /* ==============================================================
     RECORD TASK HISTORY
  ============================================================== */

  const recordTasksToHistory =
    useCallback(
      async (
        phase:
          | "INSPECTION"
          | "WORK",
        tasks: any[]
      ) => {
        if (
          historyRecordedPhasesRef.current.has(
            phase
          )
        ) {
          return;
        }

        const doneTasks =
          tasks.filter(
            (
              task
            ) =>
              task.status ===
              "DONE"
          );

        if (
          doneTasks.length ===
          0
        ) {
          return;
        }

        try {
          const payload =
            {
              appointmentId:
                appointment.id,

              phase,

              tasks:
                doneTasks.map(
                  (
                    task
                  ) => ({
                    title:
                      task.title,

                    durationMinutes:
                      task.durationMinutes,
                  })
                ),
            };

          const res =
            await taskHistoryApi.createMany(
              payload
            );

          if (
            res?.error
          ) {
            console.error(
              "Failed to record task history:",
              res.errorMessage
            );

            return;
          }

          historyRecordedPhasesRef.current.add(
            phase
          );
        } catch (
          err
        ) {
          console.error(
            "Failed to record task history:",
            err
          );
        }
      },
      [
        appointment.id,
      ]
    );

  /* ==============================================================
     ADD TASK
  ============================================================== */

  const handleAddTask =
    async (
      title: string,
      durationMinutes?: number,
      phase:
        | "INSPECTION"
        | "WORK" = taskPhase
    ) => {
      const trimmedTitle =
        title.trim();

      if (
        !trimmedTitle
      ) {
        toast.error(
          "Task title is required."
        );

        return false;
      }

      try {
        const res =
          phase ===
          "INSPECTION"
            ? await inspectionTasksApi.create({
                appointmentId:
                  appointment.id,

                title:
                  trimmedTitle,

                durationMinutes,
              })
            : await workTasksApi.create({
                appointmentId:
                  appointment.id,

                title:
                  trimmedTitle,

                durationMinutes,
              });

        if (
          res?.error
        ) {
          toast.error(
            res.errorMessage ||
              `Failed to add task: ${trimmedTitle}`
          );

          return false;
        }

        return true;
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            "Error adding task."
        );

        return false;
      }
    };

  /* ==============================================================
     ADD TEMPLATE TASKS
  ============================================================== */

  const handleAddTasksFromTemplate =
    async (
      taskList: Array<{
        title: string;
        durationMinutes?: number;
      }>
    ) => {
      if (
        !Array.isArray(
          taskList
        ) ||
        taskList.length ===
          0
      ) {
        return;
      }

      setIsAddingTemplateTasks(
        true
      );

      try {
        const sourcePhase =
          taskPhase;

        let addedCount =
          0;

        for (
          const task of taskList
        ) {
          const added =
            await handleAddTask(
              task.title,
              task.durationMinutes,
              sourcePhase
            );

          if (
            added
          ) {
            addedCount +=
              1;
          }
        }

        setTaskPickerOpen(
          false
        );

        await loadData(
          false
        );

        if (
          addedCount >
          0
        ) {
          toast.success(
            `${addedCount} task(s) added from template.`
          );
        }
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            "Error adding tasks from template."
        );
      } finally {
        setIsAddingTemplateTasks(
          false
        );
      }
    };

  /* ==============================================================
     ADD HISTORY TASKS
  ============================================================== */

  const handleAddTasksFromHistory =
    async (
      taskList: Array<{
        title: string;
        durationMinutes?: number;
      }>
    ) => {
      if (
        !Array.isArray(
          taskList
        ) ||
        taskList.length ===
          0
      ) {
        return;
      }

      setIsAddingHistoryTasks(
        true
      );

      try {
        const sourcePhase =
          taskPhase;

        let addedCount =
          0;

        for (
          const task of taskList
        ) {
          const added =
            await handleAddTask(
              task.title,
              task.durationMinutes,
              sourcePhase
            );

          if (
            added
          ) {
            addedCount +=
              1;
          }
        }

        setHistoryPickerOpen(
          false
        );

        await loadData(
          false
        );

        if (
          addedCount >
          0
        ) {
          toast.success(
            `${addedCount} task(s) added from history.`
          );
        }
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            "Error adding tasks from history."
        );
      } finally {
        setIsAddingHistoryTasks(
          false
        );
      }
    };

  /* ==============================================================
     UPDATE TASK
  ============================================================== */

  const handleTaskUpdate =
    async (
      taskId: string,
      status: string
    ) => {
      try {
        const res =
          taskPhase ===
          "INSPECTION"
            ? await inspectionTasksApi.updateStatus(
                taskId,
                status
              )
            : await workTasksApi.updateStatus(
                taskId,
                status
              );

        if (
          res.error
        ) {
          toast.error(
            res.errorMessage ||
              "Failed to update task."
          );
        }
      } catch (
        err: any
      ) {
        toast.error(
          err.message ||
            "Error updating task."
        );
      }
    };

  /* ==============================================================
     DELETE TASK
  ============================================================== */

  const handleTaskDelete =
    async (
      taskId: string
    ) => {
      try {
        const api =
          taskPhase ===
          "INSPECTION"
            ? inspectionTasksApi
            : workTasksApi;

        if (
          typeof api.delete !==
          "function"
        ) {
          toast.error(
            "Task deletion is not available."
          );

          return;
        }

        const res =
          await api.delete(
            taskId
          );

        if (
          res?.error
        ) {
          toast.error(
            res.errorMessage ||
              "Failed to delete task."
          );

          return;
        }

        toast.success(
          "Task deleted."
        );

        await loadData(
          true
        );
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            "Error deleting task."
        );
      }
    };

  /* ==============================================================
     SUBMIT TO BILLING
  ============================================================== */

  const handleSubmitToBilling =
    async () => {
      setIsSubmitting(
        true
      );

      setProcessingAction(
        "SUBMIT_TO_BILLING"
      );

      try {
        await recordTasksToHistory(
          "INSPECTION",
          inspectionTasks
        );

        /* ----------------------------------------------------------
           FINDINGS HISTORY
        ----------------------------------------------------------- */

        if (
          findings.length >
            0 &&
          !findingsHistoryRecordedRef.current
        ) {
          const historyRes =
            await historyFindingsApi.createMany({
              appointmentId:
                appointment.id,

              phase:
                "INSPECTION",

              findings:
                findings.map(
                  (
                    finding: any
                  ) => ({
                    description:
                      String(
                        finding?.description ||
                          ""
                      ).trim(),

                    parts:
                      Array.isArray(
                        finding?.parts
                      )
                        ? finding.parts.map(
                            (
                              part: any
                            ) => ({
                              partName:
                                String(
                                  part?.partName ||
                                    "Part"
                                ).trim(),

                              quantity:
                                Math.max(
                                  1,
                                  Number(
                                    part?.quantity
                                  ) ||
                                    1
                                ),

                              priceAtTime:
                                Math.max(
                                  0,
                                  Number(
                                    part?.priceAtTime
                                  ) ||
                                    0
                                ),

                              isPms:
                                Boolean(
                                  part?.isPms
                                ),
                            })
                          )
                        : [],
                  })
                ),
            });

          if (
            !historyRes?.error
          ) {
            findingsHistoryRecordedRef.current =
              true;
          }
        }

        /* ----------------------------------------------------------
           ESTIMATE
        ----------------------------------------------------------- */

        let est =
          estimate;

        if (
          !est
        ) {
          const genRes =
            await estimatesApi.create(
              appointment.id
            );

          if (
            genRes?.error
          ) {
            toast.error(
              genRes.errorMessage ||
                "Failed to generate estimate."
            );

            return;
          }

          est =
            genRes.data;

          setEstimate(
            est
          );
        }

        await loadData(
          false
        );

        toast.success(
          "Estimate submitted to billing."
        );

        onStatusChanged();

        onBack();
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            "Error submitting estimate."
        );
      } finally {
        setIsSubmitting(
          false
        );

        setProcessingAction(
          null
        );

        setSendConfirmOpen(
          false
        );
      }
    };

  /* ==============================================================
     INSPECTION DONE
  ============================================================== */

  const handleInspectionDone =
    () => {
      setFindingModalOpen(
        true
      );
    };

  /* ==============================================================
     FINDINGS SAVED
  ============================================================== */

  const handleFindingsSaved =
    async () => {
      setFindingModalOpen(
        false
      );

      await loadData(
        true
      );

      toast.success(
        "Findings saved. You can now generate the estimate by clicking 'Submit to Billing'."
      );
    };

  /* ==============================================================
     ADD FINDINGS
  ============================================================== */

  const handleAddFindings =
    async (
      selectedFindings: Array<{
        description: string;
        parts: Array<{
          partName: string;
          quantity: number;
          priceAtTime: number;
          isPms: boolean;
        }>;
      }>
    ) => {
      if (
        selectedFindings.length ===
        0
      ) {
        return;
      }

      try {
        const res =
          await findingsApi.create({
            appointmentId:
              appointment.id,

            findings:
              selectedFindings,
          });

        if (
          res?.error
        ) {
          toast.error(
            res.errorMessage ||
              "Failed to add findings."
          );

          return;
        }

        await loadData(
          true
        );

        toast.success(
          `${selectedFindings.length} finding(s) added.`
        );
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            "Error adding findings."
        );
      }
    };

  /* ==============================================================
     ADD HISTORY FINDINGS
  ============================================================== */

  const handleAddHistoryFindings =
    async (
      selectedFindings: Array<{
        description: string;
        parts: Array<{
          partName: string;
          quantity: number;
          priceAtTime: number;
          isPms: boolean;
        }>;
      }>
    ) => {
      setIsAddingHistoryFindings(
        true
      );

      try {
        await handleAddFindings(
          selectedFindings
        );

        setHistoryFindingPickerOpen(
          false
        );
      } finally {
        setIsAddingHistoryFindings(
          false
        );
      }
    };

  /* ==============================================================
     COMPLETE WORK
  ============================================================== */

  const handleWorkDone =
    async () => {
      setIsSubmitting(
        true
      );

      setProcessingAction(
        "COMPLETE_WORK"
      );

      try {
        const billRes =
          await finalBillsApi.generate(
            appointment.id
          );

        if (
          billRes.error
        ) {
          toast.error(
            billRes.errorMessage ||
              "Failed to generate Final Cost."
          );
        } else {
          toast.success(
            "Job completed! Final Cost generated."
          );

          await recordTasksToHistory(
            "WORK",
            workTasks
          );

          await appointmentsApi.updateStatus(
            appointment.id,
            "COMPLETED"
          );

          onStatusChanged();

          onBack();
        }
      } catch (
        err: any
      ) {
        toast.error(
          err.message ||
            "Error completing job."
        );
      } finally {
        setIsSubmitting(
          false
        );

        setProcessingAction(
          null
        );

        setDoneConfirmOpen(
          false
        );
      }
    };

  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    initialLoading
  ) {
    return (
      <LoadingSpinner />
    );
  }

  /* ==============================================================
     SERVICE TOTAL
  ============================================================== */

  const servicePrice =
    appointment.services?.reduce(
      (
        sum: number,
        service: any
      ) =>
        sum +
        parseFloat(
          service.basePrice ||
            0
        ),
      0
    ) || 0;

  /* ==============================================================
     FINDINGS TOTAL
  ============================================================== */

  const findingsTotal =
    findings.reduce(
      (
        sum: number,
        finding: any
      ) => {
        const partsTotal =
          (
            finding.parts ||
            []
          ).reduce(
            (
              partSum: number,
              part: any
            ) => {
              if (
                part.isPms
              ) {
                return partSum;
              }

              return (
                partSum +
                (
                  Number(
                    part.priceAtTime
                  ) ||
                  0
                ) *
                  (
                    Number(
                      part.quantity
                    ) ||
                    1
                  )
              );
            },
            0
          );

        return (
          sum +
          partsTotal
        );
      },
      0
    );

  const subtotal =
    servicePrice +
    findingsTotal;

  /* ==============================================================
     HISTORY SEARCH
  ============================================================== */

  const normalizedHistorySearch =
    historySearch
      .trim()
      .toLowerCase();

  const filteredTaskHistory =
    taskHistory.filter(
      (
        item
      ) => {
        if (
          !normalizedHistorySearch
        ) {
          return true;
        }

        return [
          item?.title,
          item?.appointment
            ?.trackingNumber,
          item?.customer
            ?.fullname,
          item?.vehicle
            ?.make,
          item?.vehicle
            ?.model,
          item?.vehicle
            ?.plateNumber,
          item?.phase,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(
            normalizedHistorySearch
          );
      }
    );

  const filteredFindingHistory =
    findingHistory.filter(
      (
        item
      ) => {
        if (
          !normalizedHistorySearch
        ) {
          return true;
        }

        return [
          item?.description,
          item?.appointment
            ?.trackingNumber,
          item?.customer
            ?.fullname,
          item?.vehicle
            ?.make,
          item?.vehicle
            ?.model,
          item?.vehicle
            ?.plateNumber,
          item?.phase,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(
            normalizedHistorySearch
          );
      }
    );

  const displayedTaskHistory =
    filteredTaskHistory.slice(
      0,
      8
    );

  const displayedFindingHistory =
    filteredFindingHistory.slice(
      0,
      6
    );

  /* ==============================================================
     STATUS INDEX
  ============================================================== */

  const currentStatusIdx =
    TRACKING_STATUSES.indexOf(
      appointment.status
    );

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-2.5 sm:p-4 lg:p-5">
        {/* ========================================================
            WORK ORDER HEADER
        ========================================================= */}

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={
                    onBack
                  }
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
                      status={
                        appointment.status ||
                        "PENDING"
                      }
                      className="shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    />
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                    {appointment.trackingNumber
                      ? `Tracking #${appointment.trackingNumber}`
                      : "Current service appointment"}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  BOOKED SERVICES
              =================================================== */}

              <div className="mt-4">
                {Array.isArray(
                  appointment.services
                ) &&
                appointment.services
                  .length >
                  0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {appointment.services.map(
                      (
                        service: any
                      ) => (
                        <ServiceCard
                          key={
                            service.id
                          }
                          serviceId={
                            service.id
                          }
                        />
                      )
                    )}
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

              {/* ==================================================
                  CUSTOMER / VEHICLE
              =================================================== */}

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <CustomerCard
                  customerId={
                    appointment.customerId
                  }
                />

                <VehicleCard
                  vehicleId={
                    appointment.vehicleId
                  }
                  customerId={
                    appointment.customerId
                  }
                />
              </div>

              {/* ==================================================
                  SCHEDULE
              =================================================== */}

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
                        {
                          appointment.appointmentDate
                        }
                        {appointment.appointmentTime
                          ? ` • ${appointment.appointmentTime}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="flex min-w-0 items-start gap-2 sm:max-w-[55%]">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                      <p className="text-xs leading-5 text-muted-foreground">
                        {
                          appointment.notes
                        }
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
                onClick={() =>
                  setGroupManagerOpen(
                    true
                  )
                }
                className="h-11 rounded-md px-4 md:h-9"
              >
                <Settings className="mr-2 h-4 w-4" />
                Default Tasks
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDefaultFindingManagerOpen(
                    true
                  )
                }
                className="h-11 rounded-md px-4 md:h-9"
              >
                <Settings className="mr-2 h-4 w-4" />
                Default Findings
              </Button>
            </div>
          </div>
        </section>

        {/* ========================================================
            SERVICE JOURNEY
        ========================================================= */}

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-3 py-2.5 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Service Journey
            </p>
          </div>

          <div className="overflow-x-auto px-3 py-3.5 sm:px-4">
            <div className="flex min-w-[620px] items-start">
              {TRACKING_STATUSES.map(
                (
                  status,
                  index
                ) => {
                  const completed =
                    currentStatusIdx >
                    index;

                  const current =
                    currentStatusIdx ===
                    index;

                  return (
                    <React.Fragment
                      key={
                        status
                      }
                    >
                      <div className="flex min-w-[100px] flex-col items-center">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all",

                            completed ||
                              current
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted text-muted-foreground",

                            current &&
                              "ring-4 ring-primary/10"
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index +
                            1
                          )}
                        </div>

                        <span
                          className={cn(
                            "mt-2 text-center text-[10px] font-semibold uppercase tracking-wide",

                            current
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {
                            STATUS_LABELS[
                              status
                            ]
                          }
                        </span>
                      </div>

                      {index <
                        TRACKING_STATUSES.length -
                          1 && (
                        <div
                          className={cn(
                            "mt-5 h-px flex-1",

                            currentStatusIdx >
                              index
                              ? "bg-primary"
                              : "bg-border"
                          )}
                        />
                      )}
                    </React.Fragment>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* ========================================================
            MAIN WORKSPACE
        ========================================================= */}

        <div
          className={cn(
            "grid gap-3.5",

            isInspection ||
              isWaitingForApproval
              ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]"
              : "grid-cols-1"
          )}
        >
          {/* ======================================================
              TASK WORKSPACE
          ======================================================= */}

          <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-3 sm:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Wrench className="h-5 w-5" />
                  </span>

                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {taskPhase ===
                      "INSPECTION"
                        ? "Inspection Checklist"
                        : "Repair Operations"}
                    </h2>

                    <p className="text-xs text-muted-foreground">
                      {
                        currentTasks.filter(
                          (
                            task
                          ) =>
                            task.status ===
                            "DONE"
                        ).length
                      }{" "}
                      of{" "}
                      {
                        currentTasks.length
                      }{" "}
                      tasks completed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setHistoryPickerOpen(
                        true
                      )
                    }
                    className="h-11 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <History className="mr-2 h-4 w-4" />
                    History
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTaskPickerOpen(
                        true
                      )
                    }
                    className="h-11 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Templates
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setAddTaskModalOpen(
                        true
                      )
                    }
                    className="h-11 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 p-3 sm:p-4">
              {currentTasks.length >
                0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <OverallProgressBar
                    tasks={
                      currentTasks
                    }
                  />
                </div>
              )}

              {tasksLoading &&
              currentTasks.length ===
                0 ? (
                <div className="space-y-3">
                  {Array.from({
                    length: 3,
                  }).map(
                    (
                      _,
                      index
                    ) => (
                      <TaskCardSkeleton
                        key={
                          index
                        }
                      />
                    )
                  )}
                </div>
              ) : tasksLoading &&
                currentTasks.length >
                  0 ? (
                <div className="space-y-3">
                  {currentTasks.map(
                    (
                      _,
                      index
                    ) => (
                      <TaskCardSkeleton
                        key={
                          index
                        }
                      />
                    )
                  )}
                </div>
              ) : currentTasks.length ===
                0 ? (
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
                    onClick={() =>
                      setAddTaskModalOpen(
                        true
                      )
                    }
                    className="mt-4 h-11 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentTasks.map(
                    (
                      task
                    ) => (
                      <TaskCard
                        key={
                          task.id
                        }
                        task={
                          task
                        }
                        onUpdate={
                          handleTaskUpdate
                        }
                        onDelete={
                          handleTaskDelete
                        }
                        onEdit={() => {}}
                        appointmentId={
                          appointment.id
                        }
                        isInProgress={
                          isInProgress
                        }
                      />
                    )
                  )}
                </div>
              )}

              {isInspection &&
                allTasksDone &&
                !isCompleted && (
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="button"
                      onClick={
                        handleInspectionDone
                      }
                      className="h-11 w-full rounded-md sm:w-auto sm:px-6 md:h-9"
                      disabled={
                        isSubmitting
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Done — Record Findings
                    </Button>
                  </div>
                )}

              {isInProgress &&
                allTasksDone &&
                !isCompleted && (
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="button"
                      onClick={() =>
                        setDoneConfirmOpen(
                          true
                        )
                      }
                      className="h-11 w-full rounded-md bg-green-600 text-white hover:bg-green-700 sm:w-auto sm:px-6 md:h-9"
                      disabled={
                        isSubmitting
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete Work
                    </Button>
                  </div>
                )}
            </div>
          </section>

          {/* ======================================================
              ESTIMATE
          ======================================================= */}

          {(isInspection ||
            isWaitingForApproval) && (
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
                            ?.map(
                              (
                                service: any
                              ) =>
                                service.name
                            )
                            .join(
                              ", "
                            ) ||
                            "Service"}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Base service
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-sm font-medium">
                        ₱
                        {
                          servicePrice.toFixed(
                            2
                          )
                        }
                      </span>
                    </div>

                    <Separator />

                    {findings.map(
                      (
                        finding: any
                      ) => (
                        <div
                          key={
                            finding.id
                          }
                          className="space-y-2"
                        >
                          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {
                              finding.description
                            }
                          </p>

                          {finding.parts &&
                            finding.parts.map(
                              (
                                part: any,
                                index: number
                              ) => (
                                <div
                                  key={
                                    index
                                  }
                                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                                >
                                  <span className="min-w-0 truncate text-xs">
                                    {
                                      part.quantity
                                    }
                                    x{" "}
                                    {
                                      part.partName
                                    }
                                    {part.isPms
                                      ? " (PMS)"
                                      : ""}
                                  </span>

                                  <span className="shrink-0 font-mono text-xs">
                                    {part.isPms
                                      ? "₱0.00"
                                      : `₱${(
                                          Number(
                                            part.priceAtTime
                                          ) *
                                          Number(
                                            part.quantity
                                          )
                                        ).toFixed(
                                          2
                                        )}`}
                                  </span>
                                </div>
                              )
                            )}
                        </div>
                      )
                    )}

                    <Separator />

                    <div className="rounded-lg bg-primary/5 p-4">
                      <div className="flex items-end justify-between gap-4">
                        <span className="text-sm font-semibold">
                          Subtotal
                        </span>

                        <span className="font-mono text-2xl font-bold tracking-tight text-primary">
                          ₱
                          {
                            subtotal.toFixed(
                              2
                            )
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="border-t border-border p-3 sm:p-4">
                  <Button
                    type="button"
                    onClick={() =>
                      setSendConfirmOpen(
                        true
                      )
                    }
                    className="h-11 w-full rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    {isSubmitting &&
                    processingAction ===
                      "SUBMIT_TO_BILLING"
                      ? "Submitting..."
                      : "Submit to Billing"}
                  </Button>
                </div>
              </section>
            </aside>
          )}
        </div>

        {/* ========================================================
            ACTIVE FINDINGS
             
            FINDINGS ARE NOW ALSO DISPLAYED IN IN_PROGRESS.
            
            In IN_PROGRESS the existing FindingsList becomes
            read-only so staff can review the findings used during
            inspection without changing them after work has started.
        ========================================================= */}

        {showFindings && (
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    {isInProgress
                      ? "Recorded Findings"
                      : "Inspection Findings"}
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    {isInProgress
                      ? "Findings recorded during inspection for this active repair."
                      : "Record observations, reuse known findings, and review previous findings."}
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full text-[10px]"
                >
                  {findings.length}{" "}
                  {findings.length ===
                  1
                    ? "Finding"
                    : "Findings"}
                </Badge>
              </div>

              {isInspection && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setHistoryFindingPickerOpen(
                        true
                      )
                    }
                    className="h-10 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <History className="mr-2 h-4 w-4" />
                    Previous Findings
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDefaultFindingPickerOpen(
                        true
                      )
                    }
                    className="h-10 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Default Findings
                  </Button>

                  <Button
                    type="button"
                    onClick={() =>
                      setFindingModalOpen(
                        true
                      )
                    }
                    className="h-10 rounded-md md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Finding
                  </Button>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <FindingsList
                findings={
                  findings
                }
                appointmentId={
                  appointment.id
                }
                readOnly={
                  findingsReadOnly
                }
                onFindingsUpdated={() =>
                  loadData(true)
                }
              />
            </div>
          </section>
        )}

        {/* =========================================================
            APPOINTMENT HISTORY
        ========================================================= */}

        {(taskHistory.length >
          0 ||
          findingHistory.length >
            0) && (
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
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
                      value={
                        historySearch
                      }
                      onChange={(
                        event
                      ) =>
                        setHistorySearch(
                          event.target
                            .value
                        )
                      }
                      placeholder="Search history..."
                      aria-label="Search appointment history"
                      className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-base shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:text-sm"
                      disabled={
                        isSubmitting
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setHistoryOpen(
                        (
                          value
                        ) =>
                          !value
                      )
                    }
                    className="h-10 shrink-0 rounded-md px-3 text-xs md:h-9"
                    disabled={
                      isSubmitting
                    }
                  >
                    {historyOpen
                      ? "Collapse"
                      : "View History"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full text-[10px]"
                >
                  {
                    taskHistory.length
                  }{" "}
                  {taskHistory.length ===
                  1
                    ? "task"
                    : "tasks"}
                </Badge>

                {taskPhase ===
                  "INSPECTION" && (
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[10px]"
                  >
                    {
                      findingHistory.length
                    }{" "}
                    {findingHistory.length ===
                    1
                      ? "finding"
                      : "findings"}
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
                <section className="min-w-0 rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />

                      <p className="text-xs font-semibold text-foreground">
                        Task History
                      </p>
                    </div>

                    <span className="text-[10px] text-muted-foreground">
                      {
                        filteredTaskHistory.length
                      }{" "}
                      shown
                    </span>
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
                    {displayedTaskHistory.length ===
                    0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        No task history matches this search.
                      </p>
                    ) : (
                      displayedTaskHistory.map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.id
                            }
                            className="rounded-md border border-border bg-card p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground">
                                  {
                                    item.title ||
                                    "Task"
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                  <span>
                                    {
                                      item.phase ||
                                      "WORK"
                                    }
                                  </span>

                                  {item.durationMinutes !=
                                    null && (
                                    <span>
                                      {
                                        item.durationMinutes
                                      }{" "}
                                      min
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
                                {new Date(
                                  item.completedAt
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                </section>

                {taskPhase ===
                  "INSPECTION" && (
                  <section className="min-w-0 rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />

                        <p className="text-xs font-semibold text-foreground">
                          Finding History
                        </p>
                      </div>

                      <span className="text-[10px] text-muted-foreground">
                        {
                          filteredFindingHistory.length
                        }{" "}
                        shown
                      </span>
                    </div>

                    <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
                      {displayedFindingHistory.length ===
                      0 ? (
                        <p className="py-8 text-center text-xs text-muted-foreground">
                          No finding history matches this search.
                        </p>
                      ) : (
                        displayedFindingHistory.map(
                          (
                            item
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="rounded-md border border-border bg-card p-3"
                            >
                              <p className="whitespace-pre-wrap text-xs font-medium leading-5 text-foreground">
                                {
                                  item.description ||
                                  "Finding"
                                }
                              </p>

                              {item.parts?.length >
                                0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {item.parts
                                    .slice(
                                      0,
                                      6
                                    )
                                    .map(
                                      (
                                        part: any
                                      ) => (
                                        <Badge
                                          key={
                                            part.id
                                          }
                                          variant="secondary"
                                          className="rounded-md text-[9px]"
                                        >
                                          {
                                            part.quantity
                                          }
                                          x{" "}
                                          {
                                            part.partName
                                          }
                                        </Badge>
                                      )
                                    )}
                                </div>
                              )}

                              {item.recordedAt && (
                                <p className="mt-2 text-[10px] text-muted-foreground">
                                  {new Date(
                                    item.recordedAt
                                  ).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )
                        )
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            EXISTING MODALS
        ========================================================= */}

        <AddTaskModal
          open={
            addTaskModalOpen
          }
          onOpenChange={
            setAddTaskModalOpen
          }
          onAddTask={
            handleAddTask
          }
        />

        <FindingModal
          open={
            findingModalOpen
          }
          onClose={() =>
            setFindingModalOpen(
              false
            )
          }
          appointmentId={
            appointment.id
          }
          onSaved={
            handleFindingsSaved
          }
        />

        <DefaultGroupManagerModal
          open={
            groupManagerOpen
          }
          onOpenChange={
            setGroupManagerOpen
          }
          onSaved={() => {
            setTaskSourceVersion(
              (
                value
              ) =>
                value +
                1
            );
          }}
        />

        <DefaultTaskPickerModal
          key={`default-task-picker-${taskSourceVersion}`}
          open={
            taskPickerOpen
          }
          onOpenChange={
            setTaskPickerOpen
          }
          onAddTasks={
            handleAddTasksFromTemplate
          }
          isAdding={
            isAddingTemplateTasks
          }
          phase={
            taskPhase
          }
        />

        <HistoryTaskPickerModal
          open={
            historyPickerOpen
          }
          onOpenChange={
            setHistoryPickerOpen
          }
          onAddTasks={
            handleAddTasksFromHistory
          }
          isAdding={
            isAddingHistoryTasks
          }
          phase={
            taskPhase
          }
          currentAppointmentId={
            appointment.id
          }
        />

        <DefaultFindingManagerModal
          open={
            defaultFindingManagerOpen
          }
          onOpenChange={
            setDefaultFindingManagerOpen
          }
          onSaved={() => {
            setFindingSourceVersion(
              (
                value
              ) =>
                value +
                1
            );
          }}
        />

        <DefaultFindingPickerModal
          key={`default-finding-picker-${findingSourceVersion}`}
          open={
            defaultFindingPickerOpen
          }
          onOpenChange={
            setDefaultFindingPickerOpen
          }
          onAddFindings={
            handleAddFindings
          }
          isAdding={
            false
          }
        />

        <HistoryFindingPickerModal
          open={
            historyFindingPickerOpen
          }
          onOpenChange={
            setHistoryFindingPickerOpen
          }
          onAddFindings={
            handleAddHistoryFindings
          }
          isAdding={
            isAddingHistoryFindings
          }
          phase="INSPECTION"
          excludeAppointmentId={
            appointment.id
          }
        />

        <ConfirmationDialog
          open={
            sendConfirmOpen
          }
          onOpenChange={
            setSendConfirmOpen
          }
          title="Submit to Billing"
          description="This will send the estimated cost to billing for customer approval. Continue?"
          onConfirm={
            handleSubmitToBilling
          }
          confirmText="Confirm & Submit"
        />

        <ConfirmationDialog
          open={
            doneConfirmOpen
          }
          onOpenChange={
            setDoneConfirmOpen
          }
          title="Complete Work"
          description="All repair tasks are done. This will generate the Final Cost and complete the job. Continue?"
          onConfirm={
            handleWorkDone
          }
          confirmText="Complete Job"
        />

        {/* ========================================================
            LONG-RUNNING OPERATION LOADING MODAL
        ========================================================= */}

        <ServiceTrackingLoadingModal
          open={
            isSubmitting
          }
          action={
            processingAction ||
            "SUBMIT_TO_BILLING"
          }
        />
      </div>
    </div>
  );
}