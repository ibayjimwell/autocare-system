import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
import { ServiceDefaultTaskGroups } from '@/database/models/service-tracking/service-default-task-groups.model';
import { InspectionTasks } from '@/database/models/service-tracking/inspection-tasks.model';
import { WorkTasks } from '@/database/models/service-tracking/work-tasks.model';
import { eq, inArray } from 'drizzle-orm';

export type LinkedTaskPhase = 'INSPECTION' | 'WORK';

/**
 * Materialize linked template tasks into the appointment checklist.
 * Invoke during the *actual* phase transition, not from a GET endpoint.
 *
 * The link is many-to-many: a group may serve multiple booked services.
 * Imported tasks are a snapshot: editing/deleting templates afterwards never
 * rewrites or deletes the appointment's existing checklist tasks.
 *
 * `db` may be Database or an existing Drizzle transaction. Pass the same tx
 * that changes the appointment status for atomicity.
 */
export async function applyLinkedDefaultTasks(
  appointmentId: string,
  phase: LinkedTaskPhase,
  db: any = Database,
): Promise<number> {
  const [appointment] = await db.select({
    services: Appointments.services,
  }).from(Appointments).where(eq(Appointments.id, appointmentId)).limit(1);
  if (!appointment) throw new Error('Appointment not found while attaching default tasks.');

  const serviceIds = Array.from(new Set(
    (Array.isArray(appointment.services) ? appointment.services : [])
      .filter((id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)),
  ));
  if (serviceIds.length === 0) return 0;

  const links = await db.select({ groupId: ServiceDefaultTaskGroups.groupId })
    .from(ServiceDefaultTaskGroups)
    .where(inArray(ServiceDefaultTaskGroups.serviceId, serviceIds));
  const groupIds: string[] = Array.from(new Set(links.map((row: any) => String(row.groupId))));
  if (groupIds.length === 0) return 0;

  const templates = await db.select().from(DefaultTasks)
    .where(inArray(DefaultTasks.groupId, groupIds))
    .orderBy(DefaultTasks.order, DefaultTasks.createdAt);
  const matching = templates.filter((task: any) =>
    (task.taskType === 'WORK' ? 'WORK' : 'INSPECTION') === phase &&
    typeof task.title === 'string' && task.title.trim(),
  );
  if (matching.length === 0) return 0;

  const table = phase === 'INSPECTION' ? InspectionTasks : WorkTasks;
  const current = await db.select({
    title: table.title,
    order: table.order,
    defaultTaskId: table.defaultTaskId,
  }).from(table).where(eq(table.appointmentId, appointmentId));

  // Keep intentional manually created tasks and previously imported tasks.
  // Title comparison also prevents a duplicate when staff manually selected
  // a template shortly before starting the phase.
  const seenTitles = new Set(current.map((row: any) => String(row.title).trim().toLowerCase()));
  const seenTemplateIds = new Set(current.map((row: any) => row.defaultTaskId).filter(Boolean));
  let nextOrder = Math.max(0, ...current.map((row: any) => Number(row.order) || 0)) + 1;
  const toInsert = [];
  for (const template of matching) {
    const title = template.title.trim();
    if (seenTemplateIds.has(template.id) || seenTitles.has(title.toLowerCase())) continue;
    seenTemplateIds.add(template.id);
    seenTitles.add(title.toLowerCase());
    toInsert.push({
      appointmentId,
      defaultTaskId: template.id,
      title,
      status: 'PENDING',
      durationMinutes: template.durationMinutes ?? null,
      order: nextOrder++,
    });
  }
  if (toInsert.length === 0) return 0;
  const rows = await db.insert(table).values(toInsert).onConflictDoNothing().returning({ id: table.id });
  return rows.length;
}
