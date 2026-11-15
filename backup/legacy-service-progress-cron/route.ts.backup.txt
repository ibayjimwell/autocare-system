import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { ServiceProgressSMS } from '@/database/models/service-journey/service-journey.model';
import { getServiceJourney } from '@/lib/service-journey/service-journey';
import { sendSMS } from '@/utils/sms';
import { isValidPhilippinePhone, normalizePhilippinePhone } from '@/utils/phone';
import { eq, and, inArray, gte } from 'drizzle-orm';

// Configure Vercel Cron (Pro) or another trusted scheduler every 10 min.
// Never make this route public: CRON_SECRET is mandatory.
export async function GET(req: NextRequest) {
  if(!process.env.CRON_SECRET || req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({error:true,errorMessage:'Unauthorized.'},{status:401});
  const now=new Date();
  const bucket=new Date(Math.floor(now.getTime()/600000)*600000);
  let processed=0,submitted=0,failed=0;
  try {
    const appointments=await Database.select({id:Appointments.id,customerId:Appointments.customerId,trackingNumber:Appointments.trackingNumber,phone:Customers.phone})
     .from(Appointments).innerJoin(Customers,eq(Appointments.customerId,Customers.id))
     .where(and(inArray(Appointments.status,['UNDER_INSPECTION','IN_PROGRESS']),gte(Appointments.updatedAt,new Date(now.getTime()-7*86400000))))
     .limit(150);
    for(const appt of appointments) {
      const phone=normalizePhilippinePhone(appt.phone);
      if(!isValidPhilippinePhone(phone))continue;
      // Atomic claim: each appointment can only send once per 10-minute bucket.
      const [claim]=await Database.insert(ServiceProgressSMS).values({appointmentId:appt.id,intervalBucket:bucket,status:'CLAIMED'}).onConflictDoNothing().returning({appointmentId:ServiceProgressSMS.appointmentId});
      if(!claim)continue;
      processed++;
      try {
        const progress=await getServiceJourney(appt.id);
        if(!progress || !['UNDER_INSPECTION','IN_PROGRESS'].includes(progress.status))continue;
        const current=progress.status==='IN_PROGRESS'?progress.work:progress.inspection;
        const delay=progress.delay?` DELAY: ${progress.delay.reason.slice(0,75)}.`:'';
        // Submission != handset delivery, and a crash between sending and state
        // update cannot be retried automatically without risk of duplicate SMS.
        await sendSMS(phone,`AutoCare #${appt.trackingNumber}: ${progress.status==='IN_PROGRESS'?'Repair':'Inspection'} ${current.done}/${current.total} tasks done.${delay} More: your AutoCare tracking page.`);
        await Database.update(ServiceProgressSMS).set({status:'SUBMITTED',submittedAt:new Date()}).where(and(eq(ServiceProgressSMS.appointmentId,appt.id),eq(ServiceProgressSMS.intervalBucket,bucket)));
        submitted++;
      }catch(error){failed++;await Database.update(ServiceProgressSMS).set({status:'FAILED',lastError:(error instanceof Error?error.message:'Unknown error').slice(0,300)}).where(and(eq(ServiceProgressSMS.appointmentId,appt.id),eq(ServiceProgressSMS.intervalBucket,bucket)));}
    }
    return NextResponse.json({error:false,processed,submitted,failed,interval:bucket.toISOString()});
  }catch(error){console.error('[Service progress SMS cron]',error);return NextResponse.json({error:true,errorMessage:'Progress check failed.'},{status:500});}
}
