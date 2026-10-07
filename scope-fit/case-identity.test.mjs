import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCaseSubject, assertCaseSubject, assertCaseIdentity, inspectRecords, PAX8_COLUMNS } from './preflight.mjs';
const columns=['source_account_id','customer_name','product_name','product_sku','seat_count'];
const source=(account='a',customer='c',id='s',date='2027-01-15',labels=['Same customer','Same product','sku','10'])=>PAX8_COLUMNS.concat(columns).join(',')+'\n'+[id,customer,'pax8','Microsoft 365','NCE','yes','annual',date,'renew',account,...labels].join(',');
const identity=(...args)=>selectCaseSubject(source(...args),args[2]??'s').subject.identity;
const args={subscriptionId:'s',today:'2026-12-30',renewalTerm:'annual',answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'},haloText:'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA'};

test('namespace, customer and subscription distinguish equal descriptions',()=>{
  const base=identity();assert.equal(base.status,'source-scoped');assert.equal(base.authenticated,false);
  for(const other of [identity('b'),identity('a','different'),identity('a','c','different')])assert.notEqual(base.key,other.key);
  assert.deepEqual(JSON.parse(base.key),['Pax8','a','c','s']);
});
test('missing/unusable account or customer cannot generate complete identity or occurrence key',()=>{
  for(const value of ['unknown','N/A','NA','not sure','unspecified','tbd'])assert.equal(identity(value).key,null);
  for(const value of ['', 'x'.repeat(129),'a\u200b']) {
    for(const item of [identity(value),identity('a',value)]) {assert.equal(item.key,null);assert.equal(item.occurrenceKey,null);assert.equal(item.status,'unresolved');}
  }
  const noAccount=selectCaseSubject(PAX8_COLUMNS.join(',')+'\ns,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew','s');
  assert.equal(noAccount.status,'unresolved');assert.equal(noAccount.subject.identity.sourceAccountId,null);assert.equal(noAccount.subject.identity.key,null);
});
test('names, SKU, seats, filenames and row positions are not identity; renewal occurrence is separate',()=>{
  const first=identity();const labels=identity('a','c','s','2027-01-15',['Changed','Changed','other','999']);
  assert.equal(first.key,labels.key);assert.equal(first.occurrenceKey,labels.occurrenceKey);
  const next=identity('a','c','s','2028-01-15');assert.equal(first.key,next.key);assert.notEqual(first.occurrenceKey,next.occurrenceKey);
  assert.equal(identity('a','c','s','bad').occurrenceKey,null);
});
test('structured keys cannot collide through delimiters, case, leading zeros or Unicode distinctions',()=>{
  const pairs=[[['a|b','c','s'],['a','b|c','s']],[['a','c','001'],['a','c','1']],[['a','c','S'],['a','c','s']],[['a','é','s'],['a','é','s']]];
  for(const [left,right] of pairs)assert.notEqual(identity(...left).key,identity(...right).key);
  assert.equal(identity(' a ',' c ',' s ').key,identity().key); // Documented trim normalization.
});
test('duplicate subscription IDs across different accounts remain ambiguous under the exact-ID selector',()=>{
  const text=source()+'\n'+source('b').split('\n')[1];
  assert.equal(selectCaseSubject(text,'s').subject,null);
  assert.equal(inspectRecords({...args,pax8Text:text}).status,'needs-record-identity');
});
test('canonical assertion binds all identity and descriptive fields to actual selected source',()=>{
  const text=source();const projection=selectCaseSubject(text,'s');
  for(const group of ['identity','descriptions'])for(const key of Object.keys(projection.subject[group])) {
    const changed=structuredClone(projection);changed.subject[group][key]='forged';assert.throws(()=>assertCaseSubject(changed,text,'s'),key);
  }
  assert.ok(Object.isFrozen(projection.subject.identity));assert.ok(Object.isFrozen(projection.subject.descriptions));
});
test('comparison handoff preserves canonical identity and account changes invalidate old link confirmation',()=>{
  const text=source();const initial=inspectRecords({...args,pax8Text:text});
  assert.deepEqual(initial.caseIdentity,selectCaseSubject(text,'s').subject.identity);
  assert.deepEqual(assertCaseIdentity(initial.caseIdentity,text,'s'),initial.caseIdentity);
  for(const value of [undefined,null,{...initial.caseIdentity,key:'forged'},{...initial.caseIdentity,sourceAccountId:'wrong'}])assert.throws(()=>assertCaseIdentity(value,text,'s'));
  const confirmed=inspectRecords({...args,pax8Text:text,linkConfirmation:{confirmed:true,basis:initial.reviewBasis}});
  assert.equal(confirmed.status,'supplied-claims-look-in-scope');
  const replacement=inspectRecords({...args,pax8Text:source('b'),linkConfirmation:{confirmed:true,basis:initial.reviewBasis}});
  assert.equal(replacement.status,'needs-record-link-confirmation');assert.notEqual(replacement.caseIdentity.key,initial.caseIdentity.key);
});
