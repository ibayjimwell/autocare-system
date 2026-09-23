'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Barcode,
  CircleCheck,
  CircleX,
  Package,
  Pencil,
  RotateCw,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency, getInventoryMargin, getInventoryStockValue, isOutOfStock, isLowStock } from '@/app-utils/inventory/inventory';

interface InventoryCardProps {
  item: any;
  onEdit: () => void;
  onRestock: () => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function InventoryCard({
  item,
  onEdit,
  onRestock,
}: InventoryCardProps) {
  const quantity = Number(item?.quantity) || 0;
  const reorderLevel = Number(item?.reorderLevel) || 0;
  const low = isLowStock(item);
  const out = isOutOfStock(item);
  const margin = getInventoryMargin(item);
  const stockValue = getInventoryStockValue(item);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
              out
                ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400'
                : low
                  ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-400'
                  : 'border-border bg-muted/40 text-muted-foreground',
            ].join(' ')}
          >
            {out || low ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Package className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {item?.name}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {item?.description || 'No description provided'}
                </p>
              </div>

              {out ? (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  Out
                </span>
              ) : low ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  Low
                </span>
              ) : item?.active ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Active
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>

            {item?.barcode ? (
              <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                <Barcode className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.barcode}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Stock
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {quantity}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {item?.unit || 'unit'}
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cost
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              ₱{formatCurrency(item?.costPrice)}
            </p>
          </div>

          <div className="rounded-lg bg-primary/[0.04] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Selling
            </p>
            <p className="mt-1 text-base font-semibold text-primary">
              ₱{formatCurrency(item?.sellingPrice)}
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Margin
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              ₱{formatCurrency(margin)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Stock ₱{formatCurrency(stockValue)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
          <div className="text-xs text-muted-foreground">
            Reorder at{' '}
            <span className="font-semibold text-foreground">
              {reorderLevel} {item?.unit || 'unit'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {item?.active ? (
              <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <CircleX className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-[11px] text-muted-foreground">
              {item?.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRestock}
            className={`h-11 rounded-md ${focusClass}`}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Restock
          </Button>

          <Button
            type="button"
            onClick={onEdit}
            className={`h-11 rounded-md ${focusClass}`}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
    </article>
  );
}
