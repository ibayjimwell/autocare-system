import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { InspectionTasks } from '@/database/models/service-tracking/inspection-tasks.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { and, eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { getTrackingNumber } from '@/utils/service-tracking/get-tracking-number';
import { serviceTrackingTriggers } from '@/triggers/service-tracking';
import { mobileInspectionTaskTriggers } from '@/app-triggers/inspection-task';

/** Persist timestamps on the server, never infer task finish from the client. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid task ID.' }, { status: 422 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Staff login required.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!['PENDING', 'IN_PROGRESS', 'DONE'].includes(status))
    return NextResponse.json({ error: true, errorMessage: 'Invalid task status.' }, { status: 422 });
  try {
    const [task] = await Database.select().from(InspectionTasks).where(eq(InspectionTasks.id, id)).limit(1);
    if (!task) return NextResponse.json({ error: true, errorMessage: 'Task not found.' }, { status: 404 });
    const [appointment] = await Database.select({ status: Appointments.status }).from(Appointments)
      .where(eq(Appointments.id, task.appointmentId)).limit(1);
    if (appointment?.status !== 'UNDER_INSPECTION')
      return NextResponse.json({ error: true, errorMessage: 'Task phase is not active.' }, { status: 409 });
    if (status === task.status) return NextResponse.json({ error: false, data: task, message: 'Task already has that status.' });
    if (status === 'DONE' && task.status !== 'IN_PROGRESS')
      return NextResponse.json({ error: true, errorMessage: 'Start the task before finishing it.' }, { status: 409 });
    if (status === 'IN_PROGRESS' && task.status !== 'PENDING')
      return NextResponse.json({ error: true, errorMessage: 'Reset to Pending before starting the task again.' }, { status: 409 });
    const now = new Date();
    const changes = status === 'PENDING'
      ? { status, startedAt: null, completedAt: null, extensionMinutes: 0, updatedAt: now }
      : status === 'IN_PROGRESS'
        ? { status, startedAt: now, completedAt: null, extensionMinutes: 0, updatedAt: now }
        : { status, completedAt: now, updatedAt: now };
    // Previous-status guard prevents concurrent duplicate transitions overwriting timing.
    const [updated] = await Database.update(InspectionTasks).set(changes)
      .where(and(eq(InspectionTasks.id, id), eq(InspectionTasks.status, task.status))).returning();
    if (!updated) return NextResponse.json({ error: true, errorMessage: 'Task changed. Refresh and retry.' }, { status: 409 });
    if (status === 'IN_PROGRESS' || status === 'DONE') {
      // Existing staff/mobile notifications are preserved, but sent only on a real transition.
      try {
      const trackingNumber = await getTrackingNumber(updated.appointmentId);
      const payload = { taskTitle: updated.title, trackingNumber };
      const mobilePayload = { appointmentId: updated.appointmentId, taskTitle: updated.title };
      if (status === 'IN_PROGRESS') {
        void serviceTrackingTriggers.onInspectionTaskStarted(payload).catch(console.error);
        void mobileInspectionTaskTriggers.onTaskStarted(mobilePayload).catch(console.error);
      } else {
        void serviceTrackingTriggers.onInspectionTaskDone(payload).catch(console.error);
        void mobileInspectionTaskTriggers.onTaskDone(mobilePayload).catch(console.error);
      }
      } catch (notificationError) { console.error('[Task notification]', notificationError); }
    }
    return NextResponse.json({ error: false, data: updated, message: 'Task updated.' });
  } catch (error) {
    console.error('[Task status inspection]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to update task status.' }, { status: 500 });
  }
}
