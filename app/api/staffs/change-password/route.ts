import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword, validatePasswordStrength } from "@/utils/shared";

// ------------------------------------------------------------------
// PUT /api/staffs/change-password – Change password of a staff member
// ------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  let body: any;

  // 1. Parse JSON body
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

  // 2. Validate required fields
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

  // 3. Validate new password strength
  const passwordStrength = validatePasswordStrength(newPassword);
  if (!passwordStrength.isValid) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Weak password",
        errorMessage: passwordStrength.errors.join(" "),
        errorLog: passwordStrength.errors,
      },
      { status: 422 }
    );
  }

  // 4. Fetch staff by username
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

  // 5. Verify current password
  let isCurrentPasswordValid: boolean;
  try {
    isCurrentPasswordValid = await validatePassword(currentPassword, staff.password);
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "se",
        errorTitle: "Password validation error",
        errorMessage: "Internal error while checking current password.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  if (!isCurrentPasswordValid) {
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

  // 6. Optionally, prevent reusing the same password (security best practice)
  const isSameAsOld = await validatePassword(newPassword, staff.password);
  if (isSameAsOld) {
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

  // 7. Hash the new password
  let hashedNewPassword: string;
  try {
    hashedNewPassword = await hashPassword(newPassword);
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

  // 8. Update password and set tempPassword = false
  try {
    await Database.update(Staffs)
      .set({
        password: hashedNewPassword,
        tempPassword: false,
      })
      .where(eq(Staffs.id, staff.id));

    return NextResponse.json(
      {
        error: false,
        message: "Password changed successfully. Please log in with your new password.",
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