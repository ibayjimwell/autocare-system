// app/api/service-queue/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { ServiceQueue } from "@/database/models/queue/service-queue.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq, and, sql } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { serviceQueueTriggers } from "@/triggers/service-queue";
import { mobileServiceQueueTriggers } from "@/app-triggers/service-queue";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorMessage: "Invalid JSON.",
    }, { status: 400 });
  }

  const { appointmentId, newPosition } = body;
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json({
      error: true,
      errorMessage: "Valid appointmentId is required.",
    }, { status: 400 });
  }
  if (typeof newPosition !== 'number' || newPosition < 1) {
    return NextResponse.json({
      error: true,
      errorMessage: "newPosition must be a positive integer.",
    }, { status: 400 });
  }

  try {
    // Get the queue entry for this appointment
    const [entry] = await Database.select()
      .from(ServiceQueue)
      .where(eq(ServiceQueue.appointmentId, appointmentId))
      .limit(1);
    if (!entry) {
      return NextResponse.json({
        error: true,
        errorMessage: "Queue entry not found.",
      }, { status: 404 });
    }

    const currentPosition = entry.queueNumber;
    const date = entry.queueDate;

    // Don't do anything if same position
    if (currentPosition === newPosition) {
      return NextResponse.json({
        error: false,
        message: "Already at that position.",
      }, { status: 200 });
    }

    // Reorder: shift numbers of other entries, then update this one
    if (newPosition < currentPosition) {
      // Move up: shift everyone from newPosition to currentPosition-1 down by 1
      await Database.execute(sql`
        UPDATE service_queue
        SET queue_number = queue_number + 1
        WHERE queue_date = ${date}
          AND queue_number >= ${newPosition}
          AND queue_number < ${currentPosition}
      `);
    } else {
      // Move down: shift everyone from currentPosition+1 to newPosition up by 1
      await Database.execute(sql`
        UPDATE service_queue
        SET queue_number = queue_number - 1
        WHERE queue_date = ${date}
          AND queue_number > ${currentPosition}
          AND queue_number <= ${newPosition}
      `);
    }

    // Update the moved entry
    await Database.update(ServiceQueue)
      .set({ queueNumber: newPosition, updatedAt: new Date() })
      .where(eq(ServiceQueue.id, entry.id));

    // Fire triggers (async, don't await)
    const [appt] = await Database.select({ customerId: Appointments.customerId, trackingNumber: Appointments.trackingNumber })
      .from(Appointments)
      .where(eq(Appointments.id, appointmentId))
      .limit(1);
    if (appt) {
      serviceQueueTriggers.onPositionChanged({
        appointmentId,
        trackingNumber: appt.trackingNumber,
        newPosition,
      }).catch(console.error);
      mobileServiceQueueTriggers.onPositionChanged({
        customerId: appt.customerId,
        trackingNumber: appt.trackingNumber,
        newPosition,
      }).catch(console.error);
    }

    return NextResponse.json({
      error: false,
      message: "Queue reordered.",
    }, { status: 200 });
  } catch (e) {
    console.error("[POST /api/service-queue/reorder] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Failed to reorder queue.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}