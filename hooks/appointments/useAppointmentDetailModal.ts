'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { appointmentsApi } from '@/lib/appointments/appointments';
import { customersApi } from '@/lib/customers/customers';
import { vehiclesApi } from '@/lib/customers/vehicles';
import { servicesApi } from '@/lib/services/services';

import { inspectionTasksApi } from '@/lib/service-tracking/inspection-tasks';
import { workTasksApi } from '@/lib/service-tracking/work-tasks';
import { findingsApi } from '@/lib/service-tracking/findings';
import { estimatesApi } from '@/lib/service-tracking/estimates';

import { finalBillsApi } from '@/lib/payments/final-bills';

import { useRealtimeTable } from '@/connections/useRealtimeTable';

const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  UNDER_INSPECTION: 2,
  WAITING_FOR_APPROVAL: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  CANCELLED: -1,
};

type LoadMode = 'initial' | 'refresh';

function unwrapData<T = any>(
  response: any,
  fallback: T
): T {
  if (
    response === null ||
    response === undefined
  ) {
    return fallback;
  }

  if (
    typeof response === 'object' &&
    Object.prototype.hasOwnProperty.call(
      response,
      'data'
    )
  ) {
    return response.data ?? fallback;
  }

  return response ?? fallback;
}

function asObject(
  response: any
): any {
  const value = unwrapData(
    response,
    null
  );

  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return null;
}

function asArray<T = any>(
  response: any
): T[] {
  const value = unwrapData<any>(
    response,
    []
  );

  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    Array.isArray(value.data)
  ) {
    return value.data;
  }

  if (
    value &&
    Array.isArray(value.items)
  ) {
    return value.items;
  }

  return [];
}

function getValue(
  object: any,
  keys: string[]
) {
  if (!object) {
    return null;
  }

  for (const key of keys) {
    const value =
      object?.[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
}

export function useAppointmentDetailModal(
  appointmentId?: string | null
) {
  // ===========================================================================
  // MODAL STATE
  // ===========================================================================

  const [open, setOpen] =
    useState(false);

  // ===========================================================================
  // LOADING
  // ===========================================================================

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  // ===========================================================================
  // APPOINTMENT
  // ===========================================================================

  const [appointment, setAppointment] =
    useState<any>(null);

  // ===========================================================================
  // RELATED DATA
  // ===========================================================================

  const [customer, setCustomer] =
    useState<any>(null);

  const [vehicle, setVehicle] =
    useState<any>(null);

  const [services, setServices] =
    useState<any[]>([]);

  // ===========================================================================
  // HISTORY
  // ===========================================================================

  const [history, setHistory] =
    useState<any[]>([]);

  // ===========================================================================
  // SERVICE TRACKING
  // ===========================================================================

  const [
    inspectionTasks,
    setInspectionTasks,
  ] = useState<any[]>([]);

  const [
    workTasks,
    setWorkTasks,
  ] = useState<any[]>([]);

  const [findings, setFindings] =
    useState<any[]>([]);

  // ===========================================================================
  // BILLING
  // ===========================================================================

  const [estimate, setEstimate] =
    useState<any>(null);

  const [finalBill, setFinalBill] =
    useState<any>(null);

  // ===========================================================================
  // QUEUE
  // ===========================================================================

  const [queue, setQueue] =
    useState<any[]>([]);

  // ===========================================================================
  // REFS
  // ===========================================================================

  const mountedRef =
    useRef(true);

  const refreshTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const requestIdRef =
    useRef(0);

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (
        refreshTimerRef.current
      ) {
        clearTimeout(
          refreshTimerRef.current
        );

        refreshTimerRef.current =
          null;
      }
    };
  }, []);

  // ===========================================================================
  // RESET
  // ===========================================================================

  const resetData =
    useCallback(() => {
      setAppointment(null);
      setCustomer(null);
      setVehicle(null);
      setServices([]);
      setHistory([]);
      setInspectionTasks([]);
      setWorkTasks([]);
      setFindings([]);
      setEstimate(null);
      setFinalBill(null);
      setQueue([]);
    }, []);

  // ===========================================================================
  // LOAD SECONDARY DATA
  //
  // IMPORTANT:
  // This function is deliberately independent from the main loading state.
  // Nothing here is allowed to keep the modal's main spinner visible.
  // ===========================================================================

  const loadSecondaryData =
    useCallback(
      async (
        appointmentData: any,
        requestId: number
      ) => {
        if (
          !appointmentData ||
          !appointmentId
        ) {
          return;
        }

        const customerId =
          appointmentData?.customerId;

        const vehicleId =
          appointmentData?.vehicleId;

        const status =
          String(
            appointmentData?.status ||
              'PENDING'
          );

        const appointmentDate =
          appointmentData?.appointmentDate;

        // =====================================================================
        // HISTORY
        // =====================================================================

        try {
          const response =
            await appointmentsApi.getHistory(
              appointmentId
            );

          if (
            !mountedRef.current ||
            requestIdRef.current !==
              requestId
          ) {
            return;
          }

          setHistory(
            asArray(response)
          );
        } catch (error) {
          console.error(
            '[Appointment Detail] History load failed:',
            error
          );

          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setHistory([]);
          }
        }

        // =====================================================================
        // CUSTOMER
        // =====================================================================

        if (customerId) {
          try {
            const response =
              await customersApi.get(
                customerId
              );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setCustomer(
                asObject(response)
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Customer load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setCustomer(null);
            }
          }
        }

        // =====================================================================
        // VEHICLE
        // =====================================================================

        if (
          customerId &&
          vehicleId
        ) {
          try {
            const response =
              await vehiclesApi.get(
                customerId,
                vehicleId
              );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setVehicle(
                asObject(response)
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Vehicle load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setVehicle(null);
            }
          }
        }

        // =====================================================================
        // SERVICES
        // =====================================================================

        try {
          const serviceRefs =
            Array.isArray(
              appointmentData?.services
            )
              ? appointmentData.services
              : [];

          const resolvedServices =
            await Promise.all(
              serviceRefs.map(
                async (
                  serviceRef: any
                ) => {
                  try {
                    // Already expanded service object.
                    if (
                      serviceRef &&
                      typeof serviceRef ===
                        'object'
                    ) {
                      return serviceRef;
                    }

                    const serviceId =
                      String(
                        serviceRef ||
                          ''
                      ).trim();

                    if (
                      !serviceId
                    ) {
                      return serviceRef;
                    }

                    const response =
                      await servicesApi.get(
                        serviceId
                      );

                    return (
                      asObject(
                        response
                      ) ??
                      serviceRef
                    );
                  } catch {
                    // Preserve original service reference.
                    return serviceRef;
                  }
                }
              )
            );

          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setServices(
              resolvedServices
            );
          }
        } catch (error) {
          console.error(
            '[Appointment Detail] Services load failed:',
            error
          );

          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setServices([]);
          }
        }

        // =====================================================================
        // INSPECTION TASKS
        // =====================================================================

        if (
          status ===
            'UNDER_INSPECTION' ||
          status ===
            'WAITING_FOR_APPROVAL' ||
          status ===
            'IN_PROGRESS' ||
          status ===
            'COMPLETED'
        ) {
          try {
            const response =
              await inspectionTasksApi.list(
                appointmentId
              );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setInspectionTasks(
                asArray(response)
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Inspection tasks load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setInspectionTasks([]);
            }
          }
        } else {
          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setInspectionTasks([]);
          }
        }

        // =====================================================================
        // WORK TASKS
        // =====================================================================

        if (
          status ===
            'IN_PROGRESS' ||
          status ===
            'COMPLETED'
        ) {
          try {
            const response =
              await workTasksApi.list(
                appointmentId
              );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setWorkTasks(
                asArray(response)
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Work tasks load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setWorkTasks([]);
            }
          }
        } else {
          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setWorkTasks([]);
          }
        }

        // =====================================================================
        // FINDINGS
        // =====================================================================

        if (
          status ===
            'UNDER_INSPECTION' ||
          status ===
            'WAITING_FOR_APPROVAL' ||
          status ===
            'IN_PROGRESS' ||
          status ===
            'COMPLETED'
        ) {
          try {
            const response =
              await findingsApi.list(
                appointmentId
              );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setFindings(
                asArray(response)
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Findings load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setFindings([]);
            }
          }
        } else {
          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setFindings([]);
          }
        }

        // =====================================================================
        // ESTIMATE
        // =====================================================================

        if (
          status ===
            'WAITING_FOR_APPROVAL' ||
          status ===
            'IN_PROGRESS' ||
          status ===
            'COMPLETED'
        ) {
          try {
            const response =
              await estimatesApi.list(
                appointmentId
              );

            let estimateList =
              asArray(response);

            let latestEstimate =
              estimateList[0] ??
              null;

            if (
              latestEstimate?.id
            ) {
              try {
                const fullResponse =
                  await estimatesApi.get(
                    latestEstimate.id
                  );

                const fullEstimate =
                  asObject(
                    fullResponse
                  );

                if (
                  fullEstimate
                ) {
                  latestEstimate =
                    fullEstimate;
                }
              } catch (error) {
                console.error(
                  '[Appointment Detail] Full estimate load failed:',
                  error
                );
              }
            }

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setEstimate(
                latestEstimate
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Estimate load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setEstimate(null);
            }
          }
        } else {
          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setEstimate(null);
          }
        }

        // =====================================================================
        // Final Cost
        // =====================================================================

        if (
          status ===
          'COMPLETED'
        ) {
          try {
            const response =
              await finalBillsApi.list(
                appointmentId
              );

            const billList =
              asArray(response);

            let latestBill =
              billList[0] ??
              null;

            if (
              latestBill?.id
            ) {
              try {
                const fullResponse =
                  await finalBillsApi.get(
                    latestBill.id
                  );

                const fullBill =
                  asObject(
                    fullResponse
                  );

                if (
                  fullBill
                ) {
                  latestBill =
                    fullBill;
                }
              } catch (error) {
                console.error(
                  '[Appointment Detail] Full Final Cost load failed:',
                  error
                );
              }
            }

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setFinalBill(
                latestBill
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Final Cost load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setFinalBill(null);
            }
          }
        } else {
          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setFinalBill(null);
          }
        }

        // =====================================================================
        // QUEUE
        //
        // Use the same backend endpoint that the existing queue system uses.
        // Queue failure must never affect the modal loading state.
        // =====================================================================

        if (
          status ===
            'CONFIRMED' &&
          appointmentDate
        ) {
          try {
            const response =
              await fetch(
                `/api/service-queue?date=${encodeURIComponent(
                  appointmentDate
                )}`,
                {
                  method:
                    'GET',
                  cache:
                    'no-store',
                }
              );

            if (
              !response.ok
            ) {
              throw new Error(
                `Queue request failed with ${response.status}`
              );
            }

            const payload =
              await response.json();

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setQueue(
                asArray(
                  payload
                )
              );
            }
          } catch (error) {
            console.error(
              '[Appointment Detail] Queue load failed:',
              error
            );

            if (
              mountedRef.current &&
              requestIdRef.current ===
                requestId
            ) {
              setQueue([]);
            }
          }
        } else {
          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setQueue([]);
          }
        }
      },
      [appointmentId]
    );

  // ===========================================================================
  // LOAD APPOINTMENT
  //
  // IMPORTANT:
  // Loading ends immediately after the appointment itself is received.
  // Secondary data continues in the background.
  // ===========================================================================

  const loadData =
    useCallback(
      async (
        mode: LoadMode = 'initial'
      ) => {
        if (!appointmentId) {
          return;
        }

        const requestId =
          ++requestIdRef.current;

        if (mode === 'initial') {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        try {
          // ===================================================================
          // PRIMARY REQUEST
          // ===================================================================

          const response =
            await appointmentsApi.get(
              appointmentId
            );

          const appointmentData =
            asObject(
              response
            );

          if (
            !mountedRef.current ||
            requestIdRef.current !==
              requestId
          ) {
            return;
          }

          if (
            !appointmentData
          ) {
            setAppointment(
              null
            );

            return;
          }

          // ===================================================================
          // SET APPOINTMENT IMMEDIATELY
          // ===================================================================

          setAppointment(
            appointmentData
          );

          // ===================================================================
          // CRITICAL:
          //
          // STOP THE MAIN LOADING SPINNER NOW.
          //
          // The modal no longer waits for history/customer/vehicle/tasks/etc.
          // ===================================================================

          setLoading(false);
          setRefreshing(false);

          // ===================================================================
          // SECONDARY REQUESTS RUN IN BACKGROUND
          // ===================================================================

          void loadSecondaryData(
            appointmentData,
            requestId
          );
        } catch (error) {
          console.error(
            '[Appointment Detail] Appointment load failed:',
            error
          );

          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setAppointment(
              null
            );
          }
        } finally {
          // ===================================================================
          // SAFETY NET
          // ===================================================================

          if (
            mountedRef.current &&
            requestIdRef.current ===
              requestId
          ) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [
        appointmentId,
        loadSecondaryData,
      ]
    );

  // ===========================================================================
  // OPEN
  // ===========================================================================

  const openModal =
    useCallback(async () => {
      if (!appointmentId) {
        return;
      }

      resetData();

      setOpen(true);

      await loadData(
        'initial'
      );
    }, [
      appointmentId,
      resetData,
      loadData,
    ]);

  // ===========================================================================
  // CLOSE
  // ===========================================================================

  const closeModal =
    useCallback(() => {
      setOpen(false);

      if (
        refreshTimerRef.current
      ) {
        clearTimeout(
          refreshTimerRef.current
        );

        refreshTimerRef.current =
          null;
      }
    }, []);

  // ===========================================================================
  // REFRESH
  // ===========================================================================

  const refresh =
    useCallback(async () => {
      if (
        !appointmentId ||
        !open
      ) {
        return;
      }

      await loadData(
        'refresh'
      );
    }, [
      appointmentId,
      open,
      loadData,
    ]);

  // ===========================================================================
  // REALTIME
  //
  // IMPORTANT:
  // Your useRealtimeTable expects positional parameters.
  //
  // This is:
  //
  // useRealtimeTable(table, filter, callback)
  //
  // NOT:
  //
  // useRealtimeTable({ table, filter, onDataChanged })
  //
  // ===========================================================================

  const handleRealtimeChange =
    useCallback(() => {
      if (
        !open ||
        !appointmentId
      ) {
        return;
      }

      if (
        refreshTimerRef.current
      ) {
        clearTimeout(
          refreshTimerRef.current
        );
      }

      refreshTimerRef.current =
        setTimeout(() => {
          refreshTimerRef.current =
            null;

          void loadData(
            'refresh'
          );
        }, 250);
    }, [
      open,
      appointmentId,
      loadData,
    ]);

  // ===========================================================================
  // APPOINTMENTS REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'appointments'
      : '',
    open
      ? `id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // APPOINTMENT HISTORY REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'appointment_status_history'
      : '',
    open
      ? `appointment_id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // INSPECTION TASKS REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'inspection_tasks'
      : '',
    open
      ? `appointment_id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // WORK TASKS REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'work_tasks'
      : '',
    open
      ? `appointment_id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // FINDINGS REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'findings'
      : '',
    open
      ? `appointment_id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // ESTIMATES REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'estimates'
      : '',
    open
      ? `appointment_id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // Final CostS REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'final_bills'
      : '',
    open
      ? `appointment_id=eq.${appointmentId}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // SERVICE QUEUE REALTIME
  // ===========================================================================

  useRealtimeTable(
    open
      ? 'service_queue'
      : '',
    open &&
    appointment?.appointmentDate
      ? `queue_date=eq.${appointment.appointmentDate}`
      : '',
    handleRealtimeChange
  );

  // ===========================================================================
  // CURRENT STATUS
  // ===========================================================================

  const currentStatus =
    String(
      appointment?.status ||
        'PENDING'
    );

  const currentStatusRank =
    STATUS_RANK[
      currentStatus
    ] ?? 0;

  const isCancelled =
    currentStatus ===
    'CANCELLED';

  // ===========================================================================
  // SECTION AVAILABILITY
  // ===========================================================================

  const enabledSections =
    useMemo(() => {
      return {
        appointment: true,

        customer: true,

        vehicle: true,

        services: true,

        history: true,

        milestones:
          !isCancelled,

        confirmation:
          !isCancelled &&
          currentStatusRank >=
            STATUS_RANK.CONFIRMED,

        queue:
          !isCancelled &&
          currentStatus ===
            'CONFIRMED',

        inspection:
          !isCancelled &&
          currentStatusRank >=
            STATUS_RANK.UNDER_INSPECTION,

        estimate:
          !isCancelled &&
          currentStatusRank >=
            STATUS_RANK.WAITING_FOR_APPROVAL,

        approval:
          !isCancelled &&
          currentStatusRank >=
            STATUS_RANK.IN_PROGRESS,

        findings:
          !isCancelled &&
          currentStatusRank >=
            STATUS_RANK.IN_PROGRESS,

        work:
          !isCancelled &&
          currentStatusRank >=
            STATUS_RANK.IN_PROGRESS,

        finalBill:
          currentStatus ===
          'COMPLETED',
      };
    }, [
      currentStatus,
      currentStatusRank,
      isCancelled,
    ]);

  // ===========================================================================
  // HISTORY MILESTONES
  // ===========================================================================

  const confirmationLog =
    useMemo(
      () =>
        history.find(
          (item: any) =>
            item?.toStatus ===
            'CONFIRMED'
        ) ?? null,
      [history]
    );

  const inspectionLog =
    useMemo(
      () =>
        history.find(
          (item: any) =>
            item?.toStatus ===
            'UNDER_INSPECTION'
        ) ?? null,
      [history]
    );

  const waitingApprovalLog =
    useMemo(
      () =>
        history.find(
          (item: any) =>
            item?.toStatus ===
            'WAITING_FOR_APPROVAL'
        ) ?? null,
      [history]
    );

  const inProgressLog =
    useMemo(
      () =>
        history.find(
          (item: any) =>
            item?.toStatus ===
            'IN_PROGRESS'
        ) ?? null,
      [history]
    );

  const completedLog =
    useMemo(
      () =>
        history.find(
          (item: any) =>
            item?.toStatus ===
            'COMPLETED'
        ) ?? null,
      [history]
    );

  const cancelledLog =
    useMemo(
      () =>
        history.find(
          (item: any) =>
            item?.toStatus ===
            'CANCELLED'
        ) ?? null,
      [history]
    );

  // ===========================================================================
  // ESTIMATE SENT
  // ===========================================================================

  const estimateSentAt =
    useMemo(() => {
      return (
        getValue(
          estimate,
          [
            'sentAt',
            'sent_at',
            'submittedAt',
            'submitted_at',
          ]
        ) ??
        getValue(
          estimate?.metadata,
          [
            'sentAt',
            'sent_at',
            'submittedAt',
            'submitted_at',
          ]
        ) ??
        waitingApprovalLog?.createdAt ??
        null
      );
    }, [
      estimate,
      waitingApprovalLog,
    ]);

  const estimateSentBy =
    useMemo(() => {
      return (
        getValue(
          estimate,
          [
            'sentBy',
            'sent_by',
            'submittedBy',
            'submitted_by',
          ]
        ) ??
        getValue(
          estimate?.metadata,
          [
            'sentBy',
            'sent_by',
            'submittedBy',
            'submitted_by',
          ]
        ) ??
        null
      );
    }, [estimate]);

  // ===========================================================================
  // ESTIMATE APPROVED
  // ===========================================================================

  const estimateApprovedAt =
    useMemo(() => {
      return (
        getValue(
          estimate,
          [
            'approvedAt',
            'approved_at',
          ]
        ) ??
        getValue(
          estimate?.metadata,
          [
            'approvedAt',
            'approved_at',
          ]
        ) ??
        inProgressLog?.createdAt ??
        null
      );
    }, [
      estimate,
      inProgressLog,
    ]);

  const estimateApprovedBy =
    useMemo(() => {
      return (
        getValue(
          estimate,
          [
            'approvedBy',
            'approved_by',
          ]
        ) ??
        getValue(
          estimate?.metadata,
          [
            'approvedBy',
            'approved_by',
          ]
        ) ??
        inProgressLog?.staff ??
        null
      );
    }, [
      estimate,
      inProgressLog,
    ]);

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // Modal
    open,
    setOpen,
    openModal,
    closeModal,

    // Loading
    loading,
    refreshing,

    // Appointment
    appointment,

    // Related
    customer,
    vehicle,
    services,

    // History
    history,

    // Tracking
    inspectionTasks,
    workTasks,
    findings,

    // Billing
    estimate,
    finalBill,

    // Queue
    queue,

    // Sections
    enabledSections,

    // Milestones
    confirmationLog,
    inspectionLog,
    waitingApprovalLog,
    inProgressLog,
    completedLog,
    cancelledLog,

    // Estimate milestones
    estimateSentAt,
    estimateSentBy,
    estimateApprovedAt,
    estimateApprovedBy,

    // Actions
    refresh,
    onRefresh: refresh,
    loadData,
  };
}

export default useAppointmentDetailModal;