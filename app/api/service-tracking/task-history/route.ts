import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { TaskHistory } from '@/database/models/service-tracking/task-history.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

/* ================================================================
   GET TASK HISTORY

   Supports:
     appointmentId         - history for one appointment
     excludeAppointmentId  - useful for reuse pickers
     all                   - enable picker result limit
     search                - title/customer/vehicle/tracking search
     phase                 - INSPECTION or WORK
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

  if (phase && !['INSPECTION', 'WORK'].includes(phase)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid phase',
        errorMessage: 'phase must be INSPECTION or WORK.',
      },
      { status: 422 },
    );
  }

  try {
    const conditions = [];

    if (appointmentId) {
      conditions.push(eq(TaskHistory.appointmentId, appointmentId));
    }

    if (excludeAppointmentId) {
      conditions.push(ne(TaskHistory.appointmentId, excludeAppointmentId));
    }

    if (phase) {
      conditions.push(eq(TaskHistory.phase, phase));
    }

    if (search) {
      conditions.push(
        or(
          ilike(TaskHistory.title, `%${search}%`),
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
      id: TaskHistory.id,
      appointmentId: TaskHistory.appointmentId,
      title: TaskHistory.title,
      durationMinutes: TaskHistory.durationMinutes,
      phase: TaskHistory.phase,
      completedAt: TaskHistory.completedAt,
      createdAt: TaskHistory.createdAt,

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
      .leftJoin(
        Appointments,
        eq(
          TaskHistory.appointmentId,
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
        desc(TaskHistory.completedAt),
        desc(TaskHistory.createdAt),
      );

    const results = all
      ? await query.limit(200)
      : await query.limit(500);

    return NextResponse.json({
      error: false,
      message: 'Task history retrieved.',
      data: results,
    });
  } catch (error) {
    console.error(
      '[GET /api/service-tracking/task-history]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch task history.',
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
   POST TASK HISTORY
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
    tasks,
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

  if (!['INSPECTION', 'WORK'].includes(phase)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid phase',
        errorMessage: 'phase must be INSPECTION or WORK.',
      },
      { status: 422 },
    );
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'No tasks',
        errorMessage: 'tasks array is required.',
      },
      { status: 422 },
    );
  }

  try {
    const records = tasks
      .map((task: any) => ({
        appointmentId,
        title: String(task?.title || '').trim(),
        durationMinutes:
          task?.durationMinutes === undefined ||
          task?.durationMinutes === null ||
          task?.durationMinutes === ''
            ? null
            : Math.max(
                0,
                Number(task.durationMinutes) || 0,
              ),
        phase,
        completedAt: new Date(),
      }))
      .filter(
        (record: any) =>
          record.title.length > 0,
      );

    if (records.length === 0) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle: 'Invalid tasks',
          errorMessage: 'At least one task must have a title.',
        },
        { status: 422 },
      );
    }

    const inserted = await Database.insert(TaskHistory)
      .values(records)
      .returning();

    return NextResponse.json({
      error: false,
      message: `${inserted.length} task(s) recorded to history.`,
      data: inserted,
    });
  } catch (error) {
    console.error(
      '[POST /api/service-tracking/task-history]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not record task history.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
