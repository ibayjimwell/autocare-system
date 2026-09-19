export interface PaymentDefaultFee {
  id: string;
  title: string;
  amount: number;
  isActive: boolean;
}

export interface PaymentDefaultDiscount {
  id: string;
  title: string;
  type: 'fixed' | 'percentage';
  value: number;
  isActive: boolean;
}

export interface PaymentConfiguration {
  parkingFeePerDay: number;
  defaultFees: PaymentDefaultFee[];
  defaultDiscounts: PaymentDefaultDiscount[];
}

export const DEFAULT_PAYMENT_CONFIGURATION: PaymentConfiguration = {
  parkingFeePerDay: 0,
  defaultFees: [],
  defaultDiscounts: [],
};

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFee(item: any, index: number): PaymentDefaultFee {
  return {
    id: String(item?.id || `${Date.now()}-fee-${index}`),
    title: String(item?.title || '').trim(),
    amount: Math.max(0, normalizeNumber(item?.amount)),
    isActive: item?.isActive !== false,
  };
}

function normalizeDiscount(item: any, index: number): PaymentDefaultDiscount {
  const type = item?.type === 'percentage' ? 'percentage' : 'fixed';

  return {
    id: String(item?.id || `${Date.now()}-discount-${index}`),
    title: String(item?.title || '').trim(),
    type,
    value: Math.max(0, normalizeNumber(item?.value)),
    isActive: item?.isActive !== false,
  };
}

export function normalizePaymentConfiguration(value: any): PaymentConfiguration {
  const config = value && typeof value === 'object' ? value : {};

  return {
    parkingFeePerDay: Math.max(
      0,
      normalizeNumber(
        config.parkingFeePerDay ?? config.parkingFee ?? config.parkingRate,
      ),
    ),
    defaultFees: Array.isArray(config.defaultFees)
      ? config.defaultFees
          .map(normalizeFee)
          .filter((fee: PaymentDefaultFee) => fee.title.length > 0)
      : [],
    defaultDiscounts: Array.isArray(config.defaultDiscounts)
      ? config.defaultDiscounts
          .map(normalizeDiscount)
          .filter((discount: PaymentDefaultDiscount) => discount.title.length > 0)
      : [],
  };
}

export const paymentsConfigurationApi = {
  get: async (): Promise<{
    error: boolean;
    errorMessage?: string;
    data: PaymentConfiguration | null;
  }> => {
    const res = await fetch('/api/configurations?module=payments', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    const json = await res.json();

    if (!res.ok || json?.error) {
      return {
        error: true,
        errorMessage: json?.errorMessage || 'Unable to load payment configuration.',
        data: null,
      };
    }

    return {
      error: false,
      data: normalizePaymentConfiguration(json?.data?.config),
    };
  },

  save: async (config: PaymentConfiguration) => {
    const normalized = normalizePaymentConfiguration(config);

    const res = await fetch('/api/configurations', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        module: 'payments',
        config: normalized,
      }),
    });

    const json = await res.json();

    if (!res.ok || json?.error) {
      return {
        error: true,
        errorMessage: json?.errorMessage || 'Unable to save payment configuration.',
        data: null,
      };
    }

    return {
      error: false,
      data: normalizePaymentConfiguration(json?.data?.config),
    };
  },
};
