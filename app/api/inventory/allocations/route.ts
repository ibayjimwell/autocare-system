import { NextRequest, NextResponse } from 'next/server';

import {
  and,
  desc,
  eq,
  ilike,
  or,
  sql,
} from 'drizzle-orm';

import { Database } from '@/lib/drizzle';

import {
  InventoryAllocations,
} from '@/database/models/inventory/inventory-allocation.model';

import {
  Inventory,
} from '@/database/models/inventory/inventory.model';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  InspectionFindings,
} from '@/database/models/service-tracking/inspection-findings.model';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  Vehicles,
} from '@/database/models/customers/vehicles.model';

const VALID_STATUSES = [
  'KEEP',
  'USED',
  'RESTORED',
] as const;

export async function GET(
  req: NextRequest,
) {
  const {
    searchParams,
  } = new URL(
    req.url,
  );

  const requestedStatus =
    (
      searchParams.get(
        'status',
      ) ||
      'KEEP'
    )
      .trim()
      .toUpperCase();

  const status =
    VALID_STATUSES.includes(
      requestedStatus as (
        typeof VALID_STATUSES
      )[number],
    )
      ? requestedStatus
      : 'KEEP';

  const search =
    searchParams.get(
      'search',
    )?.trim() || '';

  const pageValue =
    Number.parseInt(
      searchParams.get(
        'page',
      ) || '1',
      10,
    );

  const limitValue =
    Number.parseInt(
      searchParams.get(
        'limit',
      ) || '50',
      10,
    );

  const page =
    Number.isInteger(
      pageValue,
    ) && pageValue > 0
      ? pageValue
      : 1;

  const limit =
    Number.isInteger(
      limitValue,
    ) &&
    limitValue > 0
      ? Math.min(
          limitValue,
          500,
        )
      : 50;

  const offset =
    (page - 1) *
    limit;

  try {
    const conditions: any[] = [
      eq(
        InventoryAllocations.status,
        status,
      ),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(
            InventoryAllocations.itemName,
            `%${search}%`,
          ),
          ilike(
            Appointments.trackingNumber,
            `%${search}%`,
          ),
          ilike(
            InspectionFindings.description,
            `%${search}%`,
          ),
          ilike(
            Customers.fullname,
            `%${search}%`,
          ),
          ilike(
            Vehicles.plateNumber,
            `%${search}%`,
          ),
        ),
      );
    }

    const whereClause =
      and(
        ...conditions,
      );

    const [
      countResult,
    ] = await Database
      .select({
        count:
          sql<number>`count(*)`,
      })
      .from(
        InventoryAllocations,
      )
      .leftJoin(
        Appointments,
        eq(
          InventoryAllocations.appointmentId,
          Appointments.id,
        ),
      )
      .leftJoin(
        InspectionFindings,
        eq(
          InventoryAllocations.findingId,
          InspectionFindings.id,
        ),
      )
      .leftJoin(
        Customers,
        eq(
          Appointments.customerId,
          Customers.id,
        ),
      )
      .leftJoin(
        Vehicles,
        eq(
          Appointments.vehicleId,
          Vehicles.id,
        ),
      )
      .where(
        whereClause,
      );

    const total =
      Number(
        countResult?.count ||
          0,
      );

    const data =
      await Database
        .select({
          id:
            InventoryAllocations.id,

          status:
            InventoryAllocations.status,

          appointmentId:
            InventoryAllocations.appointmentId,

          findingId:
            InventoryAllocations.findingId,

          findingPartId:
            InventoryAllocations.findingPartId,

          inventoryItemId:
            InventoryAllocations.inventoryItemId,

          itemName:
            InventoryAllocations.itemName,

          unit:
            InventoryAllocations.unit,

          quantity:
            InventoryAllocations.quantity,

          priceAtTime:
            InventoryAllocations.priceAtTime,

          keptAt:
            InventoryAllocations.keptAt,

          usedAt:
            InventoryAllocations.usedAt,

          restoredAt:
            InventoryAllocations.restoredAt,

          createdAt:
            InventoryAllocations.createdAt,

          updatedAt:
            InventoryAllocations.updatedAt,

          appointment: {
            id:
              Appointments.id,

            trackingNumber:
              Appointments.trackingNumber,

            appointmentDate:
              Appointments.appointmentDate,

            appointmentTime:
              Appointments.appointmentTime,

            status:
              Appointments.status,
          },

          finding: {
            id:
              InspectionFindings.id,

            description:
              InspectionFindings.description,
          },

          customer: {
            id:
              Customers.id,

            fullname:
              Customers.fullname,
          },

          vehicle: {
            id:
              Vehicles.id,

            make:
              Vehicles.make,

            model:
              Vehicles.model,

            plateNumber:
              Vehicles.plateNumber,
          },

          inventoryItem: {
            id:
              Inventory.id,

            name:
              Inventory.name,

            quantity:
              Inventory.quantity,

            unit:
              Inventory.unit,
          },
        })
        .from(
          InventoryAllocations,
        )
        .leftJoin(
          Appointments,
          eq(
            InventoryAllocations.appointmentId,
            Appointments.id,
          ),
        )
        .leftJoin(
          InspectionFindings,
          eq(
            InventoryAllocations.findingId,
            InspectionFindings.id,
          ),
        )
        .leftJoin(
          Customers,
          eq(
            Appointments.customerId,
            Customers.id,
          ),
        )
        .leftJoin(
          Vehicles,
          eq(
            Appointments.vehicleId,
            Vehicles.id,
          ),
        )
        .leftJoin(
          Inventory,
          eq(
            InventoryAllocations.inventoryItemId,
            Inventory.id,
          ),
        )
        .where(
          whereClause,
        )
        .orderBy(
          desc(
            InventoryAllocations.createdAt,
          ),
        )
        .limit(
          limit,
        )
        .offset(
          offset,
        );

    return NextResponse.json(
      {
        error: false,
        message:
          'Inventory allocation records retrieved.',
        data,
        pagination: {
          page,
          limit,
          total,
          pages:
            Math.ceil(
              total /
                limit,
            ) || 1,
        },
      },
      {
        status: 200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      '[GET /api/inventory/allocations] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Unable to load appointment inventory records.',
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
