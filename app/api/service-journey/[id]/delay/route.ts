import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { ServiceDelays } from '@/database/models/service-journey/service-journey.model';
import { isValidUUID } from '@/utils/shared';
import { eq } from 'drizzle-orm';
import { sendCustomerNotification } from '@/lib/notifications/customer-notification';
import { canManageArrival } from '@/lib/queue/arrival-auth';

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const session=await getServerSession(authOptions);
  if(!session?.user?.id || !await canManageArrival())return NextResponse.json({error:true,errorMessage:'Service Tracking permission required.'},{status:403});
  if(!isValidUUID(id))return NextResponse.json({error:true,errorMessage:'Invalid appointment.'},{status:422});
  const body=await req.json().catch(()=>null);
  const reason=typeof body?.reason==='string'?body.reason.trim():'';
  const resolve=body?.resolve===true;
  if(!resolve && (reason.length<4 || reason.length>600))return NextResponse.json({error:true,errorMessage:'Describe the delay in 4–600 characters.'},{status:422});
  let expected:Date|null=null;
  if(!resolve && body.expectedReadyAt){expected=new Date(body.expectedReadyAt);if(!Number.isFinite(expected.getTime()) || expected.getTime()<=Date.now())return NextResponse.json({error:true,errorMessage:'Expected completion must be in the future.'},{status:422});}
  try {
    const [appt]=await Database.select({customerId:Appointments.customerId,trackingNumber:Appointments.trackingNumber,status:Appointments.status}).from(Appointments).where(eq(Appointments.id,id)).limit(1);
    if(!appt)return NextResponse.json({error:true,errorMessage:'Appointment not found.'},{status:404});
    if(!['UNDER_INSPECTION','WAITING_FOR_APPROVAL','IN_PROGRESS'].includes(appt.status))return NextResponse.json({error:true,errorMessage:'Only active services can report a delay.'},{status:409});
    if(resolve){await Database.update(ServiceDelays).set({resolvedAt:new Date(),updatedAt:new Date()}).where(eq(ServiceDelays.appointmentId,id));}
    else {
      await Database.insert(ServiceDelays).values({appointmentId:id,reason,expectedReadyAt:expected,reportedBy:session.user.id,reportedAt:new Date(),resolvedAt:null,updatedAt:new Date()}).onConflictDoUpdate({target:ServiceDelays.appointmentId,set:{reason,expectedReadyAt:expected,reportedBy:session.user.id,reportedAt:new Date(),resolvedAt:null,updatedAt:new Date()}});
      void sendCustomerNotification(appt.customerId,'Service delay update',`Your service #${appt.trackingNumber} is delayed: ${reason}${expected?' Expected ready: '+expected.toLocaleString('en-PH',{timeZone:'Asia/Manila'}):''}`,{event:'SERVICE_DELAY',url:`/tracking?appointmentId=${id}`}).catch(console.error);
    }
    return NextResponse.json({error:false,message:resolve?'Delay cleared.':'Delay recorded and customer notification queued.'});
  }catch(e){console.error('[Delay POST]',e);return NextResponse.json({error:true,errorMessage:'Unable to save delay.'},{status:500});}
}
