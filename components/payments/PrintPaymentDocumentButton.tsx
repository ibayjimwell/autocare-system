'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';

import { appointmentsApi } from '@/lib/appointments/appointments';

interface PrintPaymentDocumentButtonProps {
  detailType: 'estimate' | 'final-bill';
  selectedItem: any;
}

/* ================================================================
   SAFE DISPLAY HELPERS
================================================================ */

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function currency(value: unknown): string {
  return toNumber(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '').trim(),
  );
}

/**
 * Database identifiers must never appear in the printed customer document.
 *
 * UUIDs are still allowed internally for API calls, but any UUID that reaches
 * the document renderer is treated as unavailable instead of being displayed.
 */
function safeDocumentValue(
  value: unknown,
  fallback = 'Not available',
): string {
  const text = String(value ?? '').trim();

  if (!text || isUuid(text)) {
    return fallback;
  }

  return text;
}

function safeDate(value: unknown): string {
  if (!value) return 'Not available';

  const raw = String(value).trim();

  /*
   * Appointment dates can arrive as YYYY-MM-DD. Treat those as local shop
   * dates instead of allowing browser timezone conversion to change the day.
   */
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function safeTime(value: unknown): string {
  if (!value) return 'Not available';

  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return safeDocumentValue(raw);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    hours < 0 ||
    hours > 23 ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59
  ) {
    return safeDocumentValue(raw);
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function unwrapAppointmentResponse(response: any): any | null {
  if (!response || response.error) {
    return null;
  }

  let value = response?.data ?? response;

  if (value?.appointment) {
    value = value.appointment;
  }

  if (value?.data && typeof value.data === 'object' && !Array.isArray(value.data)) {
    value = value.data;
  }

  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

/* ================================================================
   APPOINTMENT INFORMATION
================================================================ */

function normalizeServices(appointment: any): any[] {
  const rawServices = Array.isArray(appointment?.services)
    ? appointment.services
    : [];

  return rawServices
    .map((service: any) => {
      if (typeof service === 'string') {
        const value = service.trim();

        /* Never use a raw service UUID as customer-facing text. */
        if (!value || isUuid(value)) {
          return null;
        }

        return {
          name: value,
          description: '',
          basePrice: 0,
        };
      }

      if (!service || typeof service !== 'object') {
        return null;
      }

      const name =
        service?.name ??
        service?.title ??
        service?.serviceName ??
        '';

      /*
       * Do not fall back to service.id. The ID is intentionally excluded from
       * customer-facing print output.
       */
      const safeName = safeDocumentValue(name, 'Service');

      return {
        name: safeName,
        description: safeDocumentValue(
          service?.description,
          '',
        ),
        basePrice:
          service?.basePrice ??
          service?.price ??
          service?.defaultPrice ??
          0,
      };
    })
    .filter(Boolean);
}

function normalizeParts(finding: any): any[] {
  const raw = Array.isArray(finding?.parts)
    ? finding.parts
    : Array.isArray(finding?.products)
      ? finding.products
      : [];

  return raw.map((part: any, index: number) => {
    const quantity = Math.max(1, toNumber(part?.quantity) || 1);
    const price = Math.max(
      0,
      toNumber(part?.priceAtTime ?? part?.price ?? part?.unitPrice),
    );

    const explicitTotal = part?.totalPrice ?? part?.amount;
    const total =
      explicitTotal !== undefined &&
      explicitTotal !== null &&
      explicitTotal !== ''
        ? toNumber(explicitTotal)
        : quantity * price;

    return {
      ...part,
      displayKey: part?.id && !isUuid(String(part.id))
        ? String(part.id)
        : `part-${index}`,
      name: safeDocumentValue(
        part?.partName ?? part?.name ?? part?.productName,
        'Part',
      ),
      quantity,
      priceAtTime: price,
      totalPrice: total,
    };
  });
}

function normalizeFindings(selectedItem: any): any[] {
  const raw = Array.isArray(selectedItem?.findings)
    ? selectedItem.findings
    : [];

  return raw.map((finding: any, index: number) => {
    const parts = normalizeParts(finding);
    const calculated = parts.reduce(
      (sum: number, part: any) => sum + toNumber(part.totalPrice),
      0,
    );
    const explicit = toNumber(finding?.partsSubtotal);

    return {
      ...finding,
      displayKey: `finding-${index}`,
      description: safeDocumentValue(
        finding?.description ?? finding?.title,
        'Finding',
      ),
      included: finding?.included !== false,
      parts,
      partsSubtotal: explicit || calculated,
    };
  });
}

function findingSubtotal(finding: any): number {
  if (finding?.included === false) return 0;

  const explicit = toNumber(finding?.partsSubtotal);

  if (explicit > 0) {
    return explicit;
  }

  return normalizeParts(finding).reduce(
    (sum: number, part: any) => sum + toNumber(part.totalPrice),
    0,
  );
}

function normalizeTasks(
  selectedItem: any,
  detailType: 'estimate' | 'final-bill',
): any[] {
  const raw =
    detailType === 'estimate'
      ? Array.isArray(selectedItem?.tasks)
        ? selectedItem.tasks
        : []
      : Array.isArray(selectedItem?.workTasks)
        ? selectedItem.workTasks
        : [];

  return raw.map((task: any) => ({
    title: safeDocumentValue(
      task?.title ?? task?.name,
      'Task',
    ),
    durationMinutes: task?.durationMinutes ?? task?.duration,
  }));
}

/* ================================================================
   PRINT DOCUMENT HTML
================================================================ */

function buildPrintHtml({
  detailType,
  item,
  appointment,
}: {
  detailType: 'estimate' | 'final-bill';
  item: any;
  appointment: any;
}): string {
  const isEstimate = detailType === 'estimate';
  const documentTitle = isEstimate
    ? 'ESTIMATE COSTING'
    : 'FINAL COSTING';

  const customer = appointment?.customer ?? {};
  const vehicle = appointment?.vehicle ?? {};

  const findings = normalizeFindings(item);
  const tasks = normalizeTasks(item, detailType);
  const fees = Array.isArray(item?.fees) ? item.fees : [];
  const discounts = Array.isArray(item?.discounts) ? item.discounts : [];
  const services = normalizeServices(appointment);

  const serviceSubtotal = toNumber(item?.serviceSubtotal);

  const findingsSubtotal = findings.reduce(
    (sum, finding) => sum + findingSubtotal(finding),
    0,
  );

  const feesTotal = toNumber(item?.feesTotal);
  const discountTotal = toNumber(item?.discountTotal);

  const storedGrandTotal = toNumber(item?.grandTotal);
  const calculatedGrandTotal =
    serviceSubtotal +
    findingsSubtotal +
    feesTotal -
    discountTotal;

  const grandTotal =
    Number.isFinite(storedGrandTotal) && storedGrandTotal > 0
      ? storedGrandTotal
      : calculatedGrandTotal;

  const trackingNumber = safeDocumentValue(
    appointment?.trackingNumber ??
      item?.trackingNumber ??
      appointment?.trackingNo,
    'Not available',
  );

  const customerName = safeDocumentValue(
    customer?.fullname ??
      customer?.fullName ??
      item?.customerName,
    'Customer',
  );

  const customerEmail = safeDocumentValue(
    customer?.email ?? item?.customerEmail,
    '',
  );

  const customerPhone = safeDocumentValue(
    customer?.phone ?? item?.customerPhone,
    '',
  );

  const vehicleText = [
    vehicle?.year,
    vehicle?.make,
    vehicle?.model,
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== '',
    )
    .map((value) => safeDocumentValue(value, ''))
    .filter(Boolean)
    .join(' ');

  const plate = safeDocumentValue(
    vehicle?.plateNumber ?? vehicle?.plate,
    '',
  );

  const appointmentDate = safeDate(
    appointment?.appointmentDate ?? item?.appointmentDate,
  );

  const appointmentTime = safeTime(
    appointment?.appointmentTime ?? item?.appointmentTime,
  );

  const notes = safeDocumentValue(
    appointment?.notes ?? item?.notes,
    '',
  );

  const status = safeDocumentValue(
    item?.status ?? appointment?.status,
    'Not available',
  )
    .replace(/_/g, ' ')
    .toUpperCase();

  const servicesHtml = services.length
    ? services
        .map(
          (service: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="item-name">${escapeHtml(service?.name ?? 'Service')}</div>
          ${
            service?.description
              ? `<div class="subtext">${escapeHtml(service.description)}</div>`
              : ''
          }
        </td>
        <td class="money">₱${currency(service?.basePrice)}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="empty">No service details available.</td></tr>`;

  const findingsHtml = findings.length
    ? findings
        .map((finding: any, index: number) => {
          const included = finding?.included !== false;
          const subtotal = findingSubtotal(finding);
          const parts = normalizeParts(finding);

          const partsHtml = parts.length
            ? `<div class="parts-list">${parts
                .map(
                  (part: any) => `
              <div class="part-row">
                <span>
                  ${escapeHtml(part.name)}
                  ${
                    part?.isPms
                      ? ' <span class="tag">PMS</span>'
                      : ''
                  }
                </span>
                <span>
                  ${part.quantity} x ₱${currency(part.priceAtTime)}
                  = <strong>₱${currency(part.totalPrice)}</strong>
                </span>
              </div>`,
                )
                .join('')}</div>`
            : '<div class="subtext">No attached items.</div>';

          return `
          <div class="finding ${included ? '' : 'excluded'}">
            <div class="finding-head">
              <div>
                <div class="item-name">${index + 1}. ${escapeHtml(
                  finding.description,
                )}</div>
                ${
                  !included
                    ? '<div class="status-excluded">NOT SELECTED - EXCLUDED FROM TOTAL</div>'
                    : ''
                }
              </div>
              <div class="money">₱${currency(subtotal)}</div>
            </div>
            ${partsHtml}
            <div class="finding-subtotal">
              <span>Finding Subtotal</span>
              <strong>₱${currency(subtotal)}</strong>
            </div>
          </div>`;
        })
        .join('')
    : '<div class="empty-box">No findings recorded.</div>';

  const tasksHtml = tasks.length
    ? tasks
        .map(
          (task: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(task?.title ?? 'Task')}</td>
        <td class="right">
          ${
            task?.durationMinutes
              ? `${escapeHtml(task.durationMinutes)} min`
              : ''
          }
        </td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="empty">No ${
        isEstimate ? 'inspection' : 'completed work'
      } tasks recorded.</td></tr>`;

  const feesHtml = fees.length
    ? fees
        .map(
          (fee: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(
          safeDocumentValue(fee?.title, 'Fee'),
        )}</td>
        <td class="money">₱${currency(fee?.amount)}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="empty">No fees.</td></tr>`;

  const discountsHtml = discounts.length
    ? discounts
        .map(
          (discount: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          ${escapeHtml(
            safeDocumentValue(discount?.title, 'Discount'),
          )}
          ${
            discount?.type
              ? ` (${escapeHtml(String(discount.type))})`
              : ''
          }
        </td>
        <td class="money negative">
          - ₱${currency(
            Math.abs(toNumber(discount?.amount ?? discount?.value)),
          )}
        </td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="empty">No discounts.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AutoCare ${escapeHtml(documentTitle)}${
    trackingNumber !== 'Not available'
      ? ` - ${escapeHtml(trackingNumber)}`
      : ''
  }</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}
body { font-size: 11px; line-height: 1.45; }
.receipt { width: 100%; max-width: 780px; margin: 0 auto; }
.brand { border: 1px solid #ddd; border-top: 6px solid #C1272D; padding: 18px 18px 14px; }
.brand-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.brand-name { font-size: 23px; font-weight: 800; letter-spacing: 0.8px; color: #C1272D; }
.brand-sub { margin-top: 3px; font-size: 10px; color: #666; letter-spacing: 0.8px; text-transform: uppercase; }
.doc-title { text-align: right; font-size: 15px; font-weight: 800; letter-spacing: 0.8px; }
.doc-status { display: inline-block; margin-top: 5px; padding: 3px 8px; border: 1px solid #ddd; border-radius: 99px; font-size: 9px; font-weight: 700; color: #444; }
.meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-top: 14px; padding-top: 13px; border-top: 1px dashed #bbb; }
.meta-card { border: 1px solid #e2e2e2; border-radius: 6px; padding: 10px; background: #fafafa; }
.label { font-size: 8px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #777; }
.value { margin-top: 3px; font-size: 11px; font-weight: 600; }
.subtext { margin-top: 2px; font-size: 9px; color: #777; }
.section { margin-top: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
.section-title { padding: 9px 11px; background: #f7f7f7; border-bottom: 1px solid #ddd; font-size: 10px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 8px 10px; border-bottom: 1px solid #ececec; vertical-align: top; }
th { background: #fbfbfb; font-size: 8px; letter-spacing: 0.6px; text-transform: uppercase; color: #777; text-align: left; }
tbody tr:last-child td { border-bottom: 0; }
td:first-child { width: 36px; color: #777; }
.money { text-align: right; white-space: nowrap; font-weight: 700; }
.right { text-align: right; }
.negative { color: #C1272D; }
.item-name { font-weight: 700; }
.empty { text-align: center; color: #888; font-style: italic; padding: 14px; }
.finding { padding: 10px; border-bottom: 1px solid #e8e8e8; }
.finding:last-child { border-bottom: 0; }
.finding.excluded { background: #fafafa; }
.finding-head { display: flex; justify-content: space-between; gap: 12px; }
.status-excluded { display: inline-block; margin-top: 3px; color: #777; font-size: 8px; font-weight: 700; letter-spacing: 0.4px; }
.parts-list { margin-top: 7px; padding: 6px 8px; border-left: 2px solid #ddd; background: #fafafa; }
.part-row { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; font-size: 9px; }
.tag { display: inline-block; padding: 1px 4px; border: 1px solid #ddd; border-radius: 3px; font-size: 7px; color: #666; font-weight: 700; }
.finding-subtotal { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; padding-top: 7px; border-top: 1px dotted #bbb; font-size: 9px; }
.empty-box { padding: 14px; color: #888; text-align: center; font-style: italic; }
.summary { margin-top: 15px; border: 1px solid #cfcfcf; border-radius: 6px; overflow: hidden; }
.summary-row { display: flex; justify-content: space-between; gap: 20px; padding: 8px 11px; border-bottom: 1px solid #ececec; }
.summary-row:last-child { border-bottom: 0; }
.summary-row.total { padding: 13px 11px; background: #C1272D; color: #fff; font-size: 14px; font-weight: 800; }
.note { margin-top: 12px; padding: 9px 11px; border-left: 3px solid #C1272D; background: #fafafa; color: #555; }
.ack { margin-top: 22px; border-top: 1px dashed #aaa; padding-top: 14px; page-break-inside: avoid; }
.ack-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; }
.signature-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 40px; margin-top: 28px; }
.signature { min-height: 66px; }
.signature-name { min-height: 17px; font-size: 10px; font-weight: 700; }
.signature-line { border-top: 1px solid #222; margin-top: 12px; }
.signature-label { margin-top: 4px; font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
.footer { margin-top: 18px; padding-top: 9px; border-top: 1px dashed #bbb; text-align: center; font-size: 8px; color: #777; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .receipt { max-width: none; }
}
@media (max-width: 650px) {
  .meta, .signature-grid { grid-template-columns: 1fr; }
  .brand-row { flex-direction: column; }
  .doc-title { text-align: left; }
}
</style>
</head>
<body>
<div class="receipt">
  <header class="brand">
    <div class="brand-row">
      <div>
        <div class="brand-name">AUTOCARE SYSTEM</div>
        <div class="brand-sub">Vehicle Service &amp; Maintenance</div>
      </div>
      <div>
        <div class="doc-title">${escapeHtml(documentTitle)}</div>
        <div class="doc-status">STATUS: ${escapeHtml(status)}</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-card">
        <div class="label">Tracking Number</div>
        <div class="value">${escapeHtml(trackingNumber)}</div>
      </div>

      <div class="meta-card">
        <div class="label">Document Date</div>
        <div class="value">${escapeHtml(safeDate(item?.createdAt))}</div>
      </div>

      <div class="meta-card">
        <div class="label">Appointment Date</div>
        <div class="value">${escapeHtml(appointmentDate)}</div>
      </div>

      <div class="meta-card">
        <div class="label">Appointment Time</div>
        <div class="value">${escapeHtml(appointmentTime)}</div>
      </div>
    </div>
  </header>

  <section class="section">
    <div class="section-title">Customer &amp; Vehicle Information</div>
    <table>
      <tbody>
        <tr>
          <td>Customer</td>
          <td>
            <div class="item-name">${escapeHtml(customerName)}</div>
            ${
              customerEmail
                ? `<div class="subtext">${escapeHtml(customerEmail)}</div>`
                : ''
            }
            ${
              customerPhone
                ? `<div class="subtext">${escapeHtml(customerPhone)}</div>`
                : ''
            }
          </td>
        </tr>

        <tr>
          <td>Vehicle</td>
          <td>
            <div class="item-name">
              ${escapeHtml(vehicleText || 'Vehicle information not available')}
            </div>
            ${
              plate
                ? `<div class="subtext">Plate Number: ${escapeHtml(plate)}</div>`
                : ''
            }
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="section">
    <div class="section-title">Services</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Service</th>
          <th>Base Price</th>
        </tr>
      </thead>
      <tbody>${servicesHtml}</tbody>
    </table>
    <div class="summary-row">
      <strong>Service Subtotal</strong>
      <strong>₱${currency(serviceSubtotal)}</strong>
    </div>
  </section>

  <section class="section">
    <div class="section-title">Findings &amp; Attached Items</div>
    ${findingsHtml}
    <div class="summary-row">
      <strong>Findings Subtotal</strong>
      <strong>₱${currency(findingsSubtotal)}</strong>
    </div>
  </section>

  <section class="section">
    <div class="section-title">${
      isEstimate ? 'Inspection Tasks' : 'Completed Work Tasks'
    }</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Task</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>${tasksHtml}</tbody>
    </table>
  </section>

  <section class="section">
    <div class="section-title">Fees</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${feesHtml}</tbody>
    </table>
    <div class="summary-row">
      <strong>Fees Subtotal</strong>
      <strong>₱${currency(feesTotal)}</strong>
    </div>
  </section>

  <section class="section">
    <div class="section-title">Discounts</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${discountsHtml}</tbody>
    </table>
    <div class="summary-row">
      <strong>Discounts Subtotal</strong>
      <strong class="negative">- ₱${currency(discountTotal)}</strong>
    </div>
  </section>

  ${
    notes
      ? `<div class="note"><strong>Appointment Notes:</strong> ${escapeHtml(
          notes,
        )}</div>`
      : ''
  }

  <section class="summary">
    <div class="summary-row">
      <span>Service Subtotal</span>
      <strong>₱${currency(serviceSubtotal)}</strong>
    </div>
    <div class="summary-row">
      <span>Findings Subtotal</span>
      <strong>₱${currency(findingsSubtotal)}</strong>
    </div>
    <div class="summary-row">
      <span>Fees Subtotal</span>
      <strong>₱${currency(feesTotal)}</strong>
    </div>
    <div class="summary-row">
      <span>Discounts Subtotal</span>
      <strong class="negative">- ₱${currency(discountTotal)}</strong>
    </div>
    <div class="summary-row total">
      <span>GRAND TOTAL</span>
      <span>₱${currency(grandTotal)}</span>
    </div>
  </section>

  <section class="ack">
    <div class="ack-title">Customer Acknowledgment</div>
    <p>
      I acknowledge that this ${
        isEstimate ? 'Estimate Costing' : 'Final Costing'
      } has been presented to me and that I have reviewed the services,
      findings, charges, and total amount stated above.
    </p>

    <div class="signature-grid">
      <div class="signature">
        <div class="signature-name">${escapeHtml(customerName)}</div>
        <div class="signature-line"></div>
        <div class="signature-label">Customer Signature</div>
      </div>

      <div class="signature">
        <div class="signature-name">&nbsp;</div>
        <div class="signature-line"></div>
        <div class="signature-label">Date Signed</div>
      </div>
    </div>
  </section>

  <div class="footer">
    AutoCare System - Customer Copy - Please retain this document for your records.
  </div>
</div>
</body>
</html>`;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function PrintPaymentDocumentButton({
  detailType,
  selectedItem,
}: PrintPaymentDocumentButtonProps) {
  const [printing, setPrinting] = useState(false);

  const embeddedAppointment = selectedItem?.appointment ?? null;

  const initialServices = useMemo(
    () => normalizeServices(embeddedAppointment),
    [embeddedAppointment],
  );

  const handlePrint = useCallback(async () => {
    if (!selectedItem || typeof window === 'undefined') {
      return;
    }

    const printWindow = window.open(
      '',
      '_blank',
      'width=900,height=1200',
    );

    if (!printWindow) {
      window.alert(
        'The print window was blocked. Please allow pop-ups for AutoCare System and try again.',
      );
      return;
    }

    setPrinting(true);

    printWindow.document.open();
    printWindow.document.write(
      '<!DOCTYPE html><html><head><title>Preparing document...</title></head><body style="font-family:Arial,sans-serif;padding:24px">Preparing document...</body></html>',
    );
    printWindow.document.close();

    try {
      /*
       * The database UUID is used here only as an internal API locator.
       * It is never passed into the document renderer as customer-facing text.
       */
      const appointmentId =
        selectedItem?.appointmentId ??
        selectedItem?.appointment?.id;

      let appointment = embeddedAppointment;

      /*
       * Use the Appointments GET API as the source of appointment information.
       * This provides the customer-facing data we need:
       * tracking number, date/time, customer, vehicle, notes, and services.
       */
      if (appointmentId) {
        try {
          const response = await appointmentsApi.get(
            String(appointmentId),
          );

          const fetchedAppointment = unwrapAppointmentResponse(
            response,
          );

          if (fetchedAppointment) {
            appointment = {
              ...(embeddedAppointment || {}),
              ...fetchedAppointment,
              customer: {
                ...(embeddedAppointment?.customer || {}),
                ...(fetchedAppointment?.customer || {}),
              },
              vehicle: {
                ...(embeddedAppointment?.vehicle || {}),
                ...(fetchedAppointment?.vehicle || {}),
              },
              services:
                Array.isArray(fetchedAppointment?.services) &&
                fetchedAppointment.services.length > 0
                  ? fetchedAppointment.services
                  : embeddedAppointment?.services || [],
            };
          }
        } catch (error) {
          console.warn(
            '[PrintPaymentDocumentButton] Could not refresh appointment information:',
            error,
          );
        }
      }

      const services = normalizeServices(appointment);

      /*
       * Never expose an internal UUID in the printable document even when
       * appointment API loading fails and a partial record is being used.
       */
      const printableAppointment = {
        ...(appointment || {}),
        customer: appointment?.customer || {},
        vehicle: appointment?.vehicle || {},
        services:
          services.length > 0 ? services : initialServices,
      };

      const html = buildPrintHtml({
        detailType,
        item: selectedItem,
        appointment: printableAppointment,
      });

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      const printWhenReady = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } finally {
          window.setTimeout(() => {
            try {
              printWindow.close();
            } catch {
              // Ignore close failures.
            }
          }, 700);

          setPrinting(false);
        }
      };

      if (printWindow.document.readyState === 'complete') {
        window.setTimeout(printWhenReady, 100);
      } else {
        printWindow.addEventListener('load', printWhenReady, {
          once: true,
        });

        window.setTimeout(printWhenReady, 500);
      }
    } catch (error) {
      console.error(
        '[PrintPaymentDocumentButton] Failed to prepare printable document:',
        error,
      );

      setPrinting(false);

      try {
        printWindow.close();
      } catch {
        // Ignore close failures.
      }

      window.alert(
        'Unable to prepare the printable document. Please try again.',
      );
    }
  }, [detailType, embeddedAppointment, initialServices, selectedItem]);

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={printing}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      title="Print or save this document as PDF"
    >
      <Printer className="h-3.5 w-3.5" />
      {printing ? 'Preparing...' : 'Print / Save PDF'}
    </button>
  );
}
