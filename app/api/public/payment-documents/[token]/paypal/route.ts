import {NextResponse} from 'next/server';
import {and,eq} from 'drizzle-orm';
import {Database} from '@/lib/drizzle';
import {PaypalCheckoutAttempts} from '@/database/models/payments/paypal-checkout-attempt.model';
import {resolveShare,shareUrl} from '@/lib/document-share/access';
import {loadDocument} from '@/lib/document-share/document';
import {billCentavos,latestPaypalAttempt,newPaypalAttempt,OPEN_PAYPAL_STATUSES,paypalSandboxEnabled,reconcilePaypalAttempt} from '@/lib/payments/paypal-sandbox';
export const dynamic='force-dynamic';
export async function POST(_:Request,{params}:{params:Promise<{token:string}>}) {
  const token=(await params).token;
  const link=await resolveShare(token);
  if(!link||link.documentType!=='final-bill')return NextResponse.json({error:true,errorMessage:'Payment link expired or unavailable.'},{status:404});
  if(!paypalSandboxEnabled())return NextResponse.json({error:true,errorMessage:'Online checkout is not configured.'},{status:503});
  try {
    const document=await loadDocument('final-bill',link.documentId);
    if(!document||document.status!=='OFFICIAL')return NextResponse.json({error:true,errorMessage:'Final Cost is not available for payment.'},{status:409});
    const amount=billCentavos(document.totals.grand.toFixed(2));
    if(amount<100 || amount>999999999)return NextResponse.json({error:true,errorMessage:'Invalid payment amount.'},{status:422});
    let attempt=await latestPaypalAttempt(link.documentId);
    if(attempt&&OPEN_PAYPAL_STATUSES.includes(attempt.status as any)){
      const verified=await reconcilePaypalAttempt(attempt.id);
      if(verified.paid)return NextResponse.json({error:true,errorMessage:'This Final Cost was already paid.'},{status:409});
      if(attempt.amountCentavos!==amount)return NextResponse.json({error:true,errorMessage:'Final Cost total changed. Please request a new link.'},{status:409});
      if(attempt.expiresAt.getTime()<Date.now() && attempt.status==='READY') {
        await Database.update(PaypalCheckoutAttempts).set({status:'EXPIRED',updatedAt:new Date()})
          .where(and(eq(PaypalCheckoutAttempts.id,attempt.id),eq(PaypalCheckoutAttempts.status,'READY')));
        attempt=null;
      }else if(attempt.expiresAt.getTime()<Date.now()){
        return NextResponse.json({error:true,errorMessage:'A previous PayPal order must be reconciled before retrying.'},{status:409});
      }
    }else attempt=null;
    const checkout=attempt?{checkoutUrl:`${process.env.AUTOCARE_PUBLIC_BASE_URL||'https://autocare-system.vercel.app'}/paypal/checkout/${attempt.ticket}`}
      :await newPaypalAttempt(link.documentId,amount);
    const url=new URL(checkout.checkoutUrl);
    url.searchParams.set('returnTo',new URL(shareUrl(token)).pathname);
    return NextResponse.json({error:false,data:{checkoutUrl:url.toString()}},{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){console.error('[Public PayPal start]',error);
    return NextResponse.json({error:true,errorMessage:error?.code==='23505'?'Another checkout is already open. Please refresh.':'Unable to start PayPal checkout.'},{status:409});}
}
