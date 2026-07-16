import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { NextRequest, NextResponse } from "next/server";
import { getFormDataEntries, hashPassword } from "@/utils/shared";
import { validateCustomerData } from "@/utils/customers";
import { eq } from "drizzle-orm";
import { customersTriggers } from '@/triggers/customers';

// ------------------------------------------------------------------
// POST /api/customers – Create a new customer (Sign-up)
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let rawData: any;

  // 1. Parse form data
  try {
    rawData = await getFormDataEntries(req);
    console.log('[POST /api/customers] Parsed rawData:', JSON.stringify(rawData, null, 2));
  } catch (e) {
    console.error('[POST /api/customers] Form data parse error:', e);
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
    console.warn('[POST /api/customers] Validation errors:', validationErrors);
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Creating failed",
      errorMessage: validationErrors.join(" "),
      errorLog: validationErrors,
    }, { status: 422 });
  }

  // 3. Check email uniqueness
  const emailToCheck = rawData.email.trim();
  console.log('[POST /api/customers] Checking email uniqueness:', emailToCheck);
  try {
    const existingEmail = await Database.select()
      .from(Customers)
      .where(eq(Customers.email, emailToCheck))
      .limit(1);
    console.log('[POST /api/customers] Email check result:', existingEmail.length ? 'DUPLICATE' : 'OK');
    if (existingEmail.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate email",
        errorMessage: `Email "${emailToCheck}" is already registered.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    console.error('[POST /api/customers] Email check error:', e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify email.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 4. Check phone uniqueness
  const phoneToCheck = rawData.phone.trim();
  console.log('[POST /api/customers] Checking phone uniqueness:', phoneToCheck);
  try {
    const existingPhone = await Database.select()
      .from(Customers)
      .where(eq(Customers.phone, phoneToCheck))
      .limit(1);
    console.log('[POST /api/customers] Phone check result:', existingPhone.length ? 'DUPLICATE' : 'OK');
    if (existingPhone.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate phone",
        errorMessage: `Phone "${phoneToCheck}" is already registered.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    console.error('[POST /api/customers] Phone check error:', e);
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
    console.error('[POST /api/customers] Password hashing error:', e);
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
        email: emailToCheck,
        phone: phoneToCheck,
        password: hashedPassword,
        tempPassword: rawData.tempPassword ?? true,
      })
      .returning();

    console.log('[POST /api/customers] Customer created:', newCustomer.id);

    const { password, ...customerWithoutPassword } = newCustomer;

    customersTriggers.onNew({
      fullname: customerWithoutPassword.fullname,
      email: customerWithoutPassword.email,
    }).catch(console.error);

    return NextResponse.json({
      error: false,
      message: "Customer registered successfully.",
      data: customerWithoutPassword,
    }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/customers] Insert error:', e);
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