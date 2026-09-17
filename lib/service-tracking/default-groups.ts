/* ================================================================
   DEFAULT TASK GROUPS API
================================================================ */

export interface DefaultTaskInput {
  id?: string;
  title: string;
  durationMinutes?: number;
  taskType?: 'INSPECTION' | 'WORK' | string;
  order?: number;
}

export interface DefaultGroupInput {
  title: string;
  description?: string;
  isActive?: boolean;
  tasks?: DefaultTaskInput[];
}

export const defaultGroupsApi = {
  list: async () => {
    const res = await fetch('/api/service-tracking/default-groups', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return res.json();
  },

  create: async (data: DefaultGroupInput) => {
    const res = await fetch('/api/service-tracking/default-groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (id: string, data: Partial<DefaultGroupInput>) => {
    const res = await fetch(`/api/service-tracking/default-groups/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`/api/service-tracking/default-groups/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    return res.json();
  },
};
