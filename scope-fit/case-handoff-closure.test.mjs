import test from 'node:test';
import assert from 'node:assert/strict';
import { captureRecordDecision, createCaseHandoff, assertCaseHandoff, inspectRecords } from './preflight.mjs';
const header='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state';
const source=header+'\na,A,cA,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
const input={pax8Text:source,haloText:'line_id,subscription_id,customer_ref,billing_system\nlA,A,cA,HaloPSA\n',subscriptionId:'A',today:'2026-12-30',answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'},renewalTerm:'annual'};
test('P8C-M01 every render field accessor rejects with zero execution',()=>{
 for(const key of ['status','errors','verify','checkedToday','renewalTerm','caveat','nextAction','caseHandoff']){
  let reads=0;const d=inspectRecords(input,createCaseHandoff(source,'A'));Object.defineProperty(d,key,{enumerable:true,get(){reads++;return null;}});
  assert.throws(()=>captureRecordDecision(d),TypeError);assert.equal(reads,0);
 }
});
test('P8C-M02 capture freezes aliases once and preserves live handoff ownership',()=>{
 const d=inspectRecords(input,createCaseHandoff(source,'A')),h=d.caseHandoff,c=captureRecordDecision(d,input);
 d.errors.push('changed');assert.deepEqual(c.errors,[]);assert.equal(c.caseHandoff,h);assert.deepEqual(assertCaseHandoff(c.caseHandoff,source,'A'),h);assert.ok(Object.isFrozen(c.selected));
});
test('P8C-M03 unsupported render fields and nested getters reject',()=>{
 const d=inspectRecords(input,createCaseHandoff(source,'A'));assert.throws(()=>captureRecordDecision({...d,unknown:true}),TypeError);
 for(const changes of [{actionAuthorized:true},{financialVerdict:'covered'},{decisionKind:'financial-approval'}])assert.throws(()=>captureRecordDecision({...d,...changes}),TypeError);
 let reads=0;const action={};Object.defineProperty(action,'instruction',{enumerable:true,get(){reads++;return 'x';}});
 assert.throws(()=>captureRecordDecision({...d,nextAction:action}),TypeError);assert.equal(reads,0);
});
test('P8C-M04 maximal row and column pipeline preserves last selected source record',()=>{
 const columns=header.split(',');while(columns.length<64)columns.push('extra'+columns.length);
 const text=columns.join(',')+'\n'+Array.from({length:1023},(_,i)=>['a','S'+i,'C'+i,'pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew',...Array(54).fill('')].join(',')).join('\n');
 const h=createCaseHandoff(text,'S1022');assert.equal(h.selection.subject.recordNumber,1023);assert.equal(h.selection.subject.evidence.fields.length,64);
 const current={...input,pax8Text:text,subscriptionId:'S1022',haloText:'line_id,subscription_id,customer_ref,billing_system\nl,S1022,C1022,HaloPSA\n'};
 const d=captureRecordDecision(inspectRecords(current,h),current);
 assert.equal(d.caseHandoff.selection.subject.subscriptionId,'S1022');assert.equal(d.selected.customerRef,'C1022');
});
