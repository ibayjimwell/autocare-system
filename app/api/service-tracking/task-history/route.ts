import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { TaskHistory } from '@/database/models/service-tracking/task-history.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { eq, desc, and, sql, ilike } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// ------------------------------------------------------------------
// GET /api/service-tracking/task-history
// Query params:
//   - appointmentId (optional): fetch history for a specific appointment
//   - all (optional, boolean): fetch all history (for picker)
//   - search (optional): filter by task title
//   - phase (optional): 'INSPECTION' or 'WORK'
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get('appointmentId');
  const all = searchParams.get('all') === 'true';
  const search = searchParams.get('search') || '';
  const phase = searchParams.get('phase');

  try {
    // Build query
    let query = Database.select({
      id: TaskHistory.id,
      appointmentId: TaskHistory.appointmentId,
      title: TaskHistory.title,
      durationMinutes: TaskHistory.durationMinutes,
      phase: TaskHistory.phase,
      completedAt: TaskHistory.completedAt,
      createdAt: TaskHistory.createdAt,
      // Include appointment, customer, vehicle info for the picker
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
      .from(TaskHistory)
      .leftJoin(Appointments, eq(TaskHistory.appointmentId, Appointments.id))
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id));

    // Filters
    if (appointmentId && isValidUUID(appointmentId)) {
      query = query.where(eq(TaskHistory.appointmentId, appointmentId));
    }
    if (phase && (phase === 'INSPECTION' || phase === 'WORK')) {
      query = query.where(eq(TaskHistory.phase, phase));
    }
    if (search.trim()) {
      query = query.where(ilike(TaskHistory.title, `%${search.trim()}%`));
    }

    // If we fetch for a specific appointment, order by completedAt desc
    // If all, order by completedAt desc and limit to 100 (or use pagination later)
    query = query.orderBy(desc(TaskHistory.completedAt));
    if (all) {
      query = query.limit(100); // reasonable limit for the picker
    }

    const results = await query;
    return NextResponse.json({
      error: false,
      message: 'Task history retrieved.',
      data: results,
    });
  } catch (e) {
    console.error('[GET /api/service-tracking/task-history]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Unable to fetch task history.' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// POST /api/service-tracking/task-history
// Body: { appointmentId, phase, tasks: [{ title, durationMinutes }] }
// Record multiple tasks into history.
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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
      { error: true, errorType: 'fe', errorTitle: 'Invalid JSON', errorMessage: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { appointmentId, phase, tasks } = body;
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid appointment', errorMessage: 'appointmentId is required.' },
      { status: 422 }
    );
  }
  if (!phase || !['INSPECTION', 'WORK'].includes(phase)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid phase', errorMessage: 'phase must be INSPECTION or WORK.' },
      { status: 422 }
    );
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'No tasks', errorMessage: 'tasks array is required.' },
      { status: 422 }
    );
  }

  try {
    const records = tasks.map((t: any) => ({
      appointmentId,
      title: t.title?.trim() || 'Task',
      durationMinutes: t.durationMinutes ? parseInt(t.durationMinutes) : null,
      phase,
      completedAt: new Date(),
    }));

    const inserted = await Database.insert(TaskHistory).values(records).returning();

    return NextResponse.json({
      error: false,
      message: `${inserted.length} task(s) recorded to history.`,
      data: inserted,
    });
  } catch (e) {
    console.error('[POST /api/service-tracking/task-history]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not record task history.' },
      { status: 500 }
    );
  }
}