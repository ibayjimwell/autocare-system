import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { and, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { ServiceWarranties } from '@/database/models/payments/service-warranties.model';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';
import { isValidUUID } from '@/utils/shared';

export async function DELETE(_request:NextRequest,{params}:{params:Promise<{id:string;warrantyId:string}>}) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return NextResponse.json({error:true,errorMessage:'Staff login required.'},{status:401});
  if(session.user.access?.payments!==true)return NextResponse.json({error:true,errorMessage:'Payments permission required.'},{status:403});
  const {id,warrantyId}=await params;
  if(!isValidUUID(id)||!isValidUUID(warrantyId))return NextResponse.json({error:true,errorMessage:'Invalid warranty ID.'},{status:400});
  try {
    const result=await Database.transaction(async tx=>{
      const [estimate]=await tx.select().from(EstimatedCosts).where(eq(EstimatedCosts.id,id)).for('update').limit(1);
      if(!estimate)return 'NOT_FOUND';
      if(!['PENDING','WAITING_FOR_APPROVAL'].includes(estimate.status))return 'LOCKED';
      const deleted=await tx.delete(ServiceWarranties).where(and(eq(ServiceWarranties.id,warrantyId),eq(ServiceWarranties.estimateId,id))).returning({id:ServiceWarranties.id});
      return deleted.length?'OK':'NOT_FOUND';
    });
    if(result!=='OK')return NextResponse.json({error:true,errorMessage:result==='LOCKED'?'Approved/declined estimates cannot change warranties.':'Warranty not found.'},{status:result==='LOCKED'?409:404});
    return NextResponse.json({error:false,message:'Warranty removed.'});
  }catch{return NextResponse.json({error:true,errorMessage:'Could not remove warranty.'},{status:500});}
}
