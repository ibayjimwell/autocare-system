import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// ------------------------------------------------------------------
// GET /api/customers/[id]/stats
// Returns: { vehicleCount, visitCount, recentCompleted: [Appointment] }
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  // Validate customer ID
  if (!isValidUUID(customerId)) {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Invalid ID',
      errorMessage: 'Customer ID must be a valid UUID.',
    }, { status: 422 });
  }

  // Check if customer exists
  try {
    const [customer] = await Database.select({ id: Customers.id })
      .from(Customers)
      .where(eq(Customers.id, customerId));
    if (!customer) {
      return NextResponse.json({
        error: true,
        errorType: 'auth',
        errorTitle: 'Customer not found',
        errorMessage: 'Customer does not exist.',
      }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: 'dbe',
      errorTitle: 'Database error',
      errorMessage: 'Unable to verify customer.',
    }, { status: 500 });
  }

  try {
    // 1. Count vehicles
    const [vehicleCountResult] = await Database
      .select({ count: sql<number>`count(*)` })
      .from(Vehicles)
      .where(eq(Vehicles.customerId, customerId));
    const vehicleCount = Number(vehicleCountResult?.count || 0);

    // 2. Count all appointments (total visits)
    const [visitCountResult] = await Database
      .select({ count: sql<number>`count(*)` })
      .from(Appointments)
      .where(eq(Appointments.customerId, customerId));
    const visitCount = Number(visitCountResult?.count || 0);

    // 3. Get last 5 completed appointments (for "Recent History")
    const recentCompleted = await Database.select({
      id: Appointments.id,
      trackingNumber: Appointments.trackingNumber,
      appointmentDate: Appointments.appointmentDate,
      appointmentTime: Appointments.appointmentTime,
      status: Appointments.status,
      createdAt: Appointments.createdAt,
    })
      .from(Appointments)
      .where(
        and(
          eq(Appointments.customerId, customerId),
          eq(Appointments.status, 'COMPLETED')
        )
      )
      .orderBy(desc(Appointments.appointmentDate), desc(Appointments.appointmentTime))
      .limit(5);

    // Return the stats
    return NextResponse.json({
      error: false,
      message: 'Stats retrieved successfully.',
      data: {
        vehicleCount,
        visitCount,
        recentCompleted,
      },
    }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/customers/[id]/stats] Error:', e);
    return NextResponse.json({
      error: true,
      errorType: 'dbe',
      errorTitle: 'Database error',
      errorMessage: 'Unable to fetch stats.',
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}