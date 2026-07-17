// app/api/appointments/route.ts
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { Services } from "@/database/models/services/services.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries, isValidUUID } from "@/utils/shared";
import {
  validateAppointmentData,
  generateTrackingNumber,
  serviceExists,
} from "@/utils/appointments";
import { eq, inArray, sql, desc } from "drizzle-orm";
import { appointmentsTriggers } from '@/triggers/appointments';
import { mobileAppointmentsTriggers } from "@/app-triggers/appointments";

// ------------------------------------------------------------------
// GET /api/appointments – List appointments with filters
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  try {
    let query = Database.select({
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
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id));

    if (status) {
      query = query.where(eq(Appointments.status, status.toUpperCase()));
    }
    if (customerId && isValidUUID(customerId)) {
      query = query.where(eq(Appointments.customerId, customerId));
    }
    if (from && to) {
      query = query.where(
        sql`${Appointments.appointmentDate} BETWEEN ${from} AND ${to}`
      );
    }

    const [countResult] = await Database.select({ count: sql`count(*)` })
      .from(Appointments)
      .where(query._where);
    const total = Number(countResult?.count || 0);

    const appointments = await query
      .orderBy(desc(Appointments.appointmentDate), desc(Appointments.appointmentTime))
      .limit(limit)
      .offset(offset);

    // Fetch service details
    let serviceMap: Record<string, any[]> = {};
    const allServiceIds = new Set<string>();
    for (const appt of appointments) {
      if (appt.services && Array.isArray(appt.services)) {
        for (const sid of appt.services) {
          allServiceIds.add(sid);
        }
      }
    }
    if (allServiceIds.size > 0) {
      const serviceList = await Database.select({
        id: Services.id,
        name: Services.name,
        description: Services.description,
        basePrice: Services.basePrice,
        estimatedDuration: Services.estimatedDuration,
      })
        .from(Services)
        .where(inArray(Services.id, Array.from(allServiceIds)));

      const serviceObjMap = serviceList.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, any>);

      for (const appt of appointments) {
        if (appt.services && Array.isArray(appt.services)) {
          serviceMap[appt.id] = appt.services
            .map(sid => serviceObjMap[sid])
            .filter(Boolean);
        } else {
          serviceMap[appt.id] = [];
        }
      }
    }

    const data = appointments.map(a => ({
      ...a,
      services: serviceMap[a.id] || [],
    }));

    return NextResponse.json({
      error: false,
      message: "Appointments retrieved successfully.",
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/appointments] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database query error",
      errorMessage: "Unable to fetch appointments.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// POST /api/appointments – Create a new appointment
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let rawData: any;
  try {
    rawData = await getFormDataEntries(req);
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Form data error",
      errorMessage: "Could not read submitted form data.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const errors = validateAppointmentData(rawData);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  let serviceIds: string[] = [];
  if (!rawData.services) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Services required",
      errorMessage: "At least one service must be selected.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    serviceIds = JSON.parse(rawData.services);
  } catch {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid services format",
      errorMessage: "Services must be a JSON array of UUIDs.",
      errorLog: null,
    }, { status: 422 });
  }

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid services",
      errorMessage: "At least one service is required.",
      errorLog: null,
    }, { status: 422 });
  }

  for (const id of serviceIds) {
    if (!isValidUUID(id)) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Invalid service ID",
        errorMessage: `Service ID "${id}" is not a valid UUID.`,
        errorLog: null,
      }, { status: 422 });
    }
    const exists = await serviceExists(id);
    if (!exists) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Service not found",
        errorMessage: `Service "${id}" does not exist.`,
        errorLog: null,
      }, { status: 404 });
    }
  }

  const insertData = {
    customerId: rawData.customerId,
    vehicleId: rawData.vehicleId,
    services: serviceIds,
    trackingNumber: generateTrackingNumber(),
    appointmentDate: rawData.appointmentDate,
    appointmentTime: rawData.appointmentTime,
    status: "PENDING",
    notes: rawData.notes?.trim() || null,
  };

  try {
    const [newAppointment] = await Database.insert(Appointments)
      .values(insertData)
      .returning();

    if (newAppointment) {
      appointmentsTriggers.onNew({
        trackingNumber: newAppointment.trackingNumber,
        customerName: newAppointment.customer?.fullname || 'Customer',
        appointmentDate: newAppointment.appointmentDate,
      }).catch(console.error);

      mobileAppointmentsTriggers.onNew({
        customerId: newAppointment.customerId,
        trackingNumber: newAppointment.trackingNumber,
        appointmentDate: newAppointment.appointmentDate,
      }).catch(console.error);
    }

    return NextResponse.json({
      error: false,
      message: "Appointment created successfully.",
      data: newAppointment,
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/appointments] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not create appointment.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}