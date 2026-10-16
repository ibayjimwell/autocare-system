import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { DefaultTaskGroups } from '@/database/models/service-tracking/default-task-groups.model';
import { DefaultTasks } from '@/database/models/service-tracking/default-tasks.model';
import { ServiceDefaultTaskGroups } from '@/database/models/service-tracking/service-default-task-groups.model';
import { Services } from '@/database/models/services/services.model';
import { asc, eq, inArray, notInArray, and } from 'drizzle-orm';
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

    // Save the group, linked services and template changes atomically.
    // Preserve IDs of existing templates: those IDs are the provenance key
    // that prevents duplicate automatic import into appointments.
    if (body?.tasks !== undefined && !Array.isArray(body.tasks)) {
      return NextResponse.json({ error: true, errorMessage: 'tasks must be an array.' }, { status: 422 });
    }
    const serviceIds = body?.serviceIds;
    if (serviceIds !== undefined && (!Array.isArray(serviceIds) || serviceIds.some((value: unknown) =>
      typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)
    ))) {
      return NextResponse.json({ error: true, errorMessage: 'serviceIds must contain valid service UUIDs.' }, { status: 422 });
    }
    const uniqueServiceIds: string[] = Array.from(new Set((serviceIds || []) as string[]));
    if (serviceIds !== undefined && uniqueServiceIds.length) {
      const validServices = await Database.select({ id: Services.id }).from(Services)
        .where(inArray(Services.id, uniqueServiceIds));
      if (validServices.length !== uniqueServiceIds.length) {
        return NextResponse.json({ error: true, errorMessage: 'One or more selected services no longer exist.' }, { status: 422 });
      }
    }
    const oldTasks = await Database.select({ id: DefaultTasks.id })
      .from(DefaultTasks).where(eq(DefaultTasks.groupId, id));
    const ownedIds = new Set(oldTasks.map((task) => task.id));
    if (Array.isArray(body.tasks) && body.tasks.some((task: any) => task?.id && !ownedIds.has(task.id))) {
      return NextResponse.json({ error: true, errorMessage: 'A task does not belong to this group.' }, { status: 422 });
    }

    await Database.transaction(async (tx) => {
      await tx.update(DefaultTaskGroups).set(updateData).where(eq(DefaultTaskGroups.id, id));
      if (serviceIds !== undefined) {
        await tx.delete(ServiceDefaultTaskGroups).where(eq(ServiceDefaultTaskGroups.groupId, id));
        if (uniqueServiceIds.length) await tx.insert(ServiceDefaultTaskGroups).values(
          uniqueServiceIds.map((serviceId) => ({ serviceId, groupId: id })),
        );
      }
      if (Array.isArray(body.tasks)) {
        const tasks = body.tasks.map((task: any, index: number) => ({
          ...normalizeTask(task, index, id),
          id: task?.id && ownedIds.has(task.id) ? task.id as string : undefined,
        })).filter((task: any) => task.title.length > 0);
        const retained = tasks.map((task: any) => task.id).filter(Boolean) as string[];
        // A removed template may have already generated appointment tasks;
        // their defaultTaskId becomes null (ON DELETE SET NULL), preserving history.
        await tx.delete(DefaultTasks).where(retained.length
          ? and(eq(DefaultTasks.groupId, id), notInArray(DefaultTasks.id, retained))
          : eq(DefaultTasks.groupId, id));
        for (const task of tasks) {
          if (task.id) {
            await tx.update(DefaultTasks).set({
              title: task.title, durationMinutes: task.durationMinutes,
              taskType: task.taskType, order: task.order, updatedAt: new Date(),
            }).where(eq(DefaultTasks.id, task.id));
          } else {
            await tx.insert(DefaultTasks).values({
              groupId: id, title: task.title, durationMinutes: task.durationMinutes,
              taskType: task.taskType, order: task.order,
            });
          }
        }
      }
    });

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

    const currentLinks = await Database.select({ serviceId: ServiceDefaultTaskGroups.serviceId })
      .from(ServiceDefaultTaskGroups).where(eq(ServiceDefaultTaskGroups.groupId, id));
    return NextResponse.json({
      error: false,
      message: 'Default task group updated.',
      data: {
        ...(() => { const { isActive: _legacyIsActive, ...publicGroup } = updatedGroup; return publicGroup; })(),
        tasks,
        serviceIds: currentLinks.map((link) => link.serviceId),
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
