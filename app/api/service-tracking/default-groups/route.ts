import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultTaskGroups } from '@/database/models/service-tracking/default-task-groups.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
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
   NORMALIZE TASK
================================================================ */

function normalizeTask(
  task: any,
  index: number,
  groupId?: string,
) {
  return {
    ...(groupId
      ? { groupId }
      : {}),
    ...(task?.id
      ? { id: task.id }
      : {}),
    title: String(
      task?.title || `Task ${index + 1}`,
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
   GET DEFAULT TASK GROUPS

   Returns active and inactive groups so the manager can administer
   the full library. Pickers filter inactive groups themselves.

   Uses one task query rather than one query per group.
================================================================ */

export async function GET() {
  const authError = await requireStaff();

  if (authError) {
    return authError;
  }

  try {
    const groups = await Database.select()
      .from(DefaultTaskGroups)
      .orderBy(asc(DefaultTaskGroups.title));

    const groupIds = groups.map(
      (group) => group.id,
    );

    const tasksByGroup: Record<string, any[]> = {};

    if (groupIds.length > 0) {
      const tasks = await Database.select()
        .from(DefaultTasks)
        .where(
          inArray(
            DefaultTasks.groupId,
            groupIds,
          ),
        )
        .orderBy(
          asc(DefaultTasks.order),
          asc(DefaultTasks.createdAt),
        );

      for (const task of tasks) {
        if (!tasksByGroup[task.groupId]) {
          tasksByGroup[task.groupId] = [];
        }

        tasksByGroup[task.groupId].push(
          task,
        );
      }
    }

    return NextResponse.json({
      error: false,
      message: 'Default task groups retrieved.',
      data: groups.map((group) => ({
        ...group,
        tasks:
          tasksByGroup[group.id] || [],
      })),
    });
  } catch (error) {
    console.error(
      '[GET /api/service-tracking/default-groups]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch groups.',
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
   POST DEFAULT TASK GROUP
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

  const title = String(
    body?.title || '',
  ).trim();

  if (!title) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Missing title',
        errorMessage: 'Group title is required.',
      },
      { status: 422 },
    );
  }

  const inputTasks = Array.isArray(body?.tasks)
    ? body.tasks
    : [];

  const tasks = inputTasks
    .map((task: any, index: number) =>
      normalizeTask(task, index),
    )
    .filter(
      (task: any) =>
        task.title.length > 0,
    );

  try {
    const [group] = await Database.insert(
      DefaultTaskGroups,
    )
      .values({
        title,
        description:
          String(
            body?.description || '',
          ).trim() || null,
        isActive:
          body?.isActive === undefined
            ? true
            : Boolean(body.isActive),
      })
      .returning();

    if (tasks.length > 0) {
      await Database.insert(
        DefaultTasks,
      ).values(
        tasks.map((task: any) => ({
          groupId: group.id,
          title: task.title,
          durationMinutes:
            task.durationMinutes,
          taskType:
            task.taskType,
          order: task.order,
        })),
      );
    }

    const [storedGroup] = await Database.select()
      .from(DefaultTaskGroups)
      .where(eq(DefaultTaskGroups.id, group.id));

    const storedTasks = await Database.select()
      .from(DefaultTasks)
      .where(eq(DefaultTasks.groupId, group.id))
      .orderBy(
        asc(DefaultTasks.order),
        asc(DefaultTasks.createdAt),
      );

    return NextResponse.json(
      {
        error: false,
        message: 'Default task group created.',
        data: {
          ...storedGroup,
          tasks: storedTasks,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      '[POST /api/service-tracking/default-groups]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not create group.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
