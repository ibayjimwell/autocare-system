import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { InspectionTasks } from '@/database/models/service-tracking/inspection-tasks.model';
import { WorkTasks } from '@/database/models/service-tracking/work-tasks.model';
import { ServiceQueue } from '@/database/models/queue/service-queue.model';
import { ServiceWarranties } from '@/database/models/service-journey/service-journey.model';
import { calculateTaskTiming, type TimedTask } from './task-timing';
import { eq, desc } from 'drizzle-orm';

const PHASES = ['PENDING', 'CONFIRMED', 'UNDER_INSPECTION', 'WAITING_FOR_APPROVAL', 'IN_PROGRESS', 'COMPLETED'] as const;

export async function getServiceJourney(appointmentId: string) {
  const [appt] = await Database.select().from(Appointments).where(eq(Appointments.id, appointmentId)).limit(1);
  if (!appt) return null;
  const [inspection, work, queues, warranties] = await Promise.all([
    Database.select().from(InspectionTasks).where(eq(InspectionTasks.appointmentId, appointmentId)),
    Database.select().from(WorkTasks).where(eq(WorkTasks.appointmentId, appointmentId)),
    Database.select().from(ServiceQueue).where(eq(ServiceQueue.appointmentId, appointmentId)).orderBy(desc(ServiceQueue.createdAt)).limit(1),
    Database.select().from(ServiceWarranties).where(eq(ServiceWarranties.appointmentId, appointmentId)).limit(1),
  ]);
  const status = String(appt.status).toUpperCase();
  const queue = queues[0] ?? null;
  const inspectionDone = inspection.filter(t => t.status === 'DONE').length;
  const workDone = work.filter(t => t.status === 'DONE').length;
  const active = status === 'UNDER_INSPECTION' || status === 'WAITING_FOR_APPROVAL' ? inspection : status === 'IN_PROGRESS' ? work : [];
  const done = active.filter(t => t.status === 'DONE').length;
  const expectedMinutes = active.reduce((n, t) => n + Math.max(0, t.durationMinutes ?? 0) + Math.max(0, t.extensionMinutes ?? 0), 0);
  const phaseIndex = status === 'CANCELLED' ? -1 : PHASES.indexOf(status as typeof PHASES[number]);

  // During inspection, inspect inspection tasks. Once repair begins, keep
  // inspection results together with repair tasks. One extension anywhere in
  // this service takes priority over early-finished tasks.
  const timingTasks: TimedTask[] = status === 'UNDER_INSPECTION' || status === 'WAITING_FOR_APPROVAL'
    ? inspection.map(t => ({ ...t, phase: 'INSPECTION' as const }))
    : ['IN_PROGRESS', 'COMPLETED'].includes(status)
      ? [...inspection.map(t => ({ ...t, phase: 'INSPECTION' as const })), ...work.map(t => ({ ...t, phase: 'WORK' as const }))]
      : [];
  const timing = calculateTaskTiming(timingTasks);
  const fullyCompleted = status === 'COMPLETED' && timing.remainingCount === 0;
  const timingStatus = timing.status;
  const customerMessage = status === 'COMPLETED'
    ? 'Your vehicle service is complete.'
    : status === 'IN_PROGRESS'
      ? 'Technicians are working on your vehicle.'
      : status === 'WAITING_FOR_APPROVAL'
        ? 'Please review your estimate.'
        : status === 'UNDER_INSPECTION'
          ? 'Your vehicle is being inspected.'
          : 'We will update you as your appointment progresses.';
  return {
    appointmentId: appt.id, customerId: appt.customerId, trackingNumber: appt.trackingNumber,
    status, queueStatus: queue?.status || null, queueNumber: queue?.queueNumber ?? null,
    scheduledAt: `${appt.appointmentDate}T${appt.appointmentTime}`,
    phases: PHASES.map((key, index) => ({
      key,
      label: ({ PENDING: 'Requested', CONFIRMED: 'Confirmed', UNDER_INSPECTION: 'Inspection', WAITING_FOR_APPROVAL: 'Approval', IN_PROGRESS: 'Repair in progress', COMPLETED: 'Service complete' } as Record<string, string>)[key],
      state: index < phaseIndex ? 'DONE' : index === phaseIndex ? 'CURRENT' : 'UPCOMING',
    })),
    inspection: { done: inspectionDone, total: inspection.length },
    work: { done: workDone, total: work.length },
    progressPercent: active.length ? Math.round(done / active.length * 100) : status === 'COMPLETED' ? 100 : 0,
    expectedTaskMinutes: expectedMinutes,
    delayIndicator: timingStatus,
    timing: { ...timing, isProjection: !fullyCompleted, activePhase: status },
    warranty: warranties[0] ? {
      coverage: warranties[0].coverage, terms: warranties[0].terms,
      startsAt: warranties[0].startsAt, expiresAt: warranties[0].expiresAt,
    } : null,
    customerMessage,
    refreshedAt: new Date().toISOString(),
  };
}
