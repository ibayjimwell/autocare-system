// components/inventory/pos-history-modal.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Receipt,
} from 'lucide-react';
import { usePosHistory } from '@/hooks/inventory/use-pos-history';
import { formatCurrency } from '@/app-utils/inventory/inventory';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface PosHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PosHistoryModal({ open, onClose }: PosHistoryModalProps) {
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

  // Group transactions by date (YYYY-MM-DD)
  const grouped = React.useMemo(() => {
    const map = new Map<string, any[]>();
    transactions.forEach((tx) => {
      const date = tx.createdAt ? format(parseISO(tx.createdAt), 'yyyy-MM-dd') : 'Unknown';
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(tx);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Transaction History
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{totalCount} total transactions</p>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 rounded-xl"
              title="From date"
            />
            <span className="text-slate-400">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 rounded-xl"
              title="To date"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No transactions found.</div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([date, txs]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase text-slate-500">
                      {format(parseISO(date), 'MMMM dd, yyyy')}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="space-y-3">
                    {txs.map((tx) => (
                      <div
                        key={tx.id}
                        className="border rounded-xl p-4 bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-mono text-slate-400">
                              #{tx.id.slice(0, 8)} –{' '}
                              {format(parseISO(tx.createdAt), 'hh:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">
                              Total: {formatCurrency(tx.totalAmount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Paid: {formatCurrency(tx.paymentReceived)} | Change:{' '}
                              {formatCurrency(tx.changeGiven)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {tx.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium">
                                {formatCurrency(parseFloat(item.sellingPrice) * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}