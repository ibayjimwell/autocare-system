import type { DashboardData } from '@/database/models/dashboard/dashboard.model';

interface DashboardApiResponse {
  error: boolean;
  data?: DashboardData;
  errorMessage?: string;
}

export const dashboardApi = {
  async get(signal?: AbortSignal): Promise<DashboardApiResponse> {
    const response = await fetch('/api/dashboard', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    let data: DashboardApiResponse;

    try {
      data = (await response.json()) as DashboardApiResponse;
    } catch {
      throw new Error(
        `Dashboard request failed with HTTP ${response.status}.`,
      );
    }

    if (!response.ok || data.error) {
      throw new Error(
        data.errorMessage ||
          'Unable to load dashboard analytics.',
      );
    }

    return data;
  },
};

export default dashboardApi;
