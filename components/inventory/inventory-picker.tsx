'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, X } from 'lucide-react';
import { inventoryApi } from '@/lib/inventory/inventory';
import { cn } from '@/lib/utils';

interface InventoryPickerProps {
  onSelect: (item: { id: string; name: string; price: number; quantity?: number }) => void;
  children: React.ReactNode;
  className?: string;
}

export default function InventoryPicker({ onSelect, children, className }: InventoryPickerProps) {
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
        const res = await inventoryApi.list({ search: search.trim() || undefined, limit: 20 });
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

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchItems, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
          className={cn('h-9 px-3 text-xs font-medium', className)}
        >
          {children || <Package className="w-4 h-4 mr-1" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-60 overflow-y-auto p-1">
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {search ? 'No items found' : 'No inventory items'}
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/20 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit} · ₱{parseFloat(item.sellingPrice).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Select
                  </Button>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}