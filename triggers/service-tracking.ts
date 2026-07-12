import { triggerPush } from './invoke';

interface TaskPayload {
  taskTitle: string;
  trackingNumber: string;
}

export const serviceTrackingTriggers = {
  /**
   * New inspection task added.
   */
  async onInspectionTaskAdded(payload: TaskPayload) {
    const title = '🔍 Inspection Task Added';
    const body = `"${payload.taskTitle}" added to #${payload.trackingNumber}.`;
    await triggerPush('serviceTracking', 'inspection-task-added', title, body, '/service-tracking');
  },

  /**
   * Inspection task started (IN_PROGRESS).
   */
  async onInspectionTaskStarted(payload: TaskPayload) {
    const title = '▶️ Inspection Task Started';
    const body = `"${payload.taskTitle}" is now in progress for #${payload.trackingNumber}.`;
    await triggerPush('serviceTracking', 'inspection-task-started', title, body, '/service-tracking');
  },

  /**
   * Inspection task completed (DONE).
   */
  async onInspectionTaskDone(payload: TaskPayload) {
    const title = '✅ Inspection Task Completed';
    const body = `"${payload.taskTitle}" completed for #${payload.trackingNumber}.`;
    await triggerPush('serviceTracking', 'inspection-task-done', title, body, '/service-tracking');
  },

  /**
   * New work (repair) task added.
   */
  async onWorkTaskAdded(payload: TaskPayload) {
    const title = '🔧 Repair Task Added';
    const body = `"${payload.taskTitle}" added to #${payload.trackingNumber}.`;
    await triggerPush('serviceTracking', 'work-task-added', title, body, '/service-tracking');
  },

  /**
   * Work task started (IN_PROGRESS).
   */
  async onWorkTaskStarted(payload: TaskPayload) {
    const title = '▶️ Repair Task Started';
    const body = `"${payload.taskTitle}" is now in progress for #${payload.trackingNumber}.`;
    await triggerPush('serviceTracking', 'work-task-started', title, body, '/service-tracking');
  },

  /**
   * Work task completed (DONE).
   */
  async onWorkTaskDone(payload: TaskPayload) {
    const title = '✅ Repair Task Completed';
    const body = `"${payload.taskTitle}" completed for #${payload.trackingNumber}.`;
    await triggerPush('serviceTracking', 'work-task-done', title, body, '/service-tracking');
  },
};