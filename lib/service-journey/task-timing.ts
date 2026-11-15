/**
 * AutoCare's intentionally simple, rule-based service indicator.
 *
 * Priority:
 *  1. At least one task has extensionMinutes > 0 -> DELAYED.
 *  2. Otherwise, at least one DONE task used < 80% of its ORIGINAL estimate -> EARLY.
 *  3. Otherwise -> ON_TRACK (no delay indicated).
 *
 * No task-minute totals, lateness projections, or net variance are used.
 * Timing is a heuristic about task estimates, NOT a guaranteed service finish time.
 * The same result is returned to Web and Mobile through the service journey API.
 */
export type TimingStatus = 'EARLY' | 'DELAYED' | 'ON_TRACK';

export type TimedTask = {
  id: string;
  title: string;
  status: string;
  durationMinutes: number | null;
  extensionMinutes?: number | null;
  startedAt: Date | string | null;
  completedAt?: Date | string | null;
  phase?: 'INSPECTION' | 'WORK';
};

export type TaskTimingRow = {
  id: string;
  title: string;
  phase: string;
  status: string;
  baselineMinutes: number;
  extensionMinutes: number;
  effectiveMinutes: number;
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  /** Percentage of the original estimate used before finishing (may exceed 100). */
  completionPercent: number | null;
  finishedEarly: boolean;
  nearFinish: boolean;
  measured: boolean;
  projected: boolean;
};

const MINUTE_MS = 60_000;
const EARLY_THRESHOLD = 0.8;

function positiveInteger(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

function nonnegativeInteger(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function parseTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function calculateTaskTiming(tasks: TimedTask[], now = new Date()) {
  const currentMs = now.getTime();
  const rows: TaskTimingRow[] = tasks.map(task => {
    const baselineMinutes = positiveInteger(task.durationMinutes);
    const extensionMinutes = nonnegativeInteger(task.extensionMinutes);
    const effectiveMinutes = baselineMinutes + extensionMinutes;
    const startMs = parseTimestamp(task.startedAt);
    const endMs = parseTimestamp(task.completedAt);
    const isDone = task.status === 'DONE';
    const isInProgress = task.status === 'IN_PROGRESS';
    const measured = baselineMinutes > 0 && isDone && startMs !== null &&
      endMs !== null && endMs >= startMs;
    const projected = baselineMinutes > 0 && isInProgress &&
      startMs !== null && Number.isFinite(currentMs) && currentMs >= startMs;

    const elapsedMinutes = measured
      ? (endMs! - startMs!) / MINUTE_MS
      : projected ? (currentMs - startMs!) / MINUTE_MS : null;
    const completionPercent = measured
      ? (elapsedMinutes! / baselineMinutes) * 100 : null;
    // Strictly LESS than 80%, not 80% or less. Compare full precision.
    const finishedEarly = measured && elapsedMinutes! < baselineMinutes * EARLY_THRESHOLD;
    const remainingMinutes = projected
      ? Math.max(0, effectiveMinutes - elapsedMinutes!) : null;
    // The Extend button still unlocks at 80% of the CURRENT estimate.
    const nearFinish = projected && effectiveMinutes > 0 &&
      elapsedMinutes! >= effectiveMinutes * EARLY_THRESHOLD;

    return {
      id: task.id,
      title: task.title,
      phase: task.phase ?? 'WORK',
      status: task.status,
      baselineMinutes,
      extensionMinutes,
      effectiveMinutes,
      elapsedMinutes,
      remainingMinutes,
      completionPercent,
      finishedEarly,
      nearFinish,
      measured,
      projected,
    };
  });

  const extendedTasks = rows.filter(row => row.extensionMinutes > 0);
  const earlyTasks = rows.filter(row => row.finishedEarly);
  const unknownCount = rows.filter(row => row.status === 'DONE' && !row.measured).length;
  const status: TimingStatus = extendedTasks.length > 0
    ? 'DELAYED'
    : earlyTasks.length > 0 ? 'EARLY' : 'ON_TRACK';

  return {
    status,
    extendedCount: extendedTasks.length,
    earlyCount: earlyTasks.length,
    totalCount: rows.length,
    remainingCount: rows.filter(row => row.status === 'PENDING' || row.status === 'IN_PROGRESS').length,
    unknownCount,
    // An in-progress service gets a predictive label; no guaranteed finish time.
    isProjection: rows.some(row => row.status !== 'DONE'),
    rows,
    evaluatedAt: new Date(currentMs).toISOString(),
  };
}
