// Client-only API for resolving inventory shortages on a single appointment.
// Does not change reusable Default Findings or physical inventory stock.

export type InventoryShortagePart = {
  findingPartId: string;
  findingId: string;
  findingDescription: string;
  partName: string;
  quantity: number;
  priceAtTime: string;
  isPms: boolean;
};

export type InventoryShortage = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  available: number;
  requested: number;
  shortage: number;
  missingInventory: boolean;
  parts: InventoryShortagePart[];
};

export type ExternalPurchasePart = InventoryShortagePart & {
  status: 'PENDING' | 'PURCHASED' | 'RECEIVED';
};

export type InventoryShortageReport = {
  shortages: InventoryShortage[];
  externalParts: ExternalPurchasePart[];
  alreadyReserved: boolean;
  appointmentStatus: string;
};

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json || json.error) {
    throw new Error(json?.errorMessage || `Inventory request failed (${response.status}).`);
  }
  return json;
}

const ROOT = '/api/service-tracking/inventory-shortages';

export const inventoryShortagesApi = {
  check: (appointmentId: string) => request<{ error: false; data: InventoryShortageReport }>(
    `${ROOT}?appointmentId=${encodeURIComponent(appointmentId)}`,
  ),
  markExternal: (appointmentId: string, findingPartIds: string[]) => request<{
    error: false; data: { updated: number };
  }>(ROOT, { method: 'POST', body: JSON.stringify({ appointmentId, findingPartIds }) }),
  setExternalStatus: (
    appointmentId: string,
    findingPartId: string,
    status: ExternalPurchasePart['status'],
  ) => request<{ error: false }>(ROOT, {
    method: 'PATCH', body: JSON.stringify({ appointmentId, findingPartId, status }),
  }),
};
