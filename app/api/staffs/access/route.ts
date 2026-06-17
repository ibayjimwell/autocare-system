import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { StaffAccess } from "@/database/models/staffs/staff-access.model";
import { sql } from "drizzle-orm";

// ------------------------------------------------------------------
// GET /api/staffs/access – Retrieve all access of a staff
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
    // Get the full URL
    const url = req.nextUrl;
    // Extract search params
    const combinedParams = url.searchParams.get("combined"); // returns "true" as string or null
    // Convert to boolean
    const combined = combinedParams === "true";

  try {
    if (combined) {
      // Return all staff with their access (LEFT JOIN to include staff without access)
      const results = await Database.select({
        staff: Staffs,
        access: StaffAccess,
      })
        .from(Staffs)
        .leftJoin(StaffAccess, sql`${Staffs.id} = ${StaffAccess.staffId}`)
        .orderBy(Staffs.updatedAt);
      
      // Format the response: each entry has staff object and access object (may be null)
      const formatted = results.map(row => ({
        ...row.staff,
        access: row.access || null,
      }));
      // Remove password from each staff object
      const safeData = formatted.map(({ password, ...staff }) => staff);
      
      return NextResponse.json({
        error: false,
        message: "Staff with access retrieved successfully.",
        data: safeData,
      }, { status: 200 });
    } else {
      // Just return all access records (no staff info)
      const allAccess = await Database.select()
        .from(StaffAccess)
        .orderBy(StaffAccess.createdAt);
      return NextResponse.json({
        error: false,
        message: "All staff access records retrieved.",
        data: allAccess,
      }, { status: 200 });
    }
  } catch (e) {
    console.error("GET /api/staffs/access error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database query error",
      errorMessage: "Unable to fetch access data.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}