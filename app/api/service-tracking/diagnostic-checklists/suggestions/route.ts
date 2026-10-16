import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { eq, and, inArray } from 'drizzle-orm';
import {
  DiagnosticFindingLinks, DiagnosticAddedFindings, DiagnosticChecklistEntries,
} from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { DIAGNOSTIC_KEYS } from '@/lib/diagnostic-checklist/catalog';
import { diagnosticError, getExistingChecklist, requireDiagnosticStaff, validDiagnosticId } from '@/lib/diagnostic-checklist/server';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const appointmentId = params.get('appointmentId'); const itemKey = params.get('itemKey');
  if (!validDiagnosticId(appointmentId) || !itemKey || !DIAGNOSTIC_KEYS.has(itemKey)) return diagnosticError('Valid appointmentId and itemKey required.', 422);
  try {
    const checklist = await getExistingChecklist(appointmentId);
    if (!checklist) return NextResponse.json({ error: false, data: [] });
    const [entry] = await Database.select({ status: DiagnosticChecklistEntries.status })
      .from(DiagnosticChecklistEntries).where(and(eq(DiagnosticChecklistEntries.checklistId, checklist.id),
        eq(DiagnosticChecklistEntries.itemKey, itemKey))).limit(1);
    if (!entry || !['WARNING','REPLACE'].includes(entry.status)) return NextResponse.json({ error: false, data: [] });
    const linked = await Database.select({ id: DefaultFindings.id, title: DefaultFindings.title })
      .from(DiagnosticFindingLinks).innerJoin(DefaultFindings, eq(DiagnosticFindingLinks.defaultFindingId, DefaultFindings.id))
      .where(eq(DiagnosticFindingLinks.itemKey, itemKey));
    if (!linked.length) return NextResponse.json({ error: false, data: [] });
    const ids = linked.map(row => row.id);
    const [parts, added] = await Promise.all([
      Database.select().from(DefaultFindingParts).where(inArray(DefaultFindingParts.findingId, ids)),
      Database.select().from(DiagnosticAddedFindings).where(eq(DiagnosticAddedFindings.checklistId, checklist.id)),
    ]);
    return NextResponse.json({ error: false, data: linked.map(row => ({ ...row,
      parts: parts.filter(part => part.findingId === row.id),
      added: added.some(record => record.sourceDefaultFindingId === row.id),
    })) });
  } catch (error) {
    console.error('[Diagnostic Suggestions GET]', error);
    return diagnosticError('Unable to load suggested findings.', 500);
  }
}
