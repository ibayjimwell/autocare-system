// app-triggers/service-queue.ts
import { sendCustomerNotification } from '@/lib/notifications/customer-notification';

interface MobileQueuePayload {
  customerId: string;
  trackingNumber: string;
  newPosition: number;
}

export const mobileServiceQueueTriggers = {
  async onPositionChanged(payload: MobileQueuePayload) {
    const title = '🔄 Your Queue Position Has Changed';
    const body = `Your appointment #${payload.trackingNumber} is now at position #${payload.newPosition}.`;
    await sendCustomerNotification(payload.customerId, title, body, {
      url: '/tracking',
    });
  },
};
