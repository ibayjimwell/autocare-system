import {eq,inArray} from 'drizzle-orm';
import {Database} from '@/lib/drizzle';
import {Appointments} from '@/database/models/appointments/appointments.model';
import {Customers} from '@/database/models/customers/customers.model';
import {Vehicles} from '@/database/models/customers/vehicles.model';
import {Services} from '@/database/models/services/services.model';
import {EstimatedCosts} from '@/database/models/payments/estimated-costs.model';
import {EstimateFindings} from '@/database/models/payments/estimate-findings.model';
import {EstimateFindingParts} from '@/database/models/payments/estimate-finding-parts.model';
import {EstimateFees} from '@/database/models/payments/estimate-fees.model';
import {EstimateDiscounts} from '@/database/models/payments/estimate-discounts.model';
import {EstimateTasks} from '@/database/models/payments/estimate-tasks.model';
import {FinalBill} from '@/database/models/payments/final-bill.model';
import {FinalBillFindings} from '@/database/models/payments/final-bill-findings.model';
import {FinalBillFindingParts} from '@/database/models/payments/final-bill-finding-parts.model';
import {FinalBillFees} from '@/database/models/payments/final-bill-fees.model';
import {FinalBillDiscounts} from '@/database/models/payments/final-bill-discounts.model';
import {FinalBillWorkTasks} from '@/database/models/payments/final-bill-work-tasks.model';
import {DiagnosticChecklists, DiagnosticChecklistEntries} from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import {DIAGNOSTIC_SECTIONS} from '@/lib/diagnostic-checklist/catalog';
import {Receipts} from '@/database/models/payments/receipts.model';
import type {DocumentKind} from './access';

const money=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const string=(v:unknown)=>v == null?'':String(v);
const duration=(n:unknown)=>n == null?null:Number(n);
export type SharedDocument = Awaited<ReturnType<typeof loadDocument>>;

/** The same database-backed snapshot is used by the public page and PDF endpoint.
 * Do not include internal staff credentials, raw private customer identifiers, or secret payment tokens.
 */
export async function loadDocument(kind:DocumentKind,id:string) {
  const estimate=kind==='estimate';
  const record=estimate ? (await Database.select().from(EstimatedCosts).where(eq(EstimatedCosts.id,id)).limit(1))[0]
    : (await Database.select().from(FinalBill).where(eq(FinalBill.id,id)).limit(1))[0];
  if(!record)return null;
  const [appointment]=await Database.select().from(Appointments).where(eq(Appointments.id,record.appointmentId)).limit(1);
  if(!appointment)return null;
  const [[customer],[vehicle]]=await Promise.all([
    Database.select({fullname:Customers.fullname}).from(Customers).where(eq(Customers.id,appointment.customerId)).limit(1),
    Database.select({make:Vehicles.make,model:Vehicles.model,year:Vehicles.year,plateNumber:Vehicles.plateNumber}).from(Vehicles).where(eq(Vehicles.id,appointment.vehicleId)).limit(1),
  ]);
  const serviceIds=(appointment.services||[]).filter((v):v is string=>typeof v==='string');
  const catalog=serviceIds.length?await Database.select({id:Services.id,name:Services.name,description:Services.description,
    basePrice:Services.basePrice,estimatedDuration:Services.estimatedDuration,type:Services.type,isLaborInclude:Services.isLaborInclude})
    .from(Services).where(inArray(Services.id,serviceIds)):[];
  const services=serviceIds.map(id=>catalog.find(s=>s.id===id)).filter((v):v is typeof catalog[number]=>Boolean(v)).map(s=>({
    name:s.name,description:s.description||'',type:s.type,estimatedDuration:s.estimatedDuration,
    catalogBasePrice:money(s.basePrice),laborIncluded:s.isLaborInclude,
  }));
  const findings=estimate ? await Database.select().from(EstimateFindings).where(eq(EstimateFindings.estimateId,id))
    : await Database.select().from(FinalBillFindings).where(eq(FinalBillFindings.finalBillId,id));
  const findingIds=findings.map(f=>f.id);
  const parts=estimate ? findingIds.length?await Database.select().from(EstimateFindingParts).where(inArray(EstimateFindingParts.estimateFindingId,findingIds)):[]
    : findingIds.length?await Database.select().from(FinalBillFindingParts).where(inArray(FinalBillFindingParts.finalBillFindingId,findingIds)):[];
  const [fees,discounts,tasks]=await Promise.all(estimate ? [
    Database.select().from(EstimateFees).where(eq(EstimateFees.estimateId,id)),
    Database.select().from(EstimateDiscounts).where(eq(EstimateDiscounts.estimateId,id)),
    Database.select().from(EstimateTasks).where(eq(EstimateTasks.estimateId,id)),
  ]:[
    Database.select().from(FinalBillFees).where(eq(FinalBillFees.finalBillId,id)),
    Database.select().from(FinalBillDiscounts).where(eq(FinalBillDiscounts.finalBillId,id)),
    Database.select().from(FinalBillWorkTasks).where(eq(FinalBillWorkTasks.finalBillId,id)),
  ]);
  const [checklist]=await Database.select().from(DiagnosticChecklists).where(eq(DiagnosticChecklists.appointmentId,appointment.id)).limit(1);
  const entries=checklist?await Database.select().from(DiagnosticChecklistEntries).where(eq(DiagnosticChecklistEntries.checklistId,checklist.id)):[];
  const diagnostics=checklist?{
    engineType:checklist.engineType,transmissionType:checklist.transmissionType,timeOut:checklist.timeOut,
    remarks:checklist.remarks,dentsNotes:checklist.dentsNotes,dentsMarks:checklist.dentsMarks||[],
    sections:DIAGNOSTIC_SECTIONS.map(section=>({title:section.title,
      items:section.items.map(([key,label])=>({label,status:entries.find(e=>e.itemKey===key)?.status || 'NOT CHECKED'})),
    })),
  }:null;
  const recordMore=estimate?{reason:(record as typeof EstimatedCosts.$inferSelect).reason,notes:null,
    workTasksSubtotal:0}: {reason:null,notes:(record as typeof FinalBill.$inferSelect).notes,
      workTasksSubtotal:money((record as typeof FinalBill.$inferSelect).workTasksSubtotal)};
  const receipt=estimate?null:(await Database.select({referenceNumber:Receipts.referenceNumber,createdAt:Receipts.createdAt,data:Receipts.data})
    .from(Receipts).where(eq(Receipts.finalBillId,id)).limit(1))[0] || null;
  return {
    kind, documentId:id, status:string(record.status),createdAt:record.createdAt.toISOString(),
    updatedAt:record.updatedAt.toISOString(),
    appointment:{trackingNumber:appointment.trackingNumber,date:appointment.appointmentDate,
      time:appointment.appointmentTime,status:appointment.status,notes:appointment.notes},
    customer:{name:customer?.fullname||'Customer'},
    vehicle:{make:vehicle?.make||'',model:vehicle?.model||'',year:vehicle?.year||null,plateNumber:vehicle?.plateNumber||''},
    services,
    findings:findings.map(f=>({description:f.description,included:f.included,
      partsSubtotal:money(f.partsSubtotal),parts:parts.filter(p=>
        estimate?'estimateFindingId' in p && p.estimateFindingId===f.id:'finalBillFindingId' in p && p.finalBillFindingId===f.id)
        .map(p=>({name:p.partName||'Part',quantity:p.quantity,unitPrice:money(p.priceAtTime),total:money(p.totalPrice),isPms:p.isPms}))})),
    fees:fees.map(f=>({title:f.title,amount:money(f.amount)})),
    discounts:discounts.map(d=>({title:d.title,type:d.type,value:money(d.value),amount:money(d.amount)})),
    tasks:tasks.map(t=>({title:t.title,...('status' in t ? {status:t.status}:{}),
      ...('durationMinutes' in t ? {durationMinutes:duration(t.durationMinutes)}:{})})),
    totals:{service:money(record.serviceSubtotal),findings:money(record.findingsSubtotal),
      workTasks:recordMore.workTasksSubtotal,fees:money(record.feesTotal),discount:money(record.discountTotal),
      grand:money(record.grandTotal)},
    reason:recordMore.reason,notes:recordMore.notes,diagnostics,
    payment:receipt?{referenceNumber:receipt.referenceNumber,date:receipt.createdAt.toISOString(),
      simulation:Boolean((receipt.data as any)?.payment?.simulated),source:string((receipt.data as any)?.payment?.source||'')}:null,
    payable:!estimate && record.status==='OFFICIAL',
  };
}

export function documentLines(doc:NonNullable<SharedDocument>):string[] {
  const p=(n:unknown)=>`PHP ${money(n).toFixed(2)}`;
  const lines=[`AUTOCARE — ${doc.kind==='estimate'?'ESTIMATE':'FINAL COST'}`,
    `Status: ${doc.status}`,
    `Date issued: ${doc.createdAt}`,
    `Tracking: ${doc.appointment.trackingNumber}`,
    `Appointment: ${doc.appointment.date} ${doc.appointment.time} | ${doc.appointment.status}`,
    `Customer: ${doc.customer.name}`,
    `Vehicle: ${doc.vehicle.year||''} ${doc.vehicle.make} ${doc.vehicle.model} | Plate: ${doc.vehicle.plateNumber}`,
    `Appointment notes: ${doc.appointment.notes||'None'}`, '',
    'BOOKED SERVICES (catalog base prices are reference prices; saved subtotal is authoritative)',
    ...doc.services.map(s=>`${s.name} [${s.type}] | Catalog base ${p(s.catalogBasePrice)} | ${s.estimatedDuration} min | Labor ${s.laborIncluded?'included':'not included'} | ${s.description}`),
    `Saved service subtotal: ${p(doc.totals.service)}`,'',
    'FINDINGS AND PARTS',
    ...doc.findings.flatMap(f=>[`${f.included?'INCLUDED':'EXCLUDED'} ${f.description} | Parts subtotal ${p(f.partsSubtotal)}`,
      ...f.parts.map(part=>`  - ${part.name} | Qty ${part.quantity} x ${p(part.unitPrice)} = ${p(part.total)}${part.isPms?' | PMS':''}`)]),
    `Saved findings subtotal: ${p(doc.totals.findings)}`,'','TASKS',
    ...doc.tasks.map(t=>`${t.title}${'status' in t?` | ${t.status}`:''}${'durationMinutes' in t&&t.durationMinutes!=null?` | ${t.durationMinutes} min`:''}`),
    `Saved work tasks subtotal: ${p(doc.totals.workTasks)}`,'','ADDITIONAL FEES',
    ...doc.fees.map(f=>`${f.title}: ${p(f.amount)}`),`Saved fee subtotal: ${p(doc.totals.fees)}`,'',
    'DISCOUNTS',...doc.discounts.map(d=>`${d.title} (${d.type} ${d.value}): -${p(d.amount)}`),
    `Saved discount total: -${p(doc.totals.discount)}`,'',`FINAL TOTAL: ${p(doc.totals.grand)}`,
    `Reason: ${doc.reason||'None'}`,`Notes: ${doc.notes||'None'}`,'',
  ];
  if(doc.diagnostics){lines.push('DIAGNOSTIC CHECKLIST',
    `Engine ${doc.diagnostics.engineType||'—'} | Transmission ${doc.diagnostics.transmissionType||'—'} | Time out ${doc.diagnostics.timeOut||'—'}`,
    `Remarks: ${doc.diagnostics.remarks||'None'}`,`Dent notes: ${doc.diagnostics.dentsNotes||'None'}`,
    `Dent marks: ${doc.diagnostics.dentsMarks.map(m=>`(${m.x},${m.y})`).join(', ')||'None'}`);
    for(const s of doc.diagnostics.sections)lines.push(s.title,...s.items.map(i=>`  ${i.label}: ${i.status}`));
  }
  if(doc.payment)lines.push('PAYMENT',`Receipt: ${doc.payment.referenceNumber} | ${doc.payment.date}`,
    doc.payment.simulation?'CAPSTONE DEMONSTRATION — NO FUNDS COLLECTED':`Method: ${doc.payment.source}`);
  return lines;
}
