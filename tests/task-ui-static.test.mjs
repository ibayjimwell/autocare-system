import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const card=readFileSync(new URL('../components/service-tracking/task-card.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../components/service-tracking/service-detail-panel.tsx',import.meta.url),'utf8');
test('task card owns decision modal based on same elapsed clock as progress',()=>{
  assert.match(card,/const expiredNeedsDecision = promptAllowed && isActive/);
  assert.match(card,/elapsed >= duration \* 60_000/);
  assert.match(card,/open=\{expiredNeedsDecision\}/);
  assert.match(card,/\{task\.title\} is finished\?/);
});
test('dialog finish and extend invoke the original protected API flows',()=>{
  assert.match(card,/await onUpdate\(task\.id, 'DONE'\)/);
  assert.match(card,/void extend\(true\)/);
  assert.match(card,/await onExtended\(\)/);
  assert.match(card,/setExtending\(false\)/);
});
test('only the first expired task prompts and old competing modal is removed',()=>{
  assert.match(panel,/firstExpiredTaskId/);
  assert.match(panel,/promptAllowed=\{firstExpiredTaskId === task\.id\}/);
  assert.doesNotMatch(panel,/<TaskTimerDecision/);
});
