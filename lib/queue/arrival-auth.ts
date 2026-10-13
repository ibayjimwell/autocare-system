import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { verifyJWT } from '@/utils/jwt';
import { Database } from '@/lib/drizzle';
import { StaffAccess } from '@/database/models/staffs/staff-access.model';
import { eq, and } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

/** Authenticate the actual sender, never accept a client-provided customerId. */
export async function getArrivalCustomerId(req: NextRequest): Promise<string | null> {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '');
  if (!match) return null;
  const payload = await verifyJWT(match[1]);
  const id = payload?.id;
  return typeof id === 'string' && isValidUUID(id) ? id : null;
}

/** Ask Arrival is a Service Tracking action; check permission server-side. */
export async function canManageArrival(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !isValidUUID(id)) return false;
  const [access] = await Database.select({ id: StaffAccess.id })
    .from(StaffAccess)
    .where(and(eq(StaffAccess.staffId, id), eq(StaffAccess.serviceTracking, true)))
    .limit(1);
  return Boolean(access);
}
