// lib/service-queue/service-queue.ts
export const serviceQueueApi = {
  list: async (date: string) => {
    const res = await fetch(`/api/queue?date=${date}`);
    return res.json();
  },

  reorder: async (appointmentId: string, newPosition: number) => {
    const res = await fetch('/api/queue/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, newPosition }),
    });
    return res.json();
  },
};