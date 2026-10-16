'use client';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DIAGNOSTIC_SECTIONS } from '@/lib/diagnostic-checklist/catalog';
import type { DiagnosticStatus } from '@/lib/diagnostic-checklist/catalog';

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, c => entities[c] || c);
}

interface Props {
  appointment: any;
  statuses: Map<string, DiagnosticStatus>;
  remarks: string;
  dentsNotes: string;
  disabled?: boolean;
  engineType?: string | null;
  transmissionType?: string | null;
  timeOut?: string | null;
  dentsMarks?: Array<{ x: number; y: number }>;
}
const names: DiagnosticStatus[] = ['GOOD', 'WARNING', 'REPLACE'];
export default function DiagnosticChecklistPrintButton({ appointment, statuses, remarks, dentsNotes, disabled, engineType, transmissionType, timeOut, dentsMarks = [] }: Props) {
  const handlePrint = () => {
    const popup = window.open('', '_blank', 'width=1040,height=860');
    if (!popup) { window.alert('Allow pop-ups for AutoCare to print the checklist.'); return; }
    const statusFor = (key: string, status: DiagnosticStatus) => statuses.get(key) === status ? '&#10003;' : '';
    const sectionHtml = (column: 'left' | 'right') => DIAGNOSTIC_SECTIONS.filter(section => section.column === column)
      .map(section => `<tbody><tr class="section"><td colspan="4">${escapeHtml(section.title)}</td></tr>${section.items.map(([key,label]) => `
      <tr><td class="item">${escapeHtml(label)}</td>${names.map(name => `<td class="choice ${name.toLowerCase()}">${statusFor(key,name)}</td>`).join('')}</tr>`).join('')}</tbody>`).join('');
    const table = (side: 'left' | 'right') => `<table><colgroup><col><col style="width:13%"><col style="width:13%"><col style="width:13%"></colgroup>
      <thead><tr><th class="item">CHECKLIST</th><th>Good</th><th>Warning</th><th>Replace</th></tr></thead>${sectionHtml(side)}</table>`;
    const car = `<svg viewBox="0 0 500 175" width="100%" aria-label="Top view of vehicle" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="#111" stroke-width="2.5"><rect x="110" y="30" width="280" height="105" rx="45"/>
      <path d="M185 30 L205 6 H294 L315 30 M185 135 L205 159 H294 L315 135"/>
      <path d="M205 33 L205 133 M295 33 L295 133 M205 55 L295 55 M205 112 L295 112"/>
      <rect x="85" y="37" width="25" height="38" rx="8"/><rect x="85" y="90" width="25" height="38" rx="8"/>
      <rect x="390" y="37" width="25" height="38" rx="8"/><rect x="390" y="90" width="25" height="38" rx="8"/>
      <path d="M120 48 L167 48 M120 115 L167 115 M333 48 L380 48 M333 115 L380 115"/></g>
      ${dentsMarks.map(mark => `<text x="${Math.round(mark.x)}" y="${Math.round(mark.y)}" fill="#c1272d" text-anchor="middle" font-weight="bold" font-size="24">×</text>`).join('')}</svg>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>AutoCare Diagnostic Checklist - ${escapeHtml(appointment.trackingNumber)}</title><style>
      @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#171717;margin:0;font-size:10px}
      header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #111;padding-bottom:9px;margin-bottom:8px}
      h1{margin:0;font-size:22px}small{font-size:10px;color:#555}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 14px;margin:8px 0 12px}
      .field{border-bottom:1px solid #777;padding:5px 1px;font-size:10px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
      table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #4c4c4c;padding:3px 4px;line-height:1.15}
      th{text-align:center;font-weight:bold;font-size:10px}th.item{text-align:left}td.item{text-align:left}
      tr.section td{background:#dedede;text-align:center;font-weight:800;font-size:11px;padding:5px}
      td.choice{text-align:center;font-weight:900;font-size:12px}.good{background:#78b88d}.warning{background:#ecd15b}.replace{background:#dc8580}
      .extra{margin-top:14px;page-break-inside:avoid}.extra h3{font-size:11px;margin:8px 0 5px;text-transform:uppercase}.notes{min-height:65px;border:1px solid #888;padding:6px;white-space:pre-wrap;font-size:11px}
      .car{max-width:480px;margin:auto}.car-caption{display:flex;justify-content:space-between;font-weight:bold;font-size:10px}
      @media print{.choice{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{break-inside:avoid}}
    </style></head><body><header><div><h1>AUTOCARE</h1><strong>VEHICLE DIAGNOSTIC CHECKLIST</strong></div><small>GOOD / WARNING / REPLACE</small></header>
    <div class="meta"><div class="field"><b>Tracking:</b> ${escapeHtml(appointment.trackingNumber)}</div><div class="field"><b>Date:</b> ${escapeHtml(appointment.appointmentDate)}</div>
    <div class="field"><b>Customer:</b> ${escapeHtml(appointment.customer?.fullname || '')}</div><div class="field"><b>Plate:</b> ${escapeHtml(appointment.vehicle?.plateNumber || '')}</div>
    <div class="field"><b>Vehicle:</b> ${escapeHtml([appointment.vehicle?.year,appointment.vehicle?.make,appointment.vehicle?.model].filter(Boolean).join(' '))}</div>
    <div class="field"><b>Engine:</b> ${escapeHtml(engineType || '—')} <b>Transmission:</b> ${escapeHtml(transmissionType || '—')} <b>Time out:</b> ${escapeHtml(timeOut || '—')}</div></div>
    <div class="columns"><div>${table('left')}</div><div>${table('right')}<div class="extra"><h3>Mark (X) in Dents</h3><div class="car-caption"><span>DRIVER SIDE</span><span>FRONT</span></div><div class="car">${car}</div><div class="car-caption"><span>PASSENGER SIDE</span></div>
    <div class="notes">${escapeHtml(dentsNotes)}</div><h3>Remarks</h3><div class="notes">${escapeHtml(remarks)}</div></div></div></div>
    <script>window.addEventListener('load',()=>{setTimeout(()=>{window.focus();window.print()},180)});<\/script></body></html>`;
    popup.document.open(); popup.document.write(html); popup.document.close();
  };
  return <Button type="button" variant="outline" disabled={disabled} onClick={handlePrint} className="h-10 gap-2"><Printer className="h-4 w-4"/>Print / Save PDF</Button>;
}
