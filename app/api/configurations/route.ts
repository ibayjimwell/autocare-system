import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Configurations } from '@/database/models/configurations/configurations.model';
import { ConfigurationsLogs } from '@/database/models/configurations/configurations-logs.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { AppointmentStatusHistory } from '@/database/models/appointments/appointments-status-history.model';
import { eq, and, ne } from 'drizzle-orm';

/* ------------------------------------------------------------------
   PAYMENT CONFIG NORMALIZATION / VALIDATION
------------------------------------------------------------------- */

function normalizePaymentConfig(config: any) {
  const source = config && typeof config === 'object' ? config : {};

  const parkingRaw = Number(
    source.parkingFeePerDay ??
      source.parkingFee ??
      source.parkingRate ??
      0,
  );

  const parkingFeePerDay = Number.isFinite(parkingRaw)
    ? Math.max(0, Math.round(parkingRaw * 100) / 100)
    : 0;

  const rawFees = Array.isArray(source.defaultFees)
    ? source.defaultFees
    : [];

  const defaultFees = rawFees.map((fee: any, index: number) => ({
    id:
      typeof fee?.id === 'string' && fee.id.trim()
        ? fee.id.trim()
        : `fee-${Date.now()}-${index}`,
    title: String(fee?.title ?? '').trim(),
    amount: Math.max(0, Number(fee?.amount ?? 0) || 0),
    isActive: fee?.isActive !== false,
  }));

  const rawDiscounts = Array.isArray(source.defaultDiscounts)
    ? source.defaultDiscounts
    : [];

  const defaultDiscounts = rawDiscounts.map((discount: any, index: number) => {
    const type = discount?.type === 'percentage' ? 'percentage' : 'fixed';
    const value = Math.max(0, Number(discount?.value ?? 0) || 0);

    return {
      id:
        typeof discount?.id === 'string' && discount.id.trim()
          ? discount.id.trim()
          : `discount-${Date.now()}-${index}`,
      title: String(discount?.title ?? '').trim(),
      type,
      value: type === 'percentage' ? Math.min(100, value) : value,
      isActive: discount?.isActive !== false,
    };
  });

  return {
    parkingFeePerDay: Number(parkingFeePerDay.toFixed(2)),
    defaultFees,
    defaultDiscounts,
  };
}

function validatePaymentConfig(config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'Config must be an object.';
  }

  const parking = Number(config.parkingFeePerDay ?? 0);
  if (!Number.isFinite(parking) || parking < 0) {
    return 'Parking fee must be zero or greater.';
  }

  const fees = Array.isArray(config.defaultFees) ? config.defaultFees : [];
  for (const fee of fees) {
    const amount = Number(fee?.amount ?? 0);
    if (!String(fee?.title ?? '').trim()) {
      return 'Every default fee must have a title.';
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return 'Every default fee amount must be zero or greater.';
    }
  }

  const discounts = Array.isArray(config.defaultDiscounts)
    ? config.defaultDiscounts
    : [];

  for (const discount of discounts) {
    const value = Number(discount?.value ?? 0);
    if (!String(discount?.title ?? '').trim()) {
      return 'Every default discount must have a title.';
    }
    if (!Number.isFinite(value) || value < 0) {
      return 'Every default discount value must be zero or greater.';
    }
    if (discount?.type === 'percentage' && value > 100) {
      return 'Percentage discounts cannot exceed 100%.';
    }
  }

  return null;
}

// ------------------------------------------------------------------
// GET /api/configurations?module=...
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const module = searchParams.get('module');

  if (!module) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Missing module',
        errorMessage: 'Module query parameter is required.',
      },
      { status: 400 },
    );
  }

  try {
    const [config] = await Database.select()
      .from(Configurations)
      .where(eq(Configurations.module, module));

    if (!config) {
      return NextResponse.json({
        error: false,
        message: 'No configuration found; using defaults.',
        data: null,
      });
    }

    return NextResponse.json({
      error: false,
      message: 'Configuration retrieved.',
      data: config,
    });
  } catch (e) {
    console.error('[GET /api/configurations]', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch configuration.',
      },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// PUT /api/configurations
// Body: { module: string, config: object }
// ------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'auth',
        errorTitle: 'Unauthorized',
        errorMessage: 'You must be logged in.',
      },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid JSON',
        errorMessage: 'Request body must be valid JSON.',
      },
      { status: 400 },
    );
  }

  const { module: rawModule, config: rawConfig } = body;
  const module = typeof rawModule === 'string' ? rawModule.trim() : '';

  if (!module) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid module',
        errorMessage: 'Module is required.',
      },
      { status: 400 },
    );
  }

  if (!rawConfig || typeof rawConfig !== 'object') {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid config',
        errorMessage: 'Config must be an object.',
      },
      { status: 400 },
    );
  }

  const config = module === 'payments'
    ? normalizePaymentConfig(rawConfig)
    : rawConfig;

  if (module === 'payments') {
    const validationMessage = validatePaymentConfig(config);
    if (validationMessage) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle: 'Invalid payment configuration',
          errorMessage: validationMessage,
        },
        { status: 422 },
      );
    }
  }

  try {
    const [existing] = await Database.select()
      .from(Configurations)
      .where(eq(Configurations.module, module));

    const now = new Date();
    const staffId = session.user.id;

    if (existing) {
      const previousConfig = existing.config;

      const [updated] = await Database.update(Configurations)
        .set({
          config,
          updatedAt: now,
        })
        .where(eq(Configurations.id, existing.id))
        .returning();

      await Database.insert(ConfigurationsLogs).values({
        configurationId: existing.id,
        changedBy: staffId,
        previousConfig,
        updatedConfig: config,
        updatedAt: now,
      });

      if (module === 'appointments') {
        const prevOverrides =
          previousConfig && typeof previousConfig === 'object'
            ? (previousConfig as any).dateOverrides || {}
            : {};
        const newOverrides =
          config && typeof config === 'object'
            ? (config as any).dateOverrides || {}
            : {};

        for (const [dateStr, newOverride] of Object.entries(newOverrides)) {
          if ((newOverride as any)?.isOpen === false) {
            const prevOverride = prevOverrides[dateStr];
            if (!prevOverride || prevOverride.isOpen !== false) {
              await cancelAppointmentsOnDate(
                dateStr,
                `The shop is closed on ${dateStr}, please book another date.`,
                staffId,
              );
            }
          }
        }
      }

      return NextResponse.json({
        error: false,
        message: 'Configuration updated.',
        data: updated,
      });
    }

    const [created] = await Database.insert(Configurations)
      .values({
        module,
        config,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await Database.insert(ConfigurationsLogs).values({
      configurationId: created.id,
      changedBy: staffId,
      previousConfig: {},
      updatedConfig: config,
      updatedAt: now,
    });

    if (module === 'appointments') {
      const newOverrides =
        config && typeof config === 'object'
          ? (config as any).dateOverrides || {}
          : {};

      for (const [dateStr, newOverride] of Object.entries(newOverrides)) {
        if ((newOverride as any)?.isOpen === false) {
          await cancelAppointmentsOnDate(
            dateStr,
            `The shop is closed on ${dateStr}, please book another date.`,
            staffId,
          );
        }
      }
    }

    return NextResponse.json({
      error: false,
      message: 'Configuration created.',
      data: created,
    });
  } catch (e) {
    console.error('[PUT /api/configurations]', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to update configuration.',
      },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// Helper: Cancel all non-cancelled appointments on a given date
// ------------------------------------------------------------------
async function cancelAppointmentsOnDate(
  dateStr: string,
  reason: string,
  changedBy: string,
) {
  try {
    const toCancel = await Database.select()
      .from(Appointments)
      .where(
        and(
          eq(Appointments.appointmentDate, dateStr),
          ne(Appointments.status, 'CANCELLED'),
        ),
      );

    if (toCancel.length === 0) {
      console.log(`[configurations] No appointments to cancel on ${dateStr}`);
      return;
    }

    for (const appt of toCancel) {
      await Database.update(Appointments)
        .set({
          status: 'CANCELLED',
          updatedAt: new Date(),
          notes: reason,
        })
        .where(eq(Appointments.id, appt.id));

      await Database.insert(AppointmentStatusHistory).values({
        appointmentId: appt.id,
        fromStatus: appt.status,
        toStatus: 'CANCELLED',
        changedBy,
        metadata: { reason },
      });
    }

    console.log(`[configurations] Cancelled ${toCancel.length} appointments on ${dateStr}`);
  } catch (err) {
    console.error(`[configurations] Failed to cancel appointments on ${dateStr}:`, err);
    throw err;
  }
}
