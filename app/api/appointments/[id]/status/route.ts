// app/api/appointments/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { AppointmentStatusHistory } from "@/database/models/appointments/appointments-status-history.model";
import { eq } from "drizzle-orm";
import { validateAppointmentId, isValidStatusTransition } from "@/utils/appointments";
import { isValidUUID } from "@/utils/shared";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/staffs/auth";
import { appointmentsTriggers } from "@/triggers/appointments";

// ------------------------------------------------------------------
// PATCH /api/appointments/[id]/status – Change appointment status
// ------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateAppointmentId(id);
  if (validationError) return validationError;

  // Get the logged‑in staff ID from the session
  const session = await getServerSession(authOptions);
  let staffId: string | null = null;
  if (session?.user?.id) {
    staffId = session.user.id;
  }

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

  const { status, reason, changedBy } = body;

  if (!status || typeof status !== 'string') {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Missing status",
      errorMessage: "Status is required.",
      errorLog: null,
    }, { status: 422 });
  }

  const newStatus = status.toUpperCase();

  const validStatuses = [
    'PENDING', 'CONFIRMED', 'UNDER_INSPECTION',
    'WAITING_FOR_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  ];
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid status",
      errorMessage: `Status must be one of: ${validStatuses.join(', ')}.`,
      errorLog: null,
    }, { status: 422 });
  }

  if (newStatus === 'CANCELLED' && (!reason || typeof reason !== 'string' || reason.trim().length === 0)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Reason required",
      errorMessage: "A cancellation reason is required.",
      errorLog: null,
    }, { status: 422 });
  }

  // Determine the staff ID: use provided `changedBy` if valid, else session ID
  let finalChangedBy: string | null = null;
  if (changedBy && isValidUUID(changedBy)) {
    finalChangedBy = changedBy;
  } else if (staffId) {
    finalChangedBy = staffId;
  }

  if (!finalChangedBy) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Staff required",
      errorMessage: "You must be logged in to change appointment status.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    const [current] = await Database.select({ status: Appointments.status })
      .from(Appointments)
      .where(eq(Appointments.id, id));
    if (!current) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Appointment not found",
        errorMessage: "Appointment does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    if (current.status === newStatus) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Status already set",
        errorMessage: `Appointment is already ${newStatus}.`,
        errorLog: null,
      }, { status: 422 });
    }

    if (!isValidStatusTransition(current.status, newStatus)) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Invalid transition",
        errorMessage: `Cannot transition from ${current.status} to ${newStatus}.`,
        errorLog: null,
      }, { status: 400 });
    }

    const metadata: any = {};
    if (newStatus === 'CANCELLED') {
      metadata.reason = reason.trim();
    }

    const [updated] = await Database.update(Appointments)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(Appointments.id, id))
      .returning();

    if (updated.status === 'CONFIRMED') {
      appointmentsTriggers.onConfirmed({
        trackingNumber: updated.trackingNumber,
        customerName: updated.customer?.fullname || body.customer?.fullname || 'Customer',
        appointmentDate: updated.appointmentDate,
      }).catch(console.error);
    } else if (updated.status === 'CANCELLED') {
      appointmentsTriggers.onCancelled({
        trackingNumber: updated.trackingNumber,
        customerName: updated.customer?.fullname || body.customer?.fullname || 'Customer',
        reason: updated.notes || body.notes,
      }).catch(console.error);
    }

    await Database.insert(AppointmentStatusHistory).values({
      appointmentId: id,
      fromStatus: current.status,
      toStatus: newStatus,
      changedBy: finalChangedBy,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    return NextResponse.json({
      error: false,
      message: `Appointment status changed to ${newStatus}.`,
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/appointments/[id]/status] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not change appointment status.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}