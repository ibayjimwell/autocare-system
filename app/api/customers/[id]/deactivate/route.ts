import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { eq, sql } from "drizzle-orm";
import { validateCustomerId } from "@/utils/customers";
import { customersTriggers } from "@/triggers/customers";

// ------------------------------------------------------------------
// PUT /api/customers/[id]/deactivate – Deactivate a customer
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  const validationError = await validateCustomerId(customerId);
  if (validationError) return validationError;

  try {
    const [updated] = await Database.update(Customers)
      .set({
        deactivated: true,
        updatedAt: sql`NOW()`,
      })
      .where(eq(Customers.id, customerId))
      .returning();

    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Customer not found",
        errorMessage: "Customer does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    customersTriggers.onDeactivated({
      fullname: updated.fullname,
    }).catch(console.error);

    const { password, ...customer } = updated;
    return NextResponse.json({
      error: false,
      message: "Customer deactivated successfully.",
      data: customer,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to deactivate customer.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}