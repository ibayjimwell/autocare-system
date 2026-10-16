import type { DiagnosticStatus } from './catalog';

const ROOT = '/api/service-tracking/diagnostic-checklists';

async function request<T = any>(url: string, init?: RequestInit): Promise<{ error: boolean; data?: T; errorMessage?: string }> {
  const res = await fetch(url, { cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.errorMessage || `Request failed (${res.status}).`);
  return json;
}
const payload = (value: unknown) => JSON.stringify(value);

export const diagnosticChecklistApi = {
  get: (appointmentId: string) => request(`${ROOT}?appointmentId=${encodeURIComponent(appointmentId)}`),
  mark: (appointmentId: string, itemKey: string, status: DiagnosticStatus | null) =>
    request(`${ROOT}/items`, { method: 'PUT', body: payload({ appointmentId, itemKey, status }) }),
  saveNotes: (appointmentId: string, notes: { remarks?: string; dentsNotes?: string; engineType?: string | null; transmissionType?: string | null; timeOut?: string | null; dentsMarks?: Array<{ x: number; y: number }> }) =>
    request(ROOT, { method: 'PATCH', body: payload({ appointmentId, ...notes }) }),
  suggestions: (appointmentId: string, itemKey: string) =>
    request(`${ROOT}/suggestions?${new URLSearchParams({ appointmentId, itemKey }).toString()}`),
  addFinding: (appointmentId: string, itemKey: string, defaultFindingId: string) =>
    request(`${ROOT}/findings`, { method: 'POST', body: payload({ appointmentId, itemKey, defaultFindingId }) }),
  listLinks: () => request(`${ROOT}/links`),
  saveFindingLinks: (defaultFindingId: string, itemKeys: string[]) =>
    request(`${ROOT}/links`, { method: 'PUT', body: payload({ defaultFindingId, itemKeys }) }),
};
