import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultTaskGroups } from '@/database/models/service-tracking/default-task-groups.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
import { eq, and } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// ------------------------------------------------------------------
// GET /api/service-tracking/default-groups
// Returns all groups with their tasks, ordered by title.
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  try {
    const groups = await Database.select()
      .from(DefaultTaskGroups)
      .orderBy(DefaultTaskGroups.title);

    // For each group, fetch its tasks
    const result = await Promise.all(
      groups.map(async (group) => {
        const tasks = await Database.select()
          .from(DefaultTasks)
          .where(eq(DefaultTasks.groupId, group.id))
          .orderBy(DefaultTasks.order);
        return { ...group, tasks };
      })
    );

    return NextResponse.json({
      error: false,
      message: 'Default task groups retrieved.',
      data: result,
    });
  } catch (e) {
    console.error('[GET /api/service-tracking/default-groups]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Unable to fetch groups.' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// POST /api/service-tracking/default-groups
// Body: { title, description?, isActive?, tasks: [{ title, durationMinutes? }] }
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: true, errorType: 'auth', errorTitle: 'Unauthorized', errorMessage: 'You must be logged in.' },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorType: 'fe', errorTitle: 'Invalid JSON', errorMessage: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { title, description, isActive, tasks = [] } = body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Missing title', errorMessage: 'Group title is required.' },
      { status: 422 }
    );
  }

  try {
    // Insert group
    const [group] = await Database.insert(DefaultTaskGroups)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    // Insert tasks if any
    if (tasks.length > 0) {
      const taskValues = tasks.map((t: any, idx: number) => ({
        groupId: group.id,
        title: t.title?.trim() || `Task ${idx + 1}`,
        durationMinutes: t.durationMinutes ? parseInt(t.durationMinutes) : null,
        order: idx,
      }));
      await Database.insert(DefaultTasks).values(taskValues);
    }

    // Fetch the complete group with tasks
    const fullGroup = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, group.id));
    const groupTasks = await Database.select()
      .from(DefaultTasks)
      .where(eq(DefaultTasks.groupId, group.id))
      .orderBy(DefaultTasks.order);

    return NextResponse.json({
      error: false,
      message: 'Default task group created.',
      data: { ...fullGroup[0], tasks: groupTasks },
    }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/service-tracking/default-groups]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not create group.' },
      { status: 500 }
    );
  }
}