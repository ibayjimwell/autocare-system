import { NextRequest, NextResponse } from "next/server";

import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";

import { eq } from "drizzle-orm";

import { validatePassword } from "@/utils/shared";

// ------------------------------------------------------------------
// POST /api/staffs/login – Authenticate a staff member
// ------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ---------------------------------------------------------------
  // 1. Safely parse request body
  // ---------------------------------------------------------------
  let body: unknown;

  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid request",
        errorMessage: "Request body must be valid JSON.",
        errorLog:
          e instanceof Error ? e.message : String(e),
      },
      { status: 400 }
    );
  }

  // Make sure the parsed JSON is actually an object.
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid request",
        errorMessage: "Request body must be a JSON object.",
        errorLog: null,
      },
      { status: 400 }
    );
  }

  const requestBody = body as Record<string, unknown>;

  const username =
    typeof requestBody.username === "string"
      ? requestBody.username
      : "";

  const password =
    typeof requestBody.password === "string"
      ? requestBody.password
      : "";

  // ---------------------------------------------------------------
  // 2. Validate input
  // ---------------------------------------------------------------
  if (username.trim() === "") {
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

  if (password === "") {
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

  // ---------------------------------------------------------------
  // 3. Fetch staff by username
  // ---------------------------------------------------------------
  let staff: typeof Staffs.$inferSelect | null = null;

  try {
    const result = await Database.select()
      .from(Staffs)
      .where(eq(Staffs.username, username.trim()))
      .limit(1);

    // IMPORTANT:
    // Normalize undefined into null so staff is always safe to check.
    staff = result?.[0] ?? null;
  } catch (e) {
    console.error(
      "[POST /api/staffs/login] Database error:",
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to verify credentials.",
        errorLog:
          e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------------
  // 4. Handle missing staff
  // ---------------------------------------------------------------
  if (!staff) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Invalid credentials",
        errorMessage:
          "Username or password is incorrect.",
        errorLog: null,
      },
      { status: 401 }
    );
  }

  // ---------------------------------------------------------------
  // 5. CHECK OUTBOARDED
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // 6. Validate password
  // ---------------------------------------------------------------
  let isPasswordValid = false;

  try {
    isPasswordValid = await validatePassword(
      password,
      staff.password
    );
  } catch (e) {
    console.error(
      "[POST /api/staffs/login] Password validation error:",
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType: "se",
        errorTitle: "Password validation error",
        errorMessage:
          "Internal error while checking password.",
        errorLog:
          e instanceof Error ? e.message : String(e),
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
        errorMessage:
          "Username or password is incorrect.",
        errorLog: null,
      },
      { status: 401 }
    );
  }

  // ---------------------------------------------------------------
  // 7. Check temporary password
  // ---------------------------------------------------------------
  const isTempPassword =
    staff.tempPassword === true;

  // ---------------------------------------------------------------
  // 8. Remove password from response
  // ---------------------------------------------------------------
  const {
    password: _password,
    ...staffWithoutPassword
  } = staff;

  // ---------------------------------------------------------------
  // 9. Successful login
  // ---------------------------------------------------------------
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