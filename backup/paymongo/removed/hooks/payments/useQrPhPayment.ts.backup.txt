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
  paymentStatus: string;
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
    paymentStatus: 'NONE',
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

  // Read-only provider status; the backend checks PayMongo with its secret key.
  // FAILED and EXPIRED are not treated as proof of payment.
  const checkQrStatus = useCallback(async (intentId?: string | null, showLoading = false) => {
    if (!billId) return false;
    if (showLoading && mountedRef.current) {
      setState(prev => ({ ...prev, verifying: true }));
    }
    try {
      const query = intentId ? `?paymentIntentId=${encodeURIComponent(intentId)}` : '';
      const response = await fetch(
        `/api/payments/final-bills/${encodeURIComponent(billId)}/qrph-status${query}`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.errorMessage || 'Could not check QRPh status.');
      }
      const nextStatus = String(data?.data?.status ?? 'NONE').toUpperCase();
      if (mountedRef.current) {
        setState(prev => ({ ...prev, paymentStatus: nextStatus,
          ...(data?.data?.qrImageUrl && !prev.qrImageUrl ? {
            qrImageUrl: String(data.data.qrImageUrl).startsWith('data:image/')
              ? data.data.qrImageUrl : String(data.data.qrImageUrl).startsWith('https://')
                ? data.data.qrImageUrl : `data:image/png;base64,${data.data.qrImageUrl}`,
          } : {}),
        }));
      }
      if (data?.data?.paid) {
        stopPolling();
        await loadBill();
        return true;
      }
      if (nextStatus === 'SUCCEEDED' && intentId) {
        return verifyPayment(intentId, showLoading);
      }
      if (nextStatus === 'FAILED' || nextStatus === 'EXPIRED') {
        stopPolling();
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            paymentStatus: nextStatus,
            qrImageUrl: null,
            error: nextStatus === 'EXPIRED'
              ? 'The QRPh code expired without a confirmed payment. Generate a new code.'
              : 'PayMongo reported that the payment was unsuccessful. Generate a new QRPh code to retry.',
          }));
        }
      }
      return false;
    } catch (cause) {
      if (showLoading && mountedRef.current) {
        setState(prev => ({ ...prev, error: cause instanceof Error ? cause.message : 'Unable to check payment status.' }));
      }
      return false;
    } finally {
      if (showLoading && mountedRef.current) setState(prev => ({ ...prev, verifying: false }));
    }
  }, [billId, loadBill, stopPolling, verifyPayment]);

  const startPolling = useCallback((paymentIntentId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(() => {
      void checkQrStatus(paymentIntentId);
    }, POLL_INTERVAL_MS);
  }, [stopPolling, checkQrStatus]);

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
      paymentStatus: 'INITIATED',
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

      if (!paymentIntentId || (!clientKey && !intent?.qrImageUrl)) {
        throw new Error(
          'PayMongo did not return the credentials needed to generate the QRPh code.',
        );
      }

      // If another device already generated the QR, display that same intent.
      if (intent?.existing && intent?.qrImageUrl) {
        const rawImage = String(intent.qrImageUrl);
        const existingImage = rawImage.startsWith('data:image/') ? rawImage
          : rawImage.startsWith('https://') ? rawImage
            : `data:image/png;base64,${rawImage}`;
        if (mountedRef.current) setState(prev => ({
          ...prev, creatingQr: false, paymentIntentId, qrImageUrl: existingImage,
          testUrl: intent.qrTestUrl ?? null,
          paymentStatus: 'PENDING',
          expiresAt: intent.expiresAt ? Date.parse(intent.expiresAt) : Date.now() + QRPH_EXPIRY_SECONDS * 1000,
          error: null,
        }));
        startPolling(paymentIntentId);
        return true;
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
          paymentStatus: 'PENDING',
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
    checkQrStatus,
  };
}
