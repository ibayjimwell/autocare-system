'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  estimatesApi,
} from '@/lib/payments/estimates';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

import {
  appointmentsApi,
} from '@/lib/appointments/appointments';

import {
  useRealtimeTable,
} from '@/connections/useRealtimeTable';

import type {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

/* ================================================================
   HELPERS
================================================================ */

/**
 * Safely extract an API record.
 *
 * Supported response shapes:
 *
 * {
 *   data: {...}
 * }
 *
 * {
 *   data: [{...}]
 * }
 *
 * {
 *   data: {
 *     finalBill: {...}
 *   }
 * }
 *
 * {
 *   finalBill: {...}
 * }
 */
function unwrapApiRecord(
  response: any,
): any | null {
  if (
    !response ||
    response.error
  ) {
    return null;
  }

  let value =
    response.data ??
    response;

  if (
    value &&
    typeof value ===
      'object' &&
    !Array.isArray(value)
  ) {
    if (
      value.finalBill
    ) {
      value =
        value.finalBill;
    } else if (
      value.bill
    ) {
      value =
        value.bill;
    } else if (
      value.data &&
      typeof value.data ===
        'object'
    ) {
      value =
        value.data;
    }
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value &&
    typeof value ===
      'object'
    ? value
    : null;
}

/**
 * Normalize any array-like API value.
 */
function normalizeArray(
  value: any,
): any[] {
  return Array.isArray(
    value,
  )
    ? value
    : [];
}

/**
 * Safely parse a numeric value.
 */
function toNumber(
  value: unknown,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

/**
 * Normalize appointment services.
 *
 * Service values can be:
 *
 * {
 *   id: "..."
 * }
 *
 * or
 *
 * "service-id"
 *
 * The detail modal only needs a valid service ID.
 */
function normalizeServices(
  value: any,
): any[] {
  const services =
    normalizeArray(
      value,
    );

  return services
    .map(
      (
        service: any,
      ) => {
        if (
          typeof service ===
          'string'
        ) {
          return {
            id: service,
          };
        }

        if (
          !service ||
          typeof service !==
            'object'
        ) {
          return null;
        }

        const id =
          service.id ??
          service.serviceId;

        if (
          !id
        ) {
          return null;
        }

        return {
          ...service,
          id,
        };
      },
    )
    .filter(
      Boolean,
    );
}

/**
 * Normalize final-bill finding parts.
 *
 * Some payloads use `parts`.
 * Older payloads may use `products`.
 */
function normalizeFindingParts(
  finding: any,
): any[] {
  const rawParts =
    Array.isArray(
      finding?.parts,
    )
      ? finding.parts
      : Array.isArray(
          finding?.products,
        )
        ? finding.products
        : [];

  return rawParts.map(
    (
      part: any,
      index: number,
    ) => {
      const quantity =
        Math.max(
          1,
          toNumber(
            part?.quantity,
          ) ||
            1,
        );

      const priceAtTime =
        Math.max(
          0,
          toNumber(
            part?.priceAtTime ??
              part?.price ??
              part?.unitPrice,
          ),
        );

      const explicitTotal =
        part?.totalPrice ??
        part?.amount;

      const calculatedTotal =
        explicitTotal !==
          null &&
        explicitTotal !==
          undefined &&
        explicitTotal !==
          ''
          ? toNumber(
              explicitTotal,
            )
          : priceAtTime *
            quantity;

      return {
        ...part,

        id:
          part?.id ??
          `part-${index}`,

        partName:
          part?.partName ??
          part?.name ??
          part?.productName ??
          'Part',

        quantity,

        priceAtTime,

        totalPrice:
          calculatedTotal,

        isPms:
          Boolean(
            part?.isPms,
          ),
      };
    },
  );
}

/**
 * Normalize final-bill findings.
 */
function normalizeFindings(
  value: any,
): any[] {
  return normalizeArray(
    value,
  ).map(
    (
      finding: any,
      index: number,
    ) => {
      const parts =
        normalizeFindingParts(
          finding,
        );

      const calculatedPartsSubtotal =
        parts.reduce(
          (
            total: number,
            part: any,
          ) =>
            total +
            toNumber(
              part.totalPrice,
            ),
          0,
        );

      return {
        ...finding,

        id:
          finding?.id ??
          `finding-${index}`,

        description:
          finding?.description ??
          finding?.title ??
          'Finding',

        included:
          finding?.included !==
          false,

        parts,

        partsSubtotal:
          toNumber(
            finding?.partsSubtotal,
          ) ||
          calculatedPartsSubtotal,
      };
    },
  );
}

/**
 * Normalize fees.
 */
function normalizeFees(
  value: any,
): any[] {
  return normalizeArray(
    value,
  ).map(
    (
      fee: any,
      index: number,
    ) => ({
      ...fee,

      id:
        fee?.id ??
        `fee-${index}`,

      title:
        fee?.title ??
        'Fee',

      amount:
        toNumber(
          fee?.amount,
        ),
    }),
  );
}

/**
 * Normalize discounts.
 */
function normalizeDiscounts(
  value: any,
): any[] {
  return normalizeArray(
    value,
  ).map(
    (
      discount: any,
      index: number,
    ) => ({
      ...discount,

      id:
        discount?.id ??
        `discount-${index}`,

      title:
        discount?.title ??
        'Discount',

      type:
        discount?.type ??
        'fixed',

      amount:
        Math.abs(
          toNumber(
            discount?.amount ??
              discount?.value,
          ),
        ),
    }),
  );
}

/**
 * Normalize work tasks.
 */
function normalizeWorkTasks(
  value: any,
): any[] {
  return normalizeArray(
    value,
  ).map(
    (
      task: any,
      index: number,
    ) => ({
      ...task,

      id:
        task?.id ??
        `work-task-${index}`,

      title:
        task?.title ??
        task?.name ??
        'Work Task',
    }),
  );
}

/**
 * Normalize appointment.
 */
function normalizeAppointment(
  value: any,
): any | null {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return null;
  }

  return {
    ...value,

    services:
      normalizeServices(
        value.services,
      ),
  };
}

/**
 * Normalize the complete final bill before it reaches React state.
 */
function normalizeFinalBill(
  value: any,
  fallback: any = null,
  appointment: any = null,
): any | null {
  const source =
    value ||
    fallback;

  if (
    !source ||
    typeof source !==
      'object' ||
    Array.isArray(
      source,
    )
  ) {
    return fallback &&
      typeof fallback ===
        'object'
      ? {
          ...fallback,
        }
      : null;
  }

  const sourceAppointment =
    source.appointment;

  const mergedAppointment =
    normalizeAppointment({
      ...(fallback?.appointment ||
        {}),
      ...(sourceAppointment ||
        {}),
      ...(appointment ||
        {}),
    });

  const normalized =
    {
      ...fallback,
      ...source,

      appointment:
        mergedAppointment,

      findings:
        normalizeFindings(
          source.findings ??
            fallback?.findings,
        ),

      fees:
        normalizeFees(
          source.fees ??
            fallback?.fees,
        ),

      discounts:
        normalizeDiscounts(
          source.discounts ??
            fallback?.discounts,
        ),

      workTasks:
        normalizeWorkTasks(
          source.workTasks ??
            source.tasks ??
            fallback?.workTasks,
        ),
    };

  /*
   * Keep the original database ID.
   */
  if (
    !normalized.id &&
    fallback?.id
  ) {
    normalized.id =
      fallback.id;
  }

  /*
   * Keep appointment ID available even when the detail endpoint
   * omits it.
   */
  if (
    !normalized.appointmentId &&
    fallback?.appointmentId
  ) {
    normalized.appointmentId =
      fallback.appointmentId;
  }

  /*
   * Normalize numeric totals into safe values.
   *
   * We preserve the field values when supplied by the API.
   */
  normalized.serviceSubtotal =
    toNumber(
      normalized.serviceSubtotal,
    );

  normalized.findingsSubtotal =
    toNumber(
      normalized.findingsSubtotal,
    );

  normalized.workTasksSubtotal =
    toNumber(
      normalized.workTasksSubtotal,
    );

  normalized.feesTotal =
    toNumber(
      normalized.feesTotal,
    );

  normalized.discountTotal =
    toNumber(
      normalized.discountTotal,
    );

  normalized.grandTotal =
    toNumber(
      normalized.grandTotal,
    );

  return normalized;
}

/**
 * Safely retrieve a fresh appointment.
 *
 * Appointment loading is independent from final-bill loading so a
 * missing appointment response cannot prevent the final bill from
 * being displayed.
 */
async function fetchAppointmentSafely(
  appointmentId: string | null | undefined,
): Promise<any | null> {
  if (
    !appointmentId
  ) {
    return null;
  }

  try {
    const response =
      await appointmentsApi.get(
        appointmentId,
      );

    return normalizeAppointment(
      unwrapApiRecord(
        response,
      ),
    );
  } catch (
    error
  ) {
    console.error(
      '[useDetailModal] Failed to load appointment:',
      error,
    );

    return null;
  }
}

/* ================================================================
   HOOK
================================================================ */

export function useDetailModal(
  onSuccess?: () =>
    | void
    | Promise<void>,
) {
  /* ==============================================================
     MODAL STATE
  ============================================================== */

  const [
    detailModalOpen,
    setDetailModalOpen,
  ] =
    useState(false);

  const [
    selectedItem,
    setSelectedItem,
  ] =
    useState<any>(
      null,
    );

  const [
    detailType,
    setDetailType,
  ] =
    useState<
      | 'estimate'
      | 'final-bill'
    >(
      'estimate',
    );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  /* ==============================================================
     REALTIME DEBOUNCE
  ============================================================== */

  const realtimeTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null,
    );

  /* ==============================================================
     REFRESH DETAIL
  ============================================================== */

  const refreshDetail =
    useCallback(
      async () => {
        if (
          !selectedItem
        ) {
          return;
        }

        const recordId =
          selectedItem?.id;

        if (
          !recordId
        ) {
          console.error(
            '[useDetailModal] Missing record ID during refresh.',
          );

          return;
        }

        try {
          /* ======================================================
             ESTIMATE
          ======================================================= */

          if (
            detailType ===
            'estimate'
          ) {
            let estimateRecord =
              null;

            try {
              const response =
                await estimatesApi.get(
                  recordId,
                );

              estimateRecord =
                unwrapApiRecord(
                  response,
                );
            } catch (
              error
            ) {
              console.error(
                '[useDetailModal] Failed to refresh estimate:',
                error,
              );
            }

            if (
              !estimateRecord
            ) {
              return;
            }

            const appointmentId =
              estimateRecord?.appointmentId ??
              selectedItem?.appointmentId;

            const appointment =
              await fetchAppointmentSafely(
                appointmentId,
              );

            const normalizedEstimate =
              {
                ...selectedItem,
                ...estimateRecord,

                appointment:
                  {
                    ...(selectedItem?.appointment ||
                      {}),
                    ...(estimateRecord?.appointment ||
                      {}),
                    ...(appointment ||
                      {}),

                    services:
                      normalizeServices(
                        appointment
                          ?.services ??
                          estimateRecord
                            ?.appointment
                            ?.services ??
                          selectedItem
                            ?.appointment
                            ?.services,
                      ),
                  },

                tasks:
                  normalizeArray(
                    estimateRecord?.tasks ??
                      selectedItem?.tasks,
                  ),

                findings:
                  normalizeFindings(
                    estimateRecord?.findings ??
                      selectedItem?.findings,
                  ),

                fees:
                  normalizeFees(
                    estimateRecord?.fees ??
                      selectedItem?.fees,
                  ),

                discounts:
                  normalizeDiscounts(
                    estimateRecord?.discounts ??
                      selectedItem?.discounts,
                  ),
              };

            setSelectedItem(
              normalizedEstimate,
            );

            return;
          }

          /* ======================================================
             FINAL BILL
          ======================================================= */

          let billRecord =
            null;

          try {
            const response =
              await finalBillsApi.get(
                recordId,
              );

            billRecord =
              unwrapApiRecord(
                response,
              );
          } catch (
            error
          ) {
            console.error(
              '[useDetailModal] Failed to refresh final bill:',
              error,
            );
          }

          /*
           * A failed detail request should NOT destroy the
           * currently visible bill.
           */
          if (
            !billRecord
          ) {
            return;
          }

          const appointmentId =
            billRecord?.appointmentId ??
            selectedItem?.appointmentId ??
            selectedItem
              ?.appointment
              ?.id;

          const appointment =
            await fetchAppointmentSafely(
              appointmentId,
            );

          const normalizedBill =
            normalizeFinalBill(
              billRecord,
              selectedItem,
              appointment,
            );

          if (
            !normalizedBill
          ) {
            return;
          }

          setSelectedItem(
            normalizedBill,
          );
        } catch (
          error
        ) {
          console.error(
            '[useDetailModal] Failed to refresh payment detail:',
            error,
          );

          /*
           * Do not clear selectedItem here.
           *
           * The last known safe record remains visible.
           */
        }
      },
      [
        selectedItem,
        detailType,
      ],
    );

  /* ================================================================
     OPEN DETAIL
  ================================================================ */

  const openDetail =
    useCallback(
      async (
        item: any,
        type:
          | 'estimate'
          | 'final-bill',
      ) => {
        /*
         * Normalize the list item first so the modal always has a
         * safe fallback even before the detailed API request finishes.
         */
        const fallbackItem =
          type ===
          'final-bill'
            ? normalizeFinalBill(
                item,
                item,
                item?.appointment,
              )
            : {
                ...item,

                appointment:
                  {
                    ...(item?.appointment ||
                      {}),
                    services:
                      normalizeServices(
                        item
                          ?.appointment
                          ?.services,
                      ),
                  },

                tasks:
                  normalizeArray(
                    item?.tasks,
                  ),

                findings:
                  normalizeFindings(
                    item?.findings,
                  ),

                fees:
                  normalizeFees(
                    item?.fees,
                  ),

                discounts:
                  normalizeDiscounts(
                    item?.discounts,
                  ),
              };

        setDetailLoading(
          true,
        );

        setSelectedItem(
          fallbackItem ||
            item ||
            null,
        );

        setDetailType(
          type,
        );

        setDetailModalOpen(
          true,
        );

        try {
          /* ======================================================
             FINAL BILL
          ======================================================= */

          if (
            type ===
            'final-bill'
          ) {
            const billId =
              item?.id;

            if (
              !billId
            ) {
              toast.error(
                'This final bill does not have a valid ID.',
              );

              return;
            }

            /*
             * Load the bill first.
             *
             * Appointment loading is independent so that one bad
             * related request does not break the final bill view.
             */
            let billRecord =
              null;

            try {
              const billResponse =
                await finalBillsApi.get(
                  billId,
                );

              if (
                billResponse?.error
              ) {
                toast.error(
                  billResponse?.errorMessage ||
                    'Could not load full bill details.',
                );
              } else {
                billRecord =
                  unwrapApiRecord(
                    billResponse,
                  );
              }
            } catch (
              error: any
            ) {
              console.error(
                '[useDetailModal] Final bill request failed:',
                error,
              );

              toast.error(
                error?.message ||
                  'Could not load full bill details.',
              );
            }

            /*
             * Even if the detail endpoint fails, keep the list
             * representation visible instead of throwing.
             */
            if (
              !billRecord
            ) {
              return;
            }

            const appointmentId =
              billRecord?.appointmentId ??
              item?.appointmentId ??
              item?.appointment?.id;

            const appointment =
              await fetchAppointmentSafely(
                appointmentId,
              );

            const normalizedBill =
              normalizeFinalBill(
                billRecord,
                fallbackItem ||
                  item,
                appointment,
              );

            if (
              !normalizedBill
            ) {
              toast.error(
                'The final bill data is invalid.',
              );

              return;
            }

            setSelectedItem(
              normalizedBill,
            );

            return;
          }

          /* ======================================================
             ESTIMATE
          ======================================================= */

          const estimateId =
            item?.id;

          if (
            !estimateId
          ) {
            toast.error(
              'This estimate does not have a valid ID.',
            );

            return;
          }

          let estimateRecord =
            null;

          try {
            const estimateResponse =
              await estimatesApi.get(
                estimateId,
              );

            if (
              estimateResponse?.error
            ) {
              toast.error(
                estimateResponse?.errorMessage ||
                  'Could not load estimate details.',
              );
            } else {
              estimateRecord =
                unwrapApiRecord(
                  estimateResponse,
                );
            }
          } catch (
            error: any
          ) {
            console.error(
              '[useDetailModal] Estimate request failed:',
              error,
            );

            toast.error(
              error?.message ||
                'Could not load estimate details.',
            );
          }

          if (
            !estimateRecord
          ) {
            return;
          }

          const appointmentId =
            estimateRecord?.appointmentId ??
            item?.appointmentId ??
            item?.appointment?.id;

          const appointment =
            await fetchAppointmentSafely(
              appointmentId,
            );

          const normalizedEstimate =
            {
              ...item,
              ...estimateRecord,

              appointment:
                {
                  ...(item?.appointment ||
                    {}),
                  ...(estimateRecord?.appointment ||
                    {}),
                  ...(appointment ||
                    {}),

                  services:
                    normalizeServices(
                      appointment
                        ?.services ??
                        estimateRecord
                          ?.appointment
                          ?.services ??
                        item
                          ?.appointment
                          ?.services,
                    ),
                },

              tasks:
                normalizeArray(
                  estimateRecord?.tasks ??
                    item?.tasks,
                ),

              findings:
                normalizeFindings(
                  estimateRecord?.findings ??
                    item?.findings,
                ),

              fees:
                normalizeFees(
                  estimateRecord?.fees ??
                    item?.fees,
                ),

              discounts:
                normalizeDiscounts(
                  estimateRecord?.discounts ??
                    item?.discounts,
                ),
            };

          setSelectedItem(
            normalizedEstimate,
          );

          await onSuccess?.();
        } catch (
          error
        ) {
          console.error(
            '[useDetailModal] Failed to fetch payment details:',
            error,
          );

          /*
           * Keep the existing list record visible.
           */
          if (
            fallbackItem
          ) {
            setSelectedItem(
              fallbackItem,
            );
          }

          toast.error(
            'Error loading payment details.',
          );
        } finally {
          setDetailLoading(
            false,
          );
        }
      },
      [
        onSuccess,
      ],
    );

  /* ================================================================
     SCHEDULE DETAIL REFRESH
  ================================================================ */

  const scheduleDetailRefresh =
    useCallback(
      (
        payload?: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '📡 Payment detail realtime change detected:',
          payload?.eventType ||
            'unknown',
        );

        if (
          realtimeTimerRef.current
        ) {
          clearTimeout(
            realtimeTimerRef.current,
          );
        }

        realtimeTimerRef.current =
          setTimeout(
            () => {
              realtimeTimerRef.current =
                null;

              void refreshDetail();
            },
            120,
          );
      },
      [
        refreshDetail,
      ],
    );

  /* ================================================================
     REALTIME TIMER CLEANUP
  ================================================================ */

  useEffect(
    () => {
      return () => {
        if (
          realtimeTimerRef.current
        ) {
          clearTimeout(
            realtimeTimerRef.current,
          );

          realtimeTimerRef.current =
            null;
        }
      };
    },
    [],
  );

  /* ================================================================
     ESTIMATE PARENT
  ================================================================ */

  useRealtimeTable(
    'estimated_costs',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     ESTIMATE FEES
  ================================================================ */

  useRealtimeTable(
    'estimate_fees',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `estimate_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     ESTIMATE DISCOUNTS
  ================================================================ */

  useRealtimeTable(
    'estimate_discounts',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `estimate_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     ESTIMATE FINDINGS
  ================================================================ */

  useRealtimeTable(
    'estimate_findings',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `estimate_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     ESTIMATE FINDING PARTS
  ================================================================ */

  useRealtimeTable(
    'estimate_finding_parts',
    undefined,
    detailType ===
        'estimate'
      ? scheduleDetailRefresh
      : undefined,
  );

  /* ================================================================
     FINAL BILL PARENT
  ================================================================ */

  useRealtimeTable(
    'final_bills',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     FINAL BILL FEES
  ================================================================ */

  useRealtimeTable(
    'final_bill_fees',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `final_bill_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     FINAL BILL DISCOUNTS
  ================================================================ */

  useRealtimeTable(
    'final_bill_discounts',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `final_bill_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     FINAL BILL FINDINGS
  ================================================================ */

  useRealtimeTable(
    'final_bill_findings',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `final_bill_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh,
  );

  /* ================================================================
     FINAL BILL FINDING PARTS
  ================================================================ */

  useRealtimeTable(
    'final_bill_finding_parts',
    undefined,
    detailType ===
        'final-bill'
      ? scheduleDetailRefresh
      : undefined,
  );

  /* ================================================================
     RETURN
  ================================================================ */

  return {
    detailModalOpen,

    setDetailModalOpen,

    selectedItem,

    setSelectedItem,

    detailType,

    detailLoading,

    openDetail,

    refreshDetail,
  };
}