import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { eq } from "drizzle-orm";
import { validatePassword } from "@/utils/shared";
import { signJWT } from "@/utils/jwt";

// ------------------------------------------------------------------
// POST /api/customers/login – Authenticate customer and return JWT
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any;

  // 1. Parse JSON body
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Invalid request",
      errorMessage: "Request body must be valid JSON.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const { email, password } = body;

  // 2. Basic validation
  if (!email || typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Missing email",
      errorMessage: "Email is required.",
      errorLog: null,
    }, { status: 422 });
  }
  if (!password || typeof password !== "string" || password === "") {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Missing password",
      errorMessage: "Password is required.",
      errorLog: null,
    }, { status: 422 });
  }

  // 3. Fetch customer by email
  let customer;
  try {
    const result = await Database.select()
      .from(Customers)
      .where(eq(Customers.email, email.trim()))
      .limit(1);
    customer = result[0];
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify credentials.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  if (!customer) {
    return NextResponse.json({
      error: true,
      errorType: "auth",
      errorTitle: "Invalid credentials",
      errorMessage: "Email or password is incorrect.",
      errorLog: null,
    }, { status: 401 });
  }

  if (customer.deactivated) {
    return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Account deactivated",
        errorMessage: "Your account is deactivated. Please contact the admin for assistance.",
        errorLog: null,
    }, { status: 403 });
}

  // 4. Validate password
  let isPasswordValid: boolean;
  try {
    isPasswordValid = await validatePassword(password, customer.password);
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "se",
      errorTitle: "Password validation error",
      errorMessage: "Internal error while checking password.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  if (!isPasswordValid) {
    return NextResponse.json({
      error: true,
      errorType: "auth",
      errorTitle: "Invalid credentials",
      errorMessage: "Email or password is incorrect.",
      errorLog: null,
    }, { status: 401 });
  }

  // 5. Generate JWT
  const token = await signJWT({ id: customer.id, email: customer.email }, '7d');

  // Remove password from response
  const { password: _, ...customerWithoutPassword } = customer;

  return NextResponse.json({
    error: false,
    message: "Login successful.",
    data: {
      customer: customerWithoutPassword,
      token,
    },
  }, { status: 200 });
}
