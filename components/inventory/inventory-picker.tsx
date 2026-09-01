'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Package,
  Check,
} from 'lucide-react';
import { inventoryApi } from '@/lib/inventory/inventory';
import { cn } from '@/lib/utils';

interface InventoryPickerProps {
  onSelect: (item: {
    id: string;
    name: string;
    price: number;
    quantity?: number;
  }) => void;
  children: React.ReactNode;
  className?: string;
}

export default function InventoryPicker({
  onSelect,
  children,
  className,
}: InventoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchItems = async () => {
      setLoading(true);

      try {
        const res = await inventoryApi.list({
          search: search.trim() || undefined,
          limit: 20,
        });

        if (res.error) {
          console.error('Inventory fetch error:', res.errorMessage);
          setItems([]);
        } else {
          setItems(res.data || []);
        }
      } catch (err) {
        console.error('Inventory fetch error:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(fetchItems, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [open, search]);

  const handleSelect = (item: any) => {
    onSelect({
      id: item.id,
      name: item.name,
      price: parseFloat(item.sellingPrice) || 0,
      quantity: 1,
    });

    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-11 rounded-md px-3 text-sm font-medium md:h-9 md:text-xs',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          {children || (
            <>
              <Package className="mr-1.5 h-4 w-4" />
              Select product
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-border bg-popover p-0 shadow-lg sm:w-80"
      >
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-md pl-9 text-base md:h-9 md:text-sm"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-72 p-1.5">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Package className="mx-auto h-6 w-6 text-muted-foreground" />

              <p className="mt-2 text-sm font-medium text-foreground">
                {search ? 'No items found' : 'No inventory items'}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Try another search.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </div>

                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.quantity} {item.unit} · ₱
                      {parseFloat(item.sellingPrice).toFixed(2)}
                    </div>
                  </div>

                  <span className="inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Select
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}