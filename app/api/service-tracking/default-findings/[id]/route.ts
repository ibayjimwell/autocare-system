import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { asc, eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

/* ================================================================
   AUTHORIZATION
================================================================ */

async function requireStaff() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'auth',
        errorTitle: 'Unauthorized',
        errorMessage: 'You must be logged in.',
      },
      { status: 401 },
    );
  }

  return null;
}

/* ================================================================
   PUT DEFAULT FINDING
================================================================ */

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid ID',
        errorMessage: 'Invalid finding ID.',
      },
      { status: 422 },
    );
  }

  const authError = await requireStaff();

  if (authError) {
    return authError;
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid JSON',
        errorMessage: 'Request body must be valid JSON.',
      },
      { status: 400 },
    );
  }

  const title =
    body?.title === undefined
      ? undefined
      : String(body.title).trim();

  if (title !== undefined && !title) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid title',
        errorMessage: 'Title cannot be empty.',
      },
      { status: 422 },
    );
  }

  try {
    const [existing] = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, id));

    if (!existing) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Not found',
          errorMessage: 'Finding does not exist.',
        },
        { status: 404 },
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (body?.isActive !== undefined) {
      updateData.isActive = Boolean(
        body.isActive,
      );
    }

    await Database.update(DefaultFindings)
      .set(updateData)
      .where(eq(DefaultFindings.id, id));

    if (body?.parts !== undefined) {
      if (!Array.isArray(body.parts)) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'fve',
            errorTitle: 'Invalid parts',
            errorMessage: 'parts must be an array.',
          },
          { status: 422 },
        );
      }

      await Database.delete(DefaultFindingParts)
        .where(
          eq(
            DefaultFindingParts.findingId,
            id,
          ),
        );

      const parts = body.parts
        .map((part: any) => ({
          findingId: id,
          partName: String(
            part?.partName || '',
          ).trim(),
          quantity: Math.max(
            1,
            Number(part?.quantity) || 1,
          ),
          priceAtTime: Math.max(
            0,
            Number(part?.priceAtTime) || 0,
          ),
          isPms: Boolean(part?.isPms),
        }))
        .filter(
          (part: any) =>
            part.partName.length > 0,
        );

      if (parts.length > 0) {
        await Database.insert(
          DefaultFindingParts,
        ).values(parts);
      }
    }

    const [updated] = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, id));

    const parts = await Database.select()
      .from(DefaultFindingParts)
      .where(
        eq(
          DefaultFindingParts.findingId,
          id,
        ),
      )
      .orderBy(
        asc(DefaultFindingParts.createdAt),
      );

    return NextResponse.json({
      error: false,
      message: 'Default finding updated.',
      data: {
        ...updated,
        parts,
      },
    });
  } catch (error) {
    console.error(
      '[PUT /api/service-tracking/default-findings/[id]]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not update default finding.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}

/* ================================================================
   DELETE DEFAULT FINDING
================================================================ */

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid ID',
        errorMessage: 'Invalid finding ID.',
      },
      { status: 422 },
    );
  }

  const authError = await requireStaff();

  if (authError) {
    return authError;
  }

  try {
    const [existing] = await Database.select()
      .from(DefaultFindings)
      .where(eq(DefaultFindings.id, id));

    if (!existing) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Not found',
          errorMessage: 'Finding does not exist.',
        },
        { status: 404 },
      );
    }

    await Database.delete(DefaultFindings)
      .where(eq(DefaultFindings.id, id));

    return NextResponse.json({
      error: false,
      message: 'Default finding deleted.',
    });
  } catch (error) {
    console.error(
      '[DELETE /api/service-tracking/default-findings/[id]]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not delete default finding.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
