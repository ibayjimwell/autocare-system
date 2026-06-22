import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries, hashPassword } from "@/utils/shared";
import { validateCustomerData } from "@/utils/customers";
import { eq } from "drizzle-orm";

// ------------------------------------------------------------------
// POST /api/customers – Create a new customer (Sign-up)
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
  const validationErrors = validateCustomerData(rawData);
  if (validationErrors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Creating failed",
      errorMessage: validationErrors.join(" "),
      errorLog: validationErrors,
    }, { status: 422 });
  }

  // 3. Check email uniqueness
  try {
    const existing = await Database.select()
      .from(Customers)
      .where(eq(Customers.email, rawData.email.trim()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate email",
        errorMessage: `Email "${rawData.email}" is already registered.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify email.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 4. Check phone uniqueness
  try {
    const existing = await Database.select()
      .from(Customers)
      .where(eq(Customers.phone, rawData.phone.trim()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate phone",
        errorMessage: `Phone "${rawData.phone}" is already registered.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify phone.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 5. Hash password
  let hashedPassword: string;
  try {
    hashedPassword = await hashPassword(rawData.password);
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "se",
      errorTitle: "Password hashing failed",
      errorMessage: "Internal error while securing password.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 6. Insert customer
  try {
    const [newCustomer] = await Database.insert(Customers)
      .values({
        fullname: rawData.fullname.trim(),
        email: rawData.email.trim(),
        phone: rawData.phone.trim(),
        password: hashedPassword,
      })
      .returning();

    const { password, ...customerWithoutPassword } = newCustomer;

    return NextResponse.json({
      error: false,
      message: "Customer registered successfully.",
      data: customerWithoutPassword,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not save customer.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// GET /api/customers – Retrieve all customers (without passwords)
// ------------------------------------------------------------------
export async function GET() {
  try {
    const customers = await Database.select({
      id: Customers.id,
      fullname: Customers.fullname,
      email: Customers.email,
      phone: Customers.phone,
      deactivated: Customers.deactivated,
      createdAt: Customers.createdAt,
      updatedAt: Customers.updatedAt,
    })
      .from(Customers)
      .orderBy(Customers.updatedAt);

    return NextResponse.json({
      error: false,
      message: "Customers retrieved successfully.",
      data: customers,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database query error",
      errorMessage: "Unable to fetch customers.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}