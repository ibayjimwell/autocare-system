'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { FinalBill } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { Banknote, CheckCircle2, ChevronDown, ChevronUp, CircleParking, Clock3, DollarSign, Eye, CreditCard, ReceiptText, Send, Trash2 } from 'lucide-react';
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

const PRIORITY: Record<string, number> = { OFFICIAL: 0, PENDING: 1, PARKED: 2, PAID: 3 };

function statusStyle(status: string) {
  switch (status) {
    case 'OFFICIAL': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'PENDING': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'PARKED': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function customerName(bill: any) {
  const customer = bill?.appointment?.customer ?? bill?.customer;
  return customer?.fullname ?? customer?.fullName ?? customer?.name ?? bill?.customerName ?? 'Customer';
}
function dateText(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM dd, yyyy');
}
function parkingDays(value: unknown) {
  if (!value) return 1;
  const startedAt = new Date(String(value));
  if (Number.isNaN(startedAt.getTime())) return 1;
  return Math.max(1, Math.ceil(Math.max(0, Date.now() - startedAt.getTime()) / 86400000));
}

export default function FinalBillsList({
  bills, statusFilter, onPay, onViewReceipt, onOpenDetail, onDelete,
  onPark, onMakeOfficial, onStopParking, actionLoading,
}: FinalBillsListProps) {

  const [paidExpanded, setPaidExpanded] = useState(false);
  const [parkOpen, setParkOpen] = useState(false);
  const [stopParkOpen, setStopParkOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<FinalBill | null>(null);
  const [parkingFeePerDay, setParkingFeePerDay] = useState(0);
  const [configLoading, setConfigLoading] = useState(false);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (statusFilter === 'PAID') setPaidExpanded(true);
  }, [statusFilter]);

  // Status grouping applies regardless of secondary table sort preferences.
  const { outstanding, paid } = useMemo(() => {
    const ordered = [...bills].sort((a, b) => {
      const left = PRIORITY[String(a.status).toUpperCase()] ?? 99;
      const right = PRIORITY[String(b.status).toUpperCase()] ?? 99;
      return left - right;
    });
    return {
      outstanding: ordered.filter(b => String(b.status).toUpperCase() !== 'PAID'),
      paid: ordered.filter(b => String(b.status).toUpperCase() === 'PAID'),
    };
  }, [bills]);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await paymentsConfigurationApi.get();
      if (!response.error) setParkingFeePerDay(Number(response.data?.parkingFeePerDay || 0));
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const doPark = async (feeEnabled: boolean) => {
    if (!selectedBill) return;
    if (await onPark(selectedBill.id, feeEnabled)) {
      setParkOpen(false); setSelectedBill(null);
    }
  };
  const doStopPark = async () => {
    if (!selectedBill) return;
    if (await onStopParking(selectedBill.id)) {
      setStopParkOpen(false); setSelectedBill(null);
    }
  };

  const [paypalStarting, setPaypalStarting] = useState(false);
  const openPaypal = async (bill: FinalBill) => {
    setPaypalStarting(true);
    try {
      const response = await fetch(`/api/payments/final-bills/${encodeURIComponent(bill.id)}/paypal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: '{}',
      });
      const json = await response.json();
      if (!response.ok || json.error || !json.data?.checkoutUrl) {
        throw new Error(json.errorMessage || 'Unable to open PayPal checkout.');
      }
      const target = new URL(json.data.checkoutUrl);
      if (target.origin !== window.location.origin || !target.pathname.startsWith('/paypal/checkout/')) {
        throw new Error('Unexpected PayPal checkout destination.');
      }
      window.location.assign(target.href);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to open PayPal checkout.');
    } finally { setPaypalStarting(false); }
  };
  const actions = (bill: FinalBill) => {
    const busy = actionLoading || configLoading;
    const status = String(bill.status).toUpperCase();
    if (status === 'OFFICIAL') {
      return <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || paypalStarting} onClick={() => void openPaypal(bill)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <CreditCard className="mr-1.5 h-4 w-4" /> PayPal Sandbox
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onPay(bill)}>
          <Banknote className="mr-1.5 h-4 w-4" /> Cash
        </Button>
      </div>;
    }
    if (status === 'PENDING') return <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setSelectedBill(bill); void loadConfig(); setParkOpen(true); }}>
        <CircleParking className="mr-1.5 h-4 w-4" /> Park
      </Button>
      <Button type="button" size="sm" disabled={busy} onClick={() => onMakeOfficial(bill.id)} className="bg-emerald-600 text-white hover:bg-emerald-700">
        <Send className="mr-1.5 h-4 w-4" /> Make Official
      </Button>
    </div>;
    if (status === 'PARKED') return <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setSelectedBill(bill); setStopParkOpen(true); }}>
      <CircleParking className="mr-1.5 h-4 w-4" /> Stop Parking
    </Button>;
    if (status === 'PAID') return <Button type="button" variant="outline" size="sm" onClick={() => onViewReceipt(bill.id)} disabled={busy}>
      <ReceiptText className="mr-1.5 h-4 w-4" /> Receipt
    </Button>;
    return null;
  };

  const parking = (bill: FinalBill) => {
    if (bill.status !== 'PARKED') return <span className="text-muted-foreground">—</span>;
    void clockTick; // refreshes the elapsed-days calculation every 30 seconds
    const days = parkingDays(bill.parkedAt);
    const fee = bill.parkingFeeEnabled === false ? 0 : days * Number(bill.parkingFeeRate || 0);
    return <div className="flex items-center gap-2 text-xs text-amber-700">
      <Clock3 className="h-4 w-4" />{days} day{days !== 1 ? 's' : ''} · ₱{formatCurrency(fee)}
    </div>;
  };

  const renderRows = (records: FinalBill[]) => (
    <>
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {records.map(bill => <Card key={bill.id} className="border-border bg-card shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold text-foreground">{customerName(bill)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{bill.appointment?.trackingNumber || String(bill.id).slice(0, 8).toUpperCase()}</p></div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(bill.status)}`}>{bill.status}</span>
            </div>
            <div className="flex items-end justify-between gap-2 rounded-xl bg-muted/30 p-3">
              <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium">{dateText(bill.createdAt)}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Final Cost</p><p className="text-xl font-bold text-primary">₱{formatCurrency(bill.grandTotal)}</p></div>
            </div>
            {parking(bill)}
            <div className="flex flex-wrap items-center gap-2">{actions(bill)}
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenDetail(bill, 'final-bill')}>
                <Eye className="mr-1 h-4 w-4" /> Details
              </Button>
              {bill.status !== 'PAID' && <Button type="button" size="sm" variant="ghost" disabled={actionLoading} onClick={() => onDelete(bill.id)} className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>}
            </div>
          </CardContent>
        </Card>)}
      </div>
      <Card className="hidden overflow-hidden rounded-xl border border-border shadow-sm md:block">
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Final Cost</TableHead><TableHead>Created</TableHead><TableHead>Customer / Tracking</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Parking</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{records.map(bill => <TableRow key={bill.id} className={bill.status === 'OFFICIAL' ? 'bg-blue-50/50' : ''}>
            <TableCell className="font-mono text-xs font-medium">{String(bill.id).slice(0, 8).toUpperCase()}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{dateText(bill.createdAt)}</TableCell>
            <TableCell><p className="font-medium">{customerName(bill)}</p><p className="mt-1 text-xs text-muted-foreground">{bill.appointment?.trackingNumber || 'No tracking number'}</p></TableCell>
            <TableCell><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(bill.status)}`}>{bill.status}</span></TableCell>
            <TableCell className="text-right font-semibold">₱{formatCurrency(bill.grandTotal)}</TableCell>
            <TableCell>{parking(bill)}</TableCell>
            <TableCell><div className="flex items-center justify-end gap-2">{actions(bill)}
              <Button type="button" size="icon" variant="ghost" aria-label={`View Final Cost ${bill.id}`} onClick={() => onOpenDetail(bill, 'final-bill')}><Eye className="h-4 w-4" /></Button>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table></div>
      </Card>
    </>
  );

  if (!bills.length) return <EmptyState icon={DollarSign} title="No Final Costs" description={statusFilter === 'ALL' ? 'Final Costs will appear when estimates are approved.' : 'No Final Costs match these filters.'} />;

  const selectedParkingDays = parkingDays(selectedBill?.parkedAt);
  const selectedParkingFee = selectedBill?.parkingFeeEnabled === false ? 0 : selectedParkingDays * Number(selectedBill?.parkingFeeRate || 0);

  return <div className="space-y-5">
    <section aria-label="Outstanding Final Costs" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-foreground">Final Costs to manage</h2>
          <p className="text-sm text-muted-foreground">Official bills are always first, followed by Pending and Parked.</p></div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{outstanding.length} unpaid</span>
      </div>
      {outstanding.length ? renderRows(outstanding) : <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">There are no unpaid Final Costs matching this filter.</div>}
    </section>

    {paid.length > 0 && <section aria-label="Paid Final Costs" className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" aria-expanded={paidExpanded} onClick={() => setPaidExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 sm:p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
          <div><h2 className="font-semibold text-foreground">Paid Final Costs</h2><p className="text-xs text-muted-foreground">{paid.length} completed payment{paid.length === 1 ? '' : 's'} · Hidden from your active work queue</p></div>
        </div>
        {paidExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      {paidExpanded && <div className="border-t border-border p-3 sm:p-4">{renderRows(paid)}</div>}
    </section>}

    <ParkVehicleConfirmationModal open={parkOpen} onOpenChange={open => { setParkOpen(open); if (!open) setSelectedBill(null); }}
      parkingFeePerDay={parkingFeePerDay} onConfirm={doPark} loading={actionLoading || configLoading} />
    <StopParkingConfirmationModal open={stopParkOpen} onOpenChange={open => { setStopParkOpen(open); if (!open) setSelectedBill(null); }}
      parkingFee={selectedParkingFee} billableDays={selectedParkingDays}
      rate={Number(selectedBill?.parkingFeeRate || 0)} parkedAt={selectedBill?.parkedAt}
      onConfirm={doStopPark} loading={actionLoading} />
  </div>;
}
