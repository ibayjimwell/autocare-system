import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import {
  DiagnosticChecklistEntries,
  DiagnosticFindingLinks,
} from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { DIAGNOSTIC_KEYS } from '@/lib/diagnostic-checklist/catalog';
import {
  diagnosticError,
  getExistingChecklist,
  requireDiagnosticStaff,
  requireEditableDiagnosticAppointment,
  validDiagnosticId,
} from '@/lib/diagnostic-checklist/server';

export const dynamic = 'force-dynamic';

/**
 * Create a reusable Default Finding AND link it to the chosen component.
 * Appointment findings are NOT created by this request: the client explicitly
 * asks whether to add the reusable finding to the current appointment after
 * this request succeeds. Use the existing /diagnostic-checklists/findings API
 * for that second, optional action.
 */
export async function POST(req: NextRequest) {
  const denied = await requireDiagnosticStaff();
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return diagnosticError('Request body must be valid JSON.', 400);
  }

  const appointmentId = body?.appointmentId;
  const itemKey = body?.itemKey;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const rawParts = body?.parts ?? [];

  if (!validDiagnosticId(appointmentId) || typeof itemKey !== 'string' || !DIAGNOSTIC_KEYS.has(itemKey)) {
    return diagnosticError('A valid appointment and checklist item are required.', 422);
  }
  if (!title || title.length > 250) {
    return diagnosticError('Finding name must be between 1 and 250 characters.', 422);
  }
  if (!Array.isArray(rawParts) || rawParts.length > 30) {
    return diagnosticError('Parts must be an array containing at most 30 entries.', 422);
  }

  const parts: Array<{
    inventoryItemId: string | null;
    partName: string;
    quantity: number;
    priceAtTime: number;
    isPms: boolean;
  }> = [];

  for (const raw of rawParts) {
    const partName = typeof raw?.partName === 'string' ? raw.partName.trim() : '';
    const inventoryItemId = raw?.inventoryItemId || null;
    const quantity = Number(raw?.quantity);
    const priceAtTime = Number(raw?.priceAtTime);
    const isPms = Boolean(raw?.isPms);

    if (!partName || partName.length > 250) {
      return diagnosticError('Each attached part must have a name (maximum 250 characters).', 422);
    }
    if (inventoryItemId !== null && !validDiagnosticId(inventoryItemId)) {
      return diagnosticError('An attached part has an invalid inventory reference.', 422);
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return diagnosticError('Part quantity must be a whole number from 1 to 999.', 422);
    }
    if (!Number.isFinite(priceAtTime) || priceAtTime < 0 || priceAtTime > 99999999) {
      return diagnosticError('Part price must be a valid nonnegative amount.', 422);
    }
    parts.push({
      inventoryItemId,
      partName,
      quantity,
      priceAtTime: isPms ? 0 : priceAtTime,
      isPms,
    });
  }

  try {
    const readOnlyError = await requireEditableDiagnosticAppointment(appointmentId);
    if (readOnlyError) return readOnlyError;

    const checklist = await getExistingChecklist(appointmentId);
    if (!checklist) return diagnosticError('Start the Diagnostic Checklist first.', 404);

    const [entry] = await Database.select({ status: DiagnosticChecklistEntries.status })
      .from(DiagnosticChecklistEntries)
      .where(and(
        eq(DiagnosticChecklistEntries.checklistId, checklist.id),
        eq(DiagnosticChecklistEntries.itemKey, itemKey),
      ))
      .limit(1);

    if (!entry || !['WARNING', 'REPLACE'].includes(entry.status)) {
      return diagnosticError('Mark the selected checklist item Warning or Replace first.', 409);
    }

    // One transaction: never leave an unlinked library record if saving
    // parts or the item link fails.
    const created = await Database.transaction(async tx => {
      const [finding] = await tx.insert(DefaultFindings)
        .values({ title, isActive: true })
        .returning({ id: DefaultFindings.id, title: DefaultFindings.title });

      if (parts.length) {
        await tx.insert(DefaultFindingParts).values(parts.map(part => ({
          findingId: finding.id,
          inventoryItemId: part.inventoryItemId,
          partName: part.partName,
          quantity: part.quantity,
          priceAtTime: String(part.priceAtTime),
          isPms: part.isPms,
        })));
      }

      await tx.insert(DiagnosticFindingLinks).values({
        itemKey,
        defaultFindingId: finding.id,
      });
      return finding;
    });

    return NextResponse.json({
      error: false,
      message: 'Default Finding created and linked to checklist component.',
      data: created,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Diagnostic Default Finding POST]', error);
    if (error?.code === '23505' || error?.cause?.code === '23505') {
      return diagnosticError('A duplicate default finding or checklist link already exists.', 409);
    }
    return diagnosticError('Unable to create and link the Default Finding.', 500);
  }
}
