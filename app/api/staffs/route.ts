import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries, hashPassword } from "@/utils/shared";
import { validateStaffData } from "@/utils/staffs";
import { generateTempPassword } from "@/utils/staffs";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { staffsTriggers } from "@/triggers/staffs";
import { PREDEFINED_ROLES } from "@/app-utils/staffs/constants";

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

  const normalizedUsername = String(rawData.username || '').trim().replace(/@/g, '');
  if (!normalizedUsername) {
    return NextResponse.json({
      error: true, errorType: 'fve', errorTitle: 'Invalid username',
      errorMessage: 'Staff username is required and cannot contain only @ characters.',
    }, { status: 422 });
  }

  const normalizedRole = String(rawData.role || '').trim();
  if (!PREDEFINED_ROLES.includes(normalizedRole as (typeof PREDEFINED_ROLES)[number])) {
    return NextResponse.json({
      error: true, errorType: "fve", errorTitle: "Invalid organizational role",
      errorMessage: `Role must be one of: ${PREDEFINED_ROLES.join(', ')}.`,
    }, { status: 422 });
  }

  // 3. Check username uniqueness
  try {
    const existing = await Database.select()
      .from(Staffs)
      .where(eq(Staffs.username, normalizedUsername))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate username",
        errorMessage: `Username "${normalizedUsername}" is already taken.`,
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
  const tempPlainPassword = generateTempPassword(rawData.fullname);
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
      username: normalizedUsername,
      password: hashedPassword,
      role: normalizedRole,
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
    // Presence is heartbeat-based. Clear stale flags so staff who closed the
    // browser or lost connectivity do not remain permanently "Online".
    const staleBefore = new Date(Date.now() - 90_000);
    await Database.update(Staffs)
      .set({ isOnline: false, currentModule: null })
      .where(
        and(
          eq(Staffs.isOnline, true),
          or(isNull(Staffs.lastActiveAt), lt(Staffs.lastActiveAt, staleBefore)),
        ),
      );
    const staffs = await Database.select({
      id: Staffs.id,
      fullname: Staffs.fullname,
      username: Staffs.username,
      role: Staffs.role,
      inBoarding: Staffs.inBoarding,
      isOnline: Staffs.isOnline,
      currentModule: Staffs.currentModule,
      lastActiveAt: Staffs.lastActiveAt,
      createdAt: Staffs.createdAt,
      updatedAt: Staffs.updatedAt,
    })
      .from(Staffs)
      .orderBy(Staffs.updatedAt);

    return NextResponse.json(
      {
        error: false,
        message: "Staffs retrieved successfully",
        data: staffs.map((staff) => {
          const lastSeen = staff.lastActiveAt ? new Date(staff.lastActiveAt).getTime() : 0;
          const recentlyActive = lastSeen > 0 && Date.now() - lastSeen <= 90_000;
          return { ...staff, isOnline: staff.inBoarding !== false && staff.isOnline === true && recentlyActive };
        }) as StaffWithoutPasswordType[],
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