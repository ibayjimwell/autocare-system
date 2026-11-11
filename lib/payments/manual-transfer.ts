import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { eq } from 'drizzle-orm';

export type TransferMethod = 'GCASH' | 'MAYA' | 'BANK';
export type TransferDestination = { method: TransferMethod; name: string; account: string; bankName?: string };

/** Only configured business-authorized accounts are shown to customers. */
export function getTransferDestinations(): TransferDestination[] {
  const result: TransferDestination[] = [];
  const gcashName = process.env.MANUAL_TRANSFER_GCASH_NAME?.trim();
  const gcashNumber = process.env.MANUAL_TRANSFER_GCASH_NUMBER?.trim();
  const mayaName = process.env.MANUAL_TRANSFER_MAYA_NAME?.trim();
  const mayaNumber = process.env.MANUAL_TRANSFER_MAYA_NUMBER?.trim();
  const bankName = process.env.MANUAL_TRANSFER_BANK_NAME?.trim();
  const bankOwner = process.env.MANUAL_TRANSFER_BANK_ACCOUNT_NAME?.trim();
  const bankNumber = process.env.MANUAL_TRANSFER_BANK_ACCOUNT_NUMBER?.trim();
  if (gcashName && gcashNumber) result.push({ method: 'GCASH', name: gcashName, account: gcashNumber });
  if (mayaName && mayaNumber) result.push({ method: 'MAYA', name: mayaName, account: mayaNumber });
  if (bankName && bankOwner && bankNumber) result.push({ method: 'BANK', name: bankOwner, account: bankNumber, bankName });
  return result;
}

/** Resolve bill ownership from database, never from a customer-supplied ID. */
export async function loadTransferBill(billId: string) {
  const [result] = await Database.select({
    id: FinalBill.id, appointmentId: FinalBill.appointmentId,
    customerId: Appointments.customerId, status: FinalBill.status,
    grandTotal: FinalBill.grandTotal, trackingNumber: Appointments.trackingNumber,
  }).from(FinalBill).innerJoin(Appointments, eq(FinalBill.appointmentId, Appointments.id))
    .where(eq(FinalBill.id, billId)).limit(1);
  return result ?? null;
}

export function amountToCents(raw: string | number): number {
  const str = String(raw);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(str)) return -1;
  const [whole, fraction = ''] = str.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : -1;
}
