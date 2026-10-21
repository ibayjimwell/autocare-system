'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentsPosApi } from '@/lib/payments/pos';

/** Fetch history only while its dialog is open; refetch on every reopen. */
export function usePosHistory(enabled = true) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const requestCounter = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const requestId = ++requestCounter.current;
    setLoading(true);
    setError('');
    try {
      const result = await paymentsPosApi.getHistory({
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      if (requestId !== requestCounter.current) return;
      if (result?.error) throw new Error(result.errorMessage || 'Unable to load POS history.');
      setTransactions(Array.isArray(result?.data) ? result.data : []);
      setTotalPages(Math.max(1, Number(result?.pagination?.pages || 1)));
      setTotalCount(Number(result?.pagination?.total || 0));
    } catch (problem: any) {
      if (requestId !== requestCounter.current) return;
      console.error('[usePosHistory] Error:', problem);
      setError(problem?.message || 'Unable to load POS history.');
      setTransactions([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      if (requestId === requestCounter.current) setLoading(false);
    }
  }, [enabled, search, dateFrom, dateTo, page]);

  useEffect(() => {
    if (enabled) void load();
    return () => { requestCounter.current += 1; };
  }, [enabled, load]);

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const changeDateFrom = useCallback((value: string) => {
    setDateFrom(value);
    setPage(1);
  }, []);
  const changeDateTo = useCallback((value: string) => {
    setDateTo(value);
    setPage(1);
  }, []);

  return {
    transactions,
    loading,
    error,
    search,
    setSearch: changeSearch,
    dateFrom,
    setDateFrom: changeDateFrom,
    dateTo,
    setDateTo: changeDateTo,
    page,
    setPage,
    totalPages,
    totalCount,
    load,
  };
}
