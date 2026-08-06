import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { eq, and } from 'drizzle-orm';

// GET /api/service-tracking/default-findings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  try {
    const findings = await Database.select()
      .from(DefaultFindings)
      .orderBy(DefaultFindings.title);

    const result = await Promise.all(
      findings.map(async (f) => {
        const parts = await Database.select()
          .from(DefaultFindingParts)
          .where(eq(DefaultFindingParts.findingId, f.id))
          .orderBy(DefaultFindingParts.createdAt);
        return { ...f, parts };
      })
    );

    return NextResponse.json({
      error: false,
      message: 'Default findings retrieved.',
      data: result,
    });
  } catch (e) {
    console.error('[GET /api/service-tracking/default-findings]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Unable to fetch default findings.' },
      { status: 500 }
    );
  }
}

// POST /api/service-tracking/default-findings
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json(
      { error: true, errorType: 'fe', errorTitle: 'Invalid JSON', errorMessage: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { title, isActive, parts = [] } = body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Missing title', errorMessage: 'Title is required.' },
      { status: 422 }
    );
  }

  try {
    const [finding] = await Database.insert(DefaultFindings)
      .values({ title: title.trim(), isActive: isActive !== undefined ? isActive : true })
      .returning();

    if (parts.length > 0) {
      const partValues = parts.map((p: any) => ({
        findingId: finding.id,
        partName: p.partName?.trim() || 'Part',
        quantity: p.quantity || 1,
        priceAtTime: p.priceAtTime || 0,
        isPms: p.isPms || false,
      }));
      await Database.insert(DefaultFindingParts).values(partValues);
    }

    const fullFinding = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, finding.id));
    const partsList = await Database.select()
      .from(DefaultFindingParts)
      .where(eq(DefaultFindingParts.findingId, finding.id));

    return NextResponse.json({
      error: false,
      message: 'Default finding created.',
      data: { ...fullFinding[0], parts: partsList },
    }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/service-tracking/default-findings]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not create default finding.' },
      { status: 500 }
    );
  }
}