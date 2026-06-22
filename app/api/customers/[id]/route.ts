import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { eq, sql } from "drizzle-orm";
import { validateCustomerId, validateCustomerUpdate } from "@/utils/customers";

function stripPassword(customer: any) {
  const { password, ...rest } = customer;
  return rest;
}

// ------------------------------------------------------------------
// GET /api/customers/[id] – Get a specific customer (without password)
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  // Validate customer ID
  const validationError = await validateCustomerId(customerId);
  if (validationError) return validationError;

  try {
    const [customer] = await Database.select()
      .from(Customers)
      .where(eq(Customers.id, customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Customer not found",
        errorMessage: "Customer does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: "Customer retrieved successfully.",
      data: stripPassword(customer),
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch customer details.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// PUT /api/customers/[id] – Update customer information
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  // Validate customer ID
  const validationError = await validateCustomerId(customerId);
  if (validationError) return validationError;

  // Parse JSON body
  let body: any;
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

  // Validate update fields
  const { errors, updateData } = validateCustomerUpdate(body);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  // If no fields to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "No fields to update",
      errorMessage: "At least one of 'fullname', 'email', or 'phone' must be provided.",
      errorLog: null,
    }, { status: 422 });
  }

  // Check uniqueness for email/phone if being changed (excluding current)
  try {
    if (updateData.email) {
      const existing = await Database.select()
        .from(Customers)
        .where(eq(Customers.email, updateData.email))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== customerId) {
        return NextResponse.json({
          error: true,
          errorType: "fve",
          errorTitle: "Duplicate email",
          errorMessage: `Email "${updateData.email}" is already taken.`,
          errorLog: null,
        }, { status: 409 });
      }
    }
    if (updateData.phone) {
      const existing = await Database.select()
        .from(Customers)
        .where(eq(Customers.phone, updateData.phone))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== customerId) {
        return NextResponse.json({
          error: true,
          errorType: "fve",
          errorTitle: "Duplicate phone",
          errorMessage: `Phone "${updateData.phone}" is already taken.`,
          errorLog: null,
        }, { status: 409 });
      }
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify uniqueness.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // Add updatedAt
  updateData.updatedAt = sql`NOW()`;

  try {
    const [updatedCustomer] = await Database.update(Customers)
      .set(updateData)
      .where(eq(Customers.id, customerId))
      .returning();

    if (!updatedCustomer) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Update failed",
        errorMessage: "Customer not found.",
        errorLog: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: "Customer updated successfully.",
      data: stripPassword(updatedCustomer),
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update customer.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}