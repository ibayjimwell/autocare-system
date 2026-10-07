// utils/payments/generate-payment-receipt.ts

import {
  Database,
} from '@/lib/drizzle';

import {
  FinalBill,
} from '@/database/models/payments/final-bill.model';

import {
  FinalBillFindings,
} from '@/database/models/payments/final-bill-findings.model';

import {
  FinalBillWorkTasks,
} from '@/database/models/payments/final-bill-work-tasks.model';

import {
  FinalBillFees,
} from '@/database/models/payments/final-bill-fees.model';

import {
  FinalBillDiscounts,
} from '@/database/models/payments/final-bill-discounts.model';

import {
  EstimatedCosts,
} from '@/database/models/payments/estimated-costs.model';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  Vehicles,
} from '@/database/models/customers/vehicles.model';

import {
  Services,
} from '@/database/models/services/services.model';

import {
  InspectionTasks,
} from '@/database/models/service-tracking/inspection-tasks.model';

import {
  InspectionFindings,
} from '@/database/models/service-tracking/inspection-findings.model';

import {
  InspectionFindingParts,
} from '@/database/models/service-tracking/inspection-finding-parts.model';

import {
  Receipts,
} from '@/database/models/payments/receipts.model';

import {
  and,
  eq,
  inArray,
} from 'drizzle-orm';

import {
  paymentsTriggers,
} from '@/triggers/payments';

import {
  recordPaymentTransaction,
} from '@/utils/payments/payment-transactions';

/* ============================================================================
   TYPES
============================================================================ */

export interface GeneratePaymentReceiptOptions {
  /**
   * Payment method stored in the payment transaction history
   * and receipt snapshot.
   *
   * Examples:
   * - CASH
   * - QRPH
   */
  paymentMethod?: string;

  /**
   * External payment reference.
   *
   * For PayMongo QRPh this should normally be the Payment Intent ID.
   */
  paymentReference?: string | null;

  /**
   * When true, calling this function again for an already processed
   * payment returns the existing receipt instead of throwing.
   *
   * This is important for PayMongo because:
   *
   *   webhook
   *      and
   *   verify-payment
   *
   * can arrive at almost the same time.
   */
  idempotent?: boolean;

  /**
   * Optional required status before transitioning to PAID.
   *
   * QRPh should use:
   *
   *   expectedStatus: 'OFFICIAL'
   *
   * Cash keeps the previous behavior by leaving this undefined.
   */
  expectedStatus?: 'OFFICIAL';
}

export interface GeneratePaymentReceiptResult {
  referenceNumber: string;
  receiptData: any;

  /**
   * true:
   * This invocation created the receipt.
   *
   * false:
   * Another request had already created the receipt.
   */
  created: boolean;

  /**
   * true when this was already processed before this invocation.
   */
  alreadyProcessed: boolean;
}

/* ============================================================================
   HELPERS
============================================================================ */

function generateReferenceNumber(): string {
  const date =
    new Date();

  const yy =
    date
      .getFullYear()
      .toString()
      .slice(-2);

  const mm =
    (date.getMonth() + 1)
      .toString()
      .padStart(
        2,
        '0',
      );

  const dd =
    date
      .getDate()
      .toString()
      .padStart(
        2,
        '0',
      );

  const random =
    Math.floor(
      1000 +
        Math.random() *
          9000,
    );

  return `RES-${yy}${mm}${dd}-${random}`;
}

function normalizePaymentMethod(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    String(
      value ??
        'CASH',
    )
      .trim()
      .toUpperCase();

  return (
    normalized ||
    'CASH'
  );
}

/* ============================================================================
   GENERATE PAYMENT RECEIPT
============================================================================ */

export async function generatePaymentReceipt(
  billId: string,
  options: GeneratePaymentReceiptOptions = {},
): Promise<GeneratePaymentReceiptResult> {
  const paymentMethod =
    normalizePaymentMethod(
      options.paymentMethod,
    );

  const paymentReference =
    options.paymentReference ??
    null;

  const idempotent =
    options.idempotent ===
    true;

  /* --------------------------------------------------------------------------
     1. LOAD FINAL BILL
  -------------------------------------------------------------------------- */

  const [bill] =
    await Database
      .select()
      .from(
        FinalBill,
      )
      .where(
        eq(
          FinalBill.id,
          billId,
        ),
      )
      .limit(1);

  if (!bill) {
    throw new Error(
      'Final Cost not found',
    );
  }

  /* --------------------------------------------------------------------------
     2. CHECK FOR EXISTING RECEIPT

     This is the first idempotency guard.

     If PayMongo webhook already generated the receipt and mobile polling calls
     verify-payment afterward, we simply return the existing receipt.
  -------------------------------------------------------------------------- */

  const [existingReceipt] =
    await Database
      .select()
      .from(
        Receipts,
      )
      .where(
        eq(
          Receipts.finalBillId,
          billId,
        ),
      )
      .limit(1);

  if (existingReceipt) {
    if (!idempotent) {
      throw new Error(
        'Bill already paid',
      );
    }

    return {
      referenceNumber:
        existingReceipt.referenceNumber,

      receiptData:
        existingReceipt.data,

      created:
        false,

      alreadyProcessed:
        true,
    };
  }

  /*
   * For normal/cash payment behavior, preserve the old rule:
   *
   * PAID + no idempotent option = reject.
   *
   * For online PayMongo processing we intentionally allow:
   *
   * PAID + no receipt + idempotent=true
   *
   * so an old payment affected by the previous bug can repair its missing
   * receipt.
   */
  if (
    bill.status ===
      'PAID' &&
    !idempotent
  ) {
    throw new Error(
      'Bill already paid',
    );
  }

  if (
    options.expectedStatus &&
    bill.status !==
      options.expectedStatus &&
    bill.status !==
      'PAID'
  ) {
    throw new Error(
      `This bill is currently ${bill.status} and is not ready for payment.`,
    );
  }

  /* --------------------------------------------------------------------------
     3. LOAD FINAL BILL RELATED DATA
  -------------------------------------------------------------------------- */

  const [
    findings,
    fees,
    discounts,
    workTasks,
    estimate,
    appointment,
  ] =
    await Promise.all([
      Database
        .select()
        .from(
          FinalBillFindings,
        )
        .where(
          eq(
            FinalBillFindings.finalBillId,
            billId,
          ),
        ),

      Database
        .select()
        .from(
          FinalBillFees,
        )
        .where(
          eq(
            FinalBillFees.finalBillId,
            billId,
          ),
        ),

      Database
        .select()
        .from(
          FinalBillDiscounts,
        )
        .where(
          eq(
            FinalBillDiscounts.finalBillId,
            billId,
          ),
        ),

      Database
        .select()
        .from(
          FinalBillWorkTasks,
        )
        .where(
          eq(
            FinalBillWorkTasks.finalBillId,
            billId,
          ),
        ),

      bill.estimateId
        ? Database
            .select()
            .from(
              EstimatedCosts,
            )
            .where(
              eq(
                EstimatedCosts.id,
                bill.estimateId,
              ),
            )
            .limit(1)
            .then(
              rows =>
                rows[0] ??
                null,
            )
        : Promise.resolve(
            null,
          ),

      Database
        .select()
        .from(
          Appointments,
        )
        .where(
          eq(
            Appointments.id,
            bill.appointmentId,
          ),
        )
        .limit(1)
        .then(
          rows =>
            rows[0] ??
            null,
        ),
    ]);

  if (!appointment) {
    throw new Error(
      'Appointment not found',
    );
  }

  /* --------------------------------------------------------------------------
     4. CUSTOMER + VEHICLE
  -------------------------------------------------------------------------- */

  const [
    customer,
    vehicle,
  ] =
    await Promise.all([
      Database
        .select()
        .from(
          Customers,
        )
        .where(
          eq(
            Customers.id,
            appointment.customerId,
          ),
        )
        .limit(1)
        .then(
          rows =>
            rows[0] ??
            null,
        ),

      Database
        .select()
        .from(
          Vehicles,
        )
        .where(
          eq(
            Vehicles.id,
            appointment.vehicleId,
          ),
        )
        .limit(1)
        .then(
          rows =>
            rows[0] ??
            null,
        ),
    ]);

  /* --------------------------------------------------------------------------
     5. SERVICES
  -------------------------------------------------------------------------- */

  const serviceIds =
    Array.isArray(
      appointment.services,
    )
      ? appointment.services.filter(
          (
            value,
          ): value is string =>
            typeof value ===
              'string' &&
            value.length >
              0,
        )
      : [];

  const services =
    serviceIds.length >
    0
      ? await Database
          .select()
          .from(
            Services,
          )
          .where(
            inArray(
              Services.id,
              serviceIds,
            ),
          )
      : [];

  /* --------------------------------------------------------------------------
     6. INSPECTION TASKS + FINDINGS
  -------------------------------------------------------------------------- */

  const [
    inspectionTasks,
    inspectionFindings,
  ] =
    await Promise.all([
      Database
        .select()
        .from(
          InspectionTasks,
        )
        .where(
          eq(
            InspectionTasks.appointmentId,
            appointment.id,
          ),
        ),

      Database
        .select()
        .from(
          InspectionFindings,
        )
        .where(
          eq(
            InspectionFindings.appointmentId,
            appointment.id,
          ),
        ),
    ]);

  const findingParts =
    await Promise.all(
      inspectionFindings.map(
        async finding => {
          const parts =
            await Database
              .select()
              .from(
                InspectionFindingParts,
              )
              .where(
                eq(
                  InspectionFindingParts.findingId,
                  finding.id,
                ),
              );

          return {
            ...finding,
            parts,
          };
        },
      ),
    );

  /* --------------------------------------------------------------------------
     7. ESTIMATE SNAPSHOT
  -------------------------------------------------------------------------- */

  const estimateData =
    estimate
      ? {
          id:
            estimate.id,

          status:
            estimate.status,

          serviceSubtotal:
            estimate.serviceSubtotal,

          findingsSubtotal:
            estimate.findingsSubtotal,

          feesTotal:
            estimate.feesTotal,

          discountTotal:
            estimate.discountTotal,

          grandTotal:
            estimate.grandTotal,

          reason:
            estimate.reason,

          createdAt:
            estimate.createdAt,
        }
      : null;

  /* --------------------------------------------------------------------------
     8. RECEIPT SNAPSHOT
  -------------------------------------------------------------------------- */

  const paidAt =
    new Date().toISOString();

  const receiptData = {
    customer:
      customer
        ? {
            fullname:
              customer.fullname,

            email:
              customer.email,

            phone:
              customer.phone,
          }
        : null,

    vehicle:
      vehicle
        ? {
            make:
              vehicle.make,

            model:
              vehicle.model,

            year:
              vehicle.year,

            plateNumber:
              vehicle.plateNumber,
          }
        : null,

    appointment: {
      trackingNumber:
        appointment.trackingNumber,

      appointmentDate:
        appointment.appointmentDate,

      appointmentTime:
        appointment.appointmentTime,

      notes:
        appointment.notes,
    },

    services:
      services.map(
        service => ({
          name:
            service.name,

          description:
            service.description,

          basePrice:
            service.basePrice,

          estimatedDuration:
            service.estimatedDuration,

          type:
            service.type,
        }),
      ),

    inspection: {
      doneTasks:
        inspectionTasks
          .filter(
            task =>
              task.status ===
              'DONE',
          )
          .map(
            task => ({
              title:
                task.title,
            }),
          ),

      findings:
        findingParts.map(
          finding => ({
            description:
              finding.description,

            parts:
              finding.parts.map(
                part => {
                  const quantity =
                    Number(
                      part.quantity ??
                        0,
                    );

                  const price =
                    Number.parseFloat(
                      String(
                        part.priceAtTime ??
                          0,
                      ),
                    ) ||
                    0;

                  return {
                    partName:
                      part.partName,

                    quantity:
                      part.quantity,

                    priceAtTime:
                      part.priceAtTime,

                    isPms:
                      part.isPms,

                    totalPrice:
                      (
                        quantity *
                        price
                      ).toFixed(
                        2,
                      ),
                  };
                },
              ),
          }),
        ),
    },

    estimate:
      estimateData,

    finalBill: {
      id:
        bill.id,

      serviceSubtotal:
        bill.serviceSubtotal,

      findingsSubtotal:
        bill.findingsSubtotal,

      workTasksSubtotal:
        bill.workTasksSubtotal,

      feesTotal:
        bill.feesTotal,

      discountTotal:
        bill.discountTotal,

      grandTotal:
        bill.grandTotal,

      createdAt:
        bill.createdAt,

      workTasks:
        workTasks.map(
          task => ({
            title:
              task.title,
          }),
        ),

      fees:
        fees.map(
          fee => ({
            title:
              fee.title,

            amount:
              fee.amount,
          }),
        ),

      discounts:
        discounts.map(
          discount => ({
            title:
              discount.title,

            type:
              discount.type,

            value:
              discount.value,

            amount:
              discount.amount,
          }),
        ),

      findings:
        findings.map(
          finding => ({
            description:
              finding.description,

            included:
              finding.included,

            partsSubtotal:
              finding.partsSubtotal,
          }),
        ),
    },

    payment: {
      totalAmount:
        bill.grandTotal,

      paidAt,

      method:
        paymentMethod,

      reference:
        paymentReference,
    },
  };

  const referenceNumber =
    generateReferenceNumber();

  /* --------------------------------------------------------------------------
     9. ATOMIC PAYMENT FINALIZATION

     IMPORTANT:

     Receipt creation and PAID transition happen in the SAME transaction.

     For QRPh:

       OFFICIAL
          ↓
       insert receipt
          ↓
       PAID

     If receipt insertion fails, the status update rolls back too.

     If webhook and verify-payment arrive together, only one request should
     successfully transition the current status.
  -------------------------------------------------------------------------- */

  const transactionResult =
    await Database.transaction(
      async tx => {
        /*
         * Check again INSIDE the transaction because another request may
         * have completed between our first query and this transaction.
         */
        const [
          transactionExistingReceipt,
        ] =
          await tx
            .select()
            .from(
              Receipts,
            )
            .where(
              eq(
                Receipts.finalBillId,
                billId,
              ),
            )
            .limit(1);

        if (
          transactionExistingReceipt
        ) {
          if (!idempotent) {
            throw new Error(
              'Bill already paid',
            );
          }

          return {
            referenceNumber:
              transactionExistingReceipt.referenceNumber,

            receiptData:
              transactionExistingReceipt.data,

            created:
              false,

            alreadyProcessed:
              true,

            previousStatus:
              'PAID',
          };
        }

        const [
          currentBill,
        ] =
          await tx
            .select()
            .from(
              FinalBill,
            )
            .where(
              eq(
                FinalBill.id,
                billId,
              ),
            )
            .limit(1);

        if (!currentBill) {
          throw new Error(
            'Final Cost not found',
          );
        }

        /*
         * LEGACY REPAIR CASE
         *
         * Previous online payment code could do:
         *
         *   OFFICIAL -> PAID
         *   then receipt generation failed
         *
         * because generatePaymentReceipt rejected PAID bills.
         *
         * If this is an idempotent confirmed online payment and the bill is
         * already PAID but has no receipt, create the missing receipt.
         */
        if (
          currentBill.status ===
          'PAID'
        ) {
          if (!idempotent) {
            throw new Error(
              'Bill already paid',
            );
          }

          await tx
            .insert(
              Receipts,
            )
            .values({
              referenceNumber,

              finalBillId:
                currentBill.id,

              estimateId:
                currentBill.estimateId,

              appointmentId:
                currentBill.appointmentId,

              data:
                receiptData,
            });

          return {
            referenceNumber,

            receiptData,

            created:
              true,

            alreadyProcessed:
              true,

            previousStatus:
              'PAID',
          };
        }

        if (
          options.expectedStatus &&
          currentBill.status !==
            options.expectedStatus
        ) {
          throw new Error(
            `This bill is currently ${currentBill.status} and is not ready for payment.`,
          );
        }

        /*
         * Compare against the status we just read.
         *
         * This gives us an optimistic concurrency guard.
         *
         * If another request changed the status first, returning() will
         * return no rows.
         */
        const transitioned =
          await tx
            .update(
              FinalBill,
            )
            .set({
              status:
                'PAID',

              updatedAt:
                new Date(),
            })
            .where(
              and(
                eq(
                  FinalBill.id,
                  billId,
                ),

                eq(
                  FinalBill.status,
                  currentBill.status,
                ),
              ),
            )
            .returning();

        if (
          !transitioned.length
        ) {
          /*
           * Another request may have won the race.
           *
           * Check whether it also created the receipt.
           */
          const [
            racedReceipt,
          ] =
            await tx
              .select()
              .from(
                Receipts,
              )
              .where(
                eq(
                  Receipts.finalBillId,
                  billId,
                ),
              )
              .limit(1);

          if (
            racedReceipt &&
            idempotent
          ) {
            return {
              referenceNumber:
                racedReceipt.referenceNumber,

              receiptData:
                racedReceipt.data,

              created:
                false,

              alreadyProcessed:
                true,

              previousStatus:
                'PAID',
            };
          }

          throw new Error(
            'Payment was already processed by another request.',
          );
        }

        /*
         * Insert receipt in the SAME transaction as the PAID transition.
         */
        await tx
          .insert(
            Receipts,
          )
          .values({
            referenceNumber,

            finalBillId:
              currentBill.id,

            estimateId:
              currentBill.estimateId,

            appointmentId:
              currentBill.appointmentId,

            data:
              receiptData,
          });

        return {
          referenceNumber,

          receiptData,

          created:
            true,

          alreadyProcessed:
            false,

          previousStatus:
            currentBill.status,
        };
      },
    );

  /* --------------------------------------------------------------------------
     10. IF ANOTHER REQUEST ALREADY PROCESSED IT, STOP HERE

     Do not duplicate:
     - transaction history
     - staff notification
  -------------------------------------------------------------------------- */

  if (
    !transactionResult.created
  ) {
    return {
      referenceNumber:
        transactionResult.referenceNumber,

      receiptData:
        transactionResult.receiptData,

      created:
        false,

      alreadyProcessed:
        true,
    };
  }

  /* --------------------------------------------------------------------------
     11. PAYMENT TRANSACTION HISTORY
  -------------------------------------------------------------------------- */

  try {
    await recordPaymentTransaction({
      entityType:
        'FINAL_BILL',

      entityId:
        bill.id,

      appointmentId:
        bill.appointmentId,

      eventType:
        'PAYMENT_COMPLETED',

      fromStatus:
        transactionResult.previousStatus,

      toStatus:
        'PAID',

      amount:
        bill.grandTotal,

      paymentMethod,

      referenceNumber:
        transactionResult.referenceNumber,
    });
  } catch (error) {
    /*
     * Payment + receipt are already committed.
     *
     * Transaction history failure must not roll back a successful payment.
     */
    console.error(
      '[generatePaymentReceipt] Failed to record payment transaction:',
      error,
    );
  }

  /* --------------------------------------------------------------------------
     12. STAFF NOTIFICATION
  -------------------------------------------------------------------------- */

  try {
    await paymentsTriggers
      .onPaymentCompleted({
        trackingNumber:
          appointment.trackingNumber,

        customerName:
          customer?.fullname,
      });
  } catch (error) {
    /*
     * Payment + receipt are already committed.
     *
     * Notification failure must not make the payment appear failed.
     */
    console.error(
      '[generatePaymentReceipt] Staff payment notification failed:',
      error,
    );
  }

  return {
    referenceNumber:
      transactionResult.referenceNumber,

    receiptData:
      transactionResult.receiptData,

    created:
      true,

    alreadyProcessed:
      transactionResult.alreadyProcessed,
  };
}