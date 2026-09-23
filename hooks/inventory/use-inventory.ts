'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { inventoryApi } from '@/lib/inventory/inventory';
import {
  InventoryRealtimePayload,
  useRealtimeInventory,
} from '@/connections/useRealtimeInventory';
import { isLowStock } from '@/app-utils/inventory/inventory';

type UseInventoryOptions = {
  onLowStock?: (item: any) => void;
};

function isNewlyLowStock(previousItem: any, nextItem: any) {
  if (!nextItem || nextItem.lowStockAlert === false) return false;

  const nextLow = isLowStock(nextItem);
  const previousLow = isLowStock(previousItem);

  return nextLow && !previousLow;
}

export function useInventory(
  fetchAll = true,
  options: UseInventoryOptions = {},
) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lowStockAlertItem, setLowStockAlertItem] = useState<any>(null);
  const itemsRef = useRef<any[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!fetchAll) {
        const res = await inventoryApi.list({
          limit: 50,
          sortBy: 'name',
          sortDir: 'asc',
          active: 'all',
          stock: 'all',
        });

        if (res?.error) {
          setError(res.errorMessage || 'Unable to fetch inventory.');
          setItems([]);
          return;
        }

        setItems(Array.isArray(res?.data) ? res.data : []);
        return;
      }

      /*
       * Load every page so client-side sorting/filtering is not limited
       * to the first 500 records.
       */
      const pageSize = 500;
      const firstPage = await inventoryApi.list({
        page: 1,
        limit: pageSize,
        sortBy: 'name',
        sortDir: 'asc',
        active: 'all',
        stock: 'all',
      });

      if (firstPage?.error) {
        setError(firstPage.errorMessage || 'Unable to fetch inventory.');
        setItems([]);
        return;
      }

      const allItems = Array.isArray(firstPage?.data)
        ? [...firstPage.data]
        : [];

      const totalPages = Math.max(
        1,
        Number(firstPage?.pagination?.pages || 1),
      );

      if (totalPages > 1) {
        const pageRequests = [];

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          pageRequests.push(
            inventoryApi.list({
              page: currentPage,
              limit: pageSize,
              sortBy: 'name',
              sortDir: 'asc',
              active: 'all',
              stock: 'all',
            }),
          );
        }

        const remainingPages = await Promise.all(pageRequests);

        for (const pageResult of remainingPages) {
          if (pageResult?.error) {
            throw new Error(
              pageResult.errorMessage || 'Unable to fetch all inventory pages.',
            );
          }

          if (Array.isArray(pageResult?.data)) {
            allItems.push(...pageResult.data);
          }
        }
      }

      setItems(allItems);
    } catch (err: any) {
      console.error('[useInventory] Load error:', err);
      setError(err?.message || 'Unable to fetch inventory.');
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  const handleRealtimeChange = useCallback(
    (payload: InventoryRealtimePayload) => {
      const nextItem = payload?.new;
      const previousItem = payload?.old;

      if (payload?.eventType === 'DELETE') {
        if (previousItem?.id) {
          setItems((current) => current.filter((item) => item.id !== previousItem.id));
        }
        void loadItems();
        return;
      }

      if (nextItem?.id) {
        const localPrevious = itemsRef.current.find(
          (item) => item.id === nextItem.id,
        );

        if (isNewlyLowStock(localPrevious || previousItem, nextItem)) {
          setLowStockAlertItem(nextItem);
          options.onLowStock?.(nextItem);

          toast.warning(
            `${nextItem.name} is now low on stock (${nextItem.quantity} ${nextItem.unit || 'unit'} remaining).`,
            { duration: 7000 },
          );
        }
      }

      void loadItems();
    },
    [loadItems, options.onLowStock],
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useRealtimeInventory(handleRealtimeChange);

  const lowStockItems = useMemo(
    () => items.filter((item) => isLowStock(item)),
    [items],
  );

  const lowStockCount = lowStockItems.length;

  const dismissLowStockAlert = useCallback(() => {
    setLowStockAlertItem(null);
  }, []);

  return {
    items,
    loading,
    error,
    loadItems,
    search,
    setSearch,
    lowStockItems,
    lowStockCount,
    lowStockAlertItem,
    setLowStockAlertItem,
    dismissLowStockAlert,
  };
}
