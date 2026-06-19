import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq, sql } from "drizzle-orm";
import {
  validateStaffId,
  staffExists,
  validateStaffData,
} from "@/utils/staffs";

// Helper to remove password from a staff object
function stripPassword(staff: any) {
  const { password, ...rest } = staff;
  return rest;
}

// ------------------------------------------------------------------
// GET /api/staffs/[id] – Return a single staff member (without password)
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await params;

  // Validate staff ID and existence
  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  try {
    const [staff] = await Database.select()
      .from(Staffs)
      .where(eq(Staffs.id, staffId))
      .limit(1);

    if (!staff) {
      // Already checked by validateStaffId, but double‑safe
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Staff not found",
          errorMessage: "Staff member does not exist.",
          errorLog: null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: "Staff retrieved successfully.",
        data: stripPassword(staff),
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch staff details.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// PUT /api/staffs/[id] – Update staff info (fullname, username, role)
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: staffId } = await params;

  // Validate staff ID and existence
  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  // Parse JSON body
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

  // Allowed fields (now includes inBoarding)
  const allowedFields = ["fullname", "username", "role", "inBoarding"];
  const updateData: any = {};
  let hasField = false;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      hasField = true;
      if (field === "inBoarding") {
        if (typeof body[field] !== "boolean") {
          return NextResponse.json(
            {
              error: true,
              errorType: "fve",
              errorTitle: "Invalid field type",
              errorMessage: `Field "${field}" must be a boolean.`,
              errorLog: null,
            },
            { status: 422 },
          );
        }
        updateData[field] = body[field];
      } else {
        if (typeof body[field] !== "string") {
          return NextResponse.json(
            {
              error: true,
              errorType: "fve",
              errorTitle: "Invalid field type",
              errorMessage: `Field "${field}" must be a string.`,
              errorLog: null,
            },
            { status: 422 },
          );
        }
        const trimmed = body[field].trim();
        if (field !== "role" && trimmed.length === 0) {
          return NextResponse.json(
            {
              error: true,
              errorType: "fve",
              errorTitle: "Empty value",
              errorMessage: `${field} cannot be empty.`,
              errorLog: null,
            },
            { status: 422 },
          );
        }
        updateData[field] = trimmed;
      }
    }
  }

  if (!hasField) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "No fields to update",
        errorMessage: "At least one field must be provided.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  // If username is changing, check uniqueness (excluding current)
  if (updateData.username) {
    try {
      const existing = await Database.select()
        .from(Staffs)
        .where(eq(Staffs.username, updateData.username))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== staffId) {
        return NextResponse.json(
          {
            error: true,
            errorType: "fve",
            errorTitle: "Duplicate username",
            errorMessage: `Username "${updateData.username}" is already taken.`,
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
          errorMessage: "Unable to verify username uniqueness.",
          errorLog: e instanceof Error ? e.message : String(e),
        },
        { status: 500 },
      );
    }
  }

  // Add updatedAt
  updateData.updatedAt = sql`NOW()`;

  // Perform update
  try {
    const [updatedStaff] = await Database.update(Staffs)
      .set(updateData)
      .where(eq(Staffs.id, staffId))
      .returning();

    if (!updatedStaff) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Update failed",
          errorMessage: "Staff member not found.",
          errorLog: null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: "Staff updated successfully.",
        data: stripPassword(updatedStaff),
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database update error",
        errorMessage: "Could not update staff member.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}