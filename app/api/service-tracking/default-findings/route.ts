import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultFindings } from '@/database/models/service-tracking/default-findings.model';
import { DefaultFindingParts } from '@/database/models/service-tracking/default-finding-parts.model';
import { asc, eq, inArray } from 'drizzle-orm';

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
   GET DEFAULT FINDINGS

   One query for findings + one query for all parts.
   The previous implementation performed one parts query per finding.
================================================================ */

export async function GET() {
  const authError = await requireStaff();

  if (authError) {
    return authError;
  }

  try {
    const findings = await Database.select()
      .from(DefaultFindings)
      .orderBy(asc(DefaultFindings.title));

    const findingIds = findings.map(
      (finding) => finding.id,
    );

    const partsMap: Record<string, any[]> = {};

    if (findingIds.length > 0) {
      const parts = await Database.select()
        .from(DefaultFindingParts)
        .where(
          inArray(
            DefaultFindingParts.findingId,
            findingIds,
          ),
        )
        .orderBy(
          asc(DefaultFindingParts.createdAt),
        );

      for (const part of parts) {
        if (!partsMap[part.findingId]) {
          partsMap[part.findingId] = [];
        }

        partsMap[part.findingId].push(part);
      }
    }

    return NextResponse.json({
      error: false,
      message: 'Default findings retrieved.',
      data: findings.map((finding) => ({
        ...finding,
        parts: partsMap[finding.id] || [],
      })),
    });
  } catch (error) {
    console.error(
      '[GET /api/service-tracking/default-findings]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch default findings.',
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
   POST DEFAULT FINDING
================================================================ */

export async function POST(req: NextRequest) {
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

  const title = String(body?.title || '').trim();
  const isActive =
    body?.isActive === undefined
      ? true
      : Boolean(body.isActive);
  const inputParts = Array.isArray(body?.parts)
    ? body.parts
    : [];

  if (!title) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Missing title',
        errorMessage: 'Title is required.',
      },
      { status: 422 },
    );
  }

  const parts = inputParts
    .map((part: any) => ({
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

  try {
    const [finding] = await Database.insert(
      DefaultFindings,
    )
      .values({
        title,
        isActive,
      })
      .returning();

    if (parts.length > 0) {
      await Database.insert(
        DefaultFindingParts,
      ).values(
        parts.map((part) => ({
          findingId: finding.id,
          ...part,
        })),
      );
    }

    const storedParts = await Database.select()
      .from(DefaultFindingParts)
      .where(
        eq(
          DefaultFindingParts.findingId,
          finding.id,
        ),
      )
      .orderBy(
        asc(DefaultFindingParts.createdAt),
      );

    return NextResponse.json(
      {
        error: false,
        message: 'Default finding created.',
        data: {
          ...finding,
          parts: storedParts,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      '[POST /api/service-tracking/default-findings]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not create default finding.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
