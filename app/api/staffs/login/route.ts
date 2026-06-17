import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq } from "drizzle-orm";
import { validatePassword } from "@/utils/shared";

// ------------------------------------------------------------------
// POST /api/staffs/login – Login a staff member
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any;

  // 1. Parse JSON body (login usually sends JSON, not form-data)
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "re",
        errorTitle: "Invalid request",
        errorMessage: "Request body must be valid JSON.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  const { username, password } = body;

  // 2. Basic validation
  if (!username || typeof username !== "string" || username.trim() === "") {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Missing username",
        errorMessage: "Username is required.",
        errorLog: null,
      },
      { status: 422 },
    );
  }
  if (!password || typeof password !== "string" || password === "") {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Missing password",
        errorMessage: "Password is required.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  // 3. Fetch staff by username
  let staff;
  try {
    const result = await Database.select()
      .from(Staffs)
      .where(eq(Staffs.username, username.trim()))
      .limit(1);
    staff = result[0];
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to verify credentials.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }

  if (!staff) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid credentials",
        errorMessage: "Username or password is incorrect.",
        errorLog: null,
      },
      { status: 401 },
    );
  }

  // 4. Validate password
  let isPasswordValid: boolean;
  try {
    isPasswordValid = await validatePassword(password, staff.password);
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "se",
        errorTitle: "Password validation error",
        errorMessage: "Internal error while checking password.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }

  if (!isPasswordValid) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid credentials",
        errorMessage: "Username or password is incorrect.",
        errorLog: null,
      },
      { status: 401 },
    );
  }

  // 5. Check if it's a temporary password
  const isTempPassword = staff.tempPassword === true;

  // Remove password from response data
  const { password: _p, ...staffWithoutPassword } = staff;

  if (isTempPassword) {
    // Login successful but must change password
    return NextResponse.json(
      {
        error: false,
        message: "Login successful. You must change your temporary password.",
        requiresPasswordChange: true,
        data: staffWithoutPassword,
      },
      { status: 200 },
    );
  } else {
    // Normal login
    return NextResponse.json(
      {
        error: false,
        message: "Login successful.",
        requiresPasswordChange: false,
        data: staffWithoutPassword,
      },
      { status: 200 },
    );
  }
}
