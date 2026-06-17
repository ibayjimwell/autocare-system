// app/api/staffs/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword, validatePasswordStrength } from "@/utils/shared";

export async function PUT(req: NextRequest) {
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

  const { username, currentPassword, newPassword } = body;

  // 1. Validate required fields
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
  if (!newPassword || typeof newPassword !== "string" || newPassword === "") {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Missing new password",
        errorMessage: "New password is required.",
        errorLog: null,
      },
      { status: 422 }
    );
  }

  // 2. Validate new password strength
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Weak password",
        errorMessage: strength.errors.join(" "),
        errorLog: strength.errors,
      },
      { status: 422 }
    );
  }

  // 3. Fetch staff
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
      { status: 500 }
    );
  }

  if (!staff) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Invalid user",
        errorMessage: "Staff member not found.",
        errorLog: null,
      },
      { status: 404 }
    );
  }

  // 4. If tempPassword is true, skip current password check
  if (staff.tempPassword !== true) {
    // Require and validate current password
    if (!currentPassword || typeof currentPassword !== "string" || currentPassword === "") {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Missing current password",
          errorMessage: "Current password is required.",
          errorLog: null,
        },
        { status: 422 }
      );
    }

    const isValid = await validatePassword(currentPassword, staff.password);
    if (!isValid) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Incorrect password",
          errorMessage: "Current password is incorrect.",
          errorLog: null,
        },
        { status: 401 }
      );
    }

    // Prevent reusing old password (only when not temp)
    const isSame = await validatePassword(newPassword, staff.password);
    if (isSame) {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Password reuse",
          errorMessage: "New password must be different from the current password.",
          errorLog: null,
        },
        { status: 422 }
      );
    }
  }

  // 5. Hash new password
  let hashedPassword: string;
  try {
    hashedPassword = await hashPassword(newPassword);
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "se",
        errorTitle: "Password hashing failed",
        errorMessage: "Internal error while securing new password.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  // 6. Update password and set tempPassword = false
  try {
    await Database.update(Staffs)
      .set({
        password: hashedPassword,
        tempPassword: false,
      })
      .where(eq(Staffs.id, staff.id));

    return NextResponse.json(
      {
        error: false,
        message: "Password changed successfully.",
        requiresPasswordChange: false,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database update failed",
        errorMessage: "Unable to update password. Please try again later.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}