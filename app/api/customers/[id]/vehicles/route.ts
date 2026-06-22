import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { validateCustomerId, validateVehicleData } from "@/utils/customers";
import { eq } from "drizzle-orm";

// ------------------------------------------------------------------
// POST /api/customers/[id]/vehicles – Add a new vehicle for a customer
// ------------------------------------------------------------------
export async function POST(
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

  // Validate vehicle data
  const errors = validateVehicleData(body);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  // Check plate number uniqueness
  try {
    const existing = await Database.select()
      .from(Vehicles)
      .where(eq(Vehicles.plateNumber, body.plateNumber.trim()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Duplicate plate number",
        errorMessage: `Plate number "${body.plateNumber}" is already registered.`,
        errorLog: null,
      }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify plate number uniqueness.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // Insert vehicle
  try {
    const [newVehicle] = await Database.insert(Vehicles)
      .values({
        customerId,
        plateNumber: body.plateNumber.trim(),
        make: body.make.trim(),
        model: body.model.trim(),
        year: body.year || null,
      })
      .returning();

    return NextResponse.json({
      error: false,
      message: "Vehicle added successfully.",
      data: newVehicle,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not add vehicle.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// GET /api/customers/[id]/vehicles – Get all vehicles of a customer
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
    const vehicles = await Database.select()
      .from(Vehicles)
      .where(eq(Vehicles.customerId, customerId))
      .orderBy(Vehicles.createdAt);

    return NextResponse.json({
      error: false,
      message: "Vehicles retrieved successfully.",
      data: vehicles,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch vehicles.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

