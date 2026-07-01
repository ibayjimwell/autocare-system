import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillFindings } from '@/database/models/payments/final-bill-findings.model';
import { FinalBillFindingParts } from '@/database/models/payments/final-bill-finding-parts.model';
import { FinalBillFees } from '@/database/models/payments/final-bill-fees.model';
import { FinalBillDiscounts } from '@/database/models/payments/final-bill-discounts.model';
import { FinalBillWorkTasks } from '@/database/models/payments/final-bill-work-tasks.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Invalid ID',
      errorMessage: 'ID must be a valid UUID.',
      errorLog: null,
    }, { status: 422 });
  }

  try {
    const [bill] = await Database
      .select()
      .from(FinalBill)
      .where(eq(FinalBill.id, id))
      .limit(1);

    if (!bill) {
      return NextResponse.json({
        error: true,
        errorType: 'auth',
        errorTitle: 'Bill not found',
        errorMessage: 'Final bill does not exist.',
        errorLog: null,
      }, { status: 404 });
    }

    // Fetch related bill items in parallel
    const [
      findings,
      fees,
      discounts,
      workTasks,
      appointmentRow,
    ] = await Promise.all([
      Database.select().from(FinalBillFindings).where(eq(FinalBillFindings.finalBillId, id)),
      Database.select().from(FinalBillFees).where(eq(FinalBillFees.finalBillId, id)),
      Database.select().from(FinalBillDiscounts).where(eq(FinalBillDiscounts.finalBillId, id)),
      Database.select().from(FinalBillWorkTasks).where(eq(FinalBillWorkTasks.finalBillId, id)),
      // Fetch appointment with customer and vehicle – NO services here
      Database
        .select({
          id: Appointments.id,
          appointmentDate: Appointments.appointmentDate,
          appointmentTime: Appointments.appointmentTime,
          customer: {
            fullname: Customers.fullname,
            email: Customers.email,
            phone: Customers.phone,
          },
          vehicle: {
            plateNumber: Vehicles.plateNumber,
            make: Vehicles.make,
            model: Vehicles.model,
            year: Vehicles.year,
          },
        })
        .from(Appointments)
        .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
        .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
        .where(eq(Appointments.id, bill.appointmentId))
        .limit(1),
    ]);

    // Parts for each finding
    const findingsWithParts = await Promise.all(
      findings.map(async (f) => {
        const parts = await Database
          .select()
          .from(FinalBillFindingParts)
          .where(eq(FinalBillFindingParts.finalBillFindingId, f.id));
        return { ...f, parts };
      })
    );

    const data = {
      ...bill,
      findings: findingsWithParts,
      fees,
      discounts,
      workTasks,
      appointment: appointmentRow[0] || null,   // will be merged with services on frontend
    };

    return NextResponse.json({
      error: false,
      message: 'Final bill details retrieved.',
      data,
    }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/payments/final-bills/[id]] Error:', e);
    return NextResponse.json({
      error: true,
      errorType: 'dbe',
      errorTitle: 'Database error',
      errorMessage: 'Unable to fetch final bill details.',
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}