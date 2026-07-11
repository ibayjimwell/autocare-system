'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ShoppingCart, AlertTriangle, Wrench } from 'lucide-react';
import InventoryCard from './inventory-card';
import InventoryForm from './inventory-form';
import RestockModal from './restock-modal';
import POSModal from './pos-modal';
import { useInventory } from '@/hooks/inventory/use-inventory';

export default function InventoryList() {
  const {
    items,
    loading,
    error,
    loadItems,
    search,
    setSearch,
    lowStockItems,
  } = useInventory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [restockTarget, setRestockTarget] = useState<any>(null);
  const [posOpen, setPosOpen] = useState(false);

  const handleSaveSuccess = () => {
    setFormOpen(false);
    setEditing(null);
    loadItems();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          {lowStockItems.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setSearch('')}>
              <AlertTriangle className="w-4 h-4 mr-2" /> {lowStockItems.length} Low Stock
            </Button>
          )}
          <Button onClick={() => setPosOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <ShoppingCart className="w-4 h-4 mr-2" /> POS
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No inventory items. Add your first item.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={() => { setEditing(item); setFormOpen(true); }}
              onRestock={() => setRestockTarget(item)}
            />
          ))}
        </div>
      )}

      <InventoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        onSuccess={handleSaveSuccess}
      />
      <RestockModal
        item={restockTarget}
        onClose={() => setRestockTarget(null)}
        onSuccess={loadItems}
      />
      <POSModal
        open={posOpen}
        onClose={() => setPosOpen(false)}
        onCompleted={loadItems}
      />
    </>
  );
}