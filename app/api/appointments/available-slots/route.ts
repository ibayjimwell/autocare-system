// app/api/appointments/available-slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Services } from "@/database/models/services/services.model";
import { eq, and, ne, inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';

// --------------------------------------------------------------
// GET /api/appointments/available-slots – Get available appointment slots for a given date and service IDs
// --------------------------------------------------------------
export async function GET(req: NextRequest) {
  console.log("🚀 [available-slots] ROUTE EXECUTED");

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceIdsParam = searchParams.get("serviceIds");

  console.log("[available-slots] Received:", { date, serviceIdsParam });

  // --- Validation ---
  if (!date || !serviceIdsParam) {
    return NextResponse.json({
      error: false,
      message: "Missing date or serviceIds",
      data: [],
    }, { status: 200 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({
      error: false,
      message: "Invalid date format",
      data: [],
    }, { status: 200 });
  }

  const serviceIds = serviceIdsParam.split(",").filter(id => id.length > 0);
  if (serviceIds.length === 0) {
    return NextResponse.json({
      error: false,
      message: "No service IDs",
      data: [],
    }, { status: 200 });
  }

  try {
    // 1. Fetch services to compute total duration (in JavaScript)
    const services = await Database.select({
      id: Services.id,
      estimatedDuration: Services.estimatedDuration, // maps to duration_minutes
    })
      .from(Services)
      .where(inArray(Services.id, serviceIds));

    if (services.length === 0) {
      console.warn("[available-slots] No services found");
      return NextResponse.json({
        error: false,
        message: "Services not found",
        data: [],
      }, { status: 200 });
    }

    const totalDuration = services.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0);
    console.log("[available-slots] Total duration (JS):", totalDuration);

    if (totalDuration === 0) {
      console.warn("[available-slots] Total duration is zero – no slots.");
      return NextResponse.json({
        error: false,
        message: "Total duration zero",
        data: [],
      }, { status: 200 });
    }

    // 2. Fetch existing appointments for that date (excluding CANCELLED)
    const existing = await Database.select({
      appointmentTime: Appointments.appointmentTime,
      services: Appointments.services,
    })
      .from(Appointments)
      .where(
        and(
          eq(Appointments.appointmentDate, date),
          ne(Appointments.status, "CANCELLED")
        )
      );

    // 3. Build intervals from existing appointments
    const intervals = [];
    for (const appt of existing) {
      const apptServiceIds = appt.services || [];
      if (apptServiceIds.length === 0) continue;
      // Fetch durations for these service IDs
      const apptServices = await Database.select({
        estimatedDuration: Services.estimatedDuration,
      })
        .from(Services)
        .where(inArray(Services.id, apptServiceIds));
      const apptDuration = apptServices.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0);
      if (apptDuration === 0) continue;
      const [hour, minute] = appt.appointmentTime.split(":").map(Number);
      const start = hour * 60 + minute;
      intervals.push({ start, end: start + apptDuration });
    }

    // 4. Generate slots (08:00 – 17:00, 30‑min steps)
    const shopOpen = 8 * 60;
    const shopClose = 17 * 60;
    const lastStart = shopClose - totalDuration;
    const slots = [];
    if (lastStart >= shopOpen) {
      for (let minutes = shopOpen; minutes <= lastStart; minutes += 30) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const slotStart = minutes;
        const slotEnd = slotStart + totalDuration;
        let available = true;
        for (const interval of intervals) {
          if (slotStart < interval.end && slotEnd > interval.start) {
            available = false;
            break;
          }
        }
        slots.push({ time: timeStr, available });
      }
    }

    console.log("[available-slots] Returning", slots.length, "slots");
    return NextResponse.json({
      error: false,
      message: "Available slots retrieved.",
      data: slots,
    }, { status: 200 });
  } catch (e) {
    console.error("[available-slots] Error:", e);
    return NextResponse.json({
      error: false,
      message: "Internal server error",
      data: [],
    }, { status: 200 });
  }
}