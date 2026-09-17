// lib/payments/final-bills.ts

export const finalBillsApi = {
  // LIST final bills with optional filters
  list: async (params?: {
    status?: string;
    appointmentId?: string;
  }) => {
    const query =
      new URLSearchParams();

    if (
      params?.status
    ) {
      query.set(
        "status",
        params.status
      );
    }

    if (
      params?.appointmentId
    ) {
      query.set(
        "appointmentId",
        params.appointmentId
      );
    }

    const qs =
      query.toString();

    const url = qs
      ? `/api/payments/final-bills?${qs}`
      : "/api/payments/final-bills";

    const res =
      await fetch(
        url,
        {
          cache: "no-store",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    return res.json();
  },

  /*
   * RESOLVE DISPLAYED BILL ID
   *
   * The Final Cost table displays the first 8 characters of the
   * actual database ID:
   *
   *   bill.id.slice(0, 8).toUpperCase()
   *
   * Example:
   *
   *   Database ID:
   *   32DBD79E-1234-4567-8901-123456789ABC
   *
   *   Displayed Bill ID:
   *   32DBD79E
   *
   * Manual QR entry uses the displayed value. This method resolves
   * that displayed value back to the actual database bill ID.
   *
   * It intentionally does NOT change QR scanning behavior.
   */
  resolveBillId: async (
    billId: string
  ) => {
    const normalized =
      String(
        billId || ""
      )
        .trim()
        .replace(/^#/, "")
        .toUpperCase();

    if (
      !normalized
    ) {
      return {
        error: true,
        errorMessage:
          "Bill ID is required.",
        data: null,
      };
    }

    /*
     * If the caller already supplied the actual database UUID,
     * return it directly.
     *
     * This keeps the helper safe for callers that already have the
     * real final bill ID.
     */
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      uuidPattern.test(
        normalized
      )
    ) {
      return {
        error: false,
        data: normalized,
      };
    }

    /*
     * The UI displays exactly the first 8 characters of bill.id.
     * Therefore manual entry only needs to resolve against that
     * same value.
     */
    if (
      !/^[A-Z0-9]{8}$/.test(
        normalized
      )
    ) {
      return {
        error: true,
        errorMessage:
          "Enter the 8-character Bill ID shown in the Final Cost table.",
        data: null,
      };
    }

    try {
      const res =
        await finalBillsApi.list();

      if (
        res?.error
      ) {
        return {
          error: true,
          errorMessage:
            res.errorMessage ||
            "Failed to look up the Bill ID.",
          data: null,
        };
      }

      const bills =
        Array.isArray(
          res?.data
        )
          ? res.data
          : [];

      /*
       * Match the exact displayed Bill ID:
       *
       *   bill.id.slice(0, 8).toUpperCase()
       */
      const matches =
        bills.filter(
          (
            bill: any
          ) => {
            const databaseId =
              String(
                bill?.id ||
                  ""
              )
                .trim()
                .toUpperCase();

            return (
              databaseId.slice(
                0,
                8
              ) ===
              normalized
            );
          }
        );

      if (
        matches.length ===
        0
      ) {
        return {
          error: true,
          errorMessage: `Bill ID "${normalized}" was not found.`,
          data: null,
        };
      }

      /*
       * The displayed 8-character ID should normally identify one
       * bill. If more than one record has the same prefix, do not
       * silently select an arbitrary bill.
       */
      if (
        matches.length >
        1
      ) {
        return {
          error: true,
          errorMessage:
            `Bill ID "${normalized}" matches multiple final bills. Please scan the QR code instead.`,
          data: null,
        };
      }

      return {
        error: false,
        data:
          matches[0].id,
      };
    } catch (
      err: any
    ) {
      console.error(
        "Failed to resolve Bill ID:",
        err
      );

      return {
        error: true,
        errorMessage:
          err?.message ||
          "Failed to look up the Bill ID.",
        data: null,
      };
    }
  },

  // GET single final bill with all details
  get: async (
    id: string
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${id}`,
        {
          cache: "no-store",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    return res.json();
  },

  // GENERATE final bill from approved estimate & completed work tasks
  generate: async (
    appointmentId: string
  ) => {
    const res =
      await fetch(
        "/api/service-tracking/final-bill",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            appointmentId,
          }),
        }
      );

    return res.json();
  },

  // TOGGLE finding inclusion in final bill
  toggleFinding: async (
    billId: string,
    findingId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/findings/${findingId}/toggle`,
        {
          method: "PATCH",
        }
      );

    return res.json();
  },

  // TOGGLE fee inclusion in final bill (if supported)
  toggleFee: async (
    billId: string,
    feeId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/fees/${feeId}/toggle`,
        {
          method: "PATCH",
        }
      );

    return res.json();
  },

  updatePart: async (
    billId: string,
    findingId: string,
    partId: string,
    data: {
      quantity?: number;
      priceAtTime?: number;
    }
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/findings/${findingId}/parts/${partId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            data
          ),
        }
      );

    return res.json();
  },

  updateStatus: async (
    billId: string,
    status: string,
    parkingFeeRate?: number,
    parkingFeeUnit?: string
  ) => {
    const body: any = {
      status,
    };

    if (
      parkingFeeRate !==
        undefined &&
      parkingFeeUnit
    ) {
      body.parkingFeeRate =
        parkingFeeRate;

      body.parkingFeeUnit =
        parkingFeeUnit;
    }

    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            body
          ),
        }
      );

    return res.json();
  },

  addFee: async (
    billId: string,
    data: {
      title: string;
      amount: number;
      findingId?: string;
    }
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/fees`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            data
          ),
        }
      );

    return res.json();
  },

  addDiscount: async (
    billId: string,
    data: {
      title: string;
      type:
        | "fixed"
        | "percentage";
      value: number;
    }
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/discounts`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            data
          ),
        }
      );

    return res.json();
  },

  // Get parking fee for a HOLD bill
  getParkingFee: async (
    billId: string
  ) => {
    const res =
      await fetch(
        `/api/payments/final-bills/${billId}/parking-fee`,
        {
          cache: "no-store",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    return res.json();
  },
};