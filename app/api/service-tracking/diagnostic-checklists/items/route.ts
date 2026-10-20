import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { DiagnosticChecklistEntries } from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DIAGNOSTIC_KEYS, isDiagnosticStatus } from '@/lib/diagnostic-checklist/catalog';
import { diagnosticError, ensureChecklist, requireDiagnosticStaff, requireEditableDiagnosticAppointment, validDiagnosticId } from '@/lib/diagnostic-checklist/server';

export async function PUT(req: NextRequest) {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  let body: any; try { body = await req.json(); } catch { return diagnosticError('Invalid JSON.', 400); }
  const { appointmentId, itemKey, status } = body ?? {};
  if (!validDiagnosticId(appointmentId)) return diagnosticError('Valid appointmentId is required.', 422);
  if (typeof itemKey !== 'string' || !DIAGNOSTIC_KEYS.has(itemKey)) return diagnosticError('Invalid checklist item.', 422);
  if (status !== null && !isDiagnosticStatus(status)) return diagnosticError('Choose Good, Warning, Replace, or clear the selection.', 422);
  try {
    const readOnlyError = await requireEditableDiagnosticAppointment(appointmentId);
    if (readOnlyError) return readOnlyError;
    const checklist = await ensureChecklist(appointmentId);
    if (!checklist) return diagnosticError('Appointment not found.', 404);
    if (status === null) {
      await Database.delete(DiagnosticChecklistEntries).where(and(
        eq(DiagnosticChecklistEntries.checklistId, checklist.id), eq(DiagnosticChecklistEntries.itemKey, itemKey)));
      return NextResponse.json({ error: false, data: { itemKey, status: null } });
    }
    const [entry] = await Database.insert(DiagnosticChecklistEntries)
      .values({ checklistId: checklist.id, itemKey, status })
      .onConflictDoUpdate({ target: [DiagnosticChecklistEntries.checklistId, DiagnosticChecklistEntries.itemKey],
        set: { status, updatedAt: new Date() } }).returning();
    return NextResponse.json({ error: false, data: entry });
  } catch (error) {
    console.error('[Diagnostic Checklist Item PUT]', error);
    return diagnosticError('Unable to save checklist selection.', 500);
  }
}
