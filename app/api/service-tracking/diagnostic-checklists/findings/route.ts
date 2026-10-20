import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { DiagnosticFindingLinks, DiagnosticAddedFindings, DiagnosticChecklistEntries } from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { InspectionFindings } from '@/database/models/service-tracking/inspection-findings.model';
import { InspectionFindingParts } from '@/database/models/service-tracking/inspection-finding-parts.model';
import { DIAGNOSTIC_KEYS } from '@/lib/diagnostic-checklist/catalog';
import { diagnosticError, getExistingChecklist, requireDiagnosticStaff, requireEditableDiagnosticAppointment, validDiagnosticId } from '@/lib/diagnostic-checklist/server';

/** Atomically copy a suggested default finding (including inventory parts) once. */
export async function POST(req: NextRequest) {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  let body: any; try { body = await req.json(); } catch { return diagnosticError('Invalid JSON.', 400); }
  const { appointmentId, itemKey, defaultFindingId } = body ?? {};
  if (!validDiagnosticId(appointmentId) || !validDiagnosticId(defaultFindingId) || !DIAGNOSTIC_KEYS.has(itemKey)) {
    return diagnosticError('Valid appointment, checklist item and default finding required.', 422);
  }
  try {
    const readOnlyError = await requireEditableDiagnosticAppointment(appointmentId);
    if (readOnlyError) return readOnlyError;
    const checklist = await getExistingChecklist(appointmentId);
    if (!checklist) return diagnosticError('Checklist has not been started.', 404);
    const [entry] = await Database.select().from(DiagnosticChecklistEntries).where(and(
      eq(DiagnosticChecklistEntries.checklistId, checklist.id), eq(DiagnosticChecklistEntries.itemKey, itemKey))).limit(1);
    if (!entry || !['WARNING', 'REPLACE'].includes(entry.status)) return diagnosticError('Select Warning or Replace before adding findings.', 409);
    const [linked] = await Database.select().from(DiagnosticFindingLinks).where(and(
      eq(DiagnosticFindingLinks.itemKey, itemKey), eq(DiagnosticFindingLinks.defaultFindingId, defaultFindingId))).limit(1);
    if (!linked) return diagnosticError('The selected finding is not linked to this item.', 409);
    const [source] = await Database.select().from(DefaultFindings)
      .where(eq(DefaultFindings.id, defaultFindingId)).limit(1);
    if (!source) return diagnosticError('Default finding no longer exists.', 404);
    const parts = await Database.select().from(DefaultFindingParts)
      .where(eq(DefaultFindingParts.findingId, source.id));
    const result = await Database.transaction(async tx => {
      // All changes rollback on unique constraint errors, preventing orphan findings.
      const [newFinding] = await tx.insert(InspectionFindings).values({
        appointmentId, description: source.title,
      }).returning();
      await tx.insert(DiagnosticAddedFindings).values({
        checklistId: checklist.id, itemKey, defaultFindingId: source.id,
        sourceDefaultFindingId: source.id, findingId: newFinding.id,
      });
      if (parts.length) await tx.insert(InspectionFindingParts).values(parts.map(part => ({
        findingId: newFinding.id, inventoryItemId: part.inventoryItemId,
        partName: part.partName, quantity: part.quantity,
        priceAtTime: part.isPms ? '0' : part.priceAtTime, isPms: part.isPms,
      })));
      return newFinding;
    });
    return NextResponse.json({ error: false, message: 'Suggested finding added to the appointment.', data: result }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505' || error?.cause?.code === '23505' || String(error?.message).includes('diag_added_finding_uidx')) {
      return diagnosticError('This suggested finding has already been added for this appointment.', 409);
    }
    console.error('[Diagnostic Suggested Finding POST]', error);
    return diagnosticError('Unable to add suggested finding.', 500);
  }
}
