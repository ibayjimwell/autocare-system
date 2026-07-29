// app/api/configurations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Configurations } from '@/database/models/configurations/configurations.model';
import { ConfigurationsLogs } from '@/database/models/configurations/configurations-logs.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { AppointmentStatusHistory } from '@/database/models/appointments/appointments-status-history.model';
import { eq, and, ne } from 'drizzle-orm';

// ------------------------------------------------------------------
// GET /api/configurations?module=appointments
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
      { status: 400 }
    );
  }

  try {
    const [config] = await Database.select()
      .from(Configurations)
      .where(eq(Configurations.module, module));

    if (!config) {
      // Return a default config when not found
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
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// PUT /api/configurations – Create or update configuration
// Body: { module: string, config: object }
// ------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  let body;
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
      { status: 400 }
    );
  }

  const { module, config } = body;
  if (!module || typeof module !== 'string') {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid module', errorMessage: 'Module is required.' },
      { status: 400 }
    );
  }
  if (!config || typeof config !== 'object') {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid config', errorMessage: 'Config must be an object.' },
      { status: 400 }
    );
  }

  try {
    // Find existing config
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

      // Log the change
      await Database.insert(ConfigurationsLogs).values({
        configurationId: existing.id,
        changedBy: staffId,
        previousConfig,
        updatedConfig: config,
        updatedAt: now,
      });

      // --- Module-specific logic: cancel appointments when a date is closed ---
      if (module === 'appointments') {
        const prevOverrides = previousConfig.dateOverrides || {};
        const newOverrides = config.dateOverrides || {};

        for (const [dateStr, newOverride] of Object.entries(newOverrides)) {
          if (newOverride.isOpen === false) {
            const prevOverride = prevOverrides[dateStr];
            // If was not closed before, or was open, now closed -> cancel appointments
            if (!prevOverride || prevOverride.isOpen !== false) {
              await cancelAppointmentsOnDate(dateStr, `The shop is closed on ${dateStr}, please book another date.`, staffId);
            }
          }
        }
      }

      return NextResponse.json({
        error: false,
        message: 'Configuration updated.',
        data: updated,
      });
    } else {
      // Create new
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

      // Also cancel appointments if any date is closed from the start
      if (module === 'appointments') {
        const newOverrides = config.dateOverrides || {};
        for (const [dateStr, newOverride] of Object.entries(newOverrides)) {
          if (newOverride.isOpen === false) {
            await cancelAppointmentsOnDate(dateStr, `The shop is closed on ${dateStr}, please book another date.`, staffId);
          }
        }
      }

      return NextResponse.json({
        error: false,
        message: 'Configuration created.',
        data: created,
      });
    }
  } catch (e) {
    console.error('[PUT /api/configurations]', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to update configuration.',
      },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// Helper: Cancel all non‑cancelled appointments on a given date
// ------------------------------------------------------------------
async function cancelAppointmentsOnDate(dateStr: string, reason: string, changedBy: string) {
  try {
    const toCancel = await Database.select()
      .from(Appointments)
      .where(and(
        eq(Appointments.appointmentDate, dateStr),
        ne(Appointments.status, 'CANCELLED')
      ));

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
        changedBy: changedBy,
        metadata: { reason },
      });
    }

    console.log(`[configurations] Cancelled ${toCancel.length} appointments on ${dateStr}`);
  } catch (err) {
    console.error(`[configurations] Failed to cancel appointments on ${dateStr}:`, err);
    throw err; // rethrow so the PUT request fails and the user knows
  }
}