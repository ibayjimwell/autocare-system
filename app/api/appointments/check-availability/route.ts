import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Services } from '@/database/models/services/services.model';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { getAppointmentConfig, getEffectiveConfigForDate } from '@/utils/configurations';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorType: 'fe', errorTitle: 'Invalid JSON', errorMessage: 'Request body must be JSON.' },
      { status: 400 }
    );
  }

  const { date, startTime, serviceIds } = body;
  if (!date || !startTime || !serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Missing fields',
        errorMessage: 'date, startTime, and serviceIds are required.',
      },
      { status: 400 }
    );
  }

  try {
    // 1. Get config
    const { merged } = await getAppointmentConfig();
    const effective = getEffectiveConfigForDate(merged, date);
    if (!effective.isOpen) {
      return NextResponse.json({
        error: false,
        available: false,
        message: `Shop is closed on ${date}${effective.reason ? ': ' + effective.reason : ''}`,
      });
    }

    const { openingTime, closingTime, capacity } = effective;

    // Check if startTime is within opening hours and leaves enough time before closing
    const [openHour, openMin] = openingTime.split(':').map(Number);
    const [closeHour, closeMin] = closingTime.split(':').map(Number);
    const shopOpen = openHour * 60 + openMin;
    const shopClose = closeHour * 60 + closeMin;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;

    // Fetch services to compute total duration
    const services = await Database.select({
      estimatedDuration: Services.estimatedDuration,
    })
      .from(Services)
      .where(inArray(Services.id, serviceIds));
    const totalDuration = services.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0);
    if (totalDuration === 0) {
      return NextResponse.json({
        error: false,
        available: false,
        message: 'Total duration zero, cannot book.',
      });
    }

    const endMinutes = startMinutes + totalDuration;
    if (startMinutes < shopOpen || endMinutes > shopClose) {
      return NextResponse.json({
        error: false,
        available: false,
        message: `Time must be between ${openingTime} and ${closingTime}.`,
      });
    }

    // Check capacity: count overlapping appointments
    const existing = await Database.select({
      appointmentTime: Appointments.appointmentTime,
      services: Appointments.services,
    })
      .from(Appointments)
      .where(and(eq(Appointments.appointmentDate, date), ne(Appointments.status, 'CANCELLED')));

    let overlappingCount = 0;
    for (const appt of existing) {
      const apptServiceIds = appt.services || [];
      if (apptServiceIds.length === 0) continue;
      const apptServices = await Database.select({
        estimatedDuration: Services.estimatedDuration,
      })
        .from(Services)
        .where(inArray(Services.id, apptServiceIds));
      const apptDuration = apptServices.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0);
      if (apptDuration === 0) continue;
      const [h, m] = appt.appointmentTime.split(':').map(Number);
      const apptStart = h * 60 + m;
      const apptEnd = apptStart + apptDuration;
      if (startMinutes < apptEnd && endMinutes > apptStart) {
        overlappingCount++;
      }
    }

    const available = overlappingCount < capacity;
    return NextResponse.json({
      error: false,
      available,
      message: available ? 'Time is available.' : 'Time slot is full.',
    });
  } catch (e) {
    console.error('[check-availability] Error:', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Unable to check availability.' },
      { status: 500 }
    );
  }
}