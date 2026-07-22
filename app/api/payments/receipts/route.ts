// app/api/payments/receipts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Receipts } from "@/database/models/payments/receipts.model";
import { eq } from "drizzle-orm";

// --------------------------------------------------------------
// GET /api/payments/receipts – Get receipts by finalBillId
// --------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const finalBillId = searchParams.get("finalBillId");

  if (!finalBillId) {
    return NextResponse.json(
      { error: true, errorMessage: "finalBillId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const receipts = await Database.select()
      .from(Receipts)
      .where(eq(Receipts.finalBillId, finalBillId))
      .limit(1);

    if (receipts.length === 0) {
      return NextResponse.json(
        { error: true, errorMessage: "No receipt found for this final bill" },
        { status: 404 }
      );
    }

    const receipt = receipts[0];
    // The receipt data is already stored as JSONB in the 'data' column.
    // We can return it directly along with the reference number and date.
    return NextResponse.json({
      error: false,
      message: "Receipt retrieved.",
      data: {
        referenceNumber: receipt.referenceNumber,
        createdAt: receipt.createdAt,
        details: receipt.data,
      },
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/payments/receipts] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch receipt.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}