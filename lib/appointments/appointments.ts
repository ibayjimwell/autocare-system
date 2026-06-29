// /lib/appointments/appointments.ts

export const appointmentsApi = {
  list: async (params?: { status?: string; customerId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    let url = '/api/appointments';
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query.set(key, String(value));
      });
      const qs = query.toString();
      if (qs) url += '?' + qs;
    }
    const res = await fetch(url);
    return res.json();
  },


  get: async (id: string) => {
    const res = await fetch(`/api/appointments/${id}`);
    return res.json();
  },

  create: async (data: { customerId: string; vehicleId: string; services: string[]; appointmentDate: string; appointmentTime: string; notes?: string }) => {
    const formData = new FormData();
    formData.append('customerId', data.customerId);
    formData.append('vehicleId', data.vehicleId);
    formData.append('services', JSON.stringify(data.services));
    formData.append('appointmentDate', data.appointmentDate);
    formData.append('appointmentTime', data.appointmentTime);
    if (data.notes) formData.append('notes', data.notes);
    const res = await fetch('/api/appointments', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  update: async (id: string, data: { appointmentDate?: string; appointmentTime?: string; services?: string[]; notes?: string }) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateStatus: async (id: string, status: string, reason?: string, changedBy?: string) => {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason, changedBy }),
    });
    return res.json();
  },

  getHistory: async (id: string) => {
    const res = await fetch(`/api/appointments/${id}/history`);
    return res.json();
  },

  getAvailableSlots: async (date: string, serviceIds: string[]) => {
    const query = new URLSearchParams();
    query.set('date', date);
    query.set('serviceIds', serviceIds.join(','));
    const res = await fetch(`/api/appointments/available-slots?${query.toString()}`);
    return res.json();
  },

  checkAvailability: async (date: string, startTime: string, serviceIds: string[]) => {
    const res = await fetch('/api/appointments/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime, serviceIds }),
    });
    return res.json();
  },
};