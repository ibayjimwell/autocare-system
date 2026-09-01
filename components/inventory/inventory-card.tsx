import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  RotateCw,
  AlertTriangle,
  Package,
  CircleCheck,
  CircleX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryCardProps {
  item: any;
  onEdit: () => void;
  onRestock: () => void;
}

export default function InventoryCard({
  item,
  onEdit,
  onRestock,
}: InventoryCardProps) {
  const isLow = item.quantity <= item.reorderLevel;

  return (
    <Card
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md',
        isLow && 'border-red-200 bg-red-50/30 dark:border-red-900/60 dark:bg-red-950/10',
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                  isLow
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
                    : 'border-border bg-muted/50 text-muted-foreground',
                )}
              >
                <Package className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                  {item.name}
                </h3>

                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {item.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          <Badge
            variant={item.active ? 'default' : 'secondary'}
            className={cn(
              'shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
              item.active
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                : '',
            )}
          >
            {item.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <div className="bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Quantity
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {item.quantity}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.unit || 'unit'}
            </p>
          </div>

          <div className="bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Reorder at
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {item.reorderLevel}
            </p>
            <p className="text-xs text-muted-foreground">
              minimum level
            </p>
          </div>

          <div className="bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Cost price
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              ₱{parseFloat(item.costPrice).toFixed(2)}
            </p>
          </div>

          <div className="bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Selling price
            </p>
            <p className="mt-1 text-base font-semibold text-primary">
              ₱{parseFloat(item.sellingPrice).toFixed(2)}
            </p>
          </div>
        </div>

        {isLow && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Low stock — reorder at {item.reorderLevel} {item.unit || 'unit'}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.active ? (
              <>
                <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                Available for sale
              </>
            ) : (
              <>
                <CircleX className="h-3.5 w-3.5" />
                Disabled
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRestock}
              className="h-9 rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <RotateCw className="mr-1.5 h-4 w-4" />
              Restock
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-9 rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}