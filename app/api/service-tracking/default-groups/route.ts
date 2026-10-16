import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultTaskGroups } from '@/database/models/service-tracking/default-task-groups.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
import { ServiceDefaultTaskGroups } from '@/database/models/service-tracking/service-default-task-groups.model';
import { Services } from '@/database/models/services/services.model';
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

   Returns the complete reusable task-group library. The UI no longer
   uses Active/Inactive state for default tasks.

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

    const links = groupIds.length ? await Database.select({
      groupId: ServiceDefaultTaskGroups.groupId,
      serviceId: ServiceDefaultTaskGroups.serviceId,
      serviceName: Services.name,
    }).from(ServiceDefaultTaskGroups)
      .innerJoin(Services, eq(ServiceDefaultTaskGroups.serviceId, Services.id))
      .where(inArray(ServiceDefaultTaskGroups.groupId, groupIds)) : [];

    return NextResponse.json({
      error: false,
      message: 'Default task groups retrieved.',
      data: groups.map(({ isActive: _legacyIsActive, ...group }) => ({
        ...group,
        tasks: tasksByGroup[group.id] || [],
        serviceIds: links.filter((link) => link.groupId === group.id).map((link) => link.serviceId),
        linkedServices: links.filter((link) => link.groupId === group.id).map((link) => ({ id: link.serviceId, name: link.serviceName })),
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

  const serviceIds = body?.serviceIds ?? [];
  if (!Array.isArray(serviceIds) || serviceIds.some((id: unknown) =>
    typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)
  )) {
    return NextResponse.json({ error: true, errorMessage: 'serviceIds must be an array of valid service UUIDs.' }, { status: 422 });
  }
  const selectedServiceIds: string[] = Array.from(new Set(serviceIds as string[]));
  if (selectedServiceIds.length) {
    const validServices = await Database.select({ id: Services.id }).from(Services)
      .where(inArray(Services.id, selectedServiceIds));
    if (validServices.length !== selectedServiceIds.length) {
      return NextResponse.json({ error: true, errorMessage: 'One or more selected services no longer exist.' }, { status: 422 });
    }
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
    const newGroup = await Database.transaction(async (tx) => {
      const [group] = await tx.insert(DefaultTaskGroups).values({
        title,
        description: String(body?.description || '').trim() || null,
        isActive: true,
      }).returning();
      if (tasks.length) await tx.insert(DefaultTasks).values(tasks.map((task: any) => ({
        groupId: group.id,
        title: task.title,
        durationMinutes: task.durationMinutes,
        taskType: task.taskType,
        order: task.order,
      })));
      if (selectedServiceIds.length) await tx.insert(ServiceDefaultTaskGroups).values(
        selectedServiceIds.map((serviceId) => ({ serviceId, groupId: group.id })),
      );
      return group;
    });
    const storedTasks = await Database.select().from(DefaultTasks)
      .where(eq(DefaultTasks.groupId, newGroup.id)).orderBy(asc(DefaultTasks.order));
    return NextResponse.json(
      {
        error: false,
        message: 'Default task group created.',
        data: {
          ...(() => { const { isActive: _legacyIsActive, ...publicGroup } = newGroup; return publicGroup; })(),
          serviceIds: selectedServiceIds,
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
