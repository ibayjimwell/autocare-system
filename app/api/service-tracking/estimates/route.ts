import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/payments/estimate-finding-parts.model";
import { EstimateTasks } from "@/database/models/payments/estimate-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Services } from "@/database/models/services/services.model";
import { InspectionFindings } from "@/database/models/service-tracking/inspection-findings.model";
import { InspectionFindingParts } from "@/database/models/service-tracking/inspection-finding-parts.model";
import { InspectionTasks } from "@/database/models/service-tracking/inspection-tasks.model";
import { eq, inArray, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { appointmentExists } from "@/utils/service-tracking";
import { getAppointmentInfo } from "@/utils/payments/get-appointment-info";
import { paymentsTriggers } from "@/triggers/payments";
import { mobilePaymentsTriggers } from "@/app-triggers/payments";
import { keepAppointmentInventory } from "@/utils/inventory/appointment-inventory";
import { inventoryTriggers } from "@/triggers/inventory";

// --------------------------------------------------------------------------
// POST /api/service-tracking/estimates
// --------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid JSON",
        errorMessage: "Request body must be valid JSON.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 400 }
    );
  }

  const { appointmentId } = body;
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid appointment",
        errorMessage: "appointmentId is required and must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 }
    );
  }

  const exists = await appointmentExists(appointmentId);
  if (!exists) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Appointment not found",
        errorMessage: "Appointment does not exist.",
        errorLog: null,
      },
      { status: 404 }
    );
  }

  try {
    const result = await Database.transaction(async (tx) => {
      // 1. Fetch appointment services
      const [appt] = await tx
        .select()
        .from(Appointments)
        .where(eq(Appointments.id, appointmentId));

      if (!appt) {
        throw new Error("Appointment does not exist.");
      }

      const serviceIds = appt.services || [];
      let serviceSubtotal = 0;
      let serviceDetails: any[] = [];

      if (serviceIds.length > 0) {
        const svcs = await tx
          .select()
          .from(Services)
          .where(inArray(Services.id, serviceIds));

        serviceDetails = svcs;

        serviceSubtotal = svcs.reduce(
          (sum, s) =>
            sum +
            (parseFloat(s.basePrice) || 0),
          0,
        );
      }

      // 2. Fetch inspection findings and their parts
      const findings = await tx
        .select()
        .from(InspectionFindings)
        .where(
          eq(
            InspectionFindings.appointmentId,
            appointmentId,
          ),
        );

      let findingsSubtotal = 0;
      const estimateFindingsData: any[] = [];

      for (const f of findings) {
        const parts = await tx
          .select()
          .from(InspectionFindingParts)
          .where(
            eq(
              InspectionFindingParts.findingId,
              f.id,
            ),
          );

        let findingPartsTotal = 0;

        const partsData = parts.map((p) => {
          const total =
            (p.quantity || 1) *
            (parseFloat(p.priceAtTime) || 0);

          findingPartsTotal += total;

          return {
            inventoryItemId:
              p.inventoryItemId || undefined,
            partName: p.partName,
            quantity: p.quantity || 1,
            priceAtTime: p.priceAtTime,
            isPms: p.isPms,
            totalPrice: total.toString(),
          };
        });

        findingsSubtotal += findingPartsTotal;

        estimateFindingsData.push({
          findingId: f.id,
          description: f.description,
          included: true,
          partsSubtotal:
            findingPartsTotal.toString(),
          parts: partsData,
        });
      }

      // 3. Reserve inventory selected in findings.
      //
      // This is deliberately inside the same database transaction as
      // estimate creation. If there is insufficient stock, the whole
      // operation rolls back and no estimate is created.
      const inventoryResult =
        await keepAppointmentInventory(
          tx,
          appointmentId,
        );

      // 4. Fetch completed inspection tasks
      const completedTasks = await tx
        .select()
        .from(InspectionTasks)
        .where(
          and(
            eq(
              InspectionTasks.appointmentId,
              appointmentId,
            ),
            eq(
              InspectionTasks.status,
              'DONE',
            ),
          ),
        );

      // 5. Create estimate
      const [newEstimate] =
        await tx
          .insert(EstimatedCosts)
          .values({
            appointmentId,
            status: "PENDING",
            serviceSubtotal:
              serviceSubtotal.toString(),
            findingsSubtotal:
              findingsSubtotal.toString(),
            feesTotal: "0",
            discountTotal: "0",
            grandTotal:
              (
                serviceSubtotal +
                findingsSubtotal
              ).toString(),
          })
          .returning();

      // 6. Create estimate findings and parts
      for (
        const ef of
          estimateFindingsData
      ) {
        const [
          newEstFinding,
        ] =
          await tx
            .insert(
              EstimateFindings,
            )
            .values({
              estimateId:
                newEstimate.id,
              findingId:
                ef.findingId,
              description:
                ef.description,
              included:
                ef.included,
              partsSubtotal:
                ef.partsSubtotal,
            })
            .returning();

        for (
          const part of
            ef.parts
        ) {
          await tx
            .insert(
              EstimateFindingParts,
            )
            .values({
              estimateFindingId:
                newEstFinding.id,
              partName:
                part.partName,
              quantity:
                part.quantity,
              priceAtTime:
                part.priceAtTime,
              isPms:
                part.isPms,
              totalPrice:
                part.totalPrice,
            });
        }
      }

      // 7. Create estimate tasks
      for (
        const task of
          completedTasks
      ) {
        await tx
          .insert(
            EstimateTasks,
          )
          .values({
            estimateId:
              newEstimate.id,
            taskId: task.id,
            title:
              task.title,
            durationMinutes:
              task.durationMinutes,
            status: 'DONE',
          });
      }

      return {
        estimate:
          newEstimate,
        inventory:
          inventoryResult,
      };
    });

    const info =
      await getAppointmentInfo(
        appointmentId,
      );

    if (
      result.inventory
        ?.allocations
        ?.length > 0
    ) {
      const totalQuantity =
        result.inventory.allocations.reduce(
          (
            sum: number,
            item: any,
          ) =>
            sum +
            (Number(
              item.quantity,
            ) || 0),
          0,
        );

      inventoryTriggers
        .onKept({
          itemName:
            `${result.inventory.allocations.length} item(s) for ${info.trackingNumber}`,
          quantity:
            totalQuantity,
        })
        .catch(console.error);
    }

    mobilePaymentsTriggers
      .onEstimateGenerated({
        customerId:
          info.customerId,
        trackingNumber:
          info.trackingNumber,
        appointmentId,
      })
      .catch(console.error);

    paymentsTriggers
      .onEstimateGenerated({
        trackingNumber:
          info.trackingNumber,
        customerName:
          info.customerName,
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message:
          "Estimate generated with services, findings, completed tasks, and inventory kept for this appointment.",
        data:
          result.estimate,
        inventory:
          result.inventory?.allocations ||
          [],
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/service-tracking/estimates] Error:", e);

    const inventoryError =
      e as Error & {
        code?: string;
        available?: number;
        requested?: number;
        inventoryItemId?: string;
      };

    if (
      inventoryError?.code ===
      'INSUFFICIENT_INVENTORY'
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType: "inventory",
          errorTitle:
            "Insufficient inventory",
          errorMessage:
            inventoryError.message ||
            "There is not enough inventory available for one or more selected parts.",
          errorLog: null,
          inventory: {
            inventoryItemId:
              inventoryError.inventoryItemId ||
              null,
            available:
              inventoryError.available ??
              null,
            requested:
              inventoryError.requested ??
              null,
          },
        },
        { status: 409 },
      );
    }

    if (
      inventoryError?.code ===
      'INVENTORY_ITEM_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType: "inventory",
          errorTitle:
            "Inventory item not found",
          errorMessage:
            inventoryError.message ||
            "One of the selected inventory items no longer exists.",
          errorLog: null,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Could not generate estimate.",
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      { status: 500 },
    );
  }
}
