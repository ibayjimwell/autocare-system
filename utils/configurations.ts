export interface AppointmentConfig {
  global: {
    openingTime: string;   // "HH:MM"
    closingTime: string;   // "HH:MM"
    capacity: number;
  };
  dateOverrides: Record<
    string,
    {
      openingTime?: string;
      closingTime?: string;
      isOpen?: boolean;
      reason?: string;
      capacity?: number;
    }
  >;
}

export const DEFAULT_CONFIG: AppointmentConfig = {
  global: {
    openingTime: '08:00',
    closingTime: '17:00',
    capacity: 4,
  },
  dateOverrides: {},
};

export async function getAppointmentConfig(): Promise<{
  raw: any;
  merged: AppointmentConfig;
}> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/configurations?module=appointments`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return { raw: null, merged: DEFAULT_CONFIG };
  }
  const json = await res.json();
  if (json.error || !json.data) {
    return { raw: null, merged: DEFAULT_CONFIG };
  }

  const dbConfig = json.data.config || {};
  const merged: AppointmentConfig = {
    global: {
      openingTime: dbConfig.global?.openingTime || DEFAULT_CONFIG.global.openingTime,
      closingTime: dbConfig.global?.closingTime || DEFAULT_CONFIG.global.closingTime,
      capacity: dbConfig.global?.capacity ?? DEFAULT_CONFIG.global.capacity,
    },
    dateOverrides: dbConfig.dateOverrides || {},
  };
  return { raw: dbConfig, merged };
}

export function getEffectiveConfigForDate(
  merged: AppointmentConfig,
  dateStr: string
): {
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
  reason?: string;
  capacity: number;
} {
  const override = merged.dateOverrides[dateStr];
  if (override) {
    const isOpen = override.isOpen !== undefined ? override.isOpen : true;
    return {
      openingTime: override.openingTime || merged.global.openingTime,
      closingTime: override.closingTime || merged.global.closingTime,
      isOpen,
      reason: override.reason,
      capacity: override.capacity ?? merged.global.capacity,
    };
  }
  return {
    openingTime: merged.global.openingTime,
    closingTime: merged.global.closingTime,
    isOpen: true,
    capacity: merged.global.capacity,
  };
}

/**
 * Get a set of date strings (YYYY-MM-DD) where the shop is closed.
 */
export function getClosedDates(merged: AppointmentConfig): Set<string> {
  const closed = new Set<string>();
  for (const [date, override] of Object.entries(merged.dateOverrides)) {
    if (override.isOpen === false) {
      closed.add(date);
    }
  }
  return closed;
}