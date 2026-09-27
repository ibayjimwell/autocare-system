import { and, eq, inArray, sql } from 'drizzle-orm';

import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { InventoryAllocations } from '@/database/models/inventory/inventory-allocation.model';
import { InspectionFindings } from '@/database/models/service-tracking/inspection-findings.model';
import { InspectionFindingParts } from '@/database/models/service-tracking/inspection-finding-parts.model';

type DbExecutor = typeof Database;

type InventoryAllocationRow = {
  allocationId: string;
  inventoryItemId: string;
  itemName: string;
  unit: string | null;
  quantity: number;
};

export async function keepAppointmentInventory(
  db: DbExecutor,
  appointmentId: string,
) {
  const existing = await db
    .select({
      id: InventoryAllocations.id,
      status: InventoryAllocations.status,
    })
    .from(InventoryAllocations)
    .where(
      and(
        eq(InventoryAllocations.appointmentId, appointmentId),
        inArray(InventoryAllocations.status, ['KEEP', 'USED']),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      alreadyKept: true,
      allocations: [] as InventoryAllocationRow[],
    };
  }

  const rows = await db
    .select({
      findingId: InspectionFindings.id,
      findingPartId: InspectionFindingParts.id,
      inventoryItemId: InspectionFindingParts.inventoryItemId,
      quantity: InspectionFindingParts.quantity,
      itemName: Inventory.name,
      unit: Inventory.unit,
      priceAtTime: InspectionFindingParts.priceAtTime,
    })
    .from(InspectionFindings)
    .innerJoin(
      InspectionFindingParts,
      eq(
        InspectionFindingParts.findingId,
        InspectionFindings.id,
      ),
    )
    .leftJoin(
      Inventory,
      eq(
        InspectionFindingParts.inventoryItemId,
        Inventory.id,
      ),
    )
    .where(
      eq(
        InspectionFindings.appointmentId,
        appointmentId,
      ),
    );

  const linkedRows = rows.filter(
    (row) => Boolean(row.inventoryItemId),
  );

  const missingInventoryRow =
    linkedRows.find(
      (row) => !row.itemName,
    );

  if (missingInventoryRow) {
    const error = new Error(
      'One of the inventory items selected in the findings no longer exists.',
    );

    (
      error as Error & {
        code?: string;
        inventoryItemId?: string;
      }
    ).code = 'INVENTORY_ITEM_NOT_FOUND';

    (
      error as Error & {
        inventoryItemId?: string;
      }
    ).inventoryItemId =
      missingInventoryRow.inventoryItemId as string;

    throw error;
  }

  const inventoryRows = linkedRows.filter(
    (row) =>
      Boolean(row.inventoryItemId) &&
      Boolean(row.itemName),
  );

  if (inventoryRows.length === 0) {
    return {
      alreadyKept: false,
      allocations: [] as InventoryAllocationRow[],
    };
  }

  const requestedByItem = new Map<string, number>();

  for (const row of inventoryRows) {
    const inventoryItemId = row.inventoryItemId as string;
    const quantity = Math.max(
      1,
      Number(row.quantity) || 1,
    );

    requestedByItem.set(
      inventoryItemId,
      (requestedByItem.get(inventoryItemId) || 0) + quantity,
    );
  }

  for (const [
    inventoryItemId,
    quantity,
  ] of requestedByItem.entries()) {
    const [updatedInventory] = await db
      .update(Inventory)
      .set({
        quantity: sql`${Inventory.quantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(Inventory.id, inventoryItemId),
          sql`${Inventory.quantity} >= ${quantity}`,
        ),
      )
      .returning({
        id: Inventory.id,
        name: Inventory.name,
        quantity: Inventory.quantity,
        unit: Inventory.unit,
      });

    if (!updatedInventory) {
      const [currentInventory] = await db
        .select({
          id: Inventory.id,
          name: Inventory.name,
          quantity: Inventory.quantity,
          unit: Inventory.unit,
        })
        .from(Inventory)
        .where(eq(Inventory.id, inventoryItemId))
        .limit(1);

      const available = Number(
        currentInventory?.quantity ?? 0,
      );

      const requested = quantity;

      const error = new Error(
        currentInventory
          ? `"${currentInventory.name}" has only ${available} ${currentInventory.unit || 'unit'} available, but ${requested} ${currentInventory.unit || 'unit'} is required.`
          : 'One of the selected inventory items no longer exists.',
      );

      (error as Error & {
        code?: string;
        inventoryItemId?: string;
        available?: number;
        requested?: number;
      }).code = currentInventory
        ? 'INSUFFICIENT_INVENTORY'
        : 'INVENTORY_ITEM_NOT_FOUND';

      (
        error as Error & {
          inventoryItemId?: string;
        }
      ).inventoryItemId = inventoryItemId;

      (
        error as Error & {
          available?: number;
        }
      ).available = available;

      (
        error as Error & {
          requested?: number;
        }
      ).requested = requested;

      throw error;
    }
  }

  const allocations: InventoryAllocationRow[] = [];
  const now = new Date();

  for (const row of inventoryRows) {
    const [allocation] = await db
      .insert(InventoryAllocations)
      .values({
        appointmentId,
        findingId: row.findingId,
        findingPartId: row.findingPartId,
        inventoryItemId: row.inventoryItemId as string,
        itemName: row.itemName as string,
        unit: row.unit || null,
        quantity: Math.max(
          1,
          Number(row.quantity) || 1,
        ),
        priceAtTime: String(
          Number(row.priceAtTime) || 0,
        ),
        status: 'KEEP',
        keptAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: InventoryAllocations.id,
        itemName: InventoryAllocations.itemName,
        unit: InventoryAllocations.unit,
        quantity: InventoryAllocations.quantity,
        inventoryItemId: InventoryAllocations.inventoryItemId,
      });

    if (allocation) {
      allocations.push({
        allocationId: allocation.id,
        inventoryItemId: allocation.inventoryItemId as string,
        itemName: allocation.itemName,
        unit: allocation.unit,
        quantity: allocation.quantity,
      });
    }
  }

  return {
    alreadyKept: false,
    allocations,
  };
}

export async function markAppointmentInventoryUsed(
  db: DbExecutor,
  appointmentId: string,
) {
  const now = new Date();

  return db
    .update(InventoryAllocations)
    .set({
      status: 'USED',
      usedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(InventoryAllocations.appointmentId, appointmentId),
        eq(InventoryAllocations.status, 'KEEP'),
      ),
    )
    .returning({
      id: InventoryAllocations.id,
      itemName: InventoryAllocations.itemName,
      unit: InventoryAllocations.unit,
      quantity: InventoryAllocations.quantity,
    });
}

export async function restoreAppointmentKeptInventory(
  db: DbExecutor,
  appointmentId: string,
) {
  const kept = await db
    .select({
      id: InventoryAllocations.id,
      inventoryItemId: InventoryAllocations.inventoryItemId,
      itemName: InventoryAllocations.itemName,
      unit: InventoryAllocations.unit,
      quantity: InventoryAllocations.quantity,
    })
    .from(InventoryAllocations)
    .where(
      and(
        eq(InventoryAllocations.appointmentId, appointmentId),
        eq(InventoryAllocations.status, 'KEEP'),
      ),
    );

  if (kept.length === 0) {
    return [];
  }

  const quantityByItem = new Map<string, number>();

  for (const allocation of kept) {
    if (!allocation.inventoryItemId) {
      continue;
    }

    quantityByItem.set(
      allocation.inventoryItemId,
      (quantityByItem.get(allocation.inventoryItemId) || 0) +
        Math.max(
          1,
          Number(allocation.quantity) || 1,
        ),
    );
  }

  for (const [
    inventoryItemId,
    quantity,
  ] of quantityByItem.entries()) {
    await db
      .update(Inventory)
      .set({
        quantity: sql`${Inventory.quantity} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        eq(Inventory.id, inventoryItemId),
      );
  }

  const now = new Date();

  return db
    .update(InventoryAllocations)
    .set({
      status: 'RESTORED',
      restoredAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(InventoryAllocations.appointmentId, appointmentId),
        eq(InventoryAllocations.status, 'KEEP'),
      ),
    )
    .returning({
      id: InventoryAllocations.id,
      itemName: InventoryAllocations.itemName,
      unit: InventoryAllocations.unit,
      quantity: InventoryAllocations.quantity,
    });
}
