import test from 'node:test';
import assert from 'node:assert/strict';
import { isTaskDecisionDue } from '../lib/service-journey/task-decision.ts';
const startedAt = '2026-11-15T00:00:00.000Z';
const now = Date.parse('2026-11-15T00:10:00.000Z');
test('prompts at exactly full effective duration', () => {
  assert.equal(isTaskDecisionDue({ status: 'IN_PROGRESS', durationMinutes: 10, startedAt }, now), true);
});
test('does not prompt at 99% actual duration', () => {
  assert.equal(isTaskDecisionDue({ status: 'IN_PROGRESS', durationMinutes: 10, startedAt }, now - 1), false);
});
test('extension moves due threshold and makes progress bar drop', () => {
  assert.equal(isTaskDecisionDue({ status: 'IN_PROGRESS', durationMinutes: 10, extensionMinutes: 5, startedAt }, now), false);
  assert.equal(isTaskDecisionDue({ status: 'IN_PROGRESS', durationMinutes: 10, extensionMinutes: 5, startedAt }, now + 300000), true);
});
test('completed tasks never prompt even if past due', () => {
  assert.equal(isTaskDecisionDue({ status: 'DONE', durationMinutes: 10, startedAt }, now + 600000), false);
});
test('pending tasks never prompt', () => {
  assert.equal(isTaskDecisionDue({ status: 'PENDING', durationMinutes: 10, startedAt }, now + 600000), false);
});
test('missing or invalid duration does not prompt', () => {
  assert.equal(isTaskDecisionDue({ status: 'IN_PROGRESS', durationMinutes: null, startedAt }, now), false);
});
