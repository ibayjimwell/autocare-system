import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
test('official Final Cost creation, no editable defaults',()=>{
  assert.match(read('utils/final-bill.ts'),/status: 'OFFICIAL'/);
  assert.match(read('database/models/payments/final-bill.model.ts'),/default\('OFFICIAL'\)/);
});
test('warranty is in Estimate Detail, not listing',()=>{
  assert.match(read('components/payments/DetailModal.tsx'),/<WarrantyManager/);
  assert.doesNotMatch(read('components/payments/EstimatesList.tsx'),/<WarrantyManager/);
});
test('Electronic transfer verifier removed',()=>{
  assert.doesNotMatch(read('app/(main)/payments/page.tsx'),/<ManualTransferReview/);
  assert.match(read('app/api/payments/final-bills/[id]/manual-transfer/route.ts'),/status: 410/);
});
test('Final Cost adjustments locked at API level',()=>{
  for(const p of ['fees/route.ts','discounts/route.ts','findings/[findingId]/toggle/route.ts'])
    assert.match(read('app/api/payments/final-bills/[id]/'+p),/return rejectFinalCostMonetaryEdit/);
});
test('Estimate parking creates fees before finalization',()=>{
  const p=read('app/api/payments/estimates/[id]/parking/route.ts');
  assert.match(p,/tx\.insert\(EstimateFees\)/);assert.match(p,/status: 'PARKED'/);assert.match(p,/status: 'PENDING'/);
});
test('approved estimates are archived without removing status from customer records',()=>{
  const list=read('components/payments/EstimatesList.tsx');
  assert.match(list,/approvedExpanded/);
  assert.match(list,/Approved Estimates/);
  assert.match(list,/e\.status==='APPROVED'/);
});
test('invoice list only exposes official and paid bills',()=>{
  const list=read('components/payments/FinalBillsList.tsx');
  assert.match(list,/\['OFFICIAL','PAID'\]/);
  assert.doesNotMatch(list,/onMakeOfficial\(bill\.id\)/);
});
test('estimate parking has transactional fee and monetary totals',()=>{
  const p=read('app/api/payments/estimates/[id]/parking/route.ts');
  assert.match(p,/Database\.transaction/);
  assert.match(p,/tx\.insert\(EstimateFees\)/);
  assert.match(p,/grandTotal:/);
  assert.match(p,/feesTotal:/);
});
test('Web final detail excludes mutators and offers warranty manager for estimates only',()=>{
  const p=read('components/payments/DetailModal.tsx');
  assert.match(p,/const isFinalBillEditable = false/);
  assert.match(p,/detailType === 'estimate' && selectedItem\?\.id/);
});
test('legacy final drafts are disclosed and not promoted automatically',()=>{
  assert.match(read('app/(main)/payments/page.tsx'),/legacyDraftCount/);
  assert.doesNotMatch(read('database/migrations/0060_estimate_parking_and_official_final_cost.sql'),/UPDATE public\.final_bills SET status/);
});
test('Mobile billing includes pending and parked estimates and official Final Costs',()=>{
  const root=new URL('../../mobile/', import.meta.url);
  const mobile=p=>fs.readFileSync(new URL(p,root),'utf8');
  assert.match(mobile('app/estimates.jsx'),/'PARKED'/);
  assert.match(mobile('app/billing.jsx'),/'PENDING', 'PARKED', 'WAITING_FOR_APPROVAL'/);
  assert.match(mobile('app/final-bills.jsx'),/\['OFFICIAL','PAID'\]/);
});
