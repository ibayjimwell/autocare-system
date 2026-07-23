// lib/payments/generate-payment-receipt.ts
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillFindings } from '@/database/models/payments/final-bill-findings.model';
import { FinalBillFindingParts } from '@/database/models/payments/final-bill-finding-parts.model';
import { FinalBillWorkTasks } from '@/database/models/payments/final-bill-work-tasks.model';
import { FinalBillFees } from '@/database/models/payments/final-bill-fees.model';
import { FinalBillDiscounts } from '@/database/models/payments/final-bill-discounts.model';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { Services } from '@/database/models/services/services.model';
import { InspectionTasks } from '@/database/models/service-tracking/inspection-tasks.model';
import { InspectionFindings } from '@/database/models/service-tracking/inspection-findings.model';
import { InspectionFindingParts } from '@/database/models/service-tracking/inspection-finding-parts.model';
import { Receipts } from '@/database/models/payments/receipts.model';
import { eq, inArray } from 'drizzle-orm';
import { paymentsTriggers } from '@/triggers/payments';

function generateReferenceNumber(): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RES-${yy}${mm}${dd}-${random}`;
}

export async function generatePaymentReceipt(billId: string): Promise<{
  referenceNumber: string;
  receiptData: any;
}> {
  // 1. Fetch the final bill
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, billId)).limit(1);
  if (!bill) throw new Error('Final bill not found');
  if (bill.status === 'PAID') throw new Error('Bill already paid');

  // 2. Fetch all related data (same as the cash pay route)
  const [findings, fees, discounts, workTasks, estimate, appointment] = await Promise.all([
    Database.select().from(FinalBillFindings).where(eq(FinalBillFindings.finalBillId, billId)),
    Database.select().from(FinalBillFees).where(eq(FinalBillFees.finalBillId, billId)),
    Database.select().from(FinalBillDiscounts).where(eq(FinalBillDiscounts.finalBillId, billId)),
    Database.select().from(FinalBillWorkTasks).where(eq(FinalBillWorkTasks.finalBillId, billId)),
    bill.estimateId ? Database.select().from(EstimatedCosts).where(eq(EstimatedCosts.id, bill.estimateId)).limit(1).then(r => r[0]) : null,
    Database.select().from(Appointments).where(eq(Appointments.id, bill.appointmentId)).limit(1).then(r => r[0]),
  ]);
  if (!appointment) throw new Error('Appointment not found');

  const [customer, vehicle] = await Promise.all([
    Database.select().from(Customers).where(eq(Customers.id, appointment.customerId)).limit(1).then(r => r[0]),
    Database.select().from(Vehicles).where(eq(Vehicles.id, appointment.vehicleId)).limit(1).then(r => r[0]),
  ]);

  // Services
  const serviceIds: string[] = appointment.services || [];
  const services = serviceIds.length > 0
    ? await Database.select().from(Services).where(inArray(Services.id, serviceIds))
    : [];

  // Inspection tasks & findings
  const inspectionTasks = await Database.select().from(InspectionTasks).where(eq(InspectionTasks.appointmentId, appointment.id));
  const inspectionFindings = await Database.select().from(InspectionFindings).where(eq(InspectionFindings.appointmentId, appointment.id));
  const findingParts = await Promise.all(
    inspectionFindings.map(async (f) => {
      const parts = await Database.select().from(InspectionFindingParts).where(eq(InspectionFindingParts.findingId, f.id));
      return { ...f, parts };
    })
  );

  const estimateData = estimate ? {
    id: estimate.id,
    status: estimate.status,
    serviceSubtotal: estimate.serviceSubtotal,
    findingsSubtotal: estimate.findingsSubtotal,
    feesTotal: estimate.feesTotal,
    discountTotal: estimate.discountTotal,
    grandTotal: estimate.grandTotal,
    reason: estimate.reason,
    createdAt: estimate.createdAt,
  } : null;

  const receiptData = {
    customer: customer ? {
      fullname: customer.fullname,
      email: customer.email,
      phone: customer.phone,
    } : null,
    vehicle: vehicle ? {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plateNumber: vehicle.plateNumber,
    } : null,
    appointment: {
      trackingNumber: appointment.trackingNumber,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      notes: appointment.notes,
    },
    services: services.map(s => ({
      name: s.name,
      description: s.description,
      basePrice: s.basePrice,
      estimatedDuration: s.estimatedDuration,
      type: s.type,
    })),
    inspection: {
      doneTasks: inspectionTasks.filter(t => t.status === 'DONE').map(t => ({ title: t.title })),
      findings: findingParts.map(f => ({
        description: f.description,
        parts: f.parts.map(p => ({
          partName: p.partName,
          quantity: p.quantity,
          priceAtTime: p.priceAtTime,
          isPms: p.isPms,
          totalPrice: (p.quantity * parseFloat(p.priceAtTime)).toFixed(2),
        })),
      })),
    },
    estimate: estimateData,
    finalBill: {
      id: bill.id,
      serviceSubtotal: bill.serviceSubtotal,
      findingsSubtotal: bill.findingsSubtotal,
      workTasksSubtotal: bill.workTasksSubtotal,
      feesTotal: bill.feesTotal,
      discountTotal: bill.discountTotal,
      grandTotal: bill.grandTotal,
      createdAt: bill.createdAt,
      workTasks: workTasks.map(t => ({ title: t.title })),
      fees: fees.map(f => ({ title: f.title, amount: f.amount })),
      discounts: discounts.map(d => ({
        title: d.title,
        type: d.type,
        value: d.value,
        amount: d.amount,
      })),
      findings: findings.map(f => ({
        description: f.description,
        included: f.included,
        partsSubtotal: f.partsSubtotal,
      })),
    },
    payment: {
      totalAmount: bill.grandTotal,
      paidAt: new Date().toISOString(),
    },
  };

  const referenceNumber = generateReferenceNumber();

  // 3. Insert receipt and update bill in a transaction
  await Database.transaction(async (tx) => {
    await tx.insert(Receipts).values({
      referenceNumber,
      finalBillId: bill.id,
      estimateId: bill.estimateId,
      appointmentId: bill.appointmentId,
      data: receiptData,
    });
    await tx.update(FinalBill).set({ status: 'PAID', updatedAt: new Date() }).where(eq(FinalBill.id, billId));
  });

  // 4. Send push notification (staff)
  paymentsTriggers.onPaymentCompleted({
    trackingNumber: appointment.trackingNumber,
    customerName: customer?.fullname,
  }).catch(console.error);

  return { referenceNumber, receiptData };
}