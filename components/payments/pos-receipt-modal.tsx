'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ReceiptText, X } from 'lucide-react';
import { toast } from 'sonner';

// This is an itemized POS transaction receipt / sales acknowledgment.
// It does NOT claim to be a BIR-registered VAT invoice. Configure and issue
// legally required invoices separately according to the shop's registration.
const SHOP_NAME = 'Auto Pro Tech';
const RECEIPT_CAPTION = 'POS sales receipt · cash transaction';

export interface PosReceiptItem {
  id?: string;
  name?: string;
  barcode?: string | null;
  quantity?: number | string;
  unit?: string;
  sellingPrice?: string | number;
  lineTotal?: string | number;
}

export interface PosReceiptTransaction {
  id: string;
  createdAt: string | Date;
  staffId?: string | null;
  items: PosReceiptItem[] | unknown;
  totalAmount: string | number;
  paymentReceived: string | number;
  changeGiven: string | number;
}

interface PosReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PosReceiptTransaction | null;
}

function amount(value: unknown): string {
  const numeric = Number(value);
  return (Number.isFinite(numeric) ? numeric : 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatReceiptDate(raw: unknown): string {
  const date = raw instanceof Date ? raw : new Date(String(raw || ''));
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return character;
    }
  });
}

function printableHtml(tx: PosReceiptTransaction): string {
  const items: PosReceiptItem[] = Array.isArray(tx.items) ? tx.items : [];
  const rows = items.map((item) => `
    <tr><td colspan="3" class="item">${escapeHtml(item.name || 'Inventory Item')}</td></tr>
    <tr>
      <td>${escapeHtml(item.quantity ?? 0)} × ₱${escapeHtml(amount(item.sellingPrice))}</td>
      <td>${escapeHtml(item.unit || '')}</td>
      <td class="right">₱${escapeHtml(amount(item.lineTotal))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>POS Receipt ${escapeHtml(tx.id)}</title>
<style>
@page { margin: 5mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0 auto; padding: 8px 2px; max-width: 76mm; font-size: 11px; }
h1 { font-size: 17px; margin: 0 0 4px; text-align: center; }
p { margin: 3px 0; } .center { text-align: center; }
.rule { border-top: 1px dashed #777; margin: 10px 0; }
.meta { font-size: 10px; overflow-wrap: anywhere; }
table { border-collapse: collapse; width: 100%; font-size: 11px; }
td { vertical-align: top; padding: 2px 0; }
.right { text-align: right; } .item { font-weight: 600; padding-top: 7px; overflow-wrap: anywhere; }
.total { font-size: 14px; font-weight: bold; }
.footer { margin-top: 14px; text-align: center; font-size: 10px; }
@media screen { body { border: 1px solid #ddd; margin-top: 20px; } }
</style></head><body>
<h1>${escapeHtml(SHOP_NAME)}</h1>
<p class="center">${escapeHtml(RECEIPT_CAPTION)}</p>
<div class="rule"></div>
<p class="meta"><strong>Transaction ID:</strong> ${escapeHtml(tx.id)}</p>
<p class="meta"><strong>Date:</strong> ${escapeHtml(formatReceiptDate(tx.createdAt))}</p>
<p class="meta"><strong>Method:</strong> CASH</p>
<div class="rule"></div>
<table><tbody>${rows}</tbody></table>
<div class="rule"></div>
<table><tbody>
<tr class="total"><td colspan="2">TOTAL</td><td class="right">₱${escapeHtml(amount(tx.totalAmount))}</td></tr>
<tr><td colspan="2">Cash received</td><td class="right">₱${escapeHtml(amount(tx.paymentReceived))}</td></tr>
<tr><td colspan="2">Change</td><td class="right">₱${escapeHtml(amount(tx.changeGiven))}</td></tr>
</tbody></table>
<div class="rule"></div>
<p class="footer">Thank you for your purchase.</p>
<p class="footer">This transaction slip is not a BIR-registered tax invoice. Request the shop's registered invoice when applicable.</p>
</body></html>`;
}

export default function PosReceiptModal({ open, onOpenChange, transaction }: PosReceiptModalProps) {
  const items = useMemo<PosReceiptItem[]>(
    () => Array.isArray(transaction?.items) ? transaction.items : [],
    [transaction],
  );

  const handlePrint = () => {
    if (!transaction?.id) return;
    const popup = window.open('', '_blank', 'width=450,height=800');
    if (!popup) {
      toast.error('Printing was blocked. Allow popups for AutoCare, then choose Print Receipt again.');
      return;
    }
    try {
      popup.document.open();
      popup.document.write(printableHtml(transaction));
      popup.document.close();
      popup.focus();
      popup.setTimeout(() => { if (!popup.closed) popup.print(); }, 250);
    } catch (error) {
      console.error('[PosReceiptModal] Print error:', error);
      toast.error('The receipt could not be printed. You can reopen it from POS History.');
    }
  };

  return (
    <Dialog open={open && Boolean(transaction)} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !max-h-[calc(100dvh-1rem)] !w-[calc(100vw-1rem)] !max-w-lg !min-w-0 !flex-col !overflow-hidden !rounded-2xl !p-0 sm:!max-h-[calc(100dvh-2rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ReceiptText className="h-5 w-5 text-primary" /> POS Receipt
          </DialogTitle>
          <DialogDescription>Saved sale record. You can print it now or reprint it later from POS History.</DialogDescription>
        </DialogHeader>

        {transaction && (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-sm rounded-lg border border-border bg-white px-4 py-5 font-mono text-xs text-black shadow-sm dark:text-black">
              <p className="text-center text-lg font-bold">{SHOP_NAME}</p>
              <p className="mt-1 text-center text-[11px]">{RECEIPT_CAPTION}</p>
              <div className="my-3 border-t border-dashed border-gray-400" />
              <p className="break-all leading-5"><strong>Transaction:</strong> {transaction.id}</p>
              <p className="mt-1"><strong>Date:</strong> {formatReceiptDate(transaction.createdAt)}</p>
              <p className="mt-1"><strong>Payment:</strong> CASH</p>
              <div className="my-3 border-t border-dashed border-gray-400" />
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={`${item.id || index}-${index}`}>
                    <p className="break-words font-semibold">{item.name || 'Inventory Item'}</p>
                    <div className="mt-1 flex justify-between gap-3">
                      <span>{item.quantity || 0} × ₱{amount(item.sellingPrice)} {item.unit || ''}</span>
                      <span className="shrink-0">₱{amount(item.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="my-3 border-t border-dashed border-gray-400" />
              <div className="space-y-2">
                <div className="flex justify-between gap-2 text-sm font-bold"><span>TOTAL</span><span>₱{amount(transaction.totalAmount)}</span></div>
                <div className="flex justify-between gap-2"><span>Cash received</span><span>₱{amount(transaction.paymentReceived)}</span></div>
                <div className="flex justify-between gap-2"><span>Change</span><span>₱{amount(transaction.changeGiven)}</span></div>
              </div>
              <div className="my-3 border-t border-dashed border-gray-400" />
              <p className="text-center">Thank you for your purchase.</p>
              <p className="mt-3 text-center text-[10px] leading-4 text-gray-600">Transaction slip only; not a BIR-registered tax invoice.</p>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          <Button type="button" disabled={!transaction} onClick={handlePrint} className="h-11 w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
