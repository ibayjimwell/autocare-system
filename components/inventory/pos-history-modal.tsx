'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Receipt,
} from 'lucide-react';

import { usePosHistory } from '@/hooks/inventory/use-pos-history';
import { formatCurrency } from '@/app-utils/inventory/inventory';
import { format, parseISO } from 'date-fns';

interface PosHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PosHistoryModal({
  open,
  onClose,
}: PosHistoryModalProps) {
  const {
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
  } = usePosHistory();

  const grouped = React.useMemo(() => {
    const map = new Map<string, any[]>();

    transactions.forEach((tx) => {
      const date = tx.createdAt
        ? format(parseISO(tx.createdAt), 'yyyy-MM-dd')
        : 'Unknown';

      if (!map.has(date)) {
        map.set(date, []);
      }

      map.get(date)!.push(tx);
    });

    return Array.from(map.entries()).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
  }, [transactions]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[95vh] flex-col rounded-xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>

            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Transaction History
              </DialogTitle>

              <p className="mt-0.5 text-sm text-muted-foreground">
                {totalCount} total transactions
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 py-2 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search by item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-md pl-10 text-base md:h-9 md:text-sm"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-md text-base md:h-9 md:w-36 md:text-sm"
              title="From date"
            />

            <span className="text-sm text-muted-foreground">–</span>

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-md text-base md:h-9 md:w-36 md:text-sm"
              title="To date"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="space-y-4 py-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Receipt className="h-7 w-7 text-muted-foreground" />

              <p className="mt-3 text-sm font-semibold text-foreground">
                No transactions found
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Try changing your search or date range.
              </p>
            </div>
          ) : (
            <div className="space-y-7 py-2">
              {grouped.map(([date, txs]) => (
                <section key={date}>
                  <div className="mb-3 flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-primary" />

                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {format(parseISO(date), 'MMMM dd, yyyy')}
                    </h3>

                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    {txs.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              #{tx.id.slice(0, 8)} ·{' '}
                              {format(parseISO(tx.createdAt), 'hh:mm a')}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-sm font-semibold text-primary">
                              Total: {formatCurrency(tx.totalAmount)}
                            </p>

                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              Paid: {formatCurrency(tx.paymentReceived)} ·
                              Change: {formatCurrency(tx.changeGiven)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-border pt-3">
                          <div className="space-y-2">
                            {tx.items?.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-4 text-xs"
                              >
                                <span className="min-w-0 truncate text-muted-foreground">
                                  {item.quantity}x {item.name}
                                </span>

                                <span className="shrink-0 font-medium text-foreground">
                                  {formatCurrency(
                                    parseFloat(item.sellingPrice) *
                                      item.quantity,
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 w-9 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 w-9 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}