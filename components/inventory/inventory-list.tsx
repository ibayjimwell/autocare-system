'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Package,
  Boxes,
  CircleDollarSign,
  TrendingDown,
  ArrowUpRight,
  Pencil,
  RotateCw,
  CircleCheck,
  CircleX,
} from 'lucide-react';

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

  const metrics = useMemo(() => {
    const totalItems = items.length;

    const totalValue = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const cost = parseFloat(item.costPrice) || 0;

      return sum + quantity * cost;
    }, 0);

    const activeItems = items.filter((item) => item.active).length;

    const lowStockCount = lowStockItems.length;

    const outOfStockCount = items.filter(
      (item) => Number(item.quantity) <= 0,
    ).length;

    const healthyCount = Math.max(
      items.filter(
        (item) =>
          Number(item.quantity) > Number(item.reorderLevel || 0),
      ).length,
      0,
    );

    return {
      totalItems,
      totalValue,
      activeItems,
      lowStockCount,
      outOfStockCount,
      healthyCount,
    };
  }, [items, lowStockItems]);

  const stockHealth = useMemo(() => {
    if (metrics.totalItems === 0) {
      return {
        healthy: 0,
        low: 0,
        out: 0,
      };
    }

    return {
      healthy: Math.round(
        (metrics.healthyCount / metrics.totalItems) * 100,
      ),
      low: Math.round(
        ((metrics.lowStockCount - metrics.outOfStockCount) /
          metrics.totalItems) *
          100,
      ),
      out: Math.round(
        (metrics.outOfStockCount / metrics.totalItems) * 100,
      ),
    };
  }, [metrics]);

  return (
    <>
      <div className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
        {/* Page summary */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="grid divide-y divide-border md:grid-cols-[1.1fr_1fr] md:divide-x md:divide-y-0">
            {/* Total inventory value */}
            <div className="p-5 sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total inventory value
                  </p>

                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    ₱{metrics.totalValue.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                    Based on current stock × cost price
                  </div>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-primary sm:h-11 sm:w-11">
                  <CircleDollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>

            {/* Stock summary */}
            <div className="p-5 sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Stock overview
                  </p>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {metrics.totalItems}
                    </span>

                    <span className="text-sm text-muted-foreground">
                      products
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Active
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {metrics.activeItems}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Issues
                    </p>
                    <p className="text-sm font-semibold text-red-600">
                      {metrics.lowStockCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(stockHealth.healthy, 0)}%` }}
                  />
                  <div
                    className="bg-amber-500 transition-all"
                    style={{
                      width: `${Math.max(
                        Math.min(stockHealth.low, 100),
                        0,
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${Math.max(
                        Math.min(stockHealth.out, 100),
                        0,
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Healthy {metrics.healthyCount}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Low stock {Math.max(
                      metrics.lowStockCount - metrics.outOfStockCount,
                      0,
                    )}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Out of stock {metrics.outOfStockCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Inventory
            </p>

            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Parts & supplies
              </h2>

              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {metrics.totalItems}
              </span>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 lg:flex">
            {lowStockItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch('')}
                className="h-9 rounded-md border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:hover:bg-red-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                {lowStockItems.length} Low Stock
              </Button>
            )}

            <Button
              onClick={() => setPosOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              POS
            </Button>

            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              size="sm"
              className="h-9 rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-md border-input bg-background pl-10 text-base md:h-9 md:text-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch('')}
                className="h-11 shrink-0 rounded-md px-3 text-xs md:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Boxes className="mr-1.5 h-4 w-4" />
                All items
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (lowStockItems.length > 0) {
                    setSearch('');
                  }
                }}
                disabled={lowStockItems.length === 0}
                className="h-11 shrink-0 rounded-md px-3 text-xs md:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <TrendingDown className="mr-1.5 h-4 w-4" />
                Low stock
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Desktop inventory table */}
        <section className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/35">
                  <th className="w-12 px-4 py-3 text-left">
                    <span className="sr-only">Status</span>
                  </th>

                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Item
                  </th>

                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quantity
                  </th>

                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Cost
                  </th>

                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selling
                  </th>

                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>

                  <th className="w-[170px] px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                      </td>

                      <td className="px-3 py-4">
                        <div className="space-y-2">
                          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      </td>

                      <td className="px-3 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </td>

                      <td className="px-3 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </td>

                      <td className="px-3 py-4">
                        <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
                      </td>

                      <td className="px-4 py-4">
                        <div className="ml-auto h-8 w-32 animate-pulse rounded-md bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>

                        <h3 className="mt-4 text-base font-semibold text-foreground">
                          No inventory items
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Add your first part, supply, or consumable to start
                          managing your inventory.
                        </p>

                        <Button
                          onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                          }}
                          className="mt-5 h-9 rounded-md px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Item
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isLow = item.quantity <= item.reorderLevel;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3.5">
                          <div
                            className={[
                              'flex h-8 w-8 items-center justify-center rounded-lg border',
                              isLow
                                ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400'
                                : 'border-border bg-muted/40 text-muted-foreground',
                            ].join(' ')}
                          >
                            {isLow ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="max-w-[270px]">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {item.description || 'No description provided'}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {item.quantity}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {item.unit || 'unit'}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <p className="text-sm font-medium text-foreground">
                            ₱{parseFloat(item.costPrice).toFixed(2)}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          <p className="text-sm font-semibold text-primary">
                            ₱{parseFloat(item.sellingPrice).toFixed(2)}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                              <TrendingDown className="h-3 w-3" />
                              Low stock
                            </span>
                          ) : item.active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <CircleCheck className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <CircleX className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRestockTarget(item)}
                              className="h-8 rounded-md px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                              Restock
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(item);
                                setFormOpen(true);
                              }}
                              className="h-8 rounded-md px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tablet / mobile cards */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))
          ) : items.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-foreground">
                No inventory items
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first inventory item to begin tracking stock.
              </p>

              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="mt-5 h-11 rounded-md px-4 text-sm md:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onEdit={() => {
                  setEditing(item);
                  setFormOpen(true);
                }}
                onRestock={() => setRestockTarget(item)}
              />
            ))
          )}
        </section>
      </div>

      {/* Mobile floating action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/80 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPosOpen(true)}
            className="h-11 flex-1 rounded-md bg-card text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            POS
          </Button>

          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="h-11 flex-1 rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

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