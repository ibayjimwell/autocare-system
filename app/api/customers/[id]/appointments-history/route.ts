// app/api/customers/[id]/appointments-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { AppointmentStatusHistory } from '@/database/models/appointments/appointments-status-history.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { Services } from '@/database/models/services/services.model';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { eq, inArray, desc } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  if (!isValidUUID(customerId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid customer ID' }, { status: 422 });
  }

  try {
    // Fetch all appointments for this customer
    const appointments = await Database.select({
      id: Appointments.id,
      customerId: Appointments.customerId,
      vehicleId: Appointments.vehicleId,
      services: Appointments.services,
      trackingNumber: Appointments.trackingNumber,
      appointmentDate: Appointments.appointmentDate,
      appointmentTime: Appointments.appointmentTime,
      status: Appointments.status,
      notes: Appointments.notes,
      createdAt: Appointments.createdAt,
      updatedAt: Appointments.updatedAt,
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
      .from(Appointments)
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
      .where(eq(Appointments.customerId, customerId))
      .orderBy(desc(Appointments.createdAt));

    const appointmentIds = appointments.map(a => a.id);

    if (appointmentIds.length === 0) {
      return NextResponse.json({ error: false, data: [] }, { status: 200 });
    }

    // Fetch all status history for these appointments
    const history = await Database.select({
      id: AppointmentStatusHistory.id,
      appointmentId: AppointmentStatusHistory.appointmentId,
      fromStatus: AppointmentStatusHistory.fromStatus,
      toStatus: AppointmentStatusHistory.toStatus,
      changedBy: AppointmentStatusHistory.changedBy,
      metadata: AppointmentStatusHistory.metadata,
      createdAt: AppointmentStatusHistory.createdAt,
      staff: {
        id: Staffs.id,
        fullname: Staffs.fullname,
        username: Staffs.username,
      },
    })
      .from(AppointmentStatusHistory)
      .leftJoin(Staffs, eq(AppointmentStatusHistory.changedBy, Staffs.id))
      .where(inArray(AppointmentStatusHistory.appointmentId, appointmentIds))
      .orderBy(desc(AppointmentStatusHistory.createdAt));

    // Build a map of appointmentId -> service details
    const allServiceIds = new Set<string>();
    for (const appt of appointments) {
      if (appt.services) {
        for (const sid of appt.services) allServiceIds.add(sid);
      }
    }
    let serviceMap: Record<string, any> = {};
    if (allServiceIds.size > 0) {
      const serviceList = await Database.select({
        id: Services.id,
        name: Services.name,
        description: Services.description,
        basePrice: Services.basePrice,
        estimatedDuration: Services.estimatedDuration,
        type: Services.type,
      })
        .from(Services)
        .where(inArray(Services.id, Array.from(allServiceIds)));
      serviceMap = serviceList.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
    }

    // Merge appointment data into each history entry
    const enrichedHistory = history.map(h => {
      const appt = appointments.find(a => a.id === h.appointmentId);
      const services = (appt?.services || []).map(sid => serviceMap[sid]).filter(Boolean);
      return {
        ...h,
        appointment: {
          ...appt,
          services,
        },
      };
    });

    return NextResponse.json({ error: false, data: enrichedHistory }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/customers/[id]/appointments-history]', e);
    return NextResponse.json({ error: true, errorMessage: 'Failed to fetch history' }, { status: 500 });
  }
}