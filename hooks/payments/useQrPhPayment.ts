'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

import {
  attachQrPhPaymentMethod,
  createQrPhPaymentMethod,
  getPaymentIntentStatus,
  getQrPhImageUrl,
  getQrPhTestUrl,
  QRPH_EXPIRY_SECONDS,
} from '@/lib/payments/qrph-client';

import {
  useRealtimeTable,
} from '@/connections/useRealtimeTable';

const POLL_INTERVAL_MS = 3000;

function unwrapData(response: any) {
  if (!response) return null;
  return response?.data ?? response;
}

function getErrorMessage(response: any) {
  if (!response) return null;

  if (response?.error === true) {
    return (
      response?.errorMessage ||
      response?.message ||
      'The request could not be completed.'
    );
  }

  return null;
}

export interface QrPhPaymentState {
  bill: any | null;
  loadingBill: boolean;
  creatingQr: boolean;
  verifying: boolean;
  paid: boolean;
  paymentIntentId: string | null;
  qrImageUrl: string | null;
  testUrl: string | null;
  expiresAt: number | null;
  error: string | null;
}

export function useQrPhPayment(
  billId: string,
) {
  const [state, setState] = useState<QrPhPaymentState>({
    bill: null,
    loadingBill: true,
    creatingQr: false,
    verifying: false,
    paid: false,
    paymentIntentId: null,
    qrImageUrl: null,
    testUrl: null,
    expiresAt: null,
    error: null,
  });

  const mountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const loadBill = useCallback(async () => {
    if (!billId) {
      setState((prev) => ({
        ...prev,
        loadingBill: false,
        error: 'Invalid Final Cost ID.',
      }));
      return null;
    }

    try {
      const response = await finalBillsApi.get(billId);
      const errorMessage = getErrorMessage(response);

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      const bill = unwrapData(response);

      if (!bill) {
        throw new Error('Final Cost was not found.');
      }

      if (!mountedRef.current) return bill;

      const paid = String(bill?.status ?? '').toUpperCase() === 'PAID';

      setState((prev) => ({
        ...prev,
        bill,
        loadingBill: false,
        paid,
        error: null,
      }));

      if (paid) {
        stopPolling();
      }

      return bill;
    } catch (error) {
      if (!mountedRef.current) return null;

      setState((prev) => ({
        ...prev,
        loadingBill: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load the Final Cost.',
      }));

      return null;
    }
  }, [billId, stopPolling]);

  const verifyPayment = useCallback(
    async (
      paymentIntentId?: string | null,
      showLoading = false,
    ) => {
      const intentId = paymentIntentId ?? state.paymentIntentId;

      if (!billId || !intentId || verifyingRef.current) {
        return false;
      }

      verifyingRef.current = true;

      if (showLoading && mountedRef.current) {
        setState((prev) => ({
          ...prev,
          verifying: true,
        }));
      }

      try {
        const response = await finalBillsApi.verifyOnlinePayment(
          billId,
          intentId,
        );

        const errorMessage = getErrorMessage(response);

        if (errorMessage) {
          throw new Error(errorMessage);
        }

        const payload = unwrapData(response);
        const paid = response?.paid === true || payload?.paid === true;

        if (paid) {
          stopPolling();

          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              paid: true,
              verifying: false,
              error: null,
              bill: prev.bill
                ? {
                    ...prev.bill,
                    status: 'PAID',
                  }
                : prev.bill,
            }));
          }

          return true;
        }

        return false;
      } catch (error) {
        if (showLoading && mountedRef.current) {
          setState((prev) => ({
            ...prev,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to verify the QRPh payment.',
          }));
        }

        return false;
      } finally {
        verifyingRef.current = false;

        if (showLoading && mountedRef.current) {
          setState((prev) => ({
            ...prev,
            verifying: false,
          }));
        }
      }
    },
    [billId, state.paymentIntentId, stopPolling],
  );

  const startPolling = useCallback(
    (paymentIntentId: string) => {
      stopPolling();

      pollTimerRef.current = setInterval(() => {
        void verifyPayment(paymentIntentId, false);
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, verifyPayment],
  );

  const createQr = useCallback(async () => {
    if (!billId || state.creatingQr || state.verifying) {
      return false;
    }

    const currentBill = state.bill ?? (await loadBill());

    if (!currentBill) {
      return false;
    }

    const status = String(currentBill?.status ?? '').toUpperCase();

    if (status === 'PAID') {
      setState((prev) => ({
        ...prev,
        paid: true,
      }));
      return true;
    }

    if (status !== 'OFFICIAL') {
      setState((prev) => ({
        ...prev,
        error: `This Final Cost is currently ${status || 'not ready'} and cannot be paid online.`,
      }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      creatingQr: true,
      error: null,
      qrImageUrl: null,
      testUrl: null,
      expiresAt: null,
    }));

    stopPolling();

    try {
      const intentResponse = await finalBillsApi.createOnlinePayment(
        billId,
        'qrph',
      );

      const intentError = getErrorMessage(intentResponse);

      if (intentError) {
        throw new Error(intentError);
      }

      const intent = unwrapData(intentResponse);
      const paymentIntentId =
        intent?.paymentIntentId ?? intent?.id ?? null;
      const clientKey = intent?.clientKey ?? intent?.client_key ?? null;

      if (!paymentIntentId || !clientKey) {
        throw new Error(
          'PayMongo did not return the credentials needed to generate the QRPh code.',
        );
      }

      const paymentMethodId = await createQrPhPaymentMethod();

      const attachResponse = await attachQrPhPaymentMethod({
        paymentIntentId,
        clientKey,
        paymentMethodId,
      });

      const attachStatus = getPaymentIntentStatus(attachResponse);

      if (attachStatus === 'succeeded') {
        const verified = await verifyPayment(paymentIntentId, true);
        return verified;
      }

      const qrImageUrl = getQrPhImageUrl(attachResponse);

      if (!qrImageUrl) {
        throw new Error(
          'PayMongo did not return the QRPh image for this payment.',
        );
      }

      const testUrl = getQrPhTestUrl(attachResponse);

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          creatingQr: false,
          paymentIntentId,
          qrImageUrl,
          testUrl,
          expiresAt: Date.now() + QRPH_EXPIRY_SECONDS * 1000,
          error: null,
        }));
      }

      startPolling(paymentIntentId);
      return true;
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          creatingQr: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to create the QRPh payment.',
        }));
      }

      return false;
    }
  }, [
    billId,
    state.bill,
    state.creatingQr,
    state.verifying,
    loadBill,
    stopPolling,
    verifyPayment,
    startPolling,
  ]);

  const handleRealtimeChange = useCallback((payload: any) => {
    const nextRecord = payload?.new ?? payload?.record ?? null;
    const status = String(nextRecord?.status ?? '').toUpperCase();

    if (status !== 'PAID') return;

    stopPolling();

    setState((prev) => ({
      ...prev,
      paid: true,
      verifying: false,
      error: null,
      bill: prev.bill
        ? {
            ...prev.bill,
            status: 'PAID',
          }
        : prev.bill,
    }));
  }, [stopPolling]);

  useRealtimeTable(
    'final_bills',
    billId ? `id=eq.${billId}` : undefined,
    handleRealtimeChange,
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadBill();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [loadBill, stopPolling]);

  return {
    ...state,
    loadBill,
    createQr,
    verifyPayment,
  };
}
