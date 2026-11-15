import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { canManageArrival } from '@/lib/queue/arrival-auth';
import { Database } from '@/lib/drizzle';
import { Configurations } from '@/database/models/configurations/configurations.model';
import { ConfigurationsLogs } from '@/database/models/configurations/configurations-logs.model';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
const MODULE = 'service_progress_sms';
const DEFAULTS = { enabled: false, intervalValue: 10, intervalUnit: 'minutes' as const };
type Unit = 'minutes' | 'hours';

async function hasPermission() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await canManageArrival())) return null;
  return session.user.id;
}

function toConfig(value: unknown) {
  const obj = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const intervalValue = obj.intervalValue ?? DEFAULTS.intervalValue;
  const intervalUnit = obj.intervalUnit ?? DEFAULTS.intervalUnit;
  const enabled = obj.enabled ?? DEFAULTS.enabled;
  if (typeof enabled !== 'boolean' || !Number.isInteger(intervalValue) ||
      typeof intervalValue !== 'number' || (intervalUnit !== 'minutes' && intervalUnit !== 'hours') ||
      intervalValue < 1 || intervalValue > (intervalUnit === 'minutes' ? 1440 : 24) ||
      (intervalUnit === 'minutes' && intervalValue < 5)) return null;
  return { enabled, intervalValue, intervalUnit: intervalUnit as Unit };
}

export async function GET() {
  if (!(await hasPermission())) return NextResponse.json({ error: true, errorMessage: 'Service Tracking permission required.' }, { status: 403 });
  try {
    const [record] = await Database.select({ config: Configurations.config })
      .from(Configurations).where(eq(Configurations.module, MODULE)).limit(1);
    const config = toConfig(record?.config) ?? DEFAULTS;
    return NextResponse.json({ error: false, data: config }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[SMS settings GET]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to load SMS settings.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const staffId = await hasPermission();
  if (!staffId) return NextResponse.json({ error: true, errorMessage: 'Service Tracking permission required.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const config = toConfig(body);
  if (!config) return NextResponse.json({ error: true, errorMessage: 'Interval must be 5–1440 minutes or 1–24 hours.' }, { status: 422 });
  try {
    const result = await Database.transaction(async (tx) => {
      const [existing] = await tx.select().from(Configurations)
        .where(eq(Configurations.module, MODULE)).limit(1);
      const [saved] = existing
        ? await tx.update(Configurations).set({ config, updatedAt: new Date() })
            .where(eq(Configurations.id, existing.id)).returning()
        : await tx.insert(Configurations).values({ module: MODULE, config }).returning();
      await tx.insert(ConfigurationsLogs).values({
        configurationId: saved.id,
        changedBy: staffId,
        previousConfig: existing?.config ?? {},
        updatedConfig: config,
        updatedAt: new Date(),
      });
      return saved;
    });
    return NextResponse.json({ error: false, data: result.config });
  } catch (error) {
    console.error('[SMS settings PUT]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to save SMS settings.' }, { status: 500 });
  }
}
