import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { eq } from 'drizzle-orm';
import { DiagnosticFindingLinks } from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DIAGNOSTIC_KEYS } from '@/lib/diagnostic-checklist/catalog';
import { diagnosticError, requireDiagnosticStaff, validDiagnosticId } from '@/lib/diagnostic-checklist/server';

export async function GET() {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  try {
    const rows = await Database.select({ itemKey: DiagnosticFindingLinks.itemKey,
      defaultFindingId: DiagnosticFindingLinks.defaultFindingId }).from(DiagnosticFindingLinks);
    return NextResponse.json({ error: false, data: rows });
  } catch (error) {
    console.error('[Diagnostic Finding Links GET]', error);
    return diagnosticError('Unable to load finding links.', 500);
  }
}

/** Replace links for ONE default finding, keeping every other finding untouched. */
export async function PUT(req: NextRequest) {
  const denied = await requireDiagnosticStaff(); if (denied) return denied;
  let body: any; try { body = await req.json(); } catch { return diagnosticError('Invalid JSON.', 400); }
  if (!validDiagnosticId(body?.defaultFindingId)) return diagnosticError('Valid defaultFindingId is required.', 422);
  if (!Array.isArray(body.itemKeys) || body.itemKeys.some((key: unknown) => typeof key !== 'string' || !DIAGNOSTIC_KEYS.has(key))) {
    return diagnosticError('itemKeys must be a list of valid checklist item keys.', 422);
  }
  const itemKeys: string[] = Array.from(new Set(body.itemKeys as string[]));
  try {
    const [finding] = await Database.select({ id: DefaultFindings.id }).from(DefaultFindings)
      .where(eq(DefaultFindings.id, body.defaultFindingId)).limit(1);
    if (!finding) return diagnosticError('Default finding not found.', 404);
    await Database.transaction(async tx => {
      await tx.delete(DiagnosticFindingLinks).where(eq(DiagnosticFindingLinks.defaultFindingId, finding.id));
      if (itemKeys.length) await tx.insert(DiagnosticFindingLinks)
        .values(itemKeys.map(itemKey => ({ itemKey, defaultFindingId: finding.id })));
    });
    return NextResponse.json({ error: false, data: { defaultFindingId: finding.id, itemKeys } });
  } catch (error) {
    console.error('[Diagnostic Finding Links PUT]', error);
    return diagnosticError('Unable to save checklist links.', 500);
  }
}
