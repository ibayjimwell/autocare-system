'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FinalBill } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { Clock3, CircleParking, DollarSign, Eye, MoreHorizontal, ReceiptText, Send, Trash2 } from 'lucide-react';
import { finalBillsApi } from '@/lib/payments/final-bills';
import { paymentsConfigurationApi } from '@/lib/payments/configuration';
import ParkVehicleConfirmationModal from './ParkVehicleConfirmationModal';
import StopParkingConfirmationModal from './StopParkingConfirmationModal';

interface FinalBillsListProps {
  bills: FinalBill[];
  statusFilter: string;
  onPay: (bill: FinalBill) => void;
  onViewReceipt: (billId: string) => void;
  onOpenDetail: (item: FinalBill, type: 'final-bill') => void;
  onDelete: (id: string) => void;
  onPark: (id: string, addParkingFee: boolean) => Promise<boolean> | boolean;
  onMakeOfficial: (id: string) => void;
  onStopParking: (id: string) => Promise<boolean> | boolean;
  actionLoading: boolean;
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'OFFICIAL':
      return {
        wrapper: 'border-blue-200 bg-blue-50/70 text-blue-700',
        dot: 'bg-blue-500',
        label: 'Official',
        row: 'bg-blue-50/70 hover:bg-blue-100/80 border-l-2 border-l-blue-400',
        pulse: '',
      };
    case 'PENDING':
      return {
        wrapper: 'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
        label: 'Pending',
        row: 'bg-red-50/70 hover:bg-red-100/80 border-l-2 border-l-red-400',
        pulse: 'motion-safe:animate-pulse',
      };
    case 'PARKED':
      return {
        wrapper: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
        label: 'Parked',
        row: 'bg-amber-50/70 hover:bg-amber-100/80 border-l-2 border-l-amber-400',
        pulse: 'motion-safe:animate-pulse',
      };
    case 'PAID':
      return {
        wrapper: 'border-green-200 bg-green-50/70 text-green-700',
        dot: 'bg-green-500',
        label: 'Paid',
        row: 'bg-green-50/70 hover:bg-green-100/80 border-l-2 border-l-green-400',
        pulse: '',
      };
    default:
      return {
        wrapper: 'border-border bg-muted/40 text-muted-foreground',
        dot: 'bg-muted-foreground',
        label: status || 'Unknown',
        row: 'bg-muted/30 hover:bg-muted/50 border-l-2 border-l-muted-foreground/30',
        pulse: '',
      };
  }
}

function getCustomerName(bill: any): string {
  const customer = bill?.appointment?.customer ?? bill?.customer;

  const directName =
    customer?.fullname ??
    customer?.fullName ??
    customer?.name ??
    bill?.appointment?.customerName ??
    bill?.customerName;

  if (directName) {
    return String(directName).trim();
  }

  const firstName =
    customer?.firstName ??
    customer?.first_name ??
    customer?.givenName ??
    '';

  const lastName =
    customer?.lastName ??
    customer?.last_name ??
    customer?.surname ??
    '';

  const combined = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();

  return combined || 'Unnamed Customer';
}

function safeDate(value: unknown): string {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'MMM dd, yyyy');
}

function getBillableDays(parkedAt: unknown): number {
  if (!parkedAt) return 1;
  const startedAt = new Date(String(parkedAt));
  if (Number.isNaN(startedAt.getTime())) return 1;
  const diff = Math.max(0, Date.now() - startedAt.getTime());
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function getLiveParkingFee(bill: any): number {
  if (bill?.status !== 'PARKED' || bill?.parkingFeeEnabled === false) return 0;
  const rate = Number(bill?.parkingFeeRate || 0);
  return Math.round(rate * getBillableDays(bill?.parkedAt) * 100) / 100;
}

export default function FinalBillsList({
  bills,
  statusFilter,
  onPay,
  onViewReceipt,
  onOpenDetail,
  onDelete,
  onPark,
  onMakeOfficial,
  onStopParking,
  actionLoading,
}: FinalBillsListProps) {
  const [parkModalOpen, setParkModalOpen] = useState(false);
  const [stopParkingModalOpen, setStopParkingModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [parkingFeePerDay, setParkingFeePerDay] = useState(0);
  const [configLoading, setConfigLoading] = useState(false);
  const [localTick, setLocalTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setLocalTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadPaymentConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await paymentsConfigurationApi.get();
      if (!res.error) {
        setParkingFeePerDay(Number(res.data?.parkingFeePerDay || 0));
      }
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const handleOpenPark = async (bill: FinalBill) => {
    setSelectedBill(bill);
    await loadPaymentConfig();
    setParkModalOpen(true);
  };

  const handleParkConfirm = async (addParkingFee: boolean) => {
    if (!selectedBill) return;
    const success = await onPark(selectedBill.id, addParkingFee);
    if (success) {
      setParkModalOpen(false);
      setSelectedBill(null);
    }
  };

  const handleOpenStopParking = (bill: FinalBill) => {
    setSelectedBill(bill);
    setStopParkingModalOpen(true);
  };

  const handleStopParkingConfirm = async () => {
    if (!selectedBill) return;
    const success = await onStopParking(selectedBill.id);
    if (success) {
      setStopParkingModalOpen(false);
      setSelectedBill(null);
    }
  };

  const selectedParkingDays = useMemo(
    () => getBillableDays(selectedBill?.parkedAt),
    [selectedBill, localTick],
  );

  const selectedParkingRate = Number(selectedBill?.parkingFeeRate || 0);
  const selectedParkingFee = selectedBill?.parkingFeeEnabled === false
    ? 0
    : Math.round(selectedParkingRate * selectedParkingDays * 100) / 100;

  if (bills.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No final bills"
        description={statusFilter !== 'ALL' ? 'No final bills with the selected filters.' : 'Final bills are generated from approved estimates.'}
      />
    );
  }

  const renderActions = (bill: any) => {
    const loading = actionLoading || configLoading;

    switch (bill.status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleOpenPark(bill)}
              disabled={loading}
              className="h-8 rounded-md border-amber-500 px-2.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
            >
              <CircleParking className="mr-1.5 h-3.5 w-3.5" />
              Park
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onMakeOfficial(bill.id)}
              disabled={loading}
              className="h-8 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        );
      case 'PARKED':
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleOpenStopParking(bill)}
              disabled={loading}
              className="h-8 rounded-md border-amber-500 px-2.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
            >
              <CircleParking className="mr-1.5 h-3.5 w-3.5" />
              Stop Parking
            </Button>
          </div>
        );
      case 'OFFICIAL':
        return (
          <Button
            type="button"
            size="sm"
            onClick={() => onPay(bill)}
            className="h-8 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <DollarSign className="mr-1.5 h-3.5 w-3.5" />
            Pay
          </Button>
        );
      case 'PAID':
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onViewReceipt(bill.id)}
            disabled={loading}
            className="h-8 rounded-md border-green-600/30 px-2.5 text-xs font-medium text-green-700 hover:bg-green-50"
          >
            <ReceiptText className="mr-1.5 h-3.5 w-3.5" />
            View Receipt
          </Button>
        );
      default:
        return null;
    }
  };

  const renderParkingSummary = (bill: any) => {
    if (bill.status !== 'PARKED') return <span className="text-muted-foreground">—</span>;
    const days = getBillableDays(bill.parkedAt);
    const fee = bill.parkingFeeEnabled === false ? 0 : getLiveParkingFee(bill);
    return (
      <div className="flex flex-col items-start gap-0.5 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
          <Clock3 className="h-3.5 w-3.5" />
          {days} day{days === 1 ? '' : 's'}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {bill.parkingFeeEnabled === false ? 'No parking fee' : `₱${fee.toFixed(2)} estimated`}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {bills.map((bill: any) => {
            const styles = getStatusStyles(bill.status);
            return (
              <Card key={bill.id} className={`overflow-hidden rounded-xl border bg-card shadow-sm ${styles.row}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">Final Bill</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">#{String(bill.id).slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${styles.wrapper} ${styles.pulse}`}>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
                      {styles.label}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Created</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{safeDate(bill.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                      <p className="mt-1 text-lg font-semibold text-primary">₱{formatCurrency(bill.grandTotal)}</p>
                    </div>
                  </div>
                  <div className="mt-3">{renderParkingSummary(bill)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {renderActions(bill)}
                    <Button type="button" size="sm" variant="outline" onClick={() => onOpenDetail(bill, 'final-bill')} className="h-11 rounded-md px-3 md:h-8">
                      <Eye className="mr-1.5 h-4 w-4" />
                      View
                    </Button>
                    {bill.status !== 'PAID' && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(bill.id)} className="h-11 rounded-md px-3 text-destructive hover:bg-destructive/10 md:h-8">
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="hidden md:block">
          <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3">Bill</TableHead>
                    <TableHead className="px-4 py-3">Created</TableHead>
                    <TableHead className="px-4 py-3">Customer</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right">Total</TableHead>
                    <TableHead className="px-4 py-3">Parking</TableHead>
                    <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill: any) => {
                    const styles = getStatusStyles(bill.status);
                    return (
                    <TableRow key={bill.id} className={`${styles.row} transition-colors`}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-foreground">{String(bill.id).slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">Final billing record</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{safeDate(bill.createdAt)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-foreground">{getCustomerName(bill)}</p>
                        {bill?.appointment?.trackingNumber && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{bill.appointment.trackingNumber}</p>}
                      </TableCell>
                      <TableCell className="px-4 py-3"><div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${styles.wrapper} ${styles.pulse}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />{styles.label}</div></TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold text-primary">₱{formatCurrency(bill.grandTotal)}</TableCell>
                      <TableCell className="px-4 py-3">{renderParkingSummary(bill)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {renderActions(bill)}
                          <Button type="button" size="icon" variant="ghost" aria-label={`View bill ${bill.id}`} onClick={() => onOpenDetail(bill, 'final-bill')} className="h-8 w-8 rounded-md">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-1 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Showing <span className="font-medium text-foreground">{bills.length}</span> final bill{bills.length === 1 ? '' : 's'}</span>
              <span>Pending → Parked → Pending → Official → Paid</span>
            </div>
          </Card>
        </div>
      </div>

      <ParkVehicleConfirmationModal
        open={parkModalOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedBill(null);
          setParkModalOpen(open);
        }}
        parkingFeePerDay={parkingFeePerDay}
        onConfirm={handleParkConfirm}
        loading={actionLoading || configLoading}
      />

      <StopParkingConfirmationModal
        open={stopParkingModalOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedBill(null);
          setStopParkingModalOpen(open);
        }}
        parkingFee={selectedParkingFee}
        billableDays={selectedParkingDays}
        rate={selectedParkingRate}
        parkedAt={selectedBill?.parkedAt}
        onConfirm={handleStopParkingConfirm}
        loading={actionLoading}
      />
    </>
  );
}
