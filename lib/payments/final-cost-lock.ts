import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { isValidUUID } from '@/utils/shared';

/** Finance changes must occur in the ESTIMATE, before Final Cost generation.
 * Cash payment, officialization, parking and receipt issuance are not edits.
 */
export async function rejectFinalCostMonetaryEdit(id: string) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id || session.user.access?.payments!==true)return NextResponse.json({error:true,errorMessage:'Payments permission required.'},{status:403});
  if(!isValidUUID(id))return NextResponse.json({error:true,errorMessage:'Invalid Final Cost ID.'},{status:422});
  const [bill]=await Database.select({id:FinalBill.id}).from(FinalBill).where(eq(FinalBill.id,id)).limit(1);
  if(!bill)return NextResponse.json({error:true,errorMessage:'Final Cost not found.'},{status:404});
  return NextResponse.json({error:true,errorCode:'FINAL_COST_LOCKED',errorMessage:'Final Cost is read-only. Make pricing changes in the Estimate before Final Cost generation.'},{status:409});
}
