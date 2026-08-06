import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { HistoryFindings } from '@/database/models/service-tracking/history-findings.model';
import { HistoryFindingParts } from '@/database/models/service-tracking/history-finding-parts.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { eq, and, ilike, desc, inArray } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// GET /api/service-tracking/history-findings?search=&phase=INSPECTION&all=true&appointmentId=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const phase = searchParams.get('phase');
  const all = searchParams.get('all') === 'true';
  const appointmentId = searchParams.get('appointmentId');

  try {
    let query = Database.select({
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
      .leftJoin(Appointments, eq(HistoryFindings.appointmentId, Appointments.id))
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id));

    if (appointmentId && isValidUUID(appointmentId)) {
      query = query.where(eq(HistoryFindings.appointmentId, appointmentId));
    }
    if (phase) {
      query = query.where(eq(HistoryFindings.phase, phase));
    }
    if (search.trim()) {
      query = query.where(ilike(HistoryFindings.description, `%${search.trim()}%`));
    }

    query = query.orderBy(desc(HistoryFindings.recordedAt));
    if (all) {
      query = query.limit(100);
    }

    const results = await query;

    // Fetch parts for each history finding
    const historyIds = results.map(h => h.id);
    let partsMap: Record<string, any[]> = {};
    if (historyIds.length > 0) {
      const parts = await Database.select()
        .from(HistoryFindingParts)
        .where(inArray(HistoryFindingParts.historyFindingId, historyIds));
      for (const p of parts) {
        if (!partsMap[p.historyFindingId]) partsMap[p.historyFindingId] = [];
        partsMap[p.historyFindingId].push(p);
      }
    }

    const data = results.map(h => ({
      ...h,
      parts: partsMap[h.id] || [],
    }));

    return NextResponse.json({
      error: false,
      message: 'History findings retrieved.',
      data,
    });
  } catch (e) {
    console.error('[GET /api/service-tracking/history-findings]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Unable to fetch history findings.' },
      { status: 500 }
    );
  }
}

// POST /api/service-tracking/history-findings
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json(
      { error: true, errorType: 'fe', errorTitle: 'Invalid JSON', errorMessage: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { appointmentId, phase, findings } = body;
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid appointment', errorMessage: 'appointmentId is required.' },
      { status: 422 }
    );
  }
  if (!phase || !['INSPECTION'].includes(phase)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid phase', errorMessage: 'phase must be INSPECTION.' },
      { status: 422 }
    );
  }
  if (!Array.isArray(findings) || findings.length === 0) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'No findings', errorMessage: 'findings array is required.' },
      { status: 422 }
    );
  }

  try {
    const inserted = [];
    for (const f of findings) {
      if (!f.description || typeof f.description !== 'string' || f.description.trim().length === 0) {
        return NextResponse.json(
          { error: true, errorType: 'fve', errorTitle: 'Invalid description', errorMessage: 'Each finding must have a description.' },
          { status: 422 }
        );
      }
      const [historyFinding] = await Database.insert(HistoryFindings)
        .values({
          appointmentId,
          description: f.description.trim(),
          phase,
          recordedAt: new Date(),
        })
        .returning();

      if (f.parts && Array.isArray(f.parts)) {
        const partValues = f.parts.map((p: any) => ({
          historyFindingId: historyFinding.id,
          partName: p.partName?.trim() || 'Part',
          quantity: p.quantity || 1,
          priceAtTime: p.priceAtTime || 0,
          isPms: p.isPms || false,
        }));
        if (partValues.length > 0) {
          await Database.insert(HistoryFindingParts).values(partValues);
        }
      }

      inserted.push(historyFinding);
    }

    return NextResponse.json({
      error: false,
      message: `${inserted.length} finding(s) recorded to history.`,
      data: inserted,
    });
  } catch (e) {
    console.error('[POST /api/service-tracking/history-findings]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not record history findings.' },
      { status: 500 }
    );
  }
}