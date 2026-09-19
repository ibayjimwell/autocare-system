'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { estimatesApi } from '@/lib/payments/estimates';
import { finalBillsApi } from '@/lib/payments/final-bills';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { useRealtimeTable } from '@/connections/useRealtimeTable';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/* ================================================================
   TYPES
================================================================ */

export type PaymentSearchField =
  | 'ALL'
  | 'RECORD_ID'
  | 'CUSTOMER'
  | 'PLATE'
  | 'TRACKING_NUMBER';

export type PaymentSortKey =
  | 'date'
  | 'total'
  | 'customer'
  | 'plate'
  | 'trackingNumber'
  | 'recordId';

export type PaymentSortDirection = 'asc' | 'desc';

export interface Estimate {
  id: string;
  appointmentId: string;
  status: string;
  serviceSubtotal?: number | string | null;
  findingsSubtotal?: number | string | null;
  feesTotal?: number | string | null;
  discountTotal?: number | string | null;
  grandTotal?: number | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  appointment?: any;
  findings?: any[];
  fees?: any[];
  discounts?: any[];
  tasks?: any[];
  [key: string]: any;
}

export interface FinalBill {
  id: string;
  appointmentId: string;
  estimateId?: string | null;
  status: string;
  serviceSubtotal?: number | string | null;
  findingsSubtotal?: number | string | null;
  workTasksSubtotal?: number | string | null;
  feesTotal?: number | string | null;
  discountTotal?: number | string | null;
  grandTotal?: number | string | null;
  notes?: string | null;
  parkedAt?: string | null;
  parkingFeeEnabled?: boolean | null;
  parkingFeeRate?: number | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  appointment?: any;
  findings?: any[];
  fees?: any[];
  discounts?: any[];
  workTasks?: any[];
  [key: string]: any;
}

async function enrichFinalBillsWithAppointments(
  bills: FinalBill[],
): Promise<FinalBill[]> {
  const appointmentIds = Array.from(
    new Set(
      bills
        .map((bill) => String(bill?.appointmentId ?? '').trim())
        .filter(Boolean),
    ),
  );

  if (appointmentIds.length === 0) {
    return bills;
  }

  const appointmentResults = await Promise.all(
    appointmentIds.map(async (appointmentId) => {
      try {
        const response = await appointmentsApi.get(appointmentId);

        if (response?.error || !response?.data) {
          return [appointmentId, null] as const;
        }

        const appointment =
          response.data?.appointment ??
          response.data;

        return [appointmentId, appointment] as const;
      } catch (error) {
        console.error(
          `[usePaymentsData] Failed to load appointment ${appointmentId}:`,
          error,
        );
        return [appointmentId, null] as const;
      }
    }),
  );

  const appointmentMap = new Map<string, any>(
    appointmentResults.filter(
      ([, appointment]) => appointment != null,
    ),
  );

  if (appointmentMap.size === 0) {
    return bills;
  }

  return bills.map((bill) => {
    const appointment = appointmentMap.get(
      String(bill?.appointmentId ?? ''),
    );

    if (!appointment) {
      return bill;
    }

    const existingAppointment =
      bill?.appointment &&
      typeof bill.appointment === 'object'
        ? bill.appointment
        : {};

    const mergedCustomer = {
      ...(appointment?.customer ?? {}),
      ...(existingAppointment?.customer ?? {}),
    };

    const mergedVehicle = {
      ...(appointment?.vehicle ?? {}),
      ...(existingAppointment?.vehicle ?? {}),
    };

    return {
      ...bill,
      appointment: {
        ...appointment,
        ...existingAppointment,
        customer: mergedCustomer,
        vehicle: mergedVehicle,
      },
    };
  });
}

/* ================================================================
   STATUS PRIORITY

   Status priority is applied before the selected secondary sort.
   This keeps the payment workspace operationally grouped while
   still allowing users to sort inside each status group.
================================================================ */

const ESTIMATE_STATUS_PRIORITY: Record<string, number> = {
  PENDING: 0,
  WAITING_FOR_APPROVAL: 1,
  APPROVED: 2,
  DECLINED: 3,
};

const FINAL_BILL_STATUS_PRIORITY: Record<string, number> = {
  PENDING: 0,
  PARKED: 1,
  OFFICIAL: 2,
  PAID: 3,
};

/* ================================================================
   HELPERS
================================================================ */

function unwrapArray<T = any>(response: any): T[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(value: unknown): number {
  if (!value) return 0;
  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCustomerText(record: any): string {
  return [
    record?.appointment?.customer?.fullname,
    record?.appointment?.customer?.name,
    record?.appointment?.customerName,
    record?.customer?.fullname,
    record?.customer?.name,
    record?.customerName,
    record?.appointment?.customer?.phone,
    record?.appointment?.customer?.email,
  ]
    .filter(Boolean)
    .join(' ');
}

function getPlateText(record: any): string {
  return [
    record?.appointment?.vehicle?.plateNumber,
    record?.appointment?.vehicle?.plate,
    record?.appointment?.vehicle?.licensePlate,
    record?.vehicle?.plateNumber,
    record?.vehicle?.plate,
    record?.vehicle?.licensePlate,
    record?.plateNumber,
  ]
    .filter(Boolean)
    .join(' ');
}

function getTrackingText(record: any): string {
  return [
    record?.appointment?.trackingNumber,
    record?.trackingNumber,
  ]
    .filter(Boolean)
    .join(' ');
}

function getSearchText(record: any): string {
  return [
    record?.id,
    record?.appointmentId,
    getCustomerText(record),
    getPlateText(record),
    getTrackingText(record),
    record?.status,
    record?.notes,
  ]
    .filter(Boolean)
    .join(' ');
}

function getRecordDate(record: any): number {
  return toTimestamp(
    record?.createdAt ??
      record?.updatedAt ??
      record?.appointment?.appointmentDate ??
      record?.appointment?.createdAt,
  );
}

function getRecordTotal(record: any): number {
  return toNumber(record?.grandTotal);
}

function compareValues(
  left: string | number,
  right: string | number,
  direction: PaymentSortDirection,
): number {
  let result = 0;

  if (left < right) result = -1;
  else if (left > right) result = 1;

  return direction === 'asc' ? result : -result;
}

function compareRecords(
  left: any,
  right: any,
  sortBy: PaymentSortKey,
  direction: PaymentSortDirection,
): number {
  switch (sortBy) {
    case 'date':
      return compareValues(
        getRecordDate(left),
        getRecordDate(right),
        direction,
      );

    case 'total':
      return compareValues(
        getRecordTotal(left),
        getRecordTotal(right),
        direction,
      );

    case 'customer':
      return compareValues(
        normalizeText(getCustomerText(left)),
        normalizeText(getCustomerText(right)),
        direction,
      );

    case 'plate':
      return compareValues(
        normalizeText(getPlateText(left)),
        normalizeText(getPlateText(right)),
        direction,
      );

    case 'trackingNumber':
      return compareValues(
        normalizeText(getTrackingText(left)),
        normalizeText(getTrackingText(right)),
        direction,
      );

    case 'recordId':
      return compareValues(
        normalizeText(left?.id),
        normalizeText(right?.id),
        direction,
      );

    default:
      return 0;
  }
}

function filterBySearch(
  record: any,
  search: string,
  field: PaymentSearchField,
): boolean {
  const term = normalizeText(search);
  if (!term) return true;

  let target = '';

  switch (field) {
    case 'RECORD_ID':
      target = String(record?.id ?? '');
      break;

    case 'CUSTOMER':
      target = getCustomerText(record);
      break;

    case 'PLATE':
      target = getPlateText(record);
      break;

    case 'TRACKING_NUMBER':
      target = getTrackingText(record);
      break;

    case 'ALL':
    default:
      target = getSearchText(record);
      break;
  }

  return normalizeText(target).includes(term);
}

function sortPaymentRecords<T extends Record<string, any>>(
  records: T[],
  statusPriority: Record<string, number>,
  sortBy: PaymentSortKey,
  direction: PaymentSortDirection,
): T[] {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const priorityA =
        statusPriority[String(a.record?.status ?? '').toUpperCase()] ?? 999;
      const priorityB =
        statusPriority[String(b.record?.status ?? '').toUpperCase()] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const secondary = compareRecords(
        a.record,
        b.record,
        sortBy,
        direction,
      );

      if (secondary !== 0) return secondary;

      return a.index - b.index;
    })
    .map(({ record }) => record);
}

/* ================================================================
   HOOK
================================================================ */

export function usePaymentsData(
  statusFilter: string,
  search: string,
  searchField: PaymentSearchField,
  sortBy: PaymentSortKey,
  sortDirection: PaymentSortDirection,
) {
  const [rawEstimates, setRawEstimates] = useState<Estimate[]>([]);
  const [rawFinalBills, setRawFinalBills] = useState<FinalBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const [estimateRes, finalBillRes] = await Promise.all([
        estimatesApi.list(),
        finalBillsApi.list(),
      ]);

      if (estimateRes?.error) {
        throw new Error(
          estimateRes.errorMessage || 'Failed to load estimates.',
        );
      }

      if (finalBillRes?.error) {
        throw new Error(
          finalBillRes.errorMessage || 'Failed to load final bills.',
        );
      }

      setRawEstimates(unwrapArray<Estimate>(estimateRes));

      const finalBillRecords =
        unwrapArray<FinalBill>(finalBillRes);

      const enrichedFinalBillRecords =
        await enrichFinalBillsWithAppointments(
          finalBillRecords,
        );

      setRawFinalBills(enrichedFinalBillRecords);
    } catch (cause: any) {
      console.error('[usePaymentsData] load error:', cause);
      setError({
        type: 'dbe',
        title: 'Payments data error',
        message: cause?.message || 'Unable to load payment records.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleRealtimeReload = useCallback(
    (_payload?: RealtimePostgresChangesPayload<any>) => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(() => {
        realtimeTimerRef.current = null;
        void load();
      }, 160);
    },
    [load],
  );

  useEffect(() => {
    return () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }
    };
  }, []);

  useRealtimeTable(
    'estimated_costs',
    undefined,
    scheduleRealtimeReload,
  );

  useRealtimeTable(
    'final_bills',
    undefined,
    scheduleRealtimeReload,
  );

  useRealtimeTable(
    'estimate_fees',
    undefined,
    scheduleRealtimeReload,
  );

  useRealtimeTable(
    'estimate_discounts',
    undefined,
    scheduleRealtimeReload,
  );

  useRealtimeTable(
    'final_bill_fees',
    undefined,
    scheduleRealtimeReload,
  );

  useRealtimeTable(
    'final_bill_discounts',
    undefined,
    scheduleRealtimeReload,
  );

  const estimates = useMemo(() => {
    const filtered = rawEstimates.filter((record) => {
      const statusMatches =
        statusFilter === 'ALL' ||
        statusFilter === '' ||
        String(record.status ?? '').toUpperCase() ===
          String(statusFilter).toUpperCase();

      return statusMatches && filterBySearch(record, search, searchField);
    });

    return sortPaymentRecords(
      filtered,
      ESTIMATE_STATUS_PRIORITY,
      sortBy,
      sortDirection,
    );
  }, [
    rawEstimates,
    statusFilter,
    search,
    searchField,
    sortBy,
    sortDirection,
  ]);

  const finalBills = useMemo(() => {
    const filtered = rawFinalBills.filter((record) => {
      const statusMatches =
        statusFilter === 'ALL' ||
        statusFilter === '' ||
        String(record.status ?? '').toUpperCase() ===
          String(statusFilter).toUpperCase();

      return statusMatches && filterBySearch(record, search, searchField);
    });

    return sortPaymentRecords(
      filtered,
      FINAL_BILL_STATUS_PRIORITY,
      sortBy,
      sortDirection,
    );
  }, [
    rawFinalBills,
    statusFilter,
    search,
    searchField,
    sortBy,
    sortDirection,
  ]);

  return {
    estimates,
    finalBills,
    loading,
    error,
    reload: load,
  };
}
