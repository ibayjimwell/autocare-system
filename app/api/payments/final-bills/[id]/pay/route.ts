import {NextRequest,NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {and,eq,inArray} from 'drizzle-orm';
import {authOptions} from '@/lib/auth/staffs/auth';
import {Database} from '@/lib/drizzle';
import {isValidUUID} from '@/utils/shared';
import {FinalBill} from '@/database/models/payments/final-bill.model';
import {HostedCheckoutAttempts} from '@/database/models/payments/hosted-checkout-attempt.model';
import {QrPhPaymentAttempts} from '@/database/models/payments/qrph-payment-attempt.model';
import {PaypalCheckoutAttempts} from '@/database/models/payments/paypal-checkout-attempt.model';
import {reconcilePaypalAttempt} from '@/lib/payments/paypal-sandbox';
import {generatePaymentReceipt} from '@/utils/payments/generate-payment-receipt';

const respond=(message:string,status:number)=>NextResponse.json({error:true,errorMessage:message},{status});
/** Counter cash cannot be rejected forever by archived PayMongo sessions.
 * A PayPal order with a possible capture is re-verified before retiring it.
 * CAS status updates prevent the PayPal capture handler starting after retirement.
 */
export async function POST(_req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id || session.user.access?.payments!==true) return respond('Payments permission required.',403);
  const {id}=await params;
  if(!isValidUUID(id))return respond('Invalid Final Cost ID.',422);
  try {
    const [bill]=await Database.select({status:FinalBill.status}).from(FinalBill).where(eq(FinalBill.id,id)).limit(1);
    if(!bill)return respond('Final Cost not found.',404);
    if(bill.status!=='OFFICIAL')return respond('Final Cost is not available for cash payment.',409);
    // Archived payment providers have no active checkout routes. A recorded
    // success still requires reconciliation rather than automatic cash.
    const [legacySuccess]=await Database.select({id:QrPhPaymentAttempts.id}).from(QrPhPaymentAttempts)
      .where(and(eq(QrPhPaymentAttempts.finalBillId,id),eq(QrPhPaymentAttempts.status,'SUCCEEDED'))).limit(1);
    if(legacySuccess)return respond('A prior QRPh transaction is marked successful. Reconcile it before collecting cash.',409);
    const [legacyHostedPaid]=await Database.select({id:HostedCheckoutAttempts.id}).from(HostedCheckoutAttempts)
      .where(and(eq(HostedCheckoutAttempts.finalBillId,id),inArray(HostedCheckoutAttempts.status,['PAID','SUCCEEDED','COMPLETED']))).limit(1);
    if(legacyHostedPaid)return respond('A prior online checkout is marked paid. Reconcile it before collecting cash.',409);
    const attempts=await Database.select().from(PaypalCheckoutAttempts).where(and(eq(PaypalCheckoutAttempts.finalBillId,id),
      inArray(PaypalCheckoutAttempts.status,['READY','CREATING','ACTIVE','CAPTURING','CREATE_UNKNOWN'])));
    for(const attempt of attempts) {
      // Do not permanently lock cash payments after a failed or abandoned request.
      // An uncertain operation must be at least 15 minutes old before retiring.
      const uncertain=['CAPTURING','CREATING','CREATE_UNKNOWN'].includes(attempt.status);
      const minutesOld=(Date.now()-attempt.updatedAt.getTime())/60000;
      if(uncertain && minutesOld < 15)
        return respond('An online payment is still being processed. Retry cash after it is verified or expires.',409);
      if(attempt.orderId) {
        // If an authorization was captured while the browser disconnected,
        // reconciliation settles the PayPal transaction, NOT cash.
        const verification=await reconcilePaypalAttempt(attempt.id);
        if(verification.paid)return respond('PayPal has already settled this Final Cost. Refresh the payment list.',409);
      }
      const updated=await Database.update(PaypalCheckoutAttempts).set({status:'CANCELLED',updatedAt:new Date(),
        errorMessage:'Retired by authorized cashier before collecting cash.'}).where(and(
        eq(PaypalCheckoutAttempts.id,attempt.id),eq(PaypalCheckoutAttempts.status,attempt.status)))
        .returning({id:PaypalCheckoutAttempts.id});
      if(!updated.length)return respond('Payment state changed. Refresh and try again.',409);
    }
    // Historical PayMongo ACTIVE/PENDING records are no longer operational.
    // Do not change their audit records; they must not block new cash settlement.
    const result=await generatePaymentReceipt(id,{paymentMethod:'CASH',expectedStatus:'OFFICIAL'});
    return NextResponse.json({error:false,message:'Cash payment recorded.',data:result},{status:201});
  }catch(error:any){
    console.error('[Cashier payment]',error);
    if(error?.message==='Bill already paid')return respond('Final Cost already paid.',409);
    if(error?.message==='Final Cost not found')return respond('Final Cost not found.',404);
    return respond('Cash payment could not be completed. Check provider status and retry.',503);
  }
}
