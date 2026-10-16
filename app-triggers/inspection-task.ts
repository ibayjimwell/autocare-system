// app-triggers/inspection-task.ts
import { sendAppointmentCustomerNotification } from '@/lib/notifications/customer-notification';

interface InspectionTaskPayload {
  appointmentId: string;
  taskTitle: string;
}

export const mobileInspectionTaskTriggers = {
  /** Task created */
  async onTaskAdded(payload: InspectionTaskPayload) {
    const title = '📋 New Inspection Task';
    const body = `Task "${payload.taskTitle}" has been added to your vehicle inspection.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task title edited */
  async onTaskEdited(payload: InspectionTaskPayload) {
    const title = '✏️ Inspection Task Updated';
    const body = `Task "${payload.taskTitle}" has been updated.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task started (IN_PROGRESS) */
  async onTaskStarted(payload: InspectionTaskPayload) {
    const title = '🔧 Inspection Task Started';
    const body = `Task "${payload.taskTitle}" is now in progress.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },

  /** Task done (DONE) */
  async onTaskDone(payload: InspectionTaskPayload) {
    const title = '✅ Inspection Task Completed';
    const body = `Task "${payload.taskTitle}" has been completed.`;
    await sendAppointmentCustomerNotification(payload.appointmentId, title, body, {
      url: `/tracking?appointmentId=${payload.appointmentId}`,
    });
  },
};
