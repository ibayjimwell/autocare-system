'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function safeParseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
      const parsed = safeParseDate(tx?.createdAt);
      const date = parsed ? format(parsed, 'yyyy-MM-dd') : 'Unknown';
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(tx);
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden rounded-xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Transaction History
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">
                {totalCount} total transactions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-border bg-background/80 p-4 backdrop-blur-xl sm:p-5">
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
              className="h-11 min-w-0 rounded-md text-base md:h-9 md:text-sm"
              title="From date"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 min-w-0 rounded-md text-base md:h-9 md:text-sm"
              title="To date"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-lg border border-border bg-muted/40"
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
            <div className="space-y-7">
              {grouped.map(([date, txs]) => {
                const parsedGroupDate = date === 'Unknown' ? null : parseISO(date);

                return (
                  <section key={date}>
                    <div className="mb-3 flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {parsedGroupDate ? format(parsedGroupDate, 'MMMM dd, yyyy') : 'Unknown date'}
                      </h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="space-y-2">
                      {txs.map((tx) => {
                        const parsed = safeParseDate(tx?.createdAt);
                        const items = Array.isArray(tx?.items) ? tx.items : [];

                        return (
                          <div
                            key={tx.id}
                            className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  #{String(tx.id).slice(0, 8)}
                                  {' · '}
                                  {parsed ? format(parsed, 'hh:mm a') : 'N/A'}
                                </p>
                              </div>

                              <div className="sm:text-right">
                                <p className="text-sm font-semibold text-primary">
                                  Total: {formatCurrency(tx.totalAmount)}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  Paid: {formatCurrency(tx.paymentReceived)}
                                  {' · '}
                                  Change: {formatCurrency(tx.changeGiven)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-border pt-3">
                              <div className="space-y-2">
                                {items.map((item: any, idx: number) => (
                                  <div
                                    key={`${tx.id}-${idx}`}
                                    className="flex items-center justify-between gap-4 text-xs"
                                  >
                                    <span className="min-w-0 truncate text-muted-foreground">
                                      {item?.quantity || 0}x {item?.name || 'Item'}
                                    </span>
                                    <span className="shrink-0 font-medium text-foreground">
                                      {formatCurrency(item?.lineTotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-between border-t border-border p-4">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-10 w-10 rounded-md md:h-9 md:w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-10 w-10 rounded-md md:h-9 md:w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
