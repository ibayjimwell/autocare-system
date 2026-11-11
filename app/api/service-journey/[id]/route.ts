import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { isValidUUID } from '@/utils/shared';
import { getServiceJourney } from '@/lib/service-journey/service-journey';

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!isValidUUID(id))return NextResponse.json({error:true,errorMessage:'Invalid appointment ID.'},{status:422});
  const [session,customerId]=await Promise.all([getServerSession(authOptions),getArrivalCustomerId(req)]);
  if(!session?.user?.id && !customerId)return NextResponse.json({error:true,errorMessage:'Authentication required.'},{status:401});
  try {
    const data=await getServiceJourney(id);
    if(!data || (!session?.user?.id && data.customerId!==customerId))return NextResponse.json({error:true,errorMessage:'Not found.'},{status:404});
    const {customerId: _customerId, ...safe}=data;
    return NextResponse.json({error:false,data:safe},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){console.error('[ServiceJourney GET]',e);return NextResponse.json({error:true,errorMessage:'Unable to load service progress.'},{status:500});}
}
