import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';

/** Server-only: do not trust a caller-supplied customer ID or bill amount. */
export async function canAccessQrPhBill(req: NextRequest, billCustomerId: string): Promise<boolean> {
  if (/^Bearer\s+/i.test(req.headers.get('authorization') || '')) {
    try {
      return (await getArrivalCustomerId(req)) === billCustomerId;
    } catch {
      return false;
    }
  }
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id && session.user.access?.payments === true);
}
