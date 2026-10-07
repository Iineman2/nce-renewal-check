import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaseHandoff, assertCaseHandoff, captureCaseHandoff, confirmCaseSelection, revokeCaseSelectionConfirmation, inspectRecords } from './preflight.mjs';
const header = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state';
const source = header+'\na,A,cA,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\na,B,cB,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
const input = { pax8Text: source, haloText:'line_id,subscription_id,customer_ref,billing_system\nlA,A,cA,HaloPSA\n', subscriptionId:'A', today:'2026-12-30', answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'}, renewalTerm:'annual' };
test('P8-M01 exact selected row and raw evidence travel frozen without authority', () => {
  const h=createCaseHandoff(source,'B');
  assert.equal(h.selection.subject.subscriptionId,'B');assert.equal(h.selection.subject.customerRef,'cB');assert.equal(h.selection.subject.recordNumber,2);
  assert.equal(h.selection.subject.raw.subscription_id,'B');assert.ok(h.selection.subject.evidence);
  assert.equal(h.selection.status,'candidate');assert.equal(h.authenticated,false);assert.equal(h.actionAuthorized,false);
  for(const k of ['eligibilityVerdict','linkageVerdict','financialVerdict'])assert.equal(h[k],null);
  assert.ok(Object.isFrozen(h.selection.subject.raw));assert.throws(()=>h.selection.subject.raw.subscription_id='A',TypeError);
});
test('P8-M02 genuine receipt changes only public selection status; no receipt exported', () => {
  const r=confirmCaseSelection(source,'A'),h=createCaseHandoff(source,'A',r);
  assert.equal(h.selection.status,'confirmed');assert.equal(JSON.stringify(h).includes('case-selection-confirmation-v1'),false);
  assert.deepEqual(assertCaseHandoff(h,source,'A',r),h);
  assert.throws(()=>assertCaseHandoff(h,source,'A',structuredClone(r)),TypeError);
  revokeCaseSelectionConfirmation(r);assert.throws(()=>assertCaseHandoff(h,source,'A',r),TypeError);
  const replacement=confirmCaseSelection(source,'A');assert.throws(()=>assertCaseHandoff(h,source,'A',replacement),TypeError);
  assert.equal(assertCaseHandoff(createCaseHandoff(source,'A',replacement),source,'A',replacement).selection.status,'confirmed');
});
test('P8-M03 every changed projection and source state fails closed', () => {
  const r=confirmCaseSelection(source,'A'),h=createCaseHandoff(source,'A',r);
  for(const mutate of [v=>v.actionAuthorized=true,v=>v.eligibilityVerdict='eligible',v=>v.linkageVerdict='linked',v=>v.financialVerdict='covered',v=>v.selection.subject.customerRef='cB',v=>v.selection.subject.raw.subscription_id='B',v=>v.extra=true,v=>delete v.selection.uncertainty]){
    const v=structuredClone(h);mutate(v);assert.throws(()=>assertCaseHandoff(v,source,'A',r),TypeError);
  }
  for(const s of [source+'\n',source.replace('cA','cOther'),source.replace('2027-01-15','2027-02-15')])assert.throws(()=>assertCaseHandoff(h,s,'A',r),TypeError);
  assert.throws(()=>assertCaseHandoff(h,source,'B',r),TypeError);
});
test('P8-M04 unresolved identity and ambiguity stay visible', () => {
  for(const s of [source.replace('a,A,cA','a,A,'),source.replace('a,A,cA',',A,cA'),source.replace('2027-01-15','invalid')]){
    const h=createCaseHandoff(s,'A');assert.equal(h.selection.status,'unresolved');assert.ok(h.selection.uncertainty.length);assert.equal(h.selection.canConfirm,false);assert.deepEqual(assertCaseHandoff(h,s,'A'),h);
  }
  const h=createCaseHandoff(source.replace('a,B,cB','a,A,cB'),'A');assert.equal(h.selection.subject,null);assert.equal(h.selection.matchCount,2);
});
test('P8-M05 comparison carries handoff separately from downstream verdicts', () => {
  const h=createCaseHandoff(source,'A'),d=inspectRecords(input,h);
  assert.deepEqual(d.caseHandoff,h);assert.equal(d.caseHandoff.selection.status,'candidate');assert.equal(d.caseHandoff.linkageVerdict,null);assert.equal(d.actionAuthorized,false);
  assert.equal(Object.hasOwn(inspectRecords(input),'caseHandoff'),false);
  const h2=createCaseHandoff(source,'B');assert.throws(()=>inspectRecords(input,h2),TypeError);
});
test('P8-M06 handoff is validated before blocked policy outcomes and getter code never runs', () => {
  const h=createCaseHandoff(source,'A');let reads=0;const v={...h};Object.defineProperty(v,'selection',{get(){reads++;return h.selection;},enumerable:true});
  assert.throws(()=>inspectRecords({...input,today:'2030-01-01'},v),TypeError);assert.equal(reads,0);
  const d=inspectRecords({...input,today:'2030-01-01'},h);assert.equal(d.status,'policy-review-required');assert.deepEqual(d.caseHandoff,h);
});

test('P8-M07 renderer rejects root accessors without executing them', () => {
  let reads=0;const h=createCaseHandoff(source,'A'),d={};Object.defineProperty(d,'caseHandoff',{get(){reads++;return h;}});
  assert.throws(()=>captureCaseHandoff(d,source,'A'),TypeError);assert.equal(reads,0);
  assert.throws(()=>captureCaseHandoff({},source,'A'),TypeError);assert.deepEqual(captureCaseHandoff({caseHandoff:h},source,'A'),h);
});

test('P8-M08 all selection states bind exact source bytes, including unselected rows', () => {
 for(const s of [source,source.replace('a,A,cA','a,A,'),source.replace('a,B,cB','a,A,cB')]){
  const h=createCaseHandoff(s,'A');
  for(const changed of [s+'\n',s.replace('cB','otherB')])assert.throws(()=>assertCaseHandoff(h,changed,'A'),TypeError);
  assert.throws(()=>assertCaseHandoff(structuredClone(h),s,'A'),TypeError);
 }
});
