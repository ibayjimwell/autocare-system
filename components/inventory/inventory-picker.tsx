'use client';

import React, {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  Check,
  CircleX,
  Loader2,
  Package,
  Search,
} from 'lucide-react';

import {
  Button,
} from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Input,
} from '@/components/ui/input';

import {
  ScrollArea,
} from '@/components/ui/scroll-area';

import {
  inventoryApi,
} from '@/lib/inventory/inventory';

import {
  cn,
} from '@/lib/utils';

interface InventoryPickerItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string | null;
  sellingPrice?: number | string | null;
  costPrice?: number | string | null;
  reorderLevel?: number | string | null;
  barcode?: string | null;
  active?: boolean;
}

interface InventoryPickerProps {
  onSelect: (item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    unit?: string | null;
    reorderLevel?: number | string | null;
    lowStock?: boolean;
    outOfStock?: boolean;
  }) => void;
  className?: string;
  children?: ReactNode;
}

const getNumeric = (
  value: unknown,
) => Number(value) || 0;

const isOutOfStock = (
  item: InventoryPickerItem,
) =>
  getNumeric(item.quantity) <= 0;

const isLowStock = (
  item: InventoryPickerItem,
) =>
  !isOutOfStock(item) &&
  getNumeric(item.quantity) <=
    getNumeric(item.reorderLevel);

export default function InventoryPicker({
  onSelect,
  className,
  children,
}: InventoryPickerProps) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    items,
    setItems,
  ] = useState<
    InventoryPickerItem[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res =
          await inventoryApi.list({
            search:
              search.trim() ||
              undefined,
            page: 1,
            limit: 100,
            sortBy: 'name',
            sortDir: 'asc',
            active: 'true',
            stock: 'all',
          });

        if (cancelled) {
          return;
        }

        if (res?.error) {
          setError(
            res.errorMessage ||
              'Unable to load inventory.',
          );
          setItems([]);
          return;
        }

        const nextItems =
          Array.isArray(
            res?.data,
          )
            ? res.data
            : [];

        setItems(
          nextItems as InventoryPickerItem[],
        );
      } catch (
        err: any
      ) {
        if (!cancelled) {
          setError(
            err?.message ||
              'Unable to load inventory.',
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    search,
  ]);

  const sortedItems =
    useMemo(
      () =>
        [...items].sort(
          (
            left,
            right,
          ) => {
            const leftOut =
              isOutOfStock(
                left,
              );
            const rightOut =
              isOutOfStock(
                right,
              );

            if (
              leftOut !==
              rightOut
            ) {
              return leftOut
                ? 1
                : -1;
            }

            const leftLow =
              isLowStock(
                left,
              );
            const rightLow =
              isLowStock(
                right,
              );

            if (
              leftLow !==
              rightLow
            ) {
              return leftLow
                ? 1
                : -1;
            }

            return String(
              left.name ||
                '',
            ).localeCompare(
              String(
                right.name ||
                  '',
              ),
              undefined,
              {
                sensitivity:
                  'base',
              },
            );
          },
        ),
      [
        items,
      ],
    );

  const handleSelect =
    (
      item: InventoryPickerItem,
    ) => {
      const out =
        isOutOfStock(
          item,
        );

      if (out) {
        return;
      }

      const price =
        getNumeric(
          item.sellingPrice,
        ) ||
        getNumeric(
          item.costPrice,
        );

      setSelectedId(
        item.id,
      );

      onSelect({
        id: item.id,
        name: item.name,
        price,
        quantity:
          getNumeric(
            item.quantity,
          ),
        unit:
          item.unit,
        reorderLevel:
          item.reorderLevel,
        lowStock:
          isLowStock(
            item,
          ),
        outOfStock:
          false,
      });

      setOpen(false);
      setSearch('');
    };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setOpen(true)
        }
        className={cn(
          'h-11 rounded-md',
          className,
        )}
        aria-label="Pick inventory item"
      >
        {children || (
          <>
            <Package className="mr-2 h-4 w-4" />
            Pick Inventory
          </>
        )}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(
          nextOpen,
        ) => {
          setOpen(
            nextOpen,
          );

          if (!nextOpen) {
            setSearch('');
          }
        }}
      >
        <DialogContent
          className="
            w-[calc(100%-1rem)]
            max-w-2xl
            rounded-xl
            border-border
            bg-card
            p-0
          "
        >
          <DialogHeader
            className="
              border-b
              border-border
              px-4
              py-4
              sm:px-5
              sm:py-5
            "
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <DialogTitle>
                  Pick Inventory Item
                </DialogTitle>

                <DialogDescription className="mt-1">
                  Select an actual inventory item for this finding. Stock is checked again when the estimate is submitted to billing.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="relative">
              <Search
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-muted-foreground
                "
              />

              <Input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target
                      .value,
                  )
                }
                placeholder="Search inventory item..."
                autoComplete="off"
                className="
                  h-11
                  rounded-md
                  pl-10
                  text-base
                  md:text-sm
                "
              />
            </div>

            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                border
                border-border
                bg-muted/20
                px-3
                py-2.5
              "
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

              <p className="text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Low stock
                </span>{' '}
                items can still be selected, but they are clearly marked.
                <span className="font-semibold text-foreground">
                  {' '}
                  Out of stock
                </span>{' '}
                items cannot be selected.
              </p>
            </div>

            <ScrollArea className="h-[min(60vh,28rem)] rounded-lg border border-border">
              {loading ? (
                <div className="flex min-h-64 items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading inventory...
                  </div>
                </div>
              ) : error ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <CircleX className="h-7 w-7 text-destructive" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Unable to load inventory
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    {error}
                  </p>
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <Package className="h-7 w-7 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    No inventory items found
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Try another search term.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sortedItems.map(
                    (
                      item,
                    ) => {
                      const out =
                        isOutOfStock(
                          item,
                        );

                      const low =
                        isLowStock(
                          item,
                        );

                      const selected =
                        selectedId ===
                        item.id;

                      const price =
                        getNumeric(
                          item.sellingPrice,
                        ) ||
                        getNumeric(
                          item.costPrice,
                        );

                      return (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          disabled={
                            out
                          }
                          onClick={() =>
                            handleSelect(
                              item,
                            )
                          }
                          className={cn(
                            `
                              flex
                              w-full
                              items-center
                              gap-3
                              px-4
                              py-3
                              text-left
                              transition-colors
                            `,
                            out
                              ? 'cursor-not-allowed bg-muted/30 opacity-60'
                              : 'hover:bg-accent',
                            selected &&
                              'bg-primary/5',
                          )}
                        >
                          <span
                            className={cn(
                              `
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                border
                              `,
                              out
                                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                                : low
                                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-600'
                                  : 'border-border bg-muted/40 text-muted-foreground',
                            )}
                          >
                            {out ? (
                              <CircleX className="h-4 w-4" />
                            ) : low ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </span>

                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Stock:{' '}
                                <strong className={cn(
                                  'font-semibold',
                                  out
                                    ? 'text-destructive'
                                    : low
                                      ? 'text-amber-700 dark:text-amber-400'
                                      : 'text-foreground',
                                )}>
                                  {item.quantity}{' '}
                                  {item.unit || 'unit'}
                                </strong>
                              </span>

                              <span>
                                Price: ₱
                                {price.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center gap-2">
                            {out ? (
                              <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                                Out of stock
                              </span>
                            ) : low ? (
                              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Low stock
                              </span>
                            ) : null}

                            {selected && (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </ScrollArea>

            <p className="text-[11px] leading-5 text-muted-foreground">
              Inventory quantities are reserved only when the service estimate is submitted to billing. This prevents simply opening or selecting an item from reducing actual stock.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
