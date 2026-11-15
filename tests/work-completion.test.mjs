import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { areAllWorkTasksFinished, workCompletionFingerprint } from '../lib/service-tracking/work-completion.ts';

const src = (name) => readFileSync(join(process.cwd(), name), 'utf8');

// Shared UI/server gate

test('zero repair tasks never qualify for completion', () => {
  assert.equal(areAllWorkTasksFinished([]), false);
  assert.equal(areAllWorkTasksFinished(null), false);
  assert.equal(workCompletionFingerprint([]), null);
});

test('an incomplete repair task keeps the confirmation closed', () => {
  assert.equal(areAllWorkTasksFinished([{id:'a',status:'DONE'}, {id:'b',status:'PENDING'}]), false);
  assert.equal(areAllWorkTasksFinished([{id:'a',status:'DONE'}, {id:'b',status:'IN_PROGRESS'}]), false);
});

test('all DONE repair tasks are eligible for confirmation', () => {
  const tasks = [{id:'a',status:'DONE'}, {id:'b',status:'DONE'}];
  assert.equal(areAllWorkTasksFinished(tasks), true);
  assert.equal(workCompletionFingerprint(tasks), 'a|b');
});

test('completed task fingerprint is stable across fetch ordering', () => {
  const first = [{id:'b',status:'DONE'}, {id:'a',status:'DONE'}];
  const second = [...first].reverse();
  assert.equal(workCompletionFingerprint(first), workCompletionFingerprint(second));
});

test('adding a pending task disables the completion decision', () => {
  const completed = [{id:'a',status:'DONE'}, {id:'b',status:'DONE'}];
  const next = [...completed, {id:'c',status:'PENDING'}];
  assert.ok(workCompletionFingerprint(completed));
  assert.equal(workCompletionFingerprint(next), null);
});

test('finishing the additional task produces a new fingerprint', () => {
  const oldKey = workCompletionFingerprint([{id:'a',status:'DONE'}]);
  const newKey = workCompletionFingerprint([{id:'a',status:'DONE'}, {id:'c',status:'DONE'}]);
  assert.notEqual(newKey, oldKey);
});

// Wiring assertions (an actual browser/database build is separately required).

test('UI has automatic completion prompt and both requested actions', () => {
  const panel = src('components/service-tracking/service-detail-panel.tsx');
  assert.match(panel, /useEffect\(\(\) => \{\s*if \(!completionKey\)/);
  assert.match(panel, /setDoneConfirmOpen\(true\)/);
  assert.match(panel, /The service is now Completed\?/);
  assert.match(panel, /Add Another Task/);
  assert.match(panel, /Yes, Completed/);
  assert.match(panel, /setAddTaskModalOpen\(true\)/);
});

test('yes action preserves Final Cost generation and loading overlay', () => {
  const panel = src('components/service-tracking/service-detail-panel.tsx');
  assert.match(panel, /await finalBillsApi\.generate\(appointment\.id\)/);
  assert.match(panel, /setProcessingAction\('COMPLETE_WORK'\)/);
  assert.match(panel, /<ServiceTrackingLoadingModal/);
  assert.match(panel, /completingWorkRef\.current/);
});

test('final bill server denies unfinished/empty work and inactive appointment', () => {
  const route = src('app/api/service-tracking/final-bill/route.ts');
  assert.match(route, /getServerSession\(authOptions\)/);
  assert.match(route, /currentAppointment\.status !== 'IN_PROGRESS'/);
  assert.match(route, /!areAllWorkTasksFinished\(workTasks\)/);
  assert.match(route, /await generateFinalBill\(/);
});
