/**
 * Shared completion rule for Service Tracking UI and Final Cost API.
 * A service is ready for staff confirmation only if there is at least one
 * repair task and every repair task is explicitly marked DONE.
 * Empty task lists must NEVER be considered completed.
 */
export interface WorkCompletionTask {
  id?: string | null;
  status?: string | null;
}

export function areAllWorkTasksFinished(
  tasks: readonly WorkCompletionTask[] | null | undefined,
): boolean {
  return Array.isArray(tasks) &&
    tasks.length > 0 &&
    tasks.every((task) => task?.status === 'DONE');
}

/** Stable key for the current completed task set; used to avoid prompt loops. */
export function workCompletionFingerprint(
  tasks: readonly WorkCompletionTask[] | null | undefined,
): string | null {
  if (!areAllWorkTasksFinished(tasks)) return null;
  return tasks!.map((task) => String(task.id ?? '')).sort().join('|');
}
