'use client';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { FinalBill } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { Banknote, ChevronDown, ChevronUp, DollarSign, Eye, ReceiptText } from 'lucide-react';
import ShareDocumentButton from './ShareDocumentButton';

interface FinalBillsListProps {
  bills: FinalBill[];
  statusFilter: string;
  onPay: (bill: FinalBill) => void;
  onViewReceipt: (billId: string) => void;
  onOpenDetail: (item: FinalBill, type: 'final-bill') => void;
  // Older page integrations can supply these props but Final Costs no longer expose changes.
  onDelete?: (id: string) => void;
  onPark?: (id: string, addParkingFee: boolean) => Promise<boolean> | boolean;
  onMakeOfficial?: (id: string) => void;
  onStopParking?: (id: string) => Promise<boolean> | boolean;
  actionLoading?: boolean;
}
const customerName = (b: any) => b?.appointment?.customer?.fullname || b?.customer?.fullname || 'Customer';
const dateText = (v: unknown) => { const d = new Date(String(v ?? '')); return isNaN(d.getTime()) ? '—' : format(d,'MMM dd, yyyy'); };
const badge = (s: string) => s === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700';

export default function FinalBillsList({ bills, statusFilter, onPay, onViewReceipt, onOpenDetail, actionLoading }: FinalBillsListProps) {
  const [paidExpanded,setPaidExpanded] = useState(false);
  useEffect(() => { if(statusFilter==='PAID') setPaidExpanded(true); },[statusFilter]);
  const { official, paid } = useMemo(() => {
    // Never present a draft Final Cost as collectible. Legacy records await reconciliation.
    const eligible = bills.filter(b => ['OFFICIAL','PAID'].includes(String(b.status).toUpperCase()));
    return { official: eligible.filter(b => b.status === 'OFFICIAL'), paid: eligible.filter(b => b.status === 'PAID') };
  },[bills]);
  const actions=(b:FinalBill) => b.status==='PAID'
    ? <Button type="button" variant="outline" size="sm" onClick={()=>onViewReceipt(b.id)}><ReceiptText className="mr-1.5 h-4 w-4"/>Receipt</Button>
    : <Button type="button" variant="outline" size="sm" disabled={actionLoading} onClick={()=>onPay(b)}><Banknote className="mr-1.5 h-4 w-4"/>Cash</Button>;
  const rows=(items:FinalBill[]) => <>
    <div className="grid grid-cols-1 gap-3 md:hidden">{items.map(b=><Card key={b.id} className="border-border bg-card shadow-sm"><CardContent className="space-y-4 p-4">
      <div className="flex items-start justify-between"><div><p className="font-semibold">{customerName(b)}</p><p className="text-xs text-muted-foreground">{b.appointment?.trackingNumber||b.id.slice(0,8).toUpperCase()}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge(b.status)}`}>{b.status}</span></div>
      <div className="rounded-xl bg-muted/30 p-3 flex justify-between"><div><p className="text-xs text-muted-foreground">Created</p>{dateText(b.createdAt)}</div><div className="text-right"><p className="text-xs text-muted-foreground">Final Cost</p><p className="text-xl font-bold text-primary">₱{formatCurrency(Number(b.grandTotal||0))}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">{actions(b)}<ShareDocumentButton kind="final-bill" documentId={b.id} compact/><Button size="sm" variant="outline" onClick={()=>onOpenDetail(b,'final-bill')}><Eye className="mr-1 h-4 w-4"/>Details</Button></div>
    </CardContent></Card>)}</div>
    <Card className="hidden overflow-hidden rounded-xl border border-border shadow-sm md:block"><div className="overflow-x-auto"><Table>
    <TableHeader><TableRow><TableHead>Final Cost</TableHead><TableHead>Created</TableHead><TableHead>Customer / Tracking</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
    <TableBody>{items.map(b=><TableRow key={b.id} className={b.status==='OFFICIAL'?'bg-blue-50/50':''}><TableCell className="font-mono text-xs font-medium">{b.id.slice(0,8).toUpperCase()}</TableCell><TableCell className="text-xs text-muted-foreground">{dateText(b.createdAt)}</TableCell><TableCell><p className="font-medium">{customerName(b)}</p><p className="text-xs text-muted-foreground">{b.appointment?.trackingNumber||'No tracking number'}</p></TableCell><TableCell><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badge(b.status)}`}>{b.status}</span></TableCell><TableCell className="text-right font-semibold">₱{formatCurrency(Number(b.grandTotal||0))}</TableCell><TableCell><div className="flex items-center justify-end gap-2">{actions(b)}<ShareDocumentButton kind="final-bill" documentId={b.id} compact/><Button size="sm" variant="outline" onClick={()=>onOpenDetail(b,'final-bill')}><Eye className="mr-1 h-4 w-4"/>Details</Button></div></TableCell></TableRow>)}</TableBody>
    </Table></div></Card>
  </>;
  if (!official.length && !paid.length) return <EmptyState icon={DollarSign} title="No Final Costs" description="Official Final Costs appear when repair work is completed. Approved estimates stay in Estimates."/>;
  return <div className="space-y-4">
    {official.length>0 ? <section className="space-y-2"><h3 className="text-sm font-semibold">Official Final Costs ({official.length})</h3>{rows(official)}</section> : null}
    {paid.length>0 ? <section className="space-y-2"><Button type="button" variant="outline" onClick={()=>setPaidExpanded(v=>!v)} aria-expanded={paidExpanded} className="w-full justify-between"><span>Paid Final Costs ({paid.length})</span>{paidExpanded?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</Button>{paidExpanded?rows(paid):null}</section> : null}
  </div>;
}
