import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { InspectionTasks } from '@/database/models/service-tracking/inspection-tasks.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { Appointments } from '@/database/models/appointments/appointments.model';

/* ================================================================
   DELETE INSPECTION TASK

   A task can be removed from the active inspection checklist.
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
      id: InspectionTasks.id,
      appointmentId:
        InspectionTasks.appointmentId,
    })
      .from(InspectionTasks)
      .where(
        eq(
          InspectionTasks.id,
          id,
        ),
      );

    if (!existing) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Task not found',
          errorMessage: 'Inspection task does not exist.',
        },
        { status: 404 },
      );
    }

    await Database.delete(
      InspectionTasks,
    ).where(
      eq(
        InspectionTasks.id,
        id,
      ),
    );

    const remaining = await Database.select({
      id: InspectionTasks.id,
      order: InspectionTasks.order,
    })
      .from(InspectionTasks)
      .where(
        eq(
          InspectionTasks.appointmentId,
          existing.appointmentId,
        ),
      )
      .orderBy(InspectionTasks.order);

    for (let index = 0; index < remaining.length; index += 1) {
      const nextOrder = index + 1;

      if (remaining[index].order !== nextOrder) {
        await Database.update(InspectionTasks)
          .set({
            order: nextOrder,
            updatedAt: new Date(),
          })
          .where(
            eq(
              InspectionTasks.id,
              remaining[index].id,
            ),
          );
      }
    }

    return NextResponse.json(
      {
        error: false,
        message: 'Inspection task deleted.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[DELETE /api/service-tracking/inspection-tasks/[id]]',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not delete inspection task.',
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
   EDIT INSPECTION TASK
   A task's title and estimated duration may change during an active job.
   Existing status, order, appointment, and start time remain unchanged.
================================================================ */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid task ID.' }, { status: 422 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Staff login required.' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 }); }
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const duration = body?.durationMinutes;
  if (!title || title.length > 500 ||
    (duration !== null && duration !== undefined && (!Number.isInteger(duration) || duration < 1 || duration > 43200))) {
    return NextResponse.json({ error: true, errorMessage: 'Enter a task title and a positive duration in whole minutes (or leave duration blank).' }, { status: 422 });
  }
  try {
    const [task] = await Database.select().from(InspectionTasks).where(eq(InspectionTasks.id, id)).limit(1);
    if (!task) return NextResponse.json({ error: true, errorMessage: 'Task not found.' }, { status: 404 });
    const [appointment] = await Database.select({ status: Appointments.status }).from(Appointments)
      .where(eq(Appointments.id, task.appointmentId)).limit(1);
    if (appointment?.status !== 'UNDER_INSPECTION') {
      return NextResponse.json({ error: true, errorMessage: 'Tasks can be edited only during their active appointment phase.' }, { status: 409 });
    }
    const [updated] = await Database.update(InspectionTasks).set({
      title,
      durationMinutes: duration == null ? null : duration,
      updatedAt: new Date(),
    }).where(eq(InspectionTasks.id, id)).returning();
    return NextResponse.json({ error: false, message: 'Task updated.', data: updated });
  } catch (error) {
    console.error('[Edit inspection task]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to update task.' }, { status: 500 });
  }
}
