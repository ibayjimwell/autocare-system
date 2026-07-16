import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Services } from "@/database/models/services/services.model";
import { eq, ne, and, inArray, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Get all active services
    const services = await Database.select()
      .from(Services)
      .where(eq(Services.active, true))
      .orderBy(Services.name);

    if (services.length === 0) {
      return NextResponse.json({
        error: false,
        message: "No active services.",
        data: [],
      }, { status: 200 });
    }

    // 2. For each service, count non‑cancelled/non‑completed appointments
    const serviceCounts = await Promise.all(
      services.map(async (service) => {
        const [result] = await Database.select({
          count: sql<number>`count(*)::int`,
        })
          .from(Appointments)
          .where(
            and(
              // The services array contains the service ID
              sql`${service.id}::text = ANY(${Appointments.services})`,
              ne(Appointments.status, 'CANCELLED'),
              ne(Appointments.status, 'COMPLETED')
            )
          );
        return {
          ...service,
          appointmentCount: result?.count || 0,
        };
      })
    );

    // 3. Sort by count descending and take top 4
    const trending = serviceCounts
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        basePrice: s.basePrice,
        estimatedDuration: s.estimatedDuration,
        type: s.type,
        active: s.active,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        appointmentCount: s.appointmentCount,
      }));

    return NextResponse.json({
      error: false,
      message: "Trending services retrieved.",
      data: trending,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/services/trending] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch trending services.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}