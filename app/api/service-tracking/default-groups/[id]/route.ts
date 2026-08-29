import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultTaskGroups } from '@/database/models/service-tracking/default-task-groups.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
import { eq, and } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// ------------------------------------------------------------------
// PUT /api/service-tracking/default-groups/:id
// Update group and its tasks (replace tasks).
// Body: { title?, description?, isActive?, tasks: [{ id?, title, durationMinutes?, taskType?, order? }] }
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid ID', errorMessage: 'Invalid group ID.' },
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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorType: 'fe', errorTitle: 'Invalid JSON', errorMessage: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  try {
    // Check existence
    const [existing] = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));
    if (!existing) {
      return NextResponse.json(
        { error: true, errorType: 'auth', errorTitle: 'Not found', errorMessage: 'Group does not exist.' },
        { status: 404 }
      );
    }

    // Update group fields
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length > 0) {
      await Database.update(DefaultTaskGroups)
        .set(updateData)
        .where(eq(DefaultTaskGroups.id, id));
    }

    // Replace tasks if provided
    if (body.tasks !== undefined && Array.isArray(body.tasks)) {
      // Delete existing tasks
      await Database.delete(DefaultTasks).where(eq(DefaultTasks.groupId, id));
      // Insert new tasks
      if (body.tasks.length > 0) {
        const taskValues = body.tasks.map((t: any, idx: number) => ({
          groupId: id,
          title: t.title?.trim() || `Task ${idx + 1}`,
          durationMinutes: t.durationMinutes ? parseInt(t.durationMinutes) : null,
          taskType: t.taskType || 'INSPECTION', // ✅ fixed: include taskType
          order: t.order !== undefined ? parseInt(t.order) : idx,
        }));
        await Database.insert(DefaultTasks).values(taskValues);
      }
    }

    // Fetch updated group with tasks
    const [updatedGroup] = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));
    const groupTasks = await Database.select()
      .from(DefaultTasks)
      .where(eq(DefaultTasks.groupId, id))
      .orderBy(DefaultTasks.order);

    return NextResponse.json({
      error: false,
      message: 'Default task group updated.',
      data: { ...updatedGroup, tasks: groupTasks },
    });
  } catch (e) {
    console.error('[PUT /api/service-tracking/default-groups/[id]]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not update group.' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// DELETE /api/service-tracking/default-groups/:id
// ------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorType: 'fve', errorTitle: 'Invalid ID', errorMessage: 'Invalid group ID.' },
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
    // Check existence
    const [existing] = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));
    if (!existing) {
      return NextResponse.json(
        { error: true, errorType: 'auth', errorTitle: 'Not found', errorMessage: 'Group does not exist.' },
        { status: 404 }
      );
    }

    await Database.delete(DefaultTaskGroups).where(eq(DefaultTaskGroups.id, id));

    return NextResponse.json({
      error: false,
      message: 'Default task group deleted.',
    });
  } catch (e) {
    console.error('[DELETE /api/service-tracking/default-groups/[id]]', e);
    return NextResponse.json(
      { error: true, errorType: 'dbe', errorTitle: 'Database error', errorMessage: 'Could not delete group.' },
      { status: 500 }
    );
  }
}