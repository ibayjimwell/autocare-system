import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { eq } from 'drizzle-orm';
import { DiagnosticChecklistEntries, DiagnosticChecklists } from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DIAGNOSTIC_SECTIONS } from '@/lib/diagnostic-checklist/catalog';
import { diagnosticError, ensureChecklist, getExistingChecklist, requireDiagnosticStaff, requireEditableDiagnosticAppointment, validDiagnosticId } from '@/lib/diagnostic-checklist/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  const appointmentId = new URL(req.url).searchParams.get('appointmentId');
  if (!validDiagnosticId(appointmentId)) return diagnosticError('Valid appointmentId is required.', 422);
  try {
    const checklist = await getExistingChecklist(appointmentId);
    const entries = checklist ? await Database.select().from(DiagnosticChecklistEntries)
      .where(eq(DiagnosticChecklistEntries.checklistId, checklist.id)) : [];
    return NextResponse.json({ error: false, data: { checklist, entries, sections: DIAGNOSTIC_SECTIONS } });
  } catch (error) {
    console.error('[Diagnostic Checklist GET]', error);
    return diagnosticError('Unable to load diagnostic checklist.', 500);
  }
}

/** Creates the one-to-one checklist on first use; updates notes without erasing checks. */
export async function PATCH(req: NextRequest) {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  let body: any; try { body = await req.json(); } catch { return diagnosticError('Invalid JSON.', 400); }
  if (!validDiagnosticId(body?.appointmentId)) return diagnosticError('Valid appointmentId is required.', 422);
  const patch: { remarks?: string; dentsNotes?: string; engineType?: string | null; transmissionType?: string | null; dentsMarks?: Array<{x:number;y:number}>; updatedAt: Date } = { updatedAt: new Date() };
  if (body.engineType !== undefined) {
    if (body.engineType !== null && !['GAS', 'DIESEL', 'EV'].includes(body.engineType)) return diagnosticError('Engine type must be GAS, DIESEL or EV.', 422);
    patch.engineType = body.engineType;
  }
  if (body.transmissionType !== undefined) {
    if (body.transmissionType !== null && !['MT','AT'].includes(body.transmissionType)) return diagnosticError('Transmission must be MT or AT.', 422);
    patch.transmissionType = body.transmissionType;
  }
  if (body.dentsMarks !== undefined) {
    if (!Array.isArray(body.dentsMarks) || body.dentsMarks.length > 50 || body.dentsMarks.some((mark: any) =>
      typeof mark?.x !== 'number' || !Number.isFinite(mark.x) || mark.x < 0 || mark.x > 500 ||
      typeof mark?.y !== 'number' || !Number.isFinite(mark.y) || mark.y < 0 || mark.y > 175)) {
      return diagnosticError('Dent markers must be valid X/Y coordinates.', 422);
    }
    patch.dentsMarks = body.dentsMarks.map((m: {x:number;y:number}) => ({ x: Math.round(m.x), y: Math.round(m.y) }));
  }
  if (body.remarks !== undefined) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 5000) return diagnosticError('Remarks must be at most 5000 characters.', 422);
    patch.remarks = body.remarks;
  }
  if (body.dentsNotes !== undefined) {
    if (typeof body.dentsNotes !== 'string' || body.dentsNotes.length > 5000) return diagnosticError('Dent notes must be at most 5000 characters.', 422);
    patch.dentsNotes = body.dentsNotes;
  }
  try {
    const readOnlyError = await requireEditableDiagnosticAppointment(body.appointmentId);
    if (readOnlyError) return readOnlyError;
    const checklist = await ensureChecklist(body.appointmentId);
    if (!checklist) return diagnosticError('Appointment not found.', 404);
    const [updated] = await Database.update(DiagnosticChecklists).set(patch)
      .where(eq(DiagnosticChecklists.id, checklist.id)).returning();
    return NextResponse.json({ error: false, data: updated });
  } catch (error) {
    console.error('[Diagnostic Checklist PATCH]', error);
    return diagnosticError('Unable to save diagnostic notes.', 500);
  }
}
