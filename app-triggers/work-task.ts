// app-triggers/work-task.ts
import { sendPushToCustomer } from '@/lib/push/customer-push';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { eq } from 'drizzle-orm';

interface WorkTaskPayload {
  appointmentId: string;
  taskTitle: string;
}

async function getCustomerIdFromAppointment(appointmentId: string): Promise<string | null> {
  try {
    const [appt] = await Database.select({ customerId: Appointments.customerId })
      .from(Appointments)
      .where(eq(Appointments.id, appointmentId))
      .limit(1);
    return appt?.customerId || null;
  } catch (err) {
    console.error('[mobileWorkTaskTriggers] Failed to get customerId:', err);
    return null;
  }
}

export const mobileWorkTaskTriggers = {
  /** Task added */
  async onTaskAdded(payload: WorkTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '📋 New Repair Task';
    const body = `Task "${payload.taskTitle}" has been added to your vehicle repair.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task title edited */
  async onTaskEdited(payload: WorkTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '✏️ Repair Task Updated';
    const body = `Task "${payload.taskTitle}" has been updated.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task started (IN_PROGRESS) */
  async onTaskStarted(payload: WorkTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '🔧 Repair Task Started';
    const body = `Task "${payload.taskTitle}" is now in progress.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task done (DONE) */
  async onTaskDone(payload: WorkTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '✅ Repair Task Completed';
    const body = `Task "${payload.taskTitle}" has been completed.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },
};