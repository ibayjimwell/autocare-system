import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { StaffAccess } from "@/database/models/staffs/staff-access.model";
import { eq, sql } from "drizzle-orm";
import {
  validateStaffId,
  validateAccessBody,
  ALLOWED_ACCESS_FIELDS,
} from "@/utils/staffs";

// ------------------------------------------------------------------
// GET /api/staffs/[id]/access – Retrieve access for one staff
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: staffId } = await params;

  // Validate staff ID and existence
  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  try {
    const access = await Database.select()
      .from(StaffAccess)
      .where(eq(StaffAccess.staffId, staffId))
      .limit(1);
    return NextResponse.json(
      {
        error: false,
        message: access.length
          ? "Staff access retrieved successfully."
          : "No access record found for this staff.",
        data: access[0] || null,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch access record.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// POST /api/staffs/[id]/access – Create new access record
// ------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: staffId } = await params;

  // Validate staff ID
  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid request",
        errorMessage: "Request body must be valid JSON.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  // Validate access fields – all become false if not provided
  const { error, updateData } = validateAccessBody(body, false);
  if (error) return error;

  // Build full insert object with default false for missing fields
  const insertData: any = { staffId };
  for (const field of ALLOWED_ACCESS_FIELDS) {
    insertData[field] = updateData[field] ?? false;
  }

  // Check if record already exists
  try {
    const existing = await Database.select()
      .from(StaffAccess)
      .where(eq(StaffAccess.staffId, staffId))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Access already exists",
          errorMessage:
            "This staff already has an access record. Use PUT/PATCH to update it.",
          errorLog: null,
        },
        { status: 409 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to check existing access.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }

  // Insert new record
  try {
    const [newAccess] = await Database.insert(StaffAccess)
      .values(insertData)
      .returning();
    return NextResponse.json(
      {
        error: false,
        message: "Staff access created successfully.",
        data: newAccess,
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Insert failed",
        errorMessage: "Could not create access record.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// PUT /api/staffs/[id]/access – Update existing access record 
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: staffId } = await params;

  // Validate staff ID
  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid request",
        errorMessage: "Request body must be valid JSON.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  // Validate at least one field to update
  const { error, updateData } = validateAccessBody(body, true);
  if (error) return error;

  // Add updatedAt timestamp manually (or let DB handle with default)
  // We'll set it explicitly to ensure it's updated
  const updatePayload = {
    ...updateData,
    updatedAt: sql`NOW()`, // use SQL NOW() for consistency
  };

  try {
    const [updated] = await Database.update(StaffAccess)
      .set(updatePayload)
      .where(eq(StaffAccess.staffId, staffId))
      .returning();
    if (!updated) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Access not found",
          errorMessage:
            "No access record found for this staff. Use POST to create one.",
          errorLog: null,
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error: false,
        message: "Staff access updated successfully.",
        data: updated,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Update failed",
        errorMessage: "Could not update access record.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
