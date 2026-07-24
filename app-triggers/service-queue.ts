// app-triggers/service-queue.ts
import { sendPushToCustomer } from '@/lib/push/customer-push';

interface MobileQueuePayload {
  customerId: string;
  trackingNumber: string;
  newPosition: number;
}

export const mobileServiceQueueTriggers = {
  async onPositionChanged(payload: MobileQueuePayload) {
    const title = '🔄 Your Queue Position Has Changed';
    const body = `Your appointment #${payload.trackingNumber} is now at position #${payload.newPosition}.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: '/tracking',
    });
  },
};