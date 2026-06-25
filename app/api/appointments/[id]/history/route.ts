import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { AppointmentStatusHistory } from "@/database/models/appointments/appointments-status-history.model";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq, desc } from "drizzle-orm";
import { validateAppointmentId } from "@/utils/appointments";

// ------------------------------------------------------------------
// GET /api/appointments/[id]/history – Get status history for an appointment
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateAppointmentId(id);
  if (validationError) return validationError;

  try {
    const history = await Database.select({
      id: AppointmentStatusHistory.id,
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
      .where(eq(AppointmentStatusHistory.appointmentId, id))
      .orderBy(desc(AppointmentStatusHistory.createdAt));

    return NextResponse.json({
      error: false,
      message: "Status history retrieved successfully.",
      data: history,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/appointments/[id]/history] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch status history.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
