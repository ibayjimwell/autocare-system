import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { InspectionFindings } from "@/database/models/service-tracking/inspection-findings.model";
import { InspectionFindingParts } from "@/database/models/service-tracking/inspection-finding-parts.model";
import { eq, inArray} from "drizzle-orm";
import { appointmentExists } from "@/utils/service-tracking";
import { isValidUUID } from "@/utils/shared";

// ------------------------------------------------------------------
// GET /api/service-tracking/findings?appointmentId=...
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get('appointmentId');
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid appointment ID",
      errorMessage: "appointmentId is required and must be a valid UUID.",
      errorLog: null,
    }, { status: 400 });
  }

  try {
    const findings = await Database.select()
      .from(InspectionFindings)
      .where(eq(InspectionFindings.appointmentId, appointmentId))
      .orderBy(InspectionFindings.createdAt);

    // Fetch parts for each finding using inArray (safer than sql`ANY`)
    const findingIds = findings.map(f => f.id);
    let partsMap: Record<string, any[]> = {};
    if (findingIds.length > 0) {
      const parts = await Database.select()
        .from(InspectionFindingParts)
        .where(inArray(InspectionFindingParts.findingId, findingIds)); // ✅ fixed
      for (const p of parts) {
        if (!partsMap[p.findingId]) partsMap[p.findingId] = [];
        partsMap[p.findingId].push(p);
      }
    }

    const data = findings.map(f => ({
      ...f,
      parts: partsMap[f.id] || [],
    }));

    return NextResponse.json({
      error: false,
      message: "Findings retrieved.",
      data,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/service-tracking/findings] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch findings.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// POST /api/service-tracking/findings – Record findings
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Invalid JSON",
      errorMessage: "Request body must be valid JSON.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const { appointmentId, findings } = body;
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid appointment ID",
      errorMessage: "appointmentId is required and must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }
  if (!Array.isArray(findings) || findings.length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Findings required",
      errorMessage: "At least one finding is required.",
      errorLog: null,
    }, { status: 422 });
  }

  // Verify appointment exists
  const exists = await appointmentExists(appointmentId);
  if (!exists) {
    return NextResponse.json({
      error: true,
      errorType: "auth",
      errorTitle: "Appointment not found",
      errorMessage: "Appointment does not exist.",
      errorLog: null,
    }, { status: 404 });
  }

  try {
    const insertedFindings = [];
    for (const f of findings) {
      if (!f.description || typeof f.description !== 'string' || f.description.trim().length === 0) {
        return NextResponse.json({
          error: true,
          errorType: "fve",
          errorTitle: "Invalid description",
          errorMessage: "Each finding must have a description.",
          errorLog: null,
        }, { status: 422 });
      }
      const [newFinding] = await Database.insert(InspectionFindings)
        .values({ appointmentId, description: f.description.trim() })
        .returning();
      insertedFindings.push(newFinding);

      // Insert parts if any
      if (f.parts && Array.isArray(f.parts)) {
        for (const part of f.parts) {
          const partData: any = {
            findingId: newFinding.id,
            quantity: part.quantity || 1,
            priceAtTime: part.priceAtTime || 0,
            isPms: part.isPms || false,
          };
          if (part.inventoryItemId && isValidUUID(part.inventoryItemId)) {
            partData.inventoryItemId = part.inventoryItemId;
          } else if (part.partName && typeof part.partName === 'string') {
            partData.partName = part.partName.trim();
          } else {
            return NextResponse.json({
              error: true,
              errorType: "fve",
              errorTitle: "Invalid part",
              errorMessage: "Each part must have either inventoryItemId or partName.",
              errorLog: null,
            }, { status: 422 });
          }
          await Database.insert(InspectionFindingParts).values(partData);
        }
      }
    }

    // Optionally update appointment status to WAITING_FOR_APPROVAL?
    // For now, we just return the findings.

    return NextResponse.json({
      error: false,
      message: "Findings recorded.",
      data: insertedFindings,
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/service-tracking/findings] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not record findings.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}