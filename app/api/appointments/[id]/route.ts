import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { Services } from "@/database/models/services/services.model";
import { eq, inArray } from "drizzle-orm";
import { validateAppointmentId } from "@/utils/appointments";

// ------------------------------------------------------------------
// GET /api/appointments/[id] – Get a single appointment with details
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateAppointmentId(id);
  if (validationError) return validationError;

  try {
    const [appointment] = await Database.select({
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
      .where(eq(Appointments.id, id));

    if (!appointment) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Appointment not found",
        errorMessage: "Appointment does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    // ✅ Fetch service details using inArray (safe)
    let serviceDetails: any[] = [];
    if (appointment.services && appointment.services.length > 0) {
      serviceDetails = await Database.select({
        id: Services.id,
        name: Services.name,
        description: Services.description,
        basePrice: Services.basePrice,
        estimatedDuration: Services.estimatedDuration,
      })
        .from(Services)
        .where(inArray(Services.id, appointment.services)); // ✅ fixed
    }

    return NextResponse.json({
      error: false,
      message: "Appointment retrieved successfully.",
      data: {
        ...appointment,
        services: serviceDetails,
      },
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/appointments/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch appointment details.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// PUT /api/appointments/[id] – Update appointment details
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateAppointmentId(id);
  if (validationError) return validationError;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Invalid request",
      errorMessage: "Request body must be valid JSON.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  // Basic validation (partial update)
  const allowedFields = ['appointmentDate', 'appointmentTime', 'services', 'notes'];
  const updateData: any = {};
  let hasField = false;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      hasField = true;
      if (field === 'appointmentDate') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body[field])) {
          return NextResponse.json({
            error: true,
            errorType: "fve",
            errorTitle: "Invalid date format",
            errorMessage: "Appointment date must be in YYYY-MM-DD format.",
            errorLog: null,
          }, { status: 422 });
        }
        updateData[field] = body[field];
      } else if (field === 'appointmentTime') {
        if (!/^\d{2}:\d{2}$/.test(body[field])) {
          return NextResponse.json({
            error: true,
            errorType: "fve",
            errorTitle: "Invalid time format",
            errorMessage: "Appointment time must be in HH:MM format.",
            errorLog: null,
          }, { status: 422 });
        }
        updateData[field] = body[field];
      } else if (field === 'services') {
        if (!Array.isArray(body[field]) || body[field].length === 0) {
          return NextResponse.json({
            error: true,
            errorType: "fve",
            errorTitle: "Invalid services",
            errorMessage: "Services must be a non-empty array.",
            errorLog: null,
          }, { status: 422 });
        }
        // Validate each service ID
        for (const sid of body[field]) {
          if (!isValidUUID(sid)) {
            return NextResponse.json({
              error: true,
              errorType: "fve",
              errorTitle: "Invalid service ID",
              errorMessage: `Service ID "${sid}" is not a valid UUID.`,
              errorLog: null,
            }, { status: 422 });
          }
          // Could check existence, but we'll trust the DB foreign key (or we can check)
        }
        updateData[field] = body[field];
      } else if (field === 'notes') {
        updateData[field] = body[field]?.trim() || null;
      }
    }
  }

  if (!hasField) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "No fields to update",
      errorMessage: "At least one of 'appointmentDate', 'appointmentTime', 'services', or 'notes' must be provided.",
      errorLog: null,
    }, { status: 422 });
  }

  updateData.updatedAt = new Date();

  try {
    const [updated] = await Database.update(Appointments)
      .set(updateData)
      .where(eq(Appointments.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Update failed",
        errorMessage: "Appointment not found.",
        errorLog: null,
      }, { status: 404 });
    }
    
    return NextResponse.json({
      error: false,
      message: "Appointment updated successfully.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PUT /api/appointments/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update appointment.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}