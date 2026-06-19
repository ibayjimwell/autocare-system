const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

export const staffApi = {
  // GET all staff
  list: async (search?: string) => {
    const url = search ? `${API_BASE}/api/staffs?search=${search}` : `${API_BASE}/api/staffs`;
    const res = await fetch(url);
    return res.json();
  },

  // GET single staff
  get: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/staffs/${id}`);
    return res.json();
  },

  // CREATE staff
  create: async (data: { fullname: string; username: string; role: string }) => {
    const formData = new FormData();
    formData.append('fullname', data.fullname);
    formData.append('username', data.username);
    formData.append('role', data.role);
    const res = await fetch(`${API_BASE}/api/staffs`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  // UPDATE staff (fullname, username, role, inBoarding)
  update: async (id: string, data: { fullname?: string; username?: string; role?: string; inBoarding?: boolean }) => {
    const res = await fetch(`${API_BASE}/api/staffs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};