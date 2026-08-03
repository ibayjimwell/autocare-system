export const defaultGroupsApi = {
  // GET all groups with tasks
  list: async () => {
    const res = await fetch('/api/service-tracking/default-groups');
    return res.json();
  },

  // CREATE a new group
  create: async (data: { title: string; description?: string; isActive?: boolean; tasks?: Array<{ title: string; durationMinutes?: number }> }) => {
    const res = await fetch('/api/service-tracking/default-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // UPDATE a group (tasks replaced)
  update: async (id: string, data: { title?: string; description?: string; isActive?: boolean; tasks?: Array<{ id?: string; title: string; durationMinutes?: number; order?: number }> }) => {
    const res = await fetch(`/api/service-tracking/default-groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // DELETE a group
  delete: async (id: string) => {
    const res = await fetch(`/api/service-tracking/default-groups/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};