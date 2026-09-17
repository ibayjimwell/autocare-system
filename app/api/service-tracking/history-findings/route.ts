import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { HistoryFindings } from '@/database/models/service-tracking/history-findings.model';
import { HistoryFindingParts } from '@/database/models/service-tracking/history-finding-parts.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { and, desc, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

/* ================================================================
   GET FINDING HISTORY
================================================================ */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
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

  const { searchParams } = new URL(req.url);

  const appointmentId = searchParams.get('appointmentId');
  const excludeAppointmentId = searchParams.get('excludeAppointmentId');
  const all = searchParams.get('all') === 'true';
  const search = searchParams.get('search')?.trim() || '';
  const phase = searchParams.get('phase')?.trim() || '';

  if (appointmentId && !isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid appointment ID',
        errorMessage: 'appointmentId must be a valid UUID.',
      },
      { status: 422 },
    );
  }

  if (excludeAppointmentId && !isValidUUID(excludeAppointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid exclusion ID',
        errorMessage: 'excludeAppointmentId must be a valid UUID.',
      },
      { status: 422 },
    );
  }

  if (phase && phase !== 'INSPECTION') {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid phase',
        errorMessage: 'phase must be INSPECTION.',
      },
      { status: 422 },
    );
  }

  try {
    const conditions = [];

    if (appointmentId) {
      conditions.push(eq(HistoryFindings.appointmentId, appointmentId));
    }

    if (excludeAppointmentId) {
      conditions.push(ne(HistoryFindings.appointmentId, excludeAppointmentId));
    }

    if (phase) {
      conditions.push(eq(HistoryFindings.phase, phase));
    }

    if (search) {
      conditions.push(
        or(
          ilike(HistoryFindings.description, `%${search}%`),
          ilike(Appointments.trackingNumber, `%${search}%`),
          ilike(Customers.fullname, `%${search}%`),
          ilike(Customers.email, `%${search}%`),
          ilike(Customers.phone, `%${search}%`),
          ilike(Vehicles.make, `%${search}%`),
          ilike(Vehicles.model, `%${search}%`),
          ilike(Vehicles.plateNumber, `%${search}%`),
        ),
      );
    }

    const query = Database.select({
      id: HistoryFindings.id,
      appointmentId: HistoryFindings.appointmentId,
      description: HistoryFindings.description,
      phase: HistoryFindings.phase,
      recordedAt: HistoryFindings.recordedAt,
      createdAt: HistoryFindings.createdAt,

      appointment: {
        trackingNumber: Appointments.trackingNumber,
        appointmentDate: Appointments.appointmentDate,
        appointmentTime: Appointments.appointmentTime,
      },

      customer: {
        id: Customers.id,
        fullname: Customers.fullname,
        email: Customers.email,
        phone: Customers.phone,
      },

      vehicle: {
        id: Vehicles.id,
        make: Vehicles.make,
        model: Vehicles.model,
        year: Vehicles.year,
        plateNumber: Vehicles.plateNumber,
      },
    })
      .from(HistoryFindings)
      .leftJoin(
        Appointments,
        eq(
          HistoryFindings.appointmentId,
          Appointments.id,
        ),
      )
      .leftJoin(
        Customers,
        eq(
          Appointments.customerId,
          Customers.id,
        ),
      )
      .leftJoin(
        Vehicles,
        eq(
          Appointments.vehicleId,
          Vehicles.id,
        ),
      )
      .where(
        conditions.length > 0
          ? and(...conditions)
          : undefined,
      )
      .orderBy(
        desc(HistoryFindings.recordedAt),
        desc(HistoryFindings.createdAt),
      );

    const results = all
      ? await query.limit(200)
      : await query.limit(500);

    const historyIds = results.map(
      (finding) => finding.id,
    );

    const partsMap: Record<string, any[]> = {};

    if (historyIds.length > 0) {
      const parts = await Database.select()
        .from(HistoryFindingParts)
        .where(
          inArray(
            HistoryFindingParts.historyFindingId,
            historyIds,
          ),
        )
        .orderBy(
          HistoryFindingParts.createdAt,
        );

      for (const part of parts) {
        if (!partsMap[part.historyFindingId]) {
          partsMap[part.historyFindingId] = [];
        }

        partsMap[part.historyFindingId].push(
          part,
        );
      }
    }

    const data = results.map((finding) => ({
      ...finding,
      parts: partsMap[finding.id] || [],
    }));

    return NextResponse.json({
      error: false,
      message: 'History findings retrieved.',
      data,
    });
  } catch (error) {
    console.error(
      '[GET /api/service-tracking/history-findings]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch history findings.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}

/* ================================================================
   POST FINDING HISTORY
================================================================ */

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
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

  const {
    appointmentId,
    phase,
    findings,
  } = body || {};

  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid appointment',
        errorMessage: 'appointmentId is required and must be a valid UUID.',
      },
      { status: 422 },
    );
  }

  if (phase !== 'INSPECTION') {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid phase',
        errorMessage: 'phase must be INSPECTION.',
      },
      { status: 422 },
    );
  }

  if (!Array.isArray(findings) || findings.length === 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'No findings',
        errorMessage: 'findings array is required.',
      },
      { status: 422 },
    );
  }

  try {
    const inserted: any[] = [];

    for (const finding of findings) {
      const description = String(
        finding?.description || '',
      ).trim();

      if (!description) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'fve',
            errorTitle: 'Invalid description',
            errorMessage: 'Each finding must have a description.',
          },
          { status: 422 },
        );
      }

      const [historyFinding] = await Database.insert(
        HistoryFindings,
      )
        .values({
          appointmentId,
          description,
          phase,
          recordedAt: new Date(),
        })
        .returning();

      const parts = Array.isArray(finding?.parts)
        ? finding.parts
            .map((part: any) => ({
              historyFindingId: historyFinding.id,
              partName: String(
                part?.partName || 'Part',
              ).trim() || 'Part',
              quantity: Math.max(
                1,
                Number(part?.quantity) || 1,
              ),
              priceAtTime: Math.max(
                0,
                Number(part?.priceAtTime) || 0,
              ),
              isPms: Boolean(part?.isPms),
            }))
            .filter(
              (part: any) =>
                part.partName.length > 0,
            )
        : [];

      if (parts.length > 0) {
        await Database.insert(
          HistoryFindingParts,
        ).values(parts);
      }

      inserted.push(historyFinding);
    }

    return NextResponse.json({
      error: false,
      message: `${inserted.length} finding(s) recorded to history.`,
      data: inserted,
    });
  } catch (error) {
    console.error(
      '[POST /api/service-tracking/history-findings]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not record history findings.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
