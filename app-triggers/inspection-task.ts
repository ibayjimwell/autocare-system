// app-triggers/inspection-task.ts
import { sendPushToCustomer } from '@/lib/push/customer-push';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { eq } from 'drizzle-orm';

interface InspectionTaskPayload {
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
    console.error('[mobileInspectionTaskTriggers] Failed to get customerId:', err);
    return null;
  }
}

export const mobileInspectionTaskTriggers = {
  /** Task created */
  async onTaskAdded(payload: InspectionTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '📋 New Inspection Task';
    const body = `Task "${payload.taskTitle}" has been added to your vehicle inspection.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task title edited */
  async onTaskEdited(payload: InspectionTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '✏️ Inspection Task Updated';
    const body = `Task "${payload.taskTitle}" has been updated.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task started (IN_PROGRESS) */
  async onTaskStarted(payload: InspectionTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '🔧 Inspection Task Started';
    const body = `Task "${payload.taskTitle}" is now in progress.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task done (DONE) */
  async onTaskDone(payload: InspectionTaskPayload) {
    const customerId = await getCustomerIdFromAppointment(payload.appointmentId);
    if (!customerId) return;
    const title = '✅ Inspection Task Completed';
    const body = `Task "${payload.taskTitle}" has been completed.`;
    await sendPushToCustomer(customerId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },
};