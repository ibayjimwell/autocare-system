import { NextResponse } from 'next/server';
import { capturePaypalOrder } from '@/lib/payments/paypal-sandbox';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{token:string}>}) {
  try {
    const body=await req.json().catch(()=>({}));
    if (typeof body.orderId!=='string') return NextResponse.json({error:true,errorMessage:'Missing PayPal order.'},{status:400});
    const data=await capturePaypalOrder((await params).token,body.orderId);
    return NextResponse.json({error:false,data},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { console.error('[PayPal sandbox] Capture:',error);
    return NextResponse.json({error:true,errorMessage:error instanceof Error?error.message:'Unable to verify PayPal payment.'},{status:409}); }
}
