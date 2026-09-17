export interface EstimateFeeInput {
  title: string;
  amount: number;
}

export interface EstimateDiscountInput {
  title: string;
  type:
    | 'fixed'
    | 'percentage';
  value: number;
}

async function parseResponse(
  response: Response
) {
  const json =
    await response.json();

  return json;
}

export const estimateAdjustmentsApi = {
  // ================================================================
  // ADD FEE
  // ================================================================

  addFee: async (
    estimateId: string,
    data: EstimateFeeInput
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/fees`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              data
            ),
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // UPDATE FEE
  // ================================================================

  updateFee: async (
    estimateId: string,
    feeId: string,
    data: EstimateFeeInput
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/fees/${encodeURIComponent(
          feeId
        )}`,
        {
          method:
            'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              data
            ),
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // DELETE FEE
  // ================================================================

  deleteFee: async (
    estimateId: string,
    feeId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/fees/${encodeURIComponent(
          feeId
        )}`,
        {
          method:
            'DELETE',
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // ADD DISCOUNT
  // ================================================================

  addDiscount: async (
    estimateId: string,
    data: EstimateDiscountInput
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/discounts`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              data
            ),
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // UPDATE DISCOUNT
  // ================================================================

  updateDiscount: async (
    estimateId: string,
    discountId: string,
    data: EstimateDiscountInput
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/discounts/${encodeURIComponent(
          discountId
        )}`,
        {
          method:
            'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              data
            ),
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // DELETE DISCOUNT
  // ================================================================

  deleteDiscount: async (
    estimateId: string,
    discountId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/discounts/${encodeURIComponent(
          discountId
        )}`,
        {
          method:
            'DELETE',
        }
      );

    return parseResponse(
      res
    );
  },
};

export const estimatesApi = {
  // ================================================================
  // LIST
  // ================================================================

  list: async (
    params?: {
      status?: string;
      appointmentId?: string;
    }
  ) => {
    const query =
      new URLSearchParams();

    if (
      params?.status
    ) {
      query.set(
        'status',
        params.status
      );
    }

    if (
      params?.appointmentId
    ) {
      query.set(
        'appointmentId',
        params.appointmentId
      );
    }

    const qs =
      query.toString();

    const url =
      qs
        ? `/api/payments/estimates?${qs}`
        : '/api/payments/estimates';

    const res =
      await fetch(
        url
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // GET SINGLE ESTIMATE
  // ================================================================

  get: async (
    id: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          id
        )}`
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // GENERATE
  // ================================================================

  generate: async (
    appointmentId: string
  ) => {
    const res =
      await fetch(
        '/api/service-tracking/estimates',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              appointmentId,
            }),
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // SEND FOR APPROVAL
  // ================================================================

  sendForApproval: async (
    estimateId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/send-for-approval`,
        {
          method:
            'PATCH',
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // APPROVE
  // ================================================================

  approve: async (
    estimateId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/approve`,
        {
          method:
            'PATCH',
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // DECLINE
  // ================================================================

  decline: async (
    estimateId: string,
    reason: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/decline`,
        {
          method:
            'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              reason,
            }),
        }
      );

    return parseResponse(
      res
    );
  },

  // ================================================================
  // TOGGLE FINDING
  // ================================================================

  toggleFinding: async (
    estimateId: string,
    findingId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/estimates/${encodeURIComponent(
          estimateId
        )}/findings/${encodeURIComponent(
          findingId
        )}/toggle`,
        {
          method:
            'PATCH',
        }
      );

    return parseResponse(
      res
    );
  },
};