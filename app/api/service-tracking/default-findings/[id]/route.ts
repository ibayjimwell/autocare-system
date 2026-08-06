import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// PUT /api/service-tracking/default-findings/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid ID', errorMessage: 'Invalid finding ID.' },
      { status: 422 }
    );
  }

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

  try {
    const [existing] = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, id));
    if (!existing) {
      return NextResponse.json(
        { error: true, errorType: 'auth', errorTitle: 'Not found', errorMessage: 'Finding does not exist.' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length > 0) {
      await Database.update(DefaultFindings)
        .set(updateData)
        .where(eq(DefaultFindings.id, id));
    }

    if (body.parts !== undefined && Array.isArray(body.parts)) {
      await Database.delete(DefaultFindingParts)
        .where(eq(DefaultFindingParts.findingId, id));
      if (body.parts.length > 0) {
        const partValues = body.parts.map((p: any) => ({
          findingId: id,
          partName: p.partName?.trim() || 'Part',
          quantity: p.quantity || 1,
          priceAtTime: p.priceAtTime || 0,
          isPms: p.isPms || false,
        }));
        await Database.insert(DefaultFindingParts).values(partValues);
      }
    }

    const [updated] = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, id));
    const partsList = await Database.select()
      .from(DefaultFindingParts)
      .where(eq(DefaultFindingParts.findingId, id));

    return NextResponse.json({
      error: false,
      message: 'Default finding updated.',
      data: { ...updated, parts: partsList },
    });
  } catch (e) {
    console.error('[PUT /api/service-tracking/default-findings/[id]]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not update default finding.' },
      { status: 500 }
    );
  }
}

// DELETE /api/service-tracking/default-findings/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid ID', errorMessage: 'Invalid finding ID.' },
      { status: 422 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  try {
    const [existing] = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, id));
    if (!existing) {
      return NextResponse.json(
        { error: true, errorType: 'auth', errorTitle: 'Not found', errorMessage: 'Finding does not exist.' },
        { status: 404 }
      );
    }

    await Database.delete(DefaultFindings)
      .where(eq(DefaultFindings.id, id));

    return NextResponse.json({
      error: false,
      message: 'Default finding deleted.',
    });
  } catch (e) {
    console.error('[DELETE /api/service-tracking/default-findings/[id]]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not delete default finding.' },
      { status: 500 }
    );
  }
}