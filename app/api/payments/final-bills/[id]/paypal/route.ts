import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { PaypalCheckoutAttempts } from '@/database/models/payments/paypal-checkout-attempt.model';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { canAccessQrPhBill } from '@/lib/payments/qrph-access';
import { isValidUUID } from '@/utils/shared';
import { billCentavos, latestPaypalAttempt, newPaypalAttempt, paypalSandboxEnabled, paypalSiteOrigin, reconcilePaypalAttempt, OPEN_PAYPAL_STATUSES } from '@/lib/payments/paypal-sandbox';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{id:string}> };
const respond = (payload:unknown,status=200) => NextResponse.json(payload,{status,headers:{'Cache-Control':'no-store'}});
async function customerBill(req:NextRequest,id:string) {
  if (!isValidUUID(id)) throw new Error('Invalid Final Cost reference.');
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id,id)).limit(1);
  if (!bill) throw new Error('Final Cost not found.');
  const [appointment] = await Database.select({ customerId:Appointments.customerId }).from(Appointments)
    .where(eq(Appointments.id,bill.appointmentId)).limit(1);
  if (!appointment || !(await canAccessQrPhBill(req,appointment.customerId))) throw new Error('NOT_AUTHORIZED');
  return bill;
}
function fail(error:unknown) {
  if ((error as Error)?.message === 'NOT_AUTHORIZED') return respond({error:true,errorMessage:'Not authorized to access this Final Cost.'},403);
  console.error('[PayPal sandbox checkout]',error);
  return respond({error:true,errorMessage:error instanceof Error ? error.message:'PayPal sandbox unavailable.'},503);
}
export async function GET(req:NextRequest,{params}:Context) {
  try {
    const {id} = await params;
    const bill = await customerBill(req,id);
    const attempt = await latestPaypalAttempt(id);
    if (!attempt) return respond({error:false,data:{status:'NONE',paid:bill.status === 'PAID'}});
    const state = await reconcilePaypalAttempt(attempt.id);
    return respond({error:false,data:{...state,checkoutUrl:OPEN_PAYPAL_STATUSES.includes(attempt.status as any)
      ? `${paypalSiteOrigin()}/paypal/checkout/${attempt.ticket}`:null,
      provider:'PAYPAL',sandbox:true}});
  } catch(error) { return fail(error); }
}
export async function POST(req:NextRequest,{params}:Context) {
  try {
    if (!paypalSandboxEnabled()) return respond({error:true,errorMessage:'PayPal sandbox is not configured.'},503);
    const {id} = await params;
    const bill = await customerBill(req,id);
    if (bill.status !== 'OFFICIAL') return respond({error:true,errorMessage:'This Final Cost is not ready for payment.'},409);
    const amount = billCentavos(bill.grandTotal);
    if (amount < 100 || amount > 999999999) return respond({error:true,errorMessage:'Final Cost amount is not payable.'},422);
    const [oldCheckout] = await Database.select({id:HostedCheckoutAttempts.id}).from(HostedCheckoutAttempts)
      .where(and(eq(HostedCheckoutAttempts.finalBillId,id),
        inArray(HostedCheckoutAttempts.status,['CREATING','CREATE_UNKNOWN','ACTIVE','PROCESSING']))).limit(1);
    const [oldQr] = await Database.select({id:QrPhPaymentAttempts.id}).from(QrPhPaymentAttempts)
      .where(and(eq(QrPhPaymentAttempts.finalBillId,id),
        inArray(QrPhPaymentAttempts.status,['INITIATED','PENDING','PROCESSING','SUCCEEDED']))).limit(1);
    if (oldCheckout || oldQr) return respond({error:true,errorMessage:'An earlier payment session is still open. Resolve it before creating a PayPal checkout.'},409);
    const existing = await latestPaypalAttempt(id);
    if (existing && OPEN_PAYPAL_STATUSES.includes(existing.status as any)) {
      if (existing.status === 'READY' && existing.expiresAt.getTime() < Date.now()) {
        await Database.update(PaypalCheckoutAttempts).set({status:'EXPIRED',updatedAt:new Date()})
          .where(and(eq(PaypalCheckoutAttempts.id,existing.id),eq(PaypalCheckoutAttempts.status,'READY')));
      } else {
        const state = await reconcilePaypalAttempt(existing.id);
        if (state.paid) return respond({error:true,errorMessage:'This Final Cost is already paid.'},409);
        if (existing.amountCentavos !== amount) return respond({error:true,errorMessage:'Final Cost amount changed while payment was open.'},409);
        return respond({error:false,data:{checkoutUrl:`${paypalSiteOrigin()}/paypal/checkout/${existing.ticket}`,status:state.status,reused:true}});
      }
    }
    const created = await newPaypalAttempt(id,amount);
    return respond({error:false,data:{checkoutUrl:created.checkoutUrl,status:'READY',sandbox:true}},201);
  } catch(error:any) {
    if (error?.code === '23505') return respond({error:true,errorMessage:'A checkout is already open for this Final Cost. Check its payment status.'},409);
    return fail(error);
  }
}
