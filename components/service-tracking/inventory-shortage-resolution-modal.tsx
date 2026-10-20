'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, Loader2, PackageSearch, RefreshCw, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { inventoryShortagesApi, type InventoryShortageReport, type ExternalPurchasePart } from '@/lib/service-tracking/inventory-shortages';

interface Props {
  open: boolean;
  appointmentId: string;
  trackingNumber?: string;
  initialReport?: InventoryShortageReport | null;
  onOpenChange: (open: boolean) => void;
  onContinueToBilling: () => Promise<void>;
  onFindingsChanged: () => Promise<void> | void;
}

const money = (value: number | string) => `₱${(Number(value) || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export default function InventoryShortageResolutionModal({
  open,
  appointmentId,
  trackingNumber,
  initialReport,
  onOpenChange,
  onContinueToBilling,
  onFindingsChanged,
}: Props) {
  const [report, setReport] = useState<InventoryShortageReport | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const result = await inventoryShortagesApi.check(appointmentId);
      setReport(result.data);
      setSelected(current => {
        const allowed = new Set(result.data.shortages.flatMap(group => group.parts.map(part => part.findingPartId)));
        return new Set([...current].filter(id => allowed.has(id)));
      });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to check inventory.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!open) {
      setReport(null);
      setSelected(new Set());
      return;
    }
    setReport(initialReport ?? null);
    void reload();
  }, [open, appointmentId, reload, initialReport]);

  const allPartIds = useMemo(() => report?.shortages.flatMap(group => group.parts.map(part => part.findingPartId)) || [], [report]);
  const busy = loading || saving || Boolean(statusSaving);
  const toggle = (id: string, checked: boolean) => setSelected(current => {
    const next = new Set(current);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  });

  const sourceExternally = async () => {
    if (selected.size === 0 || busy) return;
    setSaving(true);
    try {
      const result = await inventoryShortagesApi.markExternal(appointmentId, [...selected]);
      toast.success(`${result.data.updated} part(s) listed for purchase from another shop.`);
      setSelected(new Set());
      await Promise.resolve(onFindingsChanged());
      await reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not mark parts for external purchase.');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (part: ExternalPurchasePart, status: ExternalPurchasePart['status']) => {
    if (busy || status === part.status) return;
    setStatusSaving(part.findingPartId);
    try {
      await inventoryShortagesApi.setExternalStatus(appointmentId, part.findingPartId, status);
      await reload();
      await Promise.resolve(onFindingsChanged());
      toast.success(`${part.partName}: ${status.toLowerCase()}.`);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update purchase status.');
    } finally {
      setStatusSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="flex !w-[calc(100vw-1rem)] !max-w-[1050px] max-h-[92dvh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-2 border-b px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <DialogTitle>Resolve Inventory Shortages</DialogTitle>
          </div>
          <DialogDescription>
            {trackingNumber ? `Appointment #${trackingNumber}. ` : ''}
            Select parts to purchase externally. Only this appointment's parts will be unlinked from local inventory;
            names, quantities, PMS flags and saved prices remain intact.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {report?.shortages.length || 0} shortage(s) across this appointment
            </div>
            <Button type="button" size="sm" variant="outline" className="gap-2" disabled={busy} onClick={() => void reload()}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recheck Stock
            </Button>
          </div>

          {loading && !report ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Checking availability...
            </div>
          ) : report?.shortages.length ? (
            <div className="space-y-3">
              {report.shortages.map(group => (
                <div key={group.inventoryItemId} className="overflow-hidden rounded-xl border">
                  <div className="bg-amber-50/70 px-4 py-3 dark:bg-amber-950/20">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{group.itemName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Available: {group.available} {group.unit} · Required: {group.requested} {group.unit}
                        </p>
                      </div>
                      <Badge variant="destructive">Short {group.shortage} {group.unit}</Badge>
                    </div>
                  </div>
                  <div className="divide-y">
                    {group.parts.map(part => (
                      <label key={part.findingPartId} className="flex cursor-pointer items-start gap-3 p-4 hover:bg-muted/40">
                        <Checkbox
                          className="mt-0.5"
                          checked={selected.has(part.findingPartId)}
                          disabled={busy}
                          onCheckedChange={checked => toggle(part.findingPartId, checked === true)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{part.partName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Finding: {part.findingDescription}</p>
                          <p className="mt-1 text-xs">{part.quantity} × {part.isPms ? 'PMS-included' : money(part.priceAtTime)}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setSelected(new Set(allPartIds))}>Select All Listed</Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setSelected(new Set())}>Clear Selection</Button>
              </div>
              <Button type="button" disabled={busy || selected.size === 0} className="w-full gap-2 sm:w-auto" onClick={() => void sourceExternally()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBasket className="h-4 w-4" />}
                Purchase {selected.size} Part{selected.size === 1 ? '' : 's'} Externally
              </Button>
              <p className="text-xs text-muted-foreground">
                Alternatively, physically restock the missing items in Inventory Management, then select Recheck Stock.
                Partial shortages may require choosing multiple finding parts.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border bg-green-50/40 p-4 dark:bg-green-950/20">
              <Check className="mt-0.5 h-5 w-5 text-green-700" />
              <div>
                <p className="font-semibold">No unresolved local inventory shortages</p>
                <p className="mt-1 text-sm text-muted-foreground">You may continue with billing. External purchases remain listed and priced separately from local stock reservations.</p>
              </div>
            </div>
          )}

          {Boolean(report?.externalParts.length) && (
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2"><PackageSearch className="h-4 w-4" /><h3 className="font-semibold">External Purchase List ({report!.externalParts.length})</h3></div>
              {report!.externalParts.map(part => (
                <div key={part.findingPartId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{part.partName} · {part.quantity} required</p>
                    <p className="text-xs text-muted-foreground">{part.findingDescription} · {part.isPms ? 'PMS included' : money(part.priceAtTime) + ' each (finding price snapshot)'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(['PENDING', 'PURCHASED', 'RECEIVED'] as const).map(status => (
                      <Button key={status} type="button" size="sm" variant={part.status === status ? 'default' : 'outline'}
                        disabled={busy} onClick={() => void updateStatus(part, status)} className="h-8 text-xs">
                        {status === 'PENDING' ? 'Pending' : status === 'PURCHASED' ? 'Purchased' : 'Received'}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" disabled={busy || !report || report.shortages.length > 0 || report.appointmentStatus !== 'UNDER_INSPECTION'}
            onClick={() => { onOpenChange(false); void onContinueToBilling(); }}>
            Continue to Billing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
