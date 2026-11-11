'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, ShieldCheck, AlertTriangle, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type PendingTransfer = {
  id: string; finalBillId: string; trackingNumber: string; customerName: string;
  method: string; destinationAccount: string; referenceNumber: string;
  senderName: string | null; amount: string; currentBillAmount: string;
  billStatus: string; status: string; createdAt: string;
};
function formatAmount(value: string) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
async function parse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) throw new Error(json.errorMessage || 'Request failed.');
  return json;
}

export default function ManualTransferReview({ onSettled }: { onSettled?: () => Promise<unknown> | void }) {
  const [items, setItems] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmRef, setConfirmRef] = useState('');
  const [confirmAmount, setConfirmAmount] = useState('');
  const [fundsConfirmed, setFundsConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const load = useCallback(async () => {
    try {
      const payload = await parse(await fetch('/api/payments/manual-transfers', { cache: 'no-store' }));
      setItems(payload.data || []);
    } catch (error: any) { toast.error(error?.message || 'Unable to load transfers.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const interval = setInterval(() => { void load(); }, 30000);
    return () => clearInterval(interval);
  }, [load]);
  const selected = items.find(item => item.id === selectedId);
  const clear = () => {
    setSelectedId(null); setConfirmRef(''); setConfirmAmount(''); setFundsConfirmed(false); setReason('');
  };
  const review = async (item: PendingTransfer, action: 'APPROVE' | 'REJECT') => {
    if (workingId) return;
    if (action === 'REJECT' && reason.trim().length < 8) {
      toast.error('Explain the rejection in at least 8 characters.'); return;
    }
    if (action === 'APPROVE' && (!fundsConfirmed || confirmRef.trim().toUpperCase() !== item.referenceNumber ||
        Math.round(Number(confirmAmount) * 100) !== Math.round(Number(item.amount) * 100))) {
      toast.error('Independently verify the receiving account, then re-enter the matching reference and amount.'); return;
    }
    setWorkingId(item.id);
    try {
      const payload = await parse(await fetch(`/api/payments/manual-transfers/${encodeURIComponent(item.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: reason.trim(), confirmedReference: confirmRef.trim(),
          confirmedAmount: confirmAmount, fundsConfirmed }),
      }));
      toast.success(payload.message || 'Transfer review saved.'); clear();
      await load();
      if (action === 'APPROVE') await onSettled?.();
    } catch (error: any) { toast.error(error?.message || 'Review failed. Verify before retrying.'); }
    finally { setWorkingId(null); }
  };
  return (
    <Card className="mb-5 border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Electronic transfers for cashier verification</h2>
              <p className="text-xs text-muted-foreground">Reference submission alone does not prove payment. Verify actual funds in the recipient account.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || !!workingId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading submitted transfers…</p> : items.length === 0 ?
          <p className="text-sm text-muted-foreground py-3">No transfers awaiting cashier review.</p> :
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="rounded-lg border border-border p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="font-semibold text-sm">{item.trackingNumber} · {item.customerName}</div>
                  <div className="text-sm font-semibold">{formatAmount(item.amount)}</div>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-sm">
                  <p><strong>Received via:</strong> {item.method} — {item.destinationAccount}</p>
                  <p><strong>Customer-entered ref:</strong> {item.referenceNumber}</p>
                  <p><strong>Sender:</strong> {item.senderName || 'Not provided'}</p>
                  <p><strong>Submitted:</strong> {new Date(item.createdAt).toLocaleString('en-PH')}</p>
                  <p><strong>Bill:</strong> {item.billStatus} · {formatAmount(item.currentBillAmount)}</p>
                  <p><strong>Review:</strong> {item.status}</p>
                </div>
                {selectedId !== item.id && <Button variant="outline" size="sm" onClick={() => { clear(); setSelectedId(item.id); }}>
                  Review transfer
                </Button>}
                {selected?.id === item.id && <div className="border-t border-border pt-3 space-y-3">
                  <div className="rounded-lg bg-amber-50 text-amber-950 p-3 text-sm flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    Open the business GCash/Maya/bank account yourself. Check that the money ACTUALLY arrived, the receiving account,
                    amount, date and reference match. Do not approve from a screenshot or SMS alone.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm space-y-1 block">Reference confirmed in receiving account
                      <input className="w-full h-10 rounded-md border border-input bg-background px-3" value={confirmRef}
                        onChange={e => setConfirmRef(e.target.value)} placeholder="Re-type actual bank reference" autoComplete="off" />
                    </label>
                    <label className="text-sm space-y-1 block">Amount received (PHP)
                      <input className="w-full h-10 rounded-md border border-input bg-background px-3" value={confirmAmount}
                        onChange={e => setConfirmAmount(e.target.value)} inputMode="decimal" placeholder="0.00" autoComplete="off" />
                    </label>
                  </div>
                  <label className="flex gap-2 items-start text-sm cursor-pointer">
                    <input type="checkbox" checked={fundsConfirmed} onChange={e => setFundsConfirmed(e.target.checked)} className="mt-1" />
                    I personally confirmed cleared/received funds in AutoCare’s destination account, not merely a customer claim.
                  </label>
                  <label className="block text-sm space-y-1">Review note / reason if rejected
                    <textarea className="block w-full rounded-md border border-input bg-background p-2 min-h-16" value={reason}
                      onChange={e => setReason(e.target.value)} maxLength={500} placeholder="Reason required when rejecting" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void review(item, 'APPROVE')} disabled={!!workingId || !(item.status === 'PENDING_REVIEW' || item.status === 'VERIFYING') || (item.billStatus !== 'OFFICIAL' && item.billStatus !== 'PAID')}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> {item.status === 'VERIFYING' ? 'Reconcile settled receipt' : 'Confirm received & issue receipt'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void review(item, 'REJECT')}
                      disabled={!!workingId || item.status !== 'PENDING_REVIEW'}>Reject / not received</Button>
                    <Button size="sm" variant="outline" onClick={clear} disabled={!!workingId}>Cancel</Button>
                  </div>
                  {item.status === 'VERIFYING' && <p className="text-xs text-amber-700">An earlier settlement was interrupted. Reconcile the final bill and receipt before further action.</p>}
                </div>}
              </div>
            ))}
          </div>}
      </CardContent>
    </Card>
  );
}
