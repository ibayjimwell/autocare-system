import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries, hashPassword } from "@/utils/shared";
import { validateStaffData } from "@/utils/staffs";
import { generateTempPassword } from "@/utils/staffs";
import { eq } from "drizzle-orm";
import { staffsTriggers } from "@/triggers/staffs";

// ------------------------------------------------------------------
// POST /api/staffs – Create a new staff member
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let rawData: any;

  // 1. Parse form data
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

  // 2. Validate input 
  const validationErrors = validateStaffData(rawData);
  if (validationErrors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: validationErrors.join(" "),
      errorLog: validationErrors,
    }, { status: 422 });
  }

  // 3. Check username uniqueness
  try {
    const existing = await Database.select()
      .from(Staffs)
      .where(eq(Staffs.username, rawData.username.trim()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate username",
        errorMessage: `Username "${rawData.username}" is already taken.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify username.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 4. Generate temporary password
  const tempPlainPassword = generateTempPassword(rawData.username);
  let hashedPassword: string;
  try {
    hashedPassword = await hashPassword(tempPlainPassword);
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "se",
      errorTitle: "Password hashing failed",
      errorMessage: "Internal error while securing password.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 5. Insert staff with tempPassword = true
  try {
    const inserted = await Database.insert(Staffs).values({
      fullname: rawData.fullname.trim(),
      username: rawData.username.trim(),
      password: hashedPassword,
      role: rawData.role?.trim() || null,
      tempPassword: true,
    }).returning();

    const newStaff = inserted[0];
    const { password, ...staffWithoutPassword } = newStaff;

    staffsTriggers.onNew({
      fullname: staffWithoutPassword.fullname,
      username: staffWithoutPassword.username,
      role: staffWithoutPassword.role,
    }).catch(console.error);

    // Return the plaintext temporary password to the frontend
    return NextResponse.json({
      error: false,
      message: "Staff created successfully. Temporary password generated.",
      data: {
        ...staffWithoutPassword,
        tempPasswordPlain: tempPlainPassword,
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not save staff member.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// GET /api/staffs – Retrieve all staff members (without passwords)
// ------------------------------------------------------------------
export async function GET() {
  try {
    const staffs = await Database.select({
      id: Staffs.id,
      fullname: Staffs.fullname,
      username: Staffs.username,
      role: Staffs.role,
      inBoarding: Staffs.inBoarding,
      isOnline: Staffs.isOnline,
      currentModule: Staffs.currentModule,
      createdAt: Staffs.createdAt,
      updatedAt: Staffs.updatedAt,
    })
      .from(Staffs)
      .orderBy(Staffs.updatedAt);

    return NextResponse.json(
      {
        error: false,
        message: "Staffs retrieved successfully",
        data: staffs as StaffWithoutPasswordType[],
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database query error",
        errorMessage: "Unable to fetch staff list. Please try again later.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}