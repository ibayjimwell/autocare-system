import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  Database,
} from "@/lib/drizzle";

import {
  Appointments,
} from "@/database/models/appointments/appointments.model";

import {
  AppointmentStatusHistory,
} from "@/database/models/appointments/appointments-status-history.model";

import {
  eq,
} from "drizzle-orm";

import {
  validateAppointmentId,
  isValidStatusTransition,
} from "@/utils/appointments";

import {
  isValidUUID,
} from "@/utils/shared";

import {
  getServerSession,
} from "next-auth";

import {
  authOptions,
} from "@/lib/auth/staffs/auth";

import {
  appointmentsTriggers,
} from "@/triggers/appointments";

import {
  mobileAppointmentsTriggers,
} from "@/app-triggers/appointments";

import {
  addToQueue,
  removeFromQueue,
} from "@/utils/queue/queue-utils";

/* ================================================================
   CANCELLABLE APPOINTMENT STATUSES
================================================================ */

const CANCELLABLE_STATUSES =
  [
    "PENDING",

    "CONFIRMED",

    "UNDER_INSPECTION",

    "WAITING_FOR_APPROVAL",

    "IN_PROGRESS",
  ] as const;

/* ================================================================
   PATCH APPOINTMENT STATUS
================================================================ */

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  /* ==============================================================
     PARAMETER
  ============================================================== */

  const {
    id,
  } = await params;

  /* ==============================================================
     VALIDATE APPOINTMENT ID
  ============================================================== */

  const validationError =
    await validateAppointmentId(
      id,
    );

  if (
    validationError
  ) {
    return validationError;
  }

  /* ==============================================================
     STAFF SESSION
  ============================================================== */

  const session =
    await getServerSession(
      authOptions,
    );

  let staffId:
    | string
    | null = null;

  if (
    session?.user?.id
  ) {
    staffId =
      session.user.id;
  }

  /* ==============================================================
     REQUEST BODY
  ============================================================== */

  let body: any;

  try {
    body =
      await req.json();
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorType:
          "fe",

        errorTitle:
          "Invalid request",

        errorMessage:
          "Request body must be valid JSON.",

        errorLog:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status: 400,
      },
    );
  }

  /* ==============================================================
     REQUEST VALUES
  ============================================================== */

  const {
    status,
    reason,
    changedBy,
  } = body;

  /* ==============================================================
     VALIDATE STATUS
  ============================================================== */

  if (
    !status ||
    typeof status !==
      "string"
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorType:
          "fve",

        errorTitle:
          "Missing status",

        errorMessage:
          "Status is required.",

        errorLog:
          null,
      },
      {
        status: 422,
      },
    );
  }

  const newStatus =
    status.toUpperCase();

  const validStatuses = [
    "PENDING",

    "CONFIRMED",

    "UNDER_INSPECTION",

    "WAITING_FOR_APPROVAL",

    "IN_PROGRESS",

    "COMPLETED",

    "CANCELLED",
  ];

  if (
    !validStatuses.includes(
      newStatus,
    )
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorType:
          "fve",

        errorTitle:
          "Invalid status",

        errorMessage:
          `Status must be one of: ${validStatuses.join(
            ", ",
          )}.`,

        errorLog:
          null,
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     CANCELLATION REASON
  ============================================================== */

  const normalizedReason =
    typeof reason ===
    "string"
      ? reason.trim()
      : "";

  if (
    newStatus ===
      "CANCELLED" &&
    normalizedReason.length ===
      0
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorType:
          "fve",

        errorTitle:
          "Reason required",

        errorMessage:
          "A cancellation reason is required.",

        errorLog:
          null,
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     NORMALIZE CHANGED BY
  ============================================================== */

  let requestedChangedBy:
    | string
    | null = null;

  if (
    changedBy &&
    isValidUUID(
      changedBy,
    )
  ) {
    requestedChangedBy =
      changedBy;
  }

  /* ==============================================================
     FETCH CURRENT APPOINTMENT
  ============================================================== */

  try {
    const [
      current,
    ] =
      await Database.select({
        status:
          Appointments.status,

        customerId:
          Appointments.customerId,

        trackingNumber:
          Appointments.trackingNumber,

        appointmentDate:
          Appointments.appointmentDate,

        notes:
          Appointments.notes,
      })
        .from(
          Appointments,
        )
        .where(
          eq(
            Appointments.id,
            id,
          ),
        );

    /* ============================================================
       NOT FOUND
    ============================================================= */

    if (
      !current
    ) {
      return NextResponse.json(
        {
          error:
            true,

          errorType:
            "auth",

          errorTitle:
            "Appointment not found",

          errorMessage:
            "Appointment does not exist.",

          errorLog:
            null,
        },
        {
          status: 404,
        },
      );
    }

    /* ============================================================
       AUTHORIZATION
    ============================================================= */

    const isAuthenticatedStaff =
      !!staffId;

    const isAppointmentCustomer =
      !!requestedChangedBy &&
      requestedChangedBy ===
        current.customerId;

    /*
     * Existing staff workflow.
     */
    if (
      !isAuthenticatedStaff &&
      !isAppointmentCustomer
    ) {
      return NextResponse.json(
        {
          error:
            true,

          errorType:
            "auth",

          errorTitle:
            "Unauthorized",

          errorMessage:
            "You are not authorized to change this appointment.",

          errorLog:
            null,
        },
        {
          status: 403,
        },
      );
    }

    /* ============================================================
       CUSTOMER RESTRICTION
       
       Customer-side cancellation is only supported for:
         PENDING
         CONFIRMED
       
       Staff-side cancellation can use all five cancellable states.
    ============================================================= */

    if (
      isAppointmentCustomer &&
      !isAuthenticatedStaff
    ) {
      if (
        newStatus !==
        "CANCELLED"
      ) {
        return NextResponse.json(
          {
            error:
              true,

            errorType:
              "auth",

            errorTitle:
              "Customer action not allowed",

            errorMessage:
              "Customers may only cancel PENDING or CONFIRMED appointments.",

            errorLog:
              null,
          },
          {
            status: 403,
          },
        );
      }

      if (
        ![
          "PENDING",
          "CONFIRMED",
        ].includes(
          current.status,
        )
      ) {
        return NextResponse.json(
          {
            error:
              true,

            errorType:
              "fve",

            errorTitle:
              "Cannot cancel appointment",

            errorMessage:
              `A ${current.status} appointment cannot be cancelled from the customer app.`,

            errorLog:
              null,
          },
          {
            status: 422,
          },
        );
      }
    }

    /* ============================================================
       SAME STATUS
    ============================================================= */

    if (
      current.status ===
      newStatus
    ) {
      return NextResponse.json(
        {
          error:
            true,

          errorType:
            "fve",

          errorTitle:
            "Status already set",

          errorMessage:
            `Appointment is already ${newStatus}.`,

          errorLog:
            null,
        },
        {
          status: 422,
        },
      );
    }

    /* ============================================================
       CANCELLATION TRANSITION
       
       Cancellation gets its own rule so the Daily Agenda can
       cancel an appointment from every required operational state
       even if the generic transition map does not contain those
       specific CANCELLED transitions.
    ============================================================= */

    const isCancellation =
      newStatus ===
      "CANCELLED";

    const isAllowedCancellation =
      isCancellation &&
      CANCELLABLE_STATUSES.includes(
        current.status as (
          typeof CANCELLABLE_STATUSES
        )[number],
      );

    /*
     * For all non-cancellation status changes, keep the existing
     * transition validation exactly as before.
     */
    if (
      !isAllowedCancellation &&
      !isValidStatusTransition(
        current.status,
        newStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            true,

          errorType:
            "fve",

          errorTitle:
            "Invalid transition",

          errorMessage:
            `Cannot transition from ${current.status} to ${newStatus}.`,

          errorLog:
            null,
        },
        {
          status: 400,
        },
      );
    }

    /* ============================================================
       BUILD HISTORY METADATA
    ============================================================= */

    const metadata: any =
      {};

    if (
      isCancellation
    ) {
      metadata.reason =
        normalizedReason;

      metadata.cancelledBy =
        isAppointmentCustomer &&
        !isAuthenticatedStaff
          ? "customer"
          : "staff";

      if (
        isAppointmentCustomer
      ) {
        metadata.customerId =
          current.customerId;
      }

      if (
        staffId
      ) {
        metadata.staffId =
          staffId;
      }
    }

    /* ============================================================
       ACTOR
    ============================================================= */

    const finalChangedBy =
      staffId ||
      requestedChangedBy;

    if (
      !finalChangedBy
    ) {
      return NextResponse.json(
        {
          error:
            true,

          errorType:
            "auth",

          errorTitle:
            "Authentication required",

          errorMessage:
            "You must be authenticated to change appointment status.",

          errorLog:
            null,
        },
        {
          status: 422,
        },
      );
    }

    /* ============================================================
       UPDATE APPOINTMENT
    ============================================================= */

    const [
      updated,
    ] =
      await Database.update(
        Appointments,
      )
        .set({
          status:
            newStatus,

          updatedAt:
            new Date(),
        })
        .where(
          eq(
            Appointments.id,
            id,
          ),
        )
        .returning();

    /* ============================================================
       QUEUE MAINTENANCE
       
       A confirmed appointment that becomes CANCELLED must leave
       ServiceQueue.
    ============================================================= */

    if (
      updated.status ===
        "CONFIRMED" &&
      current.status !==
        "CONFIRMED"
    ) {
      await addToQueue(
        id,
      ).catch(
        console.error,
      );
    } else if (
      current.status ===
        "CONFIRMED" &&
      updated.status !==
        "CONFIRMED"
    ) {
      await removeFromQueue(
        id,
      ).catch(
        console.error,
      );
    }

    /* ============================================================
       STAFF TRIGGERS
    ============================================================= */

    if (
      updated.status ===
      "CONFIRMED"
    ) {
      appointmentsTriggers.onConfirmed(
        {
          trackingNumber:
            updated.trackingNumber,

          customerName:
            updated.customer?.fullname ||
            body.customer
              ?.fullname ||
            "Customer",

          appointmentDate:
            updated.appointmentDate,
        },
      ).catch(
        console.error,
      );
    } else if (
      updated.status ===
      "CANCELLED"
    ) {
      appointmentsTriggers.onCancelled(
        {
          trackingNumber:
            updated.trackingNumber,

          customerName:
            updated.customer?.fullname ||
            body.customer
              ?.fullname ||
            "Customer",

          /*
           * IMPORTANT:
           * Use the actual cancellation reason entered by the
           * staff/customer, not appointment.notes.
           */
          reason:
            normalizedReason,
        },
      ).catch(
        console.error,
      );
    }

    /* ============================================================
       MOBILE TRIGGER
    ============================================================= */

    const mobilePayload =
      {
        customerId:
          updated.customerId,

        trackingNumber:
          updated.trackingNumber,

        appointmentDate:
          updated.appointmentDate,

        reason:
          isCancellation
            ? normalizedReason
            : updated.notes ||
              body.notes,
      };

    switch (
      updated.status
    ) {
      case "CONFIRMED":
        mobileAppointmentsTriggers.onConfirmed(
          mobilePayload,
        ).catch(
          console.error,
        );
        break;

      case "UNDER_INSPECTION":
        mobileAppointmentsTriggers.onUnderInspection(
          mobilePayload,
        ).catch(
          console.error,
        );
        break;

      case "WAITING_FOR_APPROVAL":
        mobileAppointmentsTriggers.onWaitingForApproval(
          mobilePayload,
        ).catch(
          console.error,
        );
        break;

      case "IN_PROGRESS":
        mobileAppointmentsTriggers.onInProgress(
          mobilePayload,
        ).catch(
          console.error,
        );
        break;

      case "COMPLETED":
        mobileAppointmentsTriggers.onCompleted(
          mobilePayload,
        ).catch(
          console.error,
        );
        break;

      case "CANCELLED":
        mobileAppointmentsTriggers.onCancelled(
          mobilePayload,
        ).catch(
          console.error,
        );
        break;

      default:
        break;
    }

    /* ============================================================
       STATUS HISTORY
    ============================================================= */

    await Database.insert(
      AppointmentStatusHistory,
    ).values({
      appointmentId:
        id,

      fromStatus:
        current.status,

      toStatus:
        newStatus,

      changedBy:
        finalChangedBy,

      metadata:
        Object.keys(
          metadata,
        ).length >
        0
          ? metadata
          : null,
    });

    /* ============================================================
       RESPONSE
    ============================================================= */

    return NextResponse.json(
      {
        error:
          false,

        message:
          isCancellation
            ? "Appointment cancelled successfully."
            : `Appointment status changed to ${newStatus}.`,

        data:
          updated,
      },
      {
        status: 200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "[PATCH /api/appointments/[id]/status] Error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        errorType:
          "dbe",

        errorTitle:
          "Database update error",

        errorMessage:
          "Could not change appointment status.",

        errorLog:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status: 500,
      },
    );
  }
}