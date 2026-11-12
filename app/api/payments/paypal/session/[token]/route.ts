import { NextResponse } from 'next/server';
import { paypalCheckoutDetails, paypalClientId, paypalBrowserToken, reconcilePaypalAttempt } from '@/lib/payments/paypal-sandbox';
export const dynamic = 'force-dynamic';
type Ctx={params:Promise<{token:string}>};
export async function GET(_:Request,{params}:Ctx) {
  try {
    const {token}=await params;
    const {attempt,bill,expired}=await paypalCheckoutDetails(token);
    if (expired && bill.status !== 'PAID') return NextResponse.json({error:true,errorMessage:'Checkout expired. Return to AutoCare.'},{status:410});
    const state = await reconcilePaypalAttempt(attempt.id);
    // Wallet checkout only needs the public client ID. An unavailable advanced-card
    // client token must not break PayPal Wallet checkout.
    const browserToken = await paypalBrowserToken().catch((cause) => {
      console.warn('[PayPal sandbox] Advanced card token unavailable; Wallet remains available:', cause);
      return null;
    });
    return NextResponse.json({error:false,data:{status:state.status,paid:state.paid,
      clientId:paypalClientId(),amount:(attempt.amountCentavos/100).toFixed(2),currency:'PHP',
      billId:attempt.finalBillId,
      // SDK Client Token is valid for checkout-origin initialization; secret is never returned.
      browserToken,
    }},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  } catch(error) {
    return NextResponse.json({error:true,errorMessage:error instanceof Error ? error.message:'Unable to load PayPal checkout.'},{status:503});
  }
}
