import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultTaskGroups } from '@/database/models/service-tracking/default-task-groups.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
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
   VALIDATE / NORMALIZE TASK
================================================================ */

function normalizeTask(
  task: any,
  index: number,
  groupId: string,
) {
  return {
    groupId,
    title: String(
      task?.title || '',
    ).trim(),
    durationMinutes:
      task?.durationMinutes === undefined ||
      task?.durationMinutes === null ||
      task?.durationMinutes === ''
        ? null
        : Math.max(
            0,
            Number(task.durationMinutes) || 0,
          ),
    taskType:
      task?.taskType === 'WORK'
        ? 'WORK'
        : 'INSPECTION',
    order:
      task?.order === undefined ||
      task?.order === null ||
      task?.order === ''
        ? index
        : Math.max(
            0,
            Number(task.order) || 0,
          ),
  };
}

/* ================================================================
   PUT DEFAULT TASK GROUP
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
        errorMessage: 'Invalid group ID.',
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
        errorMessage: 'Group title cannot be empty.',
      },
      { status: 422 },
    );
  }

  try {
    const [existing] = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));

    if (!existing) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Not found',
          errorMessage: 'Group does not exist.',
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

    if (body?.description !== undefined) {
      updateData.description =
        String(body.description || '').trim() ||
        null;
    }

    if (body?.isActive !== undefined) {
      updateData.isActive = Boolean(
        body.isActive,
      );
    }

    await Database.update(DefaultTaskGroups)
      .set(updateData)
      .where(eq(DefaultTaskGroups.id, id));

    if (body?.tasks !== undefined) {
      if (!Array.isArray(body.tasks)) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'fve',
            errorTitle: 'Invalid tasks',
            errorMessage: 'tasks must be an array.',
          },
          { status: 422 },
        );
      }

      const tasks = body.tasks
        .map((task: any, index: number) =>
          normalizeTask(task, index, id),
        )
        .filter(
          (task: any) =>
            task.title.length > 0,
        );

      await Database.delete(DefaultTasks)
        .where(eq(DefaultTasks.groupId, id));

      if (tasks.length > 0) {
        await Database.insert(
          DefaultTasks,
        ).values(tasks);
      }
    }

    const [updatedGroup] = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));

    const tasks = await Database.select()
      .from(DefaultTasks)
      .where(eq(DefaultTasks.groupId, id))
      .orderBy(
        asc(DefaultTasks.order),
        asc(DefaultTasks.createdAt),
      );

    return NextResponse.json({
      error: false,
      message: 'Default task group updated.',
      data: {
        ...updatedGroup,
        tasks,
      },
    });
  } catch (error) {
    console.error(
      '[PUT /api/service-tracking/default-groups/[id]]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not update group.',
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
   DELETE DEFAULT TASK GROUP
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
        errorMessage: 'Invalid group ID.',
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
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));

    if (!existing) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Not found',
          errorMessage: 'Group does not exist.',
        },
        { status: 404 },
      );
    }

    await Database.delete(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, id));

    return NextResponse.json({
      error: false,
      message: 'Default task group deleted.',
    });
  } catch (error) {
    console.error(
      '[DELETE /api/service-tracking/default-groups/[id]]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not delete group.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
