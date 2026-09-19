'use client';

import {
  useEffect,
  useState,
} from 'react';

import receiptApi from '@/lib/receipt/receipt';

export function useReceipt(
  finalBillId: string | null | undefined,
) {
  const [receipt, setReceipt] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!finalBillId) {
      setReceipt(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setReceipt(null);

    receiptApi
      .getByFinalBill(
        finalBillId,
      )
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (response?.error) {
          setReceipt(null);
          setError(
            response.errorMessage ||
              'Failed to load receipt.',
          );
          return;
        }

        setReceipt(
          response?.data ??
            response ??
            null,
        );
        setError(null);
      })
      .catch((cause: any) => {
        if (cancelled) {
          return;
        }

        console.error(
          '[useReceipt] Failed to load receipt:',
          cause,
        );

        setReceipt(null);
        setError(
          cause?.message ||
            'Failed to load receipt.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [finalBillId]);

  return {
    receipt,
    loading,
    error,
  };
}

export default useReceipt;
