export type InventoryAllocationStatus =
  | 'KEEP'
  | 'USED'
  | 'RESTORED';

export type InventoryAllocationListParams = {
  status?: 'KEEP' | 'USED' | 'RESTORED';
  search?: string;
  page?: number;
  limit?: number;
};

async function parseJsonResponse<T = any>(
  res: Response,
): Promise<T> {
  const responseText = await res.text();

  if (!responseText) {
    return {
      error: !res.ok,
      errorMessage: !res.ok
        ? `Request failed with status ${res.status}.`
        : undefined,
    } as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return {
      error: true,
      errorMessage: `Server returned an invalid JSON response (${res.status}).`,
    } as T;
  }
}

export const inventoryTrackingApi = {
  list: async (
    params?: InventoryAllocationListParams,
  ) => {
    const query = new URLSearchParams();

    if (params?.status) {
      query.set(
        'status',
        params.status,
      );
    }

    if (params?.search) {
      query.set(
        'search',
        params.search,
      );
    }

    if (params?.page) {
      query.set(
        'page',
        String(params.page),
      );
    }

    if (params?.limit) {
      query.set(
        'limit',
        String(params.limit),
      );
    }

    const qs = query.toString();

    const res = await fetch(
      qs
        ? `/api/inventory/allocations?${qs}`
        : '/api/inventory/allocations',
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    return parseJsonResponse(res);
  },
};
