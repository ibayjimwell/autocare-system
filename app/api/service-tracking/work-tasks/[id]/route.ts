import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { WorkTasks } from '@/database/models/service-tracking/work-tasks.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

/* ================================================================
   DELETE WORK TASK

   A task can be removed from the active repair checklist.
   Remaining tasks are compacted back to a clean 1..N order.
================================================================ */

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  void req;

  const {
    id,
  } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid task ID',
        errorMessage: 'Task ID must be a valid UUID.',
      },
      { status: 422 },
    );
  }

  const session = await getServerSession(
    authOptions,
  );

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

  try {
    const [existing] = await Database.select({
      id: WorkTasks.id,
      appointmentId:
        WorkTasks.appointmentId,
    })
      .from(WorkTasks)
      .where(
        eq(
          WorkTasks.id,
          id,
        ),
      );

    if (!existing) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Task not found',
          errorMessage: 'Work task does not exist.',
        },
        { status: 404 },
      );
    }

    await Database.delete(
      WorkTasks,
    ).where(
      eq(
        WorkTasks.id,
        id,
      ),
    );

    const remaining = await Database.select({
      id: WorkTasks.id,
      order: WorkTasks.order,
    })
      .from(WorkTasks)
      .where(
        eq(
          WorkTasks.appointmentId,
          existing.appointmentId,
        ),
      )
      .orderBy(WorkTasks.order);

    for (let index = 0; index < remaining.length; index += 1) {
      const nextOrder = index + 1;

      if (remaining[index].order !== nextOrder) {
        await Database.update(WorkTasks)
          .set({
            order: nextOrder,
            updatedAt: new Date(),
          })
          .where(
            eq(
              WorkTasks.id,
              remaining[index].id,
            ),
          );
      }
    }

    return NextResponse.json(
      {
        error: false,
        message: 'Work task deleted.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[DELETE /api/service-tracking/work-tasks/[id]]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not delete work task.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
