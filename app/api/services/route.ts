import { Database } from "@/lib/drizzle";
import { Services } from "@/database/models/services/services.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries } from "@/utils/shared";
import { validateServiceData } from "@/utils/services";
import { eq } from "drizzle-orm";
import { servicesTriggers } from "@/triggers/services";

// ------------------------------------------------------------------
// GET /api/services – Retrieve service types (filter by active)
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active');

  try {
    let query = Database.select().from(Services);
    if (active !== null) {
      const isActive = active === 'true';
      query = query.where(eq(Services.active, isActive));
    }
    const services = await query.orderBy(Services.name);

    return NextResponse.json({
      error: false,
      message: "Services retrieved successfully.",
      data: services,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/services] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database query error",
      errorMessage: "Unable to fetch services.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// POST /api/services – Create a new service
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

  const errors = validateServiceData(rawData);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  // Check name uniqueness
  try {
    const existing = await Database.select()
      .from(Services)
      .where(eq(Services.name, rawData.name.trim()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate service name",
        errorMessage: `Service name "${rawData.name}" already exists.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify service name.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // Map frontend field names to database column names
  const insertData = {
    name: rawData.name.trim(),
    description: rawData.description?.trim() || null,
    basePrice: rawData.basePrice ? parseFloat(rawData.basePrice) : null,
    estimatedDuration: rawData.durationMinutes ? parseInt(rawData.durationMinutes, 10) : null, // ← key change: durationMinutes → estimatedDuration
    active: true,
    type: rawData.type
  };

  try {
    const [newService] = await Database.insert(Services)
      .values(insertData)
      .returning();

    servicesTriggers.onNew({
      name: newService.name,
      type: newService.type,
    }).catch(console.error);
    
    return NextResponse.json({
      error: false,
      message: "Service created successfully.",
      data: newService,
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/services] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not save service.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}