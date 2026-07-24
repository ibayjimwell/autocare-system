// lib/service-queue/queue-utils.ts
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { ServiceQueue } from "@/database/models/queue/service-queue.model";
import { eq, sql } from "drizzle-orm";

export async function addToQueue(appointmentId: string) {
  const [appt] = await Database.select()
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId))
    .limit(1);
  if (!appt || appt.status !== 'CONFIRMED') return;

  // Check if already in queue for this date
  const existing = await Database.select({ id: ServiceQueue.id })
    .from(ServiceQueue)
    .where(eq(ServiceQueue.appointmentId, appointmentId))
    .limit(1);
  if (existing.length > 0) return;

  // Determine next queue number for this date
  const [max] = await Database.select({ max: sql<number>`coalesce(max(${ServiceQueue.queueNumber}), 0)` })
    .from(ServiceQueue)
    .where(eq(ServiceQueue.queueDate, appt.appointmentDate));
  const nextNumber = (max?.max || 0) + 1;

  await Database.insert(ServiceQueue).values({
    appointmentId,
    queueDate: appt.appointmentDate,
    queueNumber: nextNumber,
    status: 'WAITING',
  });
}

export async function removeFromQueue(appointmentId: string) {
  const [entry] = await Database.select()
    .from(ServiceQueue)
    .where(eq(ServiceQueue.appointmentId, appointmentId))
    .limit(1);
  if (!entry) return;

  const date = entry.queueDate;
  await Database.delete(ServiceQueue).where(eq(ServiceQueue.id, entry.id));

  // Renumber remaining entries for the date to keep them sequential
  const remaining = await Database.select({ id: ServiceQueue.id })
    .from(ServiceQueue)
    .where(eq(ServiceQueue.queueDate, date))
    .orderBy(ServiceQueue.queueNumber);

  for (let i = 0; i < remaining.length; i++) {
    await Database.update(ServiceQueue)
      .set({ queueNumber: i + 1, updatedAt: new Date() })
      .where(eq(ServiceQueue.id, remaining[i].id));
  }
}