'use client';

import { FinalBill } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/status-badge';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
import {
  Clock,
  DollarSign,
  Eye,
  MoreHorizontal,
  PauseCircle,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';

import { finalBillsApi } from '@/lib/payments/final-bills';
import HoldConfigModal from './HoldConfigModal';
import UnholdConfirmModal from './UnholdConfirmModal';

interface FinalBillsListProps {
  bills: FinalBill[];
  statusFilter: string;
  onPay: (bill: FinalBill) => void;
  onOpenDetail: (item: FinalBill, type: 'final-bill') => void;
  onDelete: (id: string) => void;
  onHold: (id: string, rate: number, unit: string) => void;
  onMakeOfficial: (id: string) => void;
  onBackToPending: (id: string) => void;
  actionLoading: boolean;
}

export default function FinalBillsList({
  bills,
  statusFilter,
  onPay,
  onOpenDetail,
  onDelete,
  onHold,
  onMakeOfficial,
  onBackToPending,
  actionLoading,
}: FinalBillsListProps) {
  const [holdConfigOpen, setHoldConfigOpen] = useState(false);
  const [unholdConfirmOpen, setUnholdConfirmOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [parkingFeeData, setParkingFeeData] = useState<{
    fee: number;
    rate: number;
    unit: string;
    startedAt: string;
  } | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);

  const fetchParkingFee = async (billId: string) => {
    try {
      const res = await finalBillsApi.getParkingFee(billId);

      if (!res.error && res.data) {
        setParkingFeeData(res.data);
        return res.data;
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleHoldClick = (billId: string) => {
    setSelectedBillId(billId);
    setHoldConfigOpen(true);
  };

  const handleHoldConfirm = async (rate: number, unit: string) => {
    if (!selectedBillId) return;

    setHoldLoading(true);

    try {
      await onHold(selectedBillId, rate, unit);
      setHoldConfigOpen(false);
    } finally {
      setHoldLoading(false);
    }
  };

  const handleBackToPendingClick = async (billId: string) => {
    setSelectedBillId(billId);

    const data = await fetchParkingFee(billId);

    if (data) {
      setParkingFeeData(data);
      setUnholdConfirmOpen(true);
    } else {
      onBackToPending(billId);
    }
  };

  const handleUnholdConfirm = async () => {
    if (!selectedBillId) return;

    setHoldLoading(true);

    try {
      onBackToPending(selectedBillId);
      setUnholdConfirmOpen(false);
    } finally {
      setHoldLoading(false);
    }
  };

  if (bills.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No final bills"
        description={
          statusFilter !== 'ALL'
            ? 'No final bills with the selected status.'
            : 'Final bills are generated from approved estimates.'
        }
      />
    );
  }

  const renderActions = (bill: FinalBill) => {
    const status = bill.status;
    const isLoading = actionLoading || holdLoading;

    switch (status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleHoldClick(bill.id)}
              disabled={isLoading}
              className="
                h-8 rounded-md border-amber-500 px-2.5
                text-xs font-medium text-amber-600
                hover:bg-amber-50
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
              "
            >
              <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
              Hold
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => onMakeOfficial(bill.id)}
              disabled={isLoading}
              className="
                h-8 rounded-md bg-green-600 px-2.5
                text-xs font-medium text-white hover:bg-green-700
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
              "
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        );

      case 'HOLD':
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleBackToPendingClick(bill.id)}
              disabled={isLoading}
              className="
                h-8 rounded-md px-2.5 text-xs font-medium
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
              "
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => onMakeOfficial(bill.id)}
              disabled={isLoading}
              className="
                h-8 rounded-md bg-green-600 px-2.5
                text-xs font-medium text-white hover:bg-green-700
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
              "
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        );

      case 'OFFICIAL':
        return (
          <Button
            type="button"
            size="sm"
            onClick={() => onPay(bill)}
            className="
              h-8 rounded-md bg-blue-600 px-2.5
              text-xs font-medium text-white hover:bg-blue-700
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <DollarSign className="mr-1.5 h-3.5 w-3.5" />
            Pay
          </Button>
        );

      case 'PAID':
        return (
          <span className="text-xs font-semibold text-green-600">
            Paid
          </span>
        );

      default:
        return null;
    }
  };

  const renderParkingFee = (bill: FinalBill) => {
    if (bill.status !== 'HOLD') return null;

    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <Clock className="h-3 w-3" />
        Parking fee accumulating
      </span>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* MOBILE */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {bills.map((bill) => (
            <Card
              key={bill.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">
                        Final Bill
                      </p>

                      <p className="truncate text-xs font-mono text-muted-foreground">
                        #{bill.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={bill.status}
                    className="shrink-0 text-[10px]"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {format(new Date(bill.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </p>

                    <p className="mt-1 text-lg font-semibold text-primary">
                      ₱{formatCurrency(bill.grandTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  {renderParkingFee(bill)}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {renderActions(bill)}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenDetail(bill, 'final-bill')}
                    className="
                      h-11 rounded-md px-4
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-ring focus-visible:ring-offset-2
                    "
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>

                  {bill.status !== 'PAID' && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete bill ${bill.id}`}
                      className="
                        h-11 w-11 rounded-md text-red-500
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring focus-visible:ring-offset-2
                      "
                      onClick={() => onDelete(bill.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* DESKTOP */}
        <Card className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Bill ID
                  </TableHead>

                  <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>

                  <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>

                  <TableHead className="h-11 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </TableHead>

                  <TableHead className="h-11 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Parking
                  </TableHead>

                  <TableHead className="h-11 w-[250px] px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {bills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className="border-border hover:bg-muted/20"
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/40">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div>
                          <p className="font-mono text-sm font-medium">
                            {bill.id.slice(0, 8).toUpperCase()}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Final billing record
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(bill.createdAt), 'MMM dd, yyyy')}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <StatusBadge
                        status={bill.status}
                        className="text-[10px]"
                      />
                    </TableCell>

                    <TableCell className="px-4 py-3 text-right font-semibold text-primary">
                      ₱{formatCurrency(bill.grandTotal)}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-right text-sm">
                      {bill.status === 'HOLD' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                          <Clock className="h-3.5 w-3.5" />
                          Calculating...
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {renderActions(bill)}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`View bill ${bill.id}`}
                          onClick={() => onOpenDetail(bill, 'final-bill')}
                          className="
                            h-8 w-8 rounded-md
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-ring focus-visible:ring-offset-2
                          "
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {bill.status !== 'PAID' && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete bill ${bill.id}`}
                            className="
                              h-8 w-8 rounded-md text-red-500
                              focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-ring focus-visible:ring-offset-2
                            "
                            onClick={() => onDelete(bill.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="More actions"
                          className="
                            h-8 w-8 rounded-md
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-ring focus-visible:ring-offset-2
                          "
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-medium text-foreground">
                {bills.length}
              </span>{' '}
              final bill{bills.length === 1 ? '' : 's'}
            </span>

            <span>Current filtered result</span>
          </div>
        </Card>
      </div>

      <HoldConfigModal
        open={holdConfigOpen}
        onOpenChange={setHoldConfigOpen}
        onConfirm={handleHoldConfirm}
        loading={holdLoading}
      />

      <UnholdConfirmModal
        open={unholdConfirmOpen}
        onOpenChange={setUnholdConfirmOpen}
        parkingFee={parkingFeeData?.fee || 0}
        rate={parkingFeeData?.rate || 0}
        unit={parkingFeeData?.unit || 'hour'}
        startedAt={
          parkingFeeData?.startedAt || new Date().toISOString()
        }
        onConfirm={handleUnholdConfirm}
        loading={holdLoading}
      />
    </>
  );
}