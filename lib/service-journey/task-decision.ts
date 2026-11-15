/** Pure helper shared by task timer UI and offline tests. */
export type DecisionTask = {
  status: string;
  startedAt?: Date | string | null;
  durationMinutes?: number | null;
  extensionMinutes?: number | null;
};

export function isTaskDecisionDue(task: DecisionTask, nowMs = Date.now()): boolean {
  if (task.status !== 'IN_PROGRESS' || !task.startedAt) return false;
  const base = Number(task.durationMinutes);
  const extension = Number(task.extensionMinutes ?? 0);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(extension) || extension < 0) return false;
  const startedAtMs = new Date(task.startedAt).getTime();
  return Number.isFinite(startedAtMs) && Number.isFinite(nowMs) &&
    nowMs - startedAtMs >= (base + extension) * 60_000;
}
