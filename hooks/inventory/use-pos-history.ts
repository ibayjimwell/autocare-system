'use client';

import { useCallback, useEffect, useState } from 'react';
import { posApi } from '@/lib/inventory/inventory';

export function usePosHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await posApi.getHistory({
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });

      if (res?.error) {
        setTransactions([]);
        setTotalPages(1);
        setTotalCount(0);
        return;
      }

      setTransactions(Array.isArray(res?.data) ? res.data : []);
      setTotalPages(Math.max(1, Number(res?.pagination?.pages || 1)));
      setTotalCount(Number(res?.pagination?.total || 0));
    } catch (error) {
      console.error('[usePosHistory] Load error:', error);
      setTransactions([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo]);

  return {
    transactions,
    loading,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    totalPages,
    totalCount,
    load,
  };
}
