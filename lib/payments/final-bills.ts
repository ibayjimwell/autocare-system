export interface FinalBillFeeInput {
  title: string;
  amount: number;
  findingId?: string;
}

export interface FinalBillDiscountInput {
  title: string;
  type: 'fixed' | 'percentage';
  value: number;
}

export interface FinalBillPartInput {
  quantity?: number;
  priceAtTime?: number;
}

async function parseResponse(
  response: Response,
) {
  const json = await response.json();
  return json;
}

export const finalBillsApi = {
  list: async (
    params?: {
      status?: string;
      appointmentId?: string;
    },
  ) => {
    const query = new URLSearchParams();

    if (params?.status) {
      query.set('status', params.status);
    }

    if (params?.appointmentId) {
      query.set(
        'appointmentId',
        params.appointmentId,
      );
    }

    const qs = query.toString();

    const url = qs
      ? `/api/payments/final-bills?${qs}`
      : '/api/payments/final-bills';

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    return parseResponse(res);
  },

  resolveBillId: async (
    billId: string,
  ) => {
    const normalized = String(
      billId || '',
    )
      .trim()
      .replace(/^#/, '')
      .toUpperCase();

    if (!normalized) {
      return {
        error: true,
        errorMessage:
          'Bill ID is required.',
        data: null,
      };
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (uuidPattern.test(normalized)) {
      return {
        error: false,
        data: normalized,
      };
    }

    if (!/^[A-Z0-9]{8}$/.test(normalized)) {
      return {
        error: true,
        errorMessage:
          'Enter the 8-character Bill ID shown in the Final Cost table.',
        data: null,
      };
    }

    try {
      const res =
        await finalBillsApi.list();

      if (res?.error) {
        return {
          error: true,
          errorMessage:
            res.errorMessage ||
            'Failed to look up the Bill ID.',
          data: null,
        };
      }

      const bills = Array.isArray(
        res?.data,
      )
        ? res.data
        : [];

      const matches = bills.filter(
        (bill: any) =>
          String(
            bill?.id || '',
          )
            .trim()
            .toUpperCase()
            .slice(0, 8) ===
          normalized,
      );

      if (matches.length === 0) {
        return {
          error: true,
          errorMessage:
            `Bill ID "${normalized}" was not found.`,
          data: null,
        };
      }

      if (matches.length > 1) {
        return {
          error: true,
          errorMessage:
            `Bill ID "${normalized}" matches multiple Final Costs. Please scan the QR code instead.`,
          data: null,
        };
      }

      return {
        error: false,
        data: matches[0].id,
      };
    } catch (error: any) {
      return {
        error: true,
        errorMessage:
          error?.message ||
          'Failed to look up the Bill ID.',
        data: null,
      };
    }
  },

  get: async (id: string) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(id)}`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    return parseResponse(res);
  },

  generate: async (
    appointmentId: string,
  ) => {
    const res = await fetch(
      '/api/service-tracking/final-bill',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          appointmentId,
        }),
      },
    );

    return parseResponse(res);
  },

  toggleFinding: async (
    billId: string,
    findingId: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/findings/${encodeURIComponent(
        findingId,
      )}/toggle`,
      {
        method: 'PATCH',
      },
    );

    return parseResponse(res);
  },

  toggleFee: async (
    billId: string,
    feeId: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/fees/${encodeURIComponent(
        feeId,
      )}/toggle`,
      {
        method: 'PATCH',
      },
    );

    return parseResponse(res);
  },

  /* ================================================================
     PARTS
  ================================================================ */

  updatePart: async (
    billId: string,
    findingId: string,
    partId: string,
    data: FinalBillPartInput,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/findings/${encodeURIComponent(
        findingId,
      )}/parts/${encodeURIComponent(
        partId,
      )}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    return parseResponse(res);
  },

  deletePart: async (
    billId: string,
    findingId: string,
    partId: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/findings/${encodeURIComponent(
        findingId,
      )}/parts/${encodeURIComponent(
        partId,
      )}`,
      {
        method: 'DELETE',
      },
    );

    return parseResponse(res);
  },

  /* ================================================================
     STATUS
  ================================================================ */

  updateStatus: async (
    billId: string,
    status: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          status,
        }),
      },
    );

    return parseResponse(res);
  },

  park: async (
    billId: string,
    addParkingFee: boolean,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          status: 'PARKED',
          addParkingFee,
        }),
      },
    );

    return parseResponse(res);
  },

  stopParking: async (
    billId: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          status: 'PENDING',
        }),
      },
    );

    return parseResponse(res);
  },

  /* ================================================================
     FEES
  ================================================================ */

  addFee: async (
    billId: string,
    data: FinalBillFeeInput,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/fees`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    return parseResponse(res);
  },

  updateFee: async (
    billId: string,
    feeId: string,
    data: FinalBillFeeInput,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/fees/${encodeURIComponent(
        feeId,
      )}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    return parseResponse(res);
  },

  deleteFee: async (
    billId: string,
    feeId: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/fees/${encodeURIComponent(
        feeId,
      )}`,
      {
        method: 'DELETE',
      },
    );

    return parseResponse(res);
  },

  /* ================================================================
     DISCOUNTS
  ================================================================ */

  addDiscount: async (
    billId: string,
    data: FinalBillDiscountInput,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/discounts`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    return parseResponse(res);
  },

  updateDiscount: async (
    billId: string,
    discountId: string,
    data: FinalBillDiscountInput,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/discounts/${encodeURIComponent(
        discountId,
      )}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    return parseResponse(res);
  },

  deleteDiscount: async (
    billId: string,
    discountId: string,
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${encodeURIComponent(
        billId,
      )}/discounts/${encodeURIComponent(
        discountId,
      )}`,
      {
        method: 'DELETE',
      },
    );

    return parseResponse(res);
  },
};

export default finalBillsApi;
