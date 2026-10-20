import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { isValidUUID } from '@/utils/shared';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { InspectionFindings } from '@/database/models/service-tracking/inspection-findings.model';
import { InspectionFindingParts } from '@/database/models/service-tracking/inspection-finding-parts.model';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { InventoryAllocations } from '@/database/models/inventory/inventory-allocation.model';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';

export const dynamic = 'force-dynamic';

type ShortagePart = {
  findingPartId: string;
  findingId: string;
  findingDescription: string;
  partName: string;
  quantity: number;
  priceAtTime: string;
  isPms: boolean;
};

type Shortage = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  available: number;
  requested: number;
  shortage: number;
  missingInventory: boolean;
  parts: ShortagePart[];
};

function respondError(message: string, status = 400) {
  return NextResponse.json({ error: true, errorMessage: message }, { status });
}

async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return respondError('Please sign in as a staff member.', 401);
  }
  return null;
}

async function readAppointment(appointmentId: string) {
  const [appointment] = await Database.select({
    id: Appointments.id,
    status: Appointments.status,
  }).from(Appointments).where(eq(Appointments.id, appointmentId)).limit(1);
  return appointment || null;
}

async function getReport(appointmentId: string) {
  const [allocations, rows] = await Promise.all([
    Database.select({ status: InventoryAllocations.status })
      .from(InventoryAllocations)
      .where(and(
        eq(InventoryAllocations.appointmentId, appointmentId),
        inArray(InventoryAllocations.status, ['KEEP', 'USED']),
      )).limit(1),
    Database.select({
      findingId: InspectionFindings.id,
      findingDescription: InspectionFindings.description,
      findingPartId: InspectionFindingParts.id,
      partName: InspectionFindingParts.partName,
      quantity: InspectionFindingParts.quantity,
      priceAtTime: InspectionFindingParts.priceAtTime,
      isPms: InspectionFindingParts.isPms,
      inventoryItemId: InspectionFindingParts.inventoryItemId,
      externalPurchaseStatus: InspectionFindingParts.externalPurchaseStatus,
      inventoryName: Inventory.name,
      available: Inventory.quantity,
      unit: Inventory.unit,
    }).from(InspectionFindings)
      .innerJoin(InspectionFindingParts, eq(InspectionFindingParts.findingId, InspectionFindings.id))
      .leftJoin(Inventory, eq(InspectionFindingParts.inventoryItemId, Inventory.id))
      .where(eq(InspectionFindings.appointmentId, appointmentId)),
  ]);

  const alreadyReserved = allocations.length > 0;
  const grouped = new Map<string, Shortage>();
  const externalParts: Array<{
    findingPartId: string;
    findingId: string;
    findingDescription: string;
    partName: string;
    quantity: number;
    priceAtTime: string;
    isPms: boolean;
    status: string;
  }> = [];

  for (const row of rows) {
    const partName = row.partName || row.inventoryName || 'Unnamed part';
    const quantity = Number(row.quantity) || 1;
    if (row.externalPurchaseStatus) {
      externalParts.push({
        findingPartId: row.findingPartId,
        findingId: row.findingId,
        findingDescription: row.findingDescription,
        partName,
        quantity,
        priceAtTime: String(row.priceAtTime || '0'),
        isPms: Boolean(row.isPms),
        status: row.externalPurchaseStatus,
      });
      continue;
    }
    if (!row.inventoryItemId) continue;
    let group = grouped.get(row.inventoryItemId);
    if (!group) {
      group = {
        inventoryItemId: row.inventoryItemId,
        itemName: row.inventoryName || partName,
        unit: row.unit || 'unit',
        available: Number(row.available) || 0,
        requested: 0,
        shortage: 0,
        missingInventory: !row.inventoryName,
        parts: [],
      };
      grouped.set(row.inventoryItemId, group);
    }
    group.requested += quantity;
    group.parts.push({
      findingPartId: row.findingPartId,
      findingId: row.findingId,
      findingDescription: row.findingDescription,
      partName,
      quantity,
      priceAtTime: String(row.priceAtTime || '0'),
      isPms: Boolean(row.isPms),
    });
  }

  // If this appointment already has allocations, the stock has already
  // been deducted at KEEP time. Do not count it again as a new requirement.
  const shortages = alreadyReserved ? [] : [...grouped.values()]
    .filter(group => group.missingInventory || group.requested > group.available)
    .map(group => ({
      ...group,
      shortage: Math.max(0, group.requested - Math.max(0, group.available)),
    }));

  return { shortages, externalParts, alreadyReserved };
}

/** GET: Report ALL shortages across this appointment, plus existing external purchases. */
export async function GET(req: NextRequest) {
  const denied = await requireStaff();
  if (denied) return denied;
  const appointmentId = new URL(req.url).searchParams.get('appointmentId') || '';
  if (!isValidUUID(appointmentId)) return respondError('Valid appointmentId is required.', 422);
  try {
    const appointment = await readAppointment(appointmentId);
    if (!appointment) return respondError('Appointment not found.', 404);
    const report = await getReport(appointmentId);
    return NextResponse.json({ error: false, data: { ...report, appointmentStatus: appointment.status } });
  } catch (error) {
    console.error('[Inventory Shortages GET]', error);
    return respondError('Unable to check appointment inventory.', 500);
  }
}

/**
 * POST: Mark SELECTED appointment finding parts for external purchase.
 * This never alters default findings, actual inventory quantities or prices.
 */
export async function POST(req: NextRequest) {
  const denied = await requireStaff();
  if (denied) return denied;
  let body: any;
  try { body = await req.json(); } catch { return respondError('Invalid JSON body.', 400); }
  const appointmentId = String(body?.appointmentId || '');
  const ids: unknown[] = body?.findingPartIds;
  if (!isValidUUID(appointmentId)) return respondError('Valid appointmentId is required.', 422);
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 ||
      ids.some(id => typeof id !== 'string' || !isValidUUID(id))) {
    return respondError('Choose one or more valid finding parts.', 422);
  }
  const selectedIds: string[] = [...new Set(ids as string[])];

  try {
    const updated = await Database.transaction(async tx => {
      const [appointment] = await tx.select({ id: Appointments.id, status: Appointments.status })
        .from(Appointments).where(eq(Appointments.id, appointmentId)).limit(1);
      if (!appointment || appointment.status !== 'UNDER_INSPECTION') {
        throw new Error('External sourcing is only permitted during Under Inspection.');
      }
      const [estimate] = await tx.select({ id: EstimatedCosts.id }).from(EstimatedCosts)
        .where(eq(EstimatedCosts.appointmentId, appointmentId)).limit(1);
      if (estimate) throw new Error('The estimate has already been generated. Edit the estimate through the normal workflow.');
      const [reserved] = await tx.select({ id: InventoryAllocations.id }).from(InventoryAllocations)
        .where(and(eq(InventoryAllocations.appointmentId, appointmentId),
          inArray(InventoryAllocations.status, ['KEEP', 'USED']))).limit(1);
      if (reserved) throw new Error('This appointment already has reserved or used inventory.');

      const parts = await tx.select({
        id: InspectionFindingParts.id,
        inventoryItemId: InspectionFindingParts.inventoryItemId,
        externalPurchaseStatus: InspectionFindingParts.externalPurchaseStatus,
        findingId: InspectionFindings.id,
      }).from(InspectionFindingParts)
        .innerJoin(InspectionFindings, eq(InspectionFindingParts.findingId, InspectionFindings.id))
        .where(and(eq(InspectionFindings.appointmentId, appointmentId),
          inArray(InspectionFindingParts.id, selectedIds)))
        .for('update');

      if (parts.length !== selectedIds.length ||
          parts.some(part => !part.inventoryItemId || part.externalPurchaseStatus)) {
        throw new Error('One or more parts were modified. Refresh and review the shortages again.');
      }
      // These are appointment-specific rows. Retain names, quantities, price
      // snapshots and PMS flags for the estimate and customer bill.
      const result = await tx.update(InspectionFindingParts).set({
        inventoryItemId: null,
        externalPurchaseStatus: 'PENDING',
      }).where(inArray(InspectionFindingParts.id, selectedIds))
        .returning({ id: InspectionFindingParts.id });
      return result.length;
    });
    return NextResponse.json({ error: false, message: `${updated} part(s) set for external purchase.`, data: { updated } });
  } catch (error) {
    console.error('[Inventory Shortages POST]', error);
    return respondError(error instanceof Error ? error.message : 'Unable to source parts externally.', 409);
  }
}

/** PATCH: Track external purchases without impacting local inventory allocations. */
export async function PATCH(req: NextRequest) {
  const denied = await requireStaff();
  if (denied) return denied;
  let body: any;
  try { body = await req.json(); } catch { return respondError('Invalid JSON body.', 400); }
  const appointmentId = String(body?.appointmentId || '');
  const findingPartId = String(body?.findingPartId || '');
  const status = String(body?.status || '').toUpperCase();
  if (!isValidUUID(appointmentId) || !isValidUUID(findingPartId) ||
      !['PENDING', 'PURCHASED', 'RECEIVED'].includes(status)) {
    return respondError('Valid appointmentId, findingPartId and external purchase status required.', 422);
  }
  try {
    const [updated] = await Database.update(InspectionFindingParts).set({
      externalPurchaseStatus: status,
    }).where(and(
      eq(InspectionFindingParts.id, findingPartId),
      inArray(InspectionFindingParts.findingId,
        Database.select({ id: InspectionFindings.id }).from(InspectionFindings)
          .where(eq(InspectionFindings.appointmentId, appointmentId))),
      isNull(InspectionFindingParts.inventoryItemId),
      isNotNull(InspectionFindingParts.externalPurchaseStatus),
    )).returning({ id: InspectionFindingParts.id });
    if (!updated) return respondError('External purchase part not found.', 404);
    return NextResponse.json({ error: false, data: { id: updated.id, status } });
  } catch (error) {
    console.error('[Inventory Shortages PATCH]', error);
    return respondError('Unable to update external purchase status.', 500);
  }
}
