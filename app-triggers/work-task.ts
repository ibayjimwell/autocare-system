// app-triggers/work-task.ts
import { sendAppointmentCustomerNotification } from '@/lib/notifications/customer-notification';

interface WorkTaskPayload {
  appointmentId: string;
  taskTitle: string;
}

export const mobileWorkTaskTriggers = {
  /** Task added */
  async onTaskAdded(payload: WorkTaskPayload) {
    const title = '📋 New Repair Task';
    const body = `Task "${payload.taskTitle}" has been added to your vehicle repair.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task title edited */
  async onTaskEdited(payload: WorkTaskPayload) {
    const title = '✏️ Repair Task Updated';
    const body = `Task "${payload.taskTitle}" has been updated.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task started (IN_PROGRESS) */
  async onTaskStarted(payload: WorkTaskPayload) {
    const title = '🔧 Repair Task Started';
    const body = `Task "${payload.taskTitle}" is now in progress.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task done (DONE) */
  async onTaskDone(payload: WorkTaskPayload) {
    const title = '✅ Repair Task Completed';
    const body = `Task "${payload.taskTitle}" has been completed.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },
};
