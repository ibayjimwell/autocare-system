import { and, asc, desc, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';

import { Database } from '@/lib/drizzle';
import {
  Appointments,
  Customers,
  EstimatedCosts,
  FinalBill,
  Inventory,
  InventoryAllocations,
  InspectionTasks,
  ServiceQueue,
  Services,
  Staffs,
  WorkTasks,
} from '@/database/models';
import type {
  DashboardAccess,
  DashboardAppointments,
  DashboardCustomers,
  DashboardData,
  DashboardInventory,
  DashboardOverview,
  DashboardPaymentTrendPoint,
  DashboardPayments,
  DashboardServiceTracking,
  DashboardServices,
  DashboardStaffs,
} from '@/database/models/dashboard/dashboard.model';

const ACTIVE_SERVICE_STATUSES = [
  'UNDER_INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
] as const;

const DAYS = 7;
const SERVICE_LOOKBACK_DAYS = 90;
const CUSTOMER_LOOKBACK_DAYS = 90;
const PAYMENT_LOOKBACK_DAYS = 30;
const PAYMENT_TREND_DAYS = 14;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getManilaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function manilaDateToUtcStart(dateString: string): Date {
  return new Date(`${dateString}T00:00:00+08:00`);
}

function toManilaDateLabel(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00+08:00`);
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function toManilaDateValue(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function buildDateRange(startDate: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    addDays(startDate, index),
  );
}


function groupCount(rows: Array<{ key: string | null; count: unknown }>) {
  return rows.map((row) => ({
    key: row.key || 'Unassigned',
    count: toNumber(row.count),
  }));
}

function normalizeRole(role: string | null): string {
  return role?.trim() || 'Unassigned';
}

async function getOverview(
  access: DashboardAccess,
  today: string,
  now: Date,
): Promise<DashboardOverview> {
  const overview: DashboardOverview = {
    signals: [],
  };

  const tasks: Promise<void>[] = [];

  if (access.appointments) {
    tasks.push(
      Database.select({ count: sql<number>`count(*)::int` })
        .from(Appointments)
        .where(
          and(
            eq(Appointments.appointmentDate, today),
            ne(Appointments.status, 'CANCELLED'),
          ),
        )
        .then(([row]) => {
          overview.todayAppointments = toNumber(row?.count);
        }),
    );
  }

  if (access.serviceTracking) {
    tasks.push(
      Database.select({ count: sql<number>`count(*)::int` })
        .from(Appointments)
        .where(inArray(Appointments.status, [...ACTIVE_SERVICE_STATUSES]))
        .then(([row]) => {
          overview.activeServiceJobs = toNumber(row?.count);
        }),
    );

    tasks.push(
      Database.select({ count: sql<number>`count(*)::int` })
        .from(Appointments)
        .where(eq(Appointments.status, 'WAITING_FOR_APPROVAL'))
        .then(([row]) => {
          overview.waitingForApproval = toNumber(row?.count);
        }),
    );
  }

  if (access.payments) {
    const dayStart = manilaDateToUtcStart(today);

    tasks.push(
      Database.select({
        amount: sql<string>`coalesce(sum(${FinalBill.grandTotal}), 0)`,
      })
        .from(FinalBill)
        .where(
          and(
            eq(FinalBill.status, 'PAID'),
            gte(FinalBill.updatedAt, dayStart),
          ),
        )
        .then(([row]) => {
          overview.todayPaidAmount = toNumber(row?.amount);
        }),
    );

    tasks.push(
      Database.select({ count: sql<number>`count(*)::int` })
        .from(FinalBill)
        .where(eq(FinalBill.status, 'OFFICIAL'))
        .then(([row]) => {
          overview.unpaidFinalBills = toNumber(row?.count);
        }),
    );
  }

  if (access.inventory) {
    tasks.push(
      Database.select({ count: sql<number>`count(*)::int` })
        .from(Inventory)
        .where(
          and(
            eq(Inventory.active, true),
            eq(Inventory.lowStockAlert, true),
            sql`${Inventory.quantity} <= ${Inventory.reorderLevel}`,
          ),
        )
        .then(([row]) => {
          overview.lowStockItems = toNumber(row?.count);
        }),
    );
  }

  if (access.staffs) {
    tasks.push(
      Database.select({ count: sql<number>`count(*)::int` })
        .from(Staffs)
        .where(
          and(
            eq(Staffs.inBoarding, true),
            eq(Staffs.isOnline, true),
          ),
        )
        .then(([row]) => {
          overview.onlineStaff = toNumber(row?.count);
        }),
    );
  }

  await Promise.all(tasks);

  if (access.appointments && (overview.todayAppointments ?? 0) > 0) {
    const pendingToday = await Database.select({
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          eq(Appointments.appointmentDate, today),
          eq(Appointments.status, 'PENDING'),
        ),
      );

    const pendingCount = toNumber(pendingToday[0]?.count);

    if (pendingCount > 0) {
      overview.signals.push({
        module: 'appointments',
        severity: pendingCount >= 5 ? 'critical' : 'warning',
        title: 'Appointments need confirmation',
        detail: `${pendingCount} appointment${pendingCount === 1 ? '' : 's'} today are still pending.`,
        href: '/appointments',
      });
    }
  }

  if (access.serviceTracking) {
    const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleResult = await Database.select({
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          inArray(Appointments.status, [...ACTIVE_SERVICE_STATUSES]),
          lt(Appointments.updatedAt, staleCutoff),
        ),
      );

    const staleCount = toNumber(staleResult[0]?.count);

    if (staleCount > 0) {
      overview.signals.push({
        module: 'serviceTracking',
        severity: staleCount >= 5 ? 'critical' : 'warning',
        title: 'Work may be stalled',
        detail: `${staleCount} active service job${staleCount === 1 ? '' : 's'} has not changed for more than 24 hours.`,
        href: '/service-tracking',
      });
    }

    if ((overview.waitingForApproval ?? 0) > 0) {
      overview.signals.push({
        module: 'serviceTracking',
        severity: 'warning',
        title: 'Approval queue is holding work',
        detail: `${overview.waitingForApproval} vehicle${overview.waitingForApproval === 1 ? '' : 's'} are waiting for customer approval.`,
        href: '/service-tracking',
      });
    }
  }

  if (access.inventory && (overview.lowStockItems ?? 0) > 0) {
    const outOfStock = await Database.select({ count: sql<number>`count(*)::int` })
      .from(Inventory)
      .where(
        and(
          eq(Inventory.active, true),
          lteZeroInventory(Inventory.quantity),
        ),
      );

    const outCount = toNumber(outOfStock[0]?.count);

    if (outCount > 0) {
      overview.signals.push({
        module: 'inventory',
        severity: 'critical',
        title: 'Parts availability can block jobs',
        detail: `${outCount} active inventory item${outCount === 1 ? '' : 's'} is out of stock.`,
        href: '/inventory',
      });
    } else {
      overview.signals.push({
        module: 'inventory',
        severity: 'warning',
        title: 'Inventory needs attention',
        detail: `${overview.lowStockItems} active inventory item${overview.lowStockItems === 1 ? '' : 's'} is at or below reorder level.`,
        href: '/inventory',
      });
    }
  }

  if (access.payments && (overview.unpaidFinalBills ?? 0) > 0) {
    overview.signals.push({
      module: 'payments',
      severity: 'warning',
      title: 'Completed work is still unpaid',
      detail: `${overview.unpaidFinalBills} official final bill${overview.unpaidFinalBills === 1 ? '' : 's'} still need collection.`,
      href: '/payments',
    });
  }

  return overview;
}

function lteZeroInventory(column: typeof Inventory.quantity) {
  return sql`${column} <= 0`;
}

async function getCustomersDashboard(
  now: Date,
): Promise<DashboardCustomers> {
  const today = getManilaDateString(now);
  const thirtyDaysAgo = manilaDateToUtcStart(addDays(today, -30));
  const customerStartDate = addDays(today, -CUSTOMER_LOOKBACK_DAYS);

  const [activeResult, newResult, onlineResult, visitGroups] = await Promise.all([
    Database.select({ count: sql<number>`count(*)::int` })
      .from(Customers)
      .where(eq(Customers.deactivated, false)),

    Database.select({ count: sql<number>`count(*)::int` })
      .from(Customers)
      .where(
        and(
          eq(Customers.deactivated, false),
          gte(Customers.createdAt, thirtyDaysAgo),
        ),
      ),

    Database.select({ count: sql<number>`count(*)::int` })
      .from(Customers)
      .where(eq(Customers.isOnline, true)),

    Database.select({
      customerId: Appointments.customerId,
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          gte(Appointments.appointmentDate, customerStartDate),
          sql`${Appointments.appointmentDate} <= ${today}`,
          ne(Appointments.status, 'CANCELLED'),
        ),
      )
      .groupBy(Appointments.customerId),
  ]);

  const customersWithVisits = visitGroups.length;
  const repeatCustomers = visitGroups.filter((row) => toNumber(row.count) >= 2).length;
  const repeatRate = customersWithVisits > 0
    ? (repeatCustomers / customersWithVisits) * 100
    : 0;

  return {
    activeCustomers: toNumber(activeResult[0]?.count),
    newCustomers30d: toNumber(newResult[0]?.count),
    onlineCustomers: toNumber(onlineResult[0]?.count),
    customersWithVisits90d: customersWithVisits,
    repeatCustomerRate90d: Number(repeatRate.toFixed(1)),
  };
}

async function getAppointmentsDashboard(
  now: Date,
): Promise<DashboardAppointments> {
  const today = getManilaDateString(now);
  const next7Days = buildDateRange(today, DAYS);
  const sevenDayEnd = next7Days[next7Days.length - 1];
  const thirtyDaysAgo = addDays(today, -30);

  const [todayStatuses, dailyRows, cancellationResult, pendingConfirmationResult] = await Promise.all([
    Database.select({
      status: Appointments.status,
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          eq(Appointments.appointmentDate, today),
          ne(Appointments.status, 'CANCELLED'),
        ),
      )
      .groupBy(Appointments.status),

    Database.select({
      date: Appointments.appointmentDate,
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          sql`${Appointments.appointmentDate} between ${today} and ${sevenDayEnd}`,
          ne(Appointments.status, 'CANCELLED'),
        ),
      )
      .groupBy(Appointments.appointmentDate)
      .orderBy(asc(Appointments.appointmentDate)),

    Database.select({
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          sql`${Appointments.appointmentDate} >= ${thirtyDaysAgo}`,
          sql`${Appointments.appointmentDate} <= ${today}`,
          eq(Appointments.status, 'CANCELLED'),
        ),
      ),

    Database.select({
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(
        and(
          sql`${Appointments.appointmentDate} between ${today} and ${sevenDayEnd}`,
          eq(Appointments.status, 'PENDING'),
        ),
      ),
  ]);

  const statusMap = new Map(
    todayStatuses.map((row) => [String(row.status), toNumber(row.count)]),
  );

  const loadMap = new Map(
    dailyRows.map((row) => [String(row.date), toNumber(row.count)]),
  );

  const dailyLoad = next7Days.map((date) => ({
    date,
    label: toManilaDateLabel(date),
    count: loadMap.get(date) ?? 0,
  }));

  const busiestDay = [...dailyLoad].sort((a, b) => b.count - a.count)[0] ?? null;

  const historicalTotal = await Database.select({ count: sql<number>`count(*)::int` })
    .from(Appointments)
    .where(
      and(
        sql`${Appointments.appointmentDate} >= ${thirtyDaysAgo}`,
        sql`${Appointments.appointmentDate} <= ${today}`,
      ),
    );

  const cancellationCount = toNumber(cancellationResult[0]?.count);
  const historicalCount = toNumber(historicalTotal[0]?.count);

  return {
    todayTotal: toNumber(todayStatuses.reduce((sum, row) => sum + toNumber(row.count), 0)),
    todayPending: statusMap.get('PENDING') ?? 0,
    todayConfirmed: statusMap.get('CONFIRMED') ?? 0,
    todayInService:
      (statusMap.get('UNDER_INSPECTION') ?? 0) +
      (statusMap.get('WAITING_FOR_APPROVAL') ?? 0) +
      (statusMap.get('IN_PROGRESS') ?? 0),
    next7DaysTotal: dailyLoad.reduce((sum, row) => sum + row.count, 0),
    cancellationRate30d: historicalCount > 0
      ? Number(((cancellationCount / historicalCount) * 100).toFixed(1))
      : 0,
    pendingConfirmation7d: toNumber(pendingConfirmationResult[0]?.count),
    busiestDay,
    dailyLoad,
  };
}

async function getServicesDashboard(
  now: Date,
): Promise<DashboardServices> {
  const today = getManilaDateString(now);
  const startDate = addDays(today, -SERVICE_LOOKBACK_DAYS);

  const [serviceSummary, typeMix, topServiceRows] = await Promise.all([
    Database.select({
      activeServices: sql<number>`count(*)::int`,
      averageDurationMinutes: sql<number>`coalesce(avg(${Services.estimatedDuration}), 0)`,
    })
      .from(Services)
      .where(eq(Services.active, true)),

    Database.select({
      type: Services.type,
      count: sql<number>`count(*)::int`,
    })
      .from(Services)
      .where(eq(Services.active, true))
      .groupBy(Services.type)
      .orderBy(desc(sql`count(*)`)),

    Database.execute<{ service_id: string; count: string }>(sql`
      SELECT
        service_id,
        COUNT(*)::text AS count
      FROM appointments a
      CROSS JOIN LATERAL unnest(a.services) AS service_id
      WHERE a.appointment_date >= ${startDate}
        AND a.appointment_date <= ${today}
        AND a.status <> 'CANCELLED'
      GROUP BY service_id
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `),
  ]);

  const topIds = topServiceRows.map((row) => String(row.service_id));
  const serviceDetails = topIds.length > 0
    ? await Database.select({ id: Services.id, name: Services.name })
        .from(Services)
        .where(inArray(Services.id, topIds))
    : [];

  const nameMap = new Map(serviceDetails.map((service) => [service.id, service.name]));

  return {
    activeServices: toNumber(serviceSummary[0]?.activeServices),
    averageDurationMinutes: Number(toNumber(serviceSummary[0]?.averageDurationMinutes).toFixed(1)),
    serviceTypeMix: typeMix.map((row) => ({
      type: row.type || 'OTHER',
      count: toNumber(row.count),
    })),
    topServices90d: topServiceRows.map((row) => ({
      id: String(row.service_id),
      name: nameMap.get(String(row.service_id)) || 'Unknown service',
      count: toNumber(row.count),
    })),
  };
}

async function getStaffsDashboard(): Promise<DashboardStaffs> {
  const [staffSummary, moduleRows, roleRows] = await Promise.all([
    Database.select({
      totalStaff: sql<number>`count(*) filter (where ${Staffs.inBoarding} = true)::int`,
      onlineStaff: sql<number>`count(*) filter (where ${Staffs.inBoarding} = true and ${Staffs.isOnline} = true)::int`,
      offlineStaff: sql<number>`count(*) filter (where ${Staffs.inBoarding} = true and ${Staffs.isOnline} = false)::int`,
    })
      .from(Staffs),

    Database.select({
      key: Staffs.currentModule,
      count: sql<number>`count(*)::int`,
    })
      .from(Staffs)
      .where(
        and(
          eq(Staffs.inBoarding, true),
          eq(Staffs.isOnline, true),
        ),
      )
      .groupBy(Staffs.currentModule)
      .orderBy(desc(sql`count(*)`)),

    Database.select({
      key: Staffs.role,
      count: sql<number>`count(*)::int`,
    })
      .from(Staffs)
      .where(eq(Staffs.inBoarding, true))
      .groupBy(Staffs.role)
      .orderBy(desc(sql`count(*)`)),
  ]);

  return {
    totalStaff: toNumber(staffSummary[0]?.totalStaff),
    onlineStaff: toNumber(staffSummary[0]?.onlineStaff),
    offlineStaff: toNumber(staffSummary[0]?.offlineStaff),
    modulePresence: groupCount(moduleRows).map((row) => ({
      module: row.key,
      count: row.count,
    })),
    roleMix: roleRows.map((row) => ({
      role: normalizeRole(row.key),
      count: toNumber(row.count),
    })),
  };
}

async function getServiceTrackingDashboard(
  now: Date,
): Promise<DashboardServiceTracking> {
  const today = getManilaDateString(now);
  const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [statusRows, queueRows, inspectionRows, workRows, staleRows, oldestRows] = await Promise.all([
    Database.select({
      status: Appointments.status,
      count: sql<number>`count(*)::int`,
    })
      .from(Appointments)
      .where(inArray(Appointments.status, [...ACTIVE_SERVICE_STATUSES]))
      .groupBy(Appointments.status),

    Database.select({
      status: ServiceQueue.status,
      count: sql<number>`count(*)::int`,
    })
      .from(ServiceQueue)
      .where(eq(ServiceQueue.queueDate, today))
      .groupBy(ServiceQueue.status)
      .orderBy(desc(sql`count(*)`)),

    Database.select({
      status: InspectionTasks.status,
      count: sql<number>`count(*)::int`,
    })
      .from(InspectionTasks)
      .groupBy(InspectionTasks.status),

    Database.select({
      status: WorkTasks.status,
      count: sql<number>`count(*)::int`,
    })
      .from(WorkTasks)
      .groupBy(WorkTasks.status),

    Database.select({ count: sql<number>`count(*)::int` })
      .from(Appointments)
      .where(
        and(
          inArray(Appointments.status, [...ACTIVE_SERVICE_STATUSES]),
          lt(Appointments.updatedAt, staleCutoff),
        ),
      ),

    Database.select({
      trackingNumber: Appointments.trackingNumber,
      customerName: Customers.fullname,
      status: Appointments.status,
      updatedAt: Appointments.updatedAt,
    })
      .from(Appointments)
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .where(inArray(Appointments.status, [...ACTIVE_SERVICE_STATUSES]))
      .orderBy(asc(Appointments.updatedAt))
      .limit(5),
  ]);

  const statusMap = new Map(
    statusRows.map((row) => [String(row.status), toNumber(row.count)]),
  );

  const toTaskCounts = (rows: Array<{ status: string; count: unknown }>) => {
    const map = new Map(rows.map((row) => [String(row.status), toNumber(row.count)]));
    return {
      pending: map.get('PENDING') ?? 0,
      inProgress: map.get('IN_PROGRESS') ?? 0,
      done: map.get('DONE') ?? 0,
    };
  };

  return {
    activeJobs: [...statusMap.values()].reduce((sum, count) => sum + count, 0),
    jobsUnderInspection: statusMap.get('UNDER_INSPECTION') ?? 0,
    jobsWaitingApproval: statusMap.get('WAITING_FOR_APPROVAL') ?? 0,
    jobsInProgress: statusMap.get('IN_PROGRESS') ?? 0,
    jobsOlderThan24h: toNumber(staleRows[0]?.count),
    queueToday: queueRows.map((row) => ({
      status: String(row.status),
      count: toNumber(row.count),
    })),
    inspectionTasks: toTaskCounts(inspectionRows as Array<{ status: string; count: unknown }>),
    workTasks: toTaskCounts(workRows as Array<{ status: string; count: unknown }>),
    oldestJobs: oldestRows.map((row) => ({
      trackingNumber: row.trackingNumber,
      customerName: row.customerName || 'Customer',
      status: String(row.status),
      updatedAt: row.updatedAt.toISOString(),
      ageHours: Math.max(
        0,
        Math.round((now.getTime() - row.updatedAt.getTime()) / 3_600_000),
      ),
    })),
  };
}

async function getPaymentsDashboard(
  now: Date,
): Promise<DashboardPayments> {
  const today = getManilaDateString(now);
  const paymentStart = manilaDateToUtcStart(addDays(today, -PAYMENT_LOOKBACK_DAYS));
  const trendStart = manilaDateToUtcStart(addDays(today, -(PAYMENT_TREND_DAYS - 1)));

  const [pendingEstimateResult, officialBillResult, paidRows, openAndPaidRows] = await Promise.all([
    Database.select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${EstimatedCosts.grandTotal}), 0)`,
    })
      .from(EstimatedCosts)
      .where(eq(EstimatedCosts.status, 'WAITING_FOR_APPROVAL')),

    Database.select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${FinalBill.grandTotal}), 0)`,
    })
      .from(FinalBill)
      .where(eq(FinalBill.status, 'OFFICIAL')),

    Database.select({
      id: FinalBill.id,
      amount: FinalBill.grandTotal,
      updatedAt: FinalBill.updatedAt,
    })
      .from(FinalBill)
      .where(
        and(
          eq(FinalBill.status, 'PAID'),
          gte(FinalBill.updatedAt, paymentStart),
        ),
      )
      .orderBy(asc(FinalBill.updatedAt)),

    Database.select({
      status: FinalBill.status,
      total: FinalBill.grandTotal,
    })
      .from(FinalBill)
      .where(
        and(
          gte(FinalBill.updatedAt, paymentStart),
          inArray(FinalBill.status, ['OFFICIAL', 'PAID']),
        ),
      ),
  ]);

  const trendDates = buildDateRange(addDays(today, -(PAYMENT_TREND_DAYS - 1)), PAYMENT_TREND_DAYS);
  const trendMap = new Map<string, number>(trendDates.map((date) => [date, 0]));

  paidRows
    .filter((row) => row.updatedAt >= trendStart)
    .forEach((row) => {
      const date = toManilaDateValue(row.updatedAt);
      trendMap.set(date, (trendMap.get(date) ?? 0) + toNumber(row.amount));
    });

  const paymentTrend14d: DashboardPaymentTrendPoint[] = trendDates.map((date) => ({
    date,
    label: toManilaDateLabel(date),
    amount: Number((trendMap.get(date) ?? 0).toFixed(2)),
  }));

  let paidAmount30d = 0;
  let officialAmount30d = 0;
  let paidBills30d = 0;

  for (const row of openAndPaidRows) {
    const amount = toNumber(row.total);
    if (row.status === 'PAID') {
      paidAmount30d += amount;
      paidBills30d += 1;
    } else if (row.status === 'OFFICIAL') {
      officialAmount30d += amount;
    }
  }

  const collectionRate = paidAmount30d + officialAmount30d > 0
    ? (paidAmount30d / (paidAmount30d + officialAmount30d)) * 100
    : 0;

  return {
    pendingEstimates: toNumber(pendingEstimateResult[0]?.count),
    pendingEstimateValue: toNumber(pendingEstimateResult[0]?.total),
    officialFinalBills: toNumber(officialBillResult[0]?.count),
    officialFinalBillValue: toNumber(officialBillResult[0]?.total),
    paidAmount30d: Number(paidAmount30d.toFixed(2)),
    paidBills30d,
    collectionRate30d: Number(collectionRate.toFixed(1)),
    paymentTrend14d,
  };
}

async function getInventoryDashboard(
  now: Date,
): Promise<DashboardInventory> {
  const today = getManilaDateString(now);
  const usedStart = manilaDateToUtcStart(addDays(today, -30));

  const [summary, allocations, usedRows, lowStockList] = await Promise.all([
    Database.select({
      activeItems: sql<number>`count(*) filter (where ${Inventory.active} = true)::int`,
      lowStockItems: sql<number>`count(*) filter (where ${Inventory.active} = true and ${Inventory.lowStockAlert} = true and ${Inventory.quantity} <= ${Inventory.reorderLevel})::int`,
      outOfStockItems: sql<number>`count(*) filter (where ${Inventory.active} = true and ${Inventory.quantity} <= 0)::int`,
      stockValue: sql<string>`coalesce(sum(case when ${Inventory.active} = true then ${Inventory.quantity} * ${Inventory.costPrice} else 0 end), 0)`,
    })
      .from(Inventory),

    Database.select({
      value: sql<string>`coalesce(sum(${InventoryAllocations.quantity} * ${InventoryAllocations.priceAtTime}), 0)`,
    })
      .from(InventoryAllocations)
      .where(eq(InventoryAllocations.status, 'KEEP')),

    Database.select({
      itemName: InventoryAllocations.itemName,
      quantity: InventoryAllocations.quantity,
      priceAtTime: InventoryAllocations.priceAtTime,
    })
      .from(InventoryAllocations)
      .where(
        and(
          eq(InventoryAllocations.status, 'USED'),
          gte(InventoryAllocations.usedAt, usedStart),
        ),
      ),

    Database.select({
      name: Inventory.name,
      quantity: Inventory.quantity,
      reorderLevel: Inventory.reorderLevel,
    })
      .from(Inventory)
      .where(
        and(
          eq(Inventory.active, true),
          eq(Inventory.lowStockAlert, true),
          sql`${Inventory.quantity} <= ${Inventory.reorderLevel}`,
        ),
      )
      .orderBy(asc(Inventory.quantity), asc(Inventory.name))
      .limit(5),
  ]);

  const usedQuantity30d = usedRows.reduce((sum, row) => sum + toNumber(row.quantity), 0);
  const usedValue30d = usedRows.reduce(
    (sum, row) => sum + toNumber(row.quantity) * toNumber(row.priceAtTime),
    0,
  );

  return {
    activeItems: toNumber(summary[0]?.activeItems),
    lowStockItems: toNumber(summary[0]?.lowStockItems),
    outOfStockItems: toNumber(summary[0]?.outOfStockItems),
    stockValue: Number(toNumber(summary[0]?.stockValue).toFixed(2)),
    reservedKeepValue: Number(toNumber(allocations[0]?.value).toFixed(2)),
    usedQuantity30d,
    usedValue30d: Number(usedValue30d.toFixed(2)),
    lowStockList: lowStockList.map((row) => ({
      name: row.name,
      quantity: toNumber(row.quantity),
      reorderLevel: toNumber(row.reorderLevel),
    })),
  };
}

export async function getDashboardData(
  accessInput: Partial<Record<string, boolean>> | null | undefined,
): Promise<DashboardData> {
  const access: DashboardAccess = {
    dashboard: accessInput?.dashboard === true,
    customers: accessInput?.customers === true,
    appointments: accessInput?.appointments === true,
    services: accessInput?.services === true,
    staffs: accessInput?.staffs === true,
    serviceTracking: accessInput?.serviceTracking === true,
    payments: accessInput?.payments === true,
    inventory: accessInput?.inventory === true,
  };

  if (!access.dashboard) {
    throw new Error('DASHBOARD_ACCESS_REQUIRED');
  }

  const now = new Date();
  const overview = await getOverview(access, getManilaDateString(now), now);

  /*
   * Keep module analytics at a small concurrency level. Every module itself
   * may use Promise.all for its small set of aggregates; running all seven
   * modules at once can otherwise create a large burst of database work on
   * Supabase/Postgres. The previous implementation could make one Dashboard
   * request fan out into dozens of concurrent queries.
   */
  let customers: DashboardCustomers | undefined;
  let appointments: DashboardAppointments | undefined;
  let services: DashboardServices | undefined;
  let staffs: DashboardStaffs | undefined;
  let serviceTracking: DashboardServiceTracking | undefined;
  let payments: DashboardPayments | undefined;
  let inventory: DashboardInventory | undefined;

  const moduleJobs: Array<() => Promise<void>> = [];

  if (access.customers) {
    moduleJobs.push(async () => {
      customers = await getCustomersDashboard(now);
    });
  }
  if (access.appointments) {
    moduleJobs.push(async () => {
      appointments = await getAppointmentsDashboard(now);
    });
  }
  if (access.services) {
    moduleJobs.push(async () => {
      services = await getServicesDashboard(now);
    });
  }
  if (access.staffs) {
    moduleJobs.push(async () => {
      staffs = await getStaffsDashboard();
    });
  }
  if (access.serviceTracking) {
    moduleJobs.push(async () => {
      serviceTracking = await getServiceTrackingDashboard(now);
    });
  }
  if (access.payments) {
    moduleJobs.push(async () => {
      payments = await getPaymentsDashboard(now);
    });
  }
  if (access.inventory) {
    moduleJobs.push(async () => {
      inventory = await getInventoryDashboard(now);
    });
  }

  const MODULE_CONCURRENCY = 2;

  for (let index = 0; index < moduleJobs.length; index += MODULE_CONCURRENCY) {
    await Promise.all(
      moduleJobs
        .slice(index, index + MODULE_CONCURRENCY)
        .map((job) => job()),
    );
  }

  return {
    generatedAt: now.toISOString(),
    access,
    overview,
    ...(customers ? { customers } : {}),
    ...(appointments ? { appointments } : {}),
    ...(services ? { services } : {}),
    ...(staffs ? { staffs } : {}),
    ...(serviceTracking ? { serviceTracking } : {}),
    ...(payments ? { payments } : {}),
    ...(inventory ? { inventory } : {}),
  };
}
