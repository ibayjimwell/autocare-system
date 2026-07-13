import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { StaffAccess } from "@/database/models/staffs/staff-access.model";
import { eq } from "drizzle-orm";
import {
  validateStaffId,
  validateAccessBody,
  ALLOWED_ACCESS_FIELDS,
} from "@/utils/staffs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await params;
  console.log("GET access for staff:", staffId);

  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  try {
    const access = await Database.select()
      .from(StaffAccess)
      .where(eq(StaffAccess.staffId, staffId))
      .limit(1);

    console.log("GET result:", access[0] || null);
    return NextResponse.json({
      error: false,
      message: access.length ? "Staff access found" : "No access record",
      data: access[0] || null,
    }, { status: 200 });
  } catch (e) {
    console.error("GET access error:", e);
    return NextResponse.json({ error: true, errorMessage: "Database error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await params;
  console.log("POST access for staff:", staffId);

  // 1. Validate staff existence
  const validationError = await validateStaffId(staffId);
  if (validationError) {
    console.log("Staff validation failed");
    return validationError;
  }

  // 2. Parse body – critical section
  let body: any;
  try {
    body = await req.json();
    console.log("Body received:", JSON.stringify(body));
  } catch (e) {
    console.error("JSON parse error:", e);
    return NextResponse.json({ error: true, errorMessage: "Invalid JSON" }, { status: 400 });
  }

  // 3. Validate access fields
  const { error, updateData } = validateAccessBody(body, false);
  if (error) {
    console.log("Validation error:", error);
    return error;
  }

  // 4. Build insert data
  const insertData: any = { staffId };
  for (const field of ALLOWED_ACCESS_FIELDS) {
    insertData[field] = updateData[field] ?? false;
  }
  console.log("Insert data:", JSON.stringify(insertData));

  // 5. Check if record already exists
  const existing = await Database.select()
    .from(StaffAccess)
    .where(eq(StaffAccess.staffId, staffId))
    .limit(1);
  if (existing.length > 0) {
    console.log("Record already exists, returning 409");
    return NextResponse.json(
      { error: true, errorMessage: "Access record already exists. Use PUT to update." },
      { status: 409 }
    );
  }

  // 6. Insert
  try {
    const [newRecord] = await Database.insert(StaffAccess)
      .values(insertData)
      .returning();
    console.log("Record created:", newRecord);
    return NextResponse.json({
      error: false,
      message: "Access created.",
      data: newRecord,
    }, { status: 201 });
  } catch (e) {
    console.error("Insert error:", e);
    return NextResponse.json({ error: true, errorMessage: "Insert failed" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await params;
  console.log("PUT access for staff:", staffId);

  const validationError = await validateStaffId(staffId);
  if (validationError) return validationError;

  let body: any;
  try {
    body = await req.json();
    console.log("PUT body:", JSON.stringify(body));
  } catch {
    return NextResponse.json({ error: true, errorMessage: "Invalid JSON" }, { status: 400 });
  }

  const { error, updateData } = validateAccessBody(body, true);
  if (error) return error;

  console.log("Update payload:", updateData);

  try {
    const [updated] = await Database.update(StaffAccess)
      .set(updateData)
      .where(eq(StaffAccess.staffId, staffId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: true, errorMessage: "Record not found" }, { status: 404 });
    }

    console.log("Updated record:", updated);
    return NextResponse.json({ error: false, message: "Access updated.", data: updated }, { status: 200 });
  } catch (e) {
    console.error("Update error:", e);
    return NextResponse.json({ error: true, errorMessage: "Update failed" }, { status: 500 });
  }
}