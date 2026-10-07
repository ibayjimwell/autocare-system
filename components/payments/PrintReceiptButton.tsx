'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

function money(value: unknown) {
  const number = Number(value) || 0;
  return Math.abs(number).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => (
    {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    } as Record<string, string>
  )[character] || character);
}

function partTotal(part: any) {
  const explicit = Number(part?.totalPrice ?? part?.subtotal);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  return (Math.max(1, Number(part?.quantity) || 1) * Math.max(0, Number(part?.priceAtTime ?? part?.price) || 0));
}

export default function PrintReceiptButton({ receipt }: { receipt: any }) {
  const print = () => {
    if (!receipt) return;

    const details = receipt?.data ?? receipt?.details ?? receipt ?? {};
    const customer = details?.customer ?? {};
    const vehicle = details?.vehicle ?? {};
    const payment = details?.payment ?? {};
    const finalBill = details?.finalBill ?? {};
    const services = Array.isArray(details?.services) ? details.services : [];
    const findings = Array.isArray(details?.inspection?.findings)
      ? details.inspection.findings
      : Array.isArray(finalBill?.findings)
        ? finalBill.findings
        : [];
    const fees = Array.isArray(finalBill?.fees) ? finalBill.fees : [];
    const discounts = Array.isArray(finalBill?.discounts) ? finalBill.discounts : [];

    const total = Number(
      payment?.amount ??
      payment?.totalAmount ??
      finalBill?.grandTotal ??
      details?.grandTotal ??
      0,
    ) || 0;

    const referenceNumber =
      receipt?.referenceNumber ??
      details?.referenceNumber ??
      '—';

    const printedAt = new Date(
      receipt?.createdAt ??
      details?.createdAt ??
      payment?.paidAt ??
      Date.now(),
    );

    const serviceRows = services.map((service: any) => `
      <div class="line">
        <span>${escapeHtml(service?.name || service?.serviceName || 'Service')}</span>
        <b>₱${money(service?.basePrice ?? service?.price ?? 0)}</b>
      </div>
    `).join('');

    const findingRows = findings.map((finding: any) => {
      const parts = Array.isArray(finding?.parts) ? finding.parts : [];
      const partsHtml = parts.map((part: any) => `
        <div class="subline">
          <span>${escapeHtml(`${Math.max(1, Number(part?.quantity) || 1)} × ${part?.partName || part?.name || 'Part'}`)}</span>
          <b>₱${money(partTotal(part))}</b>
        </div>
      `).join('');

      return `
        <div class="finding-name">${escapeHtml(finding?.description || finding?.title || 'Finding')}</div>
        ${partsHtml}
      `;
    }).join('');

    const feeRows = fees.map((fee: any) => `
      <div class="line">
        <span>${escapeHtml(fee?.title || 'Fee')}</span>
        <b>₱${money(fee?.amount)}</b>
      </div>
    `).join('');

    const discountRows = discounts.map((discount: any) => {
      const amount = Math.abs(Number(discount?.amount ?? discount?.value) || 0);
      return `
        <div class="line discount">
          <span>${escapeHtml(discount?.title || 'Discount')}</span>
          <b>${amount > 0.004 ? `-₱${money(amount)}` : `₱${money(0)}`}</b>
        </div>
      `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=420,height=760');
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AutoCare Receipt ${escapeHtml(referenceNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { width: 74mm; margin: 0 auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 10.5px; line-height: 1.35; }
    .center { text-align: center; }
    .brand { font-size: 18px; font-weight: 900; letter-spacing: .8px; }
    .muted { font-size: 9px; }
    .rule { border-top: 1px dashed #000; margin: 6px 0; }
    .section-title { margin: 7px 0 3px; font-size: 10px; font-weight: 900; }
    .line, .subline { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: start; margin: 2px 0; }
    .line span, .subline span { min-width: 0; overflow-wrap: anywhere; }
    .line b, .subline b { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
    .subline { padding-left: 7px; font-size: 9.5px; }
    .finding-name { margin-top: 4px; font-weight: 700; overflow-wrap: anywhere; }
    .discount { font-weight: 700; }
    .total { font-size: 14px; font-weight: 900; }
    .thank-you { margin-top: 7px; font-weight: 700; }
    @media print { body { width: 74mm; } }
  </style>
</head>
<body>
  <div class="center brand">AUTOCARE</div>
  <div class="center muted">OFFICIAL PAYMENT RECEIPT</div>
  <div class="rule"></div>
  <div class="line"><span>Receipt</span><b>${escapeHtml(referenceNumber)}</b></div>
  <div class="line"><span>Date</span><b>${escapeHtml(printedAt.toLocaleDateString('en-PH'))}</b></div>
  <div class="line"><span>Time</span><b>${escapeHtml(printedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }))}</b></div>
  ${details?.appointment?.trackingNumber ? `<div class="line"><span>Tracking</span><b>${escapeHtml(details.appointment.trackingNumber)}</b></div>` : ''}

  <div class="rule"></div>
  <div><b>Customer</b><br/>${escapeHtml(customer?.fullname || customer?.name || 'Customer')}</div>
  <div style="height:4px"></div>
  <div><b>Vehicle</b><br/>${escapeHtml([vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle')}</div>
  ${vehicle?.plateNumber ? `<div class="line"><span>Plate</span><b>${escapeHtml(vehicle.plateNumber)}</b></div>` : ''}

  <div class="rule"></div>
  <div class="section-title">SERVICES</div>
  ${serviceRows || '<div class="muted">No service line items.</div>'}

  ${findingRows ? `<div class="rule"></div><div class="section-title">FINDINGS / PARTS</div>${findingRows}` : ''}
  ${feeRows ? `<div class="rule"></div><div class="section-title">FEES</div>${feeRows}` : ''}
  ${discountRows ? `<div class="rule"></div><div class="section-title">DISCOUNTS</div>${discountRows}` : ''}

  <div class="rule"></div>
  <div class="line total"><span>TOTAL PAID</span><b>₱${money(total)}</b></div>
  <div class="line"><span>Method</span><b>${escapeHtml(payment?.method || payment?.paymentMethod || '—')}</b></div>
  ${payment?.referenceNumber ? `<div class="line"><span>Payment Ref.</span><b>${escapeHtml(payment.referenceNumber)}</b></div>` : ''}

  <div class="rule"></div>
  <div class="center thank-you">Thank you for choosing AutoCare.</div>
  <div class="center muted">Keep this receipt for your records.</div>
  <script>
    window.addEventListener('load', () => {
      window.print();
      window.onafterprint = () => window.close();
    });
  </script>
</body>
</html>`);

    printWindow.document.close();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={print}
      disabled={!receipt}
    >
      <Printer className="mr-2 h-4 w-4" />
      Print 80mm Receipt
    </Button>
  );
}
