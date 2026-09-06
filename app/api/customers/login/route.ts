import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq } from "drizzle-orm";
import { validatePassword } from "@/utils/shared";

// ------------------------------------------------------------------
// POST /api/staffs/login – Authenticate a staff member
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
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
      { status: 400 }
    );
  }

  const { username, password } = body;

  // 1. Validate input
  if (!username || typeof username !== "string" || username.trim() === "") {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Missing username",
        errorMessage: "Username is required.",
        errorLog: null,
      },
      { status: 422 }
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
      { status: 422 }
    );
  }

  // 2. Fetch staff by username
  let staff;
  try {
    const result = await Database.select()
      .from(Staffs)
      .where(eq(Staffs.username, username.trim()))
      .limit(1);
    staff = result[0];
  } catch (e) {
    console.error("[POST /api/staffs/login] Database error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to verify credentials.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  // 3. Handle missing staff
  if (!staff) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Invalid credentials",
        errorMessage: "Username or password is incorrect.",
        errorLog: null,
      },
      { status: 401 }
    );
  }

  // 4. ✅ CHECK OUTBOARDED
  if (staff.inBoarding === false) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Account deactivated",
        errorMessage:
          "Your account has been outboarded. Please contact your administrator.",
        errorLog: null,
      },
      { status: 403 }
    );
  }

  // 5. Validate password
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
      { status: 500 }
    );
  }

  if (!isPasswordValid) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Invalid credentials",
        errorMessage: "Username or password is incorrect.",
        errorLog: null,
      },
      { status: 401 }
    );
  }

  // 6. Check if temporary password
  const isTempPassword = staff.tempPassword === true;

  // 7. Remove password from response
  const { password: _p, ...staffWithoutPassword } = staff;

  return NextResponse.json(
    {
      error: false,
      message: isTempPassword
        ? "Login successful. You must change your temporary password."
        : "Login successful.",
      requiresPasswordChange: isTempPassword,
      data: staffWithoutPassword,
    },
    { status: 200 }
  );
}