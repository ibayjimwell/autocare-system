// triggers/service-queue.ts
import { triggerPush } from './invoke';

interface QueuePositionPayload {
  appointmentId: string;
  trackingNumber: string;
  newPosition: number;
}

export const serviceQueueTriggers = {
  async onPositionChanged(payload: QueuePositionPayload) {
    const title = '🔄 Queue Position Updated';
    const body = `Appointment #${payload.trackingNumber} is now at position #${payload.newPosition}.`;
    await triggerPush('service-tracking', 'queue-changed', title, body, '/service-tracking');
  },
};