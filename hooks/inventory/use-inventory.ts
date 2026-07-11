import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryApi } from '@/lib/inventory/inventory';
import { useRealtimeInventory } from '@/connections/useRealtimeInventory';
import { toast } from 'sonner';

export function useInventory(fetchAll = false) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.list({ search: search || undefined, limit: 50 });
      if (res.error) {
        setError(res.errorMessage);
        setItems([]);
      } else {
        setItems(res.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Realtime subscription
  const handleRealtimeRefresh = useCallback(() => loadItems(), [loadItems]);
  useRealtimeInventory(handleRealtimeRefresh);

  // Low stock alerts (client side)
  const lowStockItems = useMemo(() => items.filter(i => i.quantity <= i.reorderLevel && i.lowStockAlert), [items]);

  useEffect(() => {
    if (lowStockItems.length > 0) {
      toast.warning(`${lowStockItems.length} item(s) low on stock`, { duration: 5000 });
    }
  }, [lowStockItems]);

  return { items, loading, error, loadItems, search, setSearch, lowStockItems };
}