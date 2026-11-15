import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTaskTiming } from '../lib/service-journey/task-timing.ts';

const start = '2026-11-15T02:00:00.000Z';
const after = (minutes) => new Date(Date.parse(start) + minutes * 60_000).toISOString();
const task = (id, status, estimate, elapsed = null, extension = 0, phase = 'INSPECTION') => ({
  id,
  title: `Task ${id}`,
  status,
  durationMinutes: estimate,
  extensionMinutes: extension,
  startedAt: status === 'PENDING' ? null : start,
  completedAt: status === 'DONE' && elapsed !== null ? after(elapsed) : null,
  phase,
});

test('No extended tasks and no early finish means ON_TRACK', () => {
  const r = calculateTaskTiming([task('normal', 'DONE', 30, 28)]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.extendedCount, 0);
  assert.equal(r.earlyCount, 0);
});

test('Any extension means DELAYED even when task is still running', () => {
  const r = calculateTaskTiming([task('extended', 'IN_PROGRESS', 30, null, 10)], new Date(after(25)));
  assert.equal(r.status, 'DELAYED');
  assert.equal(r.extendedCount, 1);
});

test('A completed task under 80% of its ORIGINAL estimate means EARLY', () => {
  const r = calculateTaskTiming([task('quick', 'DONE', 50, 30)]);
  assert.equal(r.status, 'EARLY');
  assert.equal(r.earlyCount, 1);
  assert.equal(r.rows[0].completionPercent, 60);
  assert.equal(r.rows[0].finishedEarly, true);
});

test('Exactly 80% is NOT early (strictly less than 80%)', () => {
  const r = calculateTaskTiming([task('boundary', 'DONE', 50, 40)]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.rows[0].finishedEarly, false);
});

test('Just below 80% is early', () => {
  const r = calculateTaskTiming([task('near', 'DONE', 50, 39.999)]);
  assert.equal(r.status, 'EARLY');
});

test('Extension always wins over early completion in mixed tasks', () => {
  const r = calculateTaskTiming([
    task('fast', 'DONE', 60, 30),
    task('extended', 'DONE', 20, 10, 5),
  ]);
  assert.equal(r.status, 'DELAYED');
  assert.equal(r.earlyCount, 2);
  assert.equal(r.extendedCount, 1);
});

test('Extension on a task finishing early still means DELAYED', () => {
  const r = calculateTaskTiming([task('both', 'DONE', 30, 10, 10)]);
  assert.equal(r.status, 'DELAYED');
  assert.equal(r.earlyCount, 1);
});

test('Overrunning original estimate WITHOUT extension does not imply delay', () => {
  const r = calculateTaskTiming([task('slow', 'DONE', 20, 90)]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.extendedCount, 0);
});

test('Pending tasks do not qualify for early or delayed', () => {
  const r = calculateTaskTiming([task('future', 'PENDING', 30)]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.earlyCount, 0);
  assert.equal(r.extendedCount, 0);
});

test('No tasks is ON_TRACK, and nothing is falsely classified', () => {
  const r = calculateTaskTiming([]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.totalCount, 0);
});

test('Invalid finish timestamp cannot falsely mark task early', () => {
  const t = task('legacy', 'DONE', 30, null);
  const r = calculateTaskTiming([t]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.unknownCount, 1);
});

test('Zero or missing original duration cannot falsely mark early', () => {
  const r = calculateTaskTiming([task('zero', 'DONE', 0, 0)]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.unknownCount, 1);
});

test('INSPECTION + WORK tasks keep earlier evidence after repair begins', () => {
  const r = calculateTaskTiming([
    task('inspection', 'DONE', 50, 20, 0, 'INSPECTION'),
    task('repair', 'IN_PROGRESS', 40, null, 0, 'WORK'),
  ], new Date(after(20)));
  assert.equal(r.status, 'EARLY');
  assert.equal(r.rows.length, 2);
});

test('Extend button still appears at 80% of current effective estimate', () => {
  const r = calculateTaskTiming([task('active', 'IN_PROGRESS', 30, null, 0)], new Date(after(24)));
  assert.equal(r.rows[0].nearFinish, true);
  assert.equal(r.rows[0].remainingMinutes, 6);
  assert.equal(r.status, 'ON_TRACK');
});

test('Extend button re-locks until 80% of extended estimate elapsed', () => {
  const r = calculateTaskTiming([task('active', 'IN_PROGRESS', 30, null, 15)], new Date(after(28)));
  assert.equal(r.rows[0].nearFinish, false);
  assert.equal(r.rows[0].effectiveMinutes, 45);
  assert.equal(r.status, 'DELAYED');
});

test('No active task is marked early just because current progress is under 80%', () => {
  const r = calculateTaskTiming([task('active', 'IN_PROGRESS', 50)], new Date(after(15)));
  assert.equal(r.earlyCount, 0);
  assert.equal(r.status, 'ON_TRACK');
});

test('Malformed timestamp and earlier completion time are ignored', () => {
  const record = { ...task('wrong', 'DONE', 40, 10), completedAt: '2025-01-01T00:00:00Z' };
  const r = calculateTaskTiming([record]);
  assert.equal(r.status, 'ON_TRACK');
  assert.equal(r.unknownCount, 1);
});

test('Positive extension with historical missing finish still means DELAYED', () => {
  const record = task('legacy', 'DONE', 40, null, 10);
  const r = calculateTaskTiming([record]);
  assert.equal(r.status, 'DELAYED');
  assert.equal(r.unknownCount, 1);
});
