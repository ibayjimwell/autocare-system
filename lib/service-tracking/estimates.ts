// lib/service-tracking/estimates.ts

export const estimatesApi = {
  // GENERATE estimate for an appointment
  create: async (appointmentId: string) => {
    const res = await fetch('/api/service-tracking/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    });
    return res.json();
  },

  // SEND estimate for approval (change status to WAITING_FOR_APPROVAL)
  sendForApproval: async (estimateId: string) => {
    const res = await fetch(`/api/billing/estimates/${estimateId}/send-for-approval`, {
      method: 'PATCH',
    });
    return res.json();
  },

  // APPROVE estimate
  approve: async (estimateId: string) => {
    const res = await fetch(`/api/billing/estimates/${estimateId}/approve`, {
      method: 'PATCH',
    });
    return res.json();
  },

  // DECLINE estimate (requires reason)
  decline: async (estimateId: string, reason: string) => {
    const res = await fetch(`/api/billing/estimates/${estimateId}/decline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  // TOGGLE finding inclusion in estimate
  toggleFinding: async (estimateId: string, findingId: string) => {
    const res = await fetch(`/api/billing/estimates/${estimateId}/findings/${findingId}/toggle`, {
      method: 'PATCH',
    });
    return res.json();
  },
};