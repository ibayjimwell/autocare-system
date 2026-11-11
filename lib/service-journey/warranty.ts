import { Database } from '@/lib/drizzle';
import { ServiceWarranties } from '@/database/models/service-journey/service-journey.model';
export async function issueWarrantyForCompletedAppointment(appointmentId:string){
  const raw=process.env.AUTOCARE_LABOR_WARRANTY_DAYS || '30';
  const days=Number(raw);
  if(!Number.isInteger(days)||days<1||days>365)throw new Error('AUTOCARE_LABOR_WARRANTY_DAYS must be between 1 and 365.');
  const start=new Date();const expiry=new Date(start.getTime()+days*86400_000);
  const [saved]=await Database.insert(ServiceWarranties).values({appointmentId,startsAt:start,expiresAt:expiry,coverage:'Labor workmanship',terms:'Covers eligible labor workmanship for '+days+' days from completed service; excludes consumables, normal wear, accidents and unrelated faults. Subject to inspection and documented shop policy.'}).onConflictDoNothing({target:ServiceWarranties.appointmentId}).returning();
  return saved||null;
}
