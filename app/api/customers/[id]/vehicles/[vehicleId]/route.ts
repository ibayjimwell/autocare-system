import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { validateCustomerId, validateVehicleUpdate } from "@/utils/customers";
import { eq, and } from "drizzle-orm";

// ------------------------------------------------------------------
// GET /api/customers/[id]/vehicles/[vehicleId] – Get a specific vehicle
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  const { id, vehicleId } = await params;

  const validationError = await validateCustomerId(id);
  if (validationError) return validationError;

  try {
    const [vehicle] = await Database.select()
      .from(Vehicles)
      .where(and(eq(Vehicles.id, vehicleId), eq(Vehicles.customerId, id)))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Vehicle not found",
        errorMessage: "Vehicle does not exist for this customer.",
        errorLog: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: "Vehicle retrieved successfully.",
      data: vehicle,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch vehicle details.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// PUT /api/customers/[id]/vehicles/[vehicleId] – Update a vehicle
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  const { id, vehicleId } = await params;

  // Validate customer ID
  const validationError = await validateCustomerId(id);
  if (validationError) return validationError;

  // Fetch the current vehicle (needed for plate comparison)
  let currentVehicle;
  try {
    const [vehicle] = await Database.select()
      .from(Vehicles)
      .where(and(eq(Vehicles.id, vehicleId), eq(Vehicles.customerId, id)))
      .limit(1);
    if (!vehicle) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Vehicle not found",
        errorMessage: "Vehicle does not exist for this customer.",
        errorLog: null,
      }, { status: 404 });
    }
    currentVehicle = vehicle;
  } catch (e) {
    console.error("[PUT] Fetch error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify vehicle.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

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

  // Validate update data
  const { errors, updateData } = validateVehicleUpdate(body);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "No fields to update",
      errorMessage: "At least one field must be provided.",
      errorLog: null,
    }, { status: 422 });
  }

  // Check plate uniqueness ONLY if plate is being changed
  if (updateData.plateNumber && updateData.plateNumber !== currentVehicle.plateNumber) {
    try {
      const existing = await Database.select({ id: Vehicles.id })
        .from(Vehicles)
        .where(eq(Vehicles.plateNumber, updateData.plateNumber))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== vehicleId) {
        return NextResponse.json({
          error: true,
          errorType: "fve",
          errorTitle: "Duplicate plate number",
          errorMessage: `Plate number "${updateData.plateNumber}" is already registered.`,
          errorLog: null,
        }, { status: 409 });
      }
    } catch (e) {
      console.error("[PUT] Error checking plate uniqueness:", e);
      return NextResponse.json({
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to verify plate number uniqueness.",
        errorLog: e instanceof Error ? e.message : String(e),
      }, { status: 500 });
    }
  }

  // Ensure `year` is a number or null
  if (updateData.year !== undefined) {
    if (updateData.year === null || updateData.year === '') {
      updateData.year = null;
    } else {
      const yearNum = Number(updateData.year);
      if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear() + 1) {
        updateData.year = yearNum;
      } else {
        updateData.year = null;
      }
    }
  }

  // Set updatedAt
  updateData.updatedAt = new Date();

  // Perform update with combined WHERE condition
  try {
    const [updatedVehicle] = await Database.update(Vehicles)
      .set(updateData)
      .where(and(eq(Vehicles.id, vehicleId), eq(Vehicles.customerId, id)))
      .returning();

    if (!updatedVehicle) {
      return NextResponse.json({
        error: true,
        errorType: "dbe",
        errorTitle: "Update failed",
        errorMessage: "No vehicle was updated.",
        errorLog: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: "Vehicle updated successfully.",
      data: updatedVehicle,
    }, { status: 200 });
  } catch (e: any) {
    console.error("[PUT] Database error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update vehicle.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// DELETE /api/customers/[id]/vehicles/[vehicleId] – Delete a vehicle
// ------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  const { id, vehicleId } = await params;

  const validationError = await validateCustomerId(id);
  if (validationError) return validationError;

  try {
    // Verify it exists before deleting (optional but safe)
    const [vehicle] = await Database.select()
      .from(Vehicles)
      .where(and(eq(Vehicles.id, vehicleId), eq(Vehicles.customerId, id)))
      .limit(1);
    if (!vehicle) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Vehicle not found",
        errorMessage: "Vehicle does not exist for this customer.",
        errorLog: null,
      }, { status: 404 });
    }

    await Database.delete(Vehicles)
      .where(and(eq(Vehicles.id, vehicleId), eq(Vehicles.customerId, id)));

    return NextResponse.json({
      error: false,
      message: "Vehicle deleted successfully.",
    }, { status: 200 });
  } catch (e) {
    console.error("[DELETE] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database deletion error",
      errorMessage: "Could not delete vehicle.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}