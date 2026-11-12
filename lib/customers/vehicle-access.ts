import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/staffs/auth';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { Database } from '@/lib/drizzle';
import { StaffAccess } from '@/database/models/staffs/staff-access.model';
import { isValidUUID } from '@/utils/shared';

/** Customer JWT owners and staff granted the Customers module can manage vehicles. */
export async function canAccessCustomerVehicles(req: NextRequest, customerId: string): Promise<boolean> {
  if (!isValidUUID(customerId)) return false;
  const customer = await getArrivalCustomerId(req);
  if (customer) return customer === customerId;

  const session = await getServerSession(authOptions);
  const staffId = session?.user?.id;
  if (!staffId || !isValidUUID(staffId)) return false;

  const [permission] = await Database.select({ id: StaffAccess.id })
    .from(StaffAccess)
    .where(and(eq(StaffAccess.staffId, staffId), eq(StaffAccess.customers, true)))
    .limit(1);
  return Boolean(permission);
}
