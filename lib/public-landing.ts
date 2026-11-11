import 'server-only';

import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { Services } from '@/database/models/services/services.model';
import { ServiceQueue } from '@/database/models/queue/service-queue.model';

/**
 * Public projection only. Never send customer names, IDs, tracking numbers,
 * appointment IDs, full registration plates, notes, or contact information.
 */
export type PublicQueueVehicle = {
  key: string;
  vehicle: string;
  plate: string;
  services: string[];
  time: string;
  queueNumber: number | null;
  status: 'CONFIRMED' | 'IN_PROGRESS';
};

export type PublicQueueFeed = {
  dateISO: string;
  dateLabel: string;
  updatedAt: string;
  confirmed: PublicQueueVehicle[];
  inProgress: PublicQueueVehicle[];
  unavailable: boolean;
};

export type PublicTrendingService = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: string | null;
  bookingCount: number;
};

const PHILIPPINES_TZ = 'Asia/Manila';
const QUEUE_LIMIT_PER_GROUP = 6;

/** Date.now() is evaluated for every request using Philippine business time. */
export function getManilaBusinessDate(now = new Date(Date.now())) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const dateISO = `${value('year')}-${value('month')}-${value('day')}`;
  const dateLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: PHILIPPINES_TZ,
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).format(now);
  return { dateISO, dateLabel };
}

/** Server-side masking; the raw plate never crosses into the public response. */
export function maskPublicPlate(plate: string | null): string {
  const chars = (plate ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!chars) return 'Plate private';
  const visible = chars.slice(-Math.min(3, Math.max(1, chars.length - 1)));
  return `••• ${visible}`;
}

function safeVehicleName(make: string | null, model: string | null) {
  const value = [make, model].filter(Boolean).join(' ').trim();
  return value.length ? value.slice(0, 90) : 'Vehicle';
}

/**
 * Read-only, bounded query: CONFIRMED / IN_PROGRESS appointments booked for
 * today, plus active jobs explicitly on today's service_queue. Both sources
 * are needed because a workshop job may carry over from an earlier booking.
 * We do not expose mechanic, customer, appointment, or payment information.
 */
export async function getPublicLiveQueue(now = new Date(Date.now())): Promise<PublicQueueFeed> {
  const { dateISO, dateLabel } = getManilaBusinessDate(now);
  const empty: PublicQueueFeed = {
    dateISO, dateLabel, updatedAt: now.toISOString(),
    confirmed: [], inProgress: [], unavailable: false,
  };
  try {
    const records = await Database.select({
      id: Appointments.id,
      status: Appointments.status,
      appointmentTime: Appointments.appointmentTime,
      serviceIds: Appointments.services,
      make: Vehicles.make,
      model: Vehicles.model,
      plate: Vehicles.plateNumber,
      queueNumber: ServiceQueue.queueNumber,
    })
      .from(Appointments)
      .innerJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
      .leftJoin(ServiceQueue, eq(ServiceQueue.appointmentId, Appointments.id))
      .where(and(
        inArray(Appointments.status, ['CONFIRMED', 'IN_PROGRESS']),
        or(eq(Appointments.appointmentDate, dateISO), eq(ServiceQueue.queueDate, dateISO)),
      ))
      .orderBy(asc(Appointments.appointmentTime))
      .limit(120);

    const unique = new Map<string, typeof records[number]>();
    for (const item of records) {
      if (!unique.has(item.id)) unique.set(item.id, item);
    }
    const items = [...unique.values()];
    const confirmed = items.filter(item => item.status === 'CONFIRMED').slice(0, QUEUE_LIMIT_PER_GROUP);
    const inProgress = items.filter(item => item.status === 'IN_PROGRESS').slice(0, QUEUE_LIMIT_PER_GROUP);
    const displayRows = [...confirmed, ...inProgress];
    const ids = [...new Set(displayRows.flatMap(item => item.serviceIds ?? []).filter(
      (id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id),
    ))];
    const serviceRows = ids.length
      ? await Database.select({ id: Services.id, name: Services.name })
          .from(Services).where(inArray(Services.id, ids))
      : [];
    const serviceMap = new Map(serviceRows.map(item => [item.id, item.name]));
    const mapped = (rows: typeof displayRows, status: PublicQueueVehicle['status']): PublicQueueVehicle[] =>
      rows.map((row, index) => ({
        // Ephemeral positional key, not a database identifier.
        key: `${status}-${index}`,
        vehicle: safeVehicleName(row.make, row.model),
        plate: maskPublicPlate(row.plate),
        services: (row.serviceIds ?? []).map(id => serviceMap.get(id)).filter((name): name is string => Boolean(name)).slice(0, 4),
        time: String(row.appointmentTime ?? '').slice(0, 5),
        queueNumber: typeof row.queueNumber === 'number' && row.queueNumber > 0 ? row.queueNumber : null,
        status,
      }));

    return {
      ...empty,
      confirmed: mapped(confirmed, 'CONFIRMED'),
      inProgress: mapped(inProgress, 'IN_PROGRESS'),
    };
  } catch (error) {
    console.error('[Public landing] Failed to read today\'s queue:', error);
    return { ...empty, unavailable: true };
  }
}

/** Uses the same active-appointment concept as /api/services/trending. */
export async function getPublicTrendingServices(): Promise<PublicTrendingService[]> {
  try {
    const popularity = sql<number>`(
      SELECT COUNT(*)::int
      FROM appointments AS active_appointment
      WHERE ${Services.id}::text = ANY(active_appointment.services)
        AND active_appointment.status NOT IN ('CANCELLED', 'COMPLETED')
    )`;
    const rows = await Database.select({
      id: Services.id,
      name: Services.name,
      description: Services.description,
      category: Services.type,
      basePrice: Services.basePrice,
      bookingCount: popularity,
    })
      .from(Services)
      .where(eq(Services.active, true));

    return rows
      .map(item => ({ ...item, bookingCount: Math.max(0, Number(item.bookingCount) || 0) }))
      .sort((a, b) => b.bookingCount - a.bookingCount || a.name.localeCompare(b.name))
      .slice(0, 4);
  } catch (error) {
    console.error('[Public landing] Trending services unavailable:', error);
    return [];
  }
}
