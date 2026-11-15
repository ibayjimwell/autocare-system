import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { InspectionTasks } from '@/database/models/service-tracking/inspection-tasks.model';
import { WorkTasks } from '@/database/models/service-tracking/work-tasks.model';
import { and, eq, lte, sql } from 'drizzle-orm';
import { calculateTaskTiming } from '@/lib/service-journey/task-timing';
import { isValidUUID } from '@/utils/shared';

/** Add 5–240 minutes to a nearly completed ACTIVE task. Original estimate never changes. */
export async function extendTask(req: NextRequest, id: string, phase: 'INSPECTION' | 'WORK') {
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid task ID.' }, { status: 422 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Staff login required.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const minutes = body?.additionalMinutes;
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240)
    return NextResponse.json({ error: true, errorMessage: 'Extension must be 5 to 240 whole minutes.' }, { status: 422 });
  try {
    if (phase === 'INSPECTION') {
      const [task] = await Database.select().from(InspectionTasks).where(eq(InspectionTasks.id, id)).limit(1);
      if (!task) return NextResponse.json({ error: true, errorMessage: 'Task not found.' }, { status: 404 });
      const [appointment] = await Database.select({ status: Appointments.status }).from(Appointments).where(eq(Appointments.id, task.appointmentId)).limit(1);
      if (appointment?.status !== 'UNDER_INSPECTION' || task.status !== 'IN_PROGRESS')
        return NextResponse.json({ error: true, errorMessage: 'Only an active inspection task can be extended.' }, { status: 409 });
      const timing = calculateTaskTiming([{ ...task, phase: 'INSPECTION' }]);
      if (!timing.rows[0].nearFinish)
        return NextResponse.json({ error: true, errorMessage: 'Extend becomes available after 80% of the current estimated duration has elapsed.' }, { status: 409 });
      const [updated] = await Database.update(InspectionTasks).set({
        extensionMinutes: sql`${InspectionTasks.extensionMinutes} + ${minutes}`,
        updatedAt: new Date(),
      }).where(and(eq(InspectionTasks.id, id), eq(InspectionTasks.status, 'IN_PROGRESS'), eq(InspectionTasks.extensionMinutes, task.extensionMinutes), lte(InspectionTasks.extensionMinutes, 1440 - minutes))).returning();
      if (!updated) return NextResponse.json({ error: true, errorMessage: 'Task changed or extension limit reached. Refresh.' }, { status: 409 });
      return NextResponse.json({ error: false, message: `Added ${minutes} minutes.`, data: updated });
    }
    const [task] = await Database.select().from(WorkTasks).where(eq(WorkTasks.id, id)).limit(1);
    if (!task) return NextResponse.json({ error: true, errorMessage: 'Task not found.' }, { status: 404 });
    const [appointment] = await Database.select({ status: Appointments.status }).from(Appointments).where(eq(Appointments.id, task.appointmentId)).limit(1);
    if (appointment?.status !== 'IN_PROGRESS' || task.status !== 'IN_PROGRESS')
      return NextResponse.json({ error: true, errorMessage: 'Only an active repair task can be extended.' }, { status: 409 });
    const timing = calculateTaskTiming([{ ...task, phase: 'WORK' }]);
    if (!timing.rows[0].nearFinish)
      return NextResponse.json({ error: true, errorMessage: 'Extend becomes available after 80% of the current estimated duration has elapsed.' }, { status: 409 });
    const [updated] = await Database.update(WorkTasks).set({
      extensionMinutes: sql`${WorkTasks.extensionMinutes} + ${minutes}`,
      updatedAt: new Date(),
    }).where(and(eq(WorkTasks.id, id), eq(WorkTasks.status, 'IN_PROGRESS'), eq(WorkTasks.extensionMinutes, task.extensionMinutes), lte(WorkTasks.extensionMinutes, 1440 - minutes))).returning();
    if (!updated) return NextResponse.json({ error: true, errorMessage: 'Task changed or extension limit reached. Refresh.' }, { status: 409 });
    return NextResponse.json({ error: false, message: `Added ${minutes} minutes.`, data: updated });
  } catch (e) {
    console.error('[Extend service task]', e);
    return NextResponse.json({ error: true, errorMessage: 'Unable to extend task.' }, { status: 500 });
  }
}
