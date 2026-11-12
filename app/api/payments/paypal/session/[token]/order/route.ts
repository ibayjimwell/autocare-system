import { NextResponse } from 'next/server';
import { ensurePaypalOrder } from '@/lib/payments/paypal-sandbox';
export const dynamic='force-dynamic';
export async function POST(_:Request,{params}:{params:Promise<{token:string}>}) {
  try { const order=await ensurePaypalOrder((await params).token);
    return NextResponse.json({error:false,data:{id:order.id}},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { console.error('[PayPal sandbox] Create:',error);
    return NextResponse.json({error:true,errorMessage:error instanceof Error?error.message:'Could not start PayPal order.'},{status:409}); }
}
