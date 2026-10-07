import test from 'node:test';
import assert from 'node:assert/strict';
import { captureSelectedRecord, selectCaseSubject, assertCaseSubject, assertCaseIdentity, inspectRecords, PAX8_COLUMNS } from './preflight.mjs';
const selected = {subscriptionId:'s',customerRef:'c',haloLineId:'l'};
const extras=['source_account_id','customer_name','product_name','product_sku','seat_count'];
const row=(overrides={})=>({...Object.fromEntries(PAX8_COLUMNS.map((key,i)=>[key,['s','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'][i]])),source_account_id:'a',customer_name:'Same',product_name:'Same',product_sku:'sku',seat_count:'10',...overrides});
const csv=(rows,columns=PAX8_COLUMNS.concat(extras))=>columns.join(',')+'\n'+rows.map(value=>columns.map(key=>String(value[key]??'')).join(',')).join('\n');
const input={subscriptionId:'s',today:'2026-12-30',renewalTerm:'annual',answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'},haloText:'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA'};

test('selected root and nested accessors are rejected without invoking getters',()=>{
  let reads=0;
  for(const value of [{get selected(){reads++;return selected;}},{selected:{...selected,get customerRef(){reads++;return 'c';}}}])assert.throws(()=>captureSelectedRecord(value));
  assert.equal(reads,0);
});
test('selected capture reads descriptor once and detaches all subsequent alias mutations',()=>{
  let reads=0;const target={selected:{...selected}};
  const proxy=new Proxy(target,{getOwnPropertyDescriptor(object,key){if(key==='selected') {reads++;return {configurable:true,enumerable:true,writable:true,value:reads===1?object.selected:{...selected,subscriptionId:'wrong'}};}return Reflect.getOwnPropertyDescriptor(object,key);}});
  const captured=captureSelectedRecord(proxy);assert.equal(reads,1);target.selected.subscriptionId='wrong';
  assert.deepEqual(captured,selected);assert.ok(Object.isFrozen(captured));
  assert.throws(()=>{captured.customerRef='wrong';},TypeError);
});
test('selected shape rejects omission, extras, types, exotic values and excessive raw length',()=>{
  assert.equal(captureSelectedRecord({}),null);
  for(const value of [null,[],new Date(),{...selected,extra:true},{...selected,customerRef:null},{...selected,subscriptionId:1},{...selected,haloLineId:'x'.repeat(1025)}])assert.throws(()=>captureSelectedRecord({selected:value}));
  for(const key of Object.keys(selected)){const value={...selected};delete value[key];assert.throws(()=>captureSelectedRecord({selected:value}));}
  assert.equal(captureSelectedRecord({selected:{...selected,customerRef:''}}).customerRef,''); // Honest unusable link-review raw value, never a complete identity key.
});
test('identity serialization preserves null keys/version and rejects loss, coercion or added authority',()=>{
  for(const account of ['a','unknown','']){
    const text=csv([row({source_account_id:account})]);const original=selectCaseSubject(text,'s').subject.identity;
    assert.deepEqual(assertCaseIdentity(JSON.parse(JSON.stringify(original)),text,'s'),original);
    for(const key of Object.keys(original)){const altered={...original};delete altered[key];assert.throws(()=>assertCaseIdentity(altered,text,'s'));}
    assert.throws(()=>assertCaseIdentity({...original,subscriptionId:1},text,'s'));
    assert.throws(()=>assertCaseIdentity({...original,actionAuthorized:true},text,'s'));
  }
});
test('confirmation basis responds to every relevant identity/occurrence/description source change',()=>{
  const text=csv([row()]);const first=inspectRecords({...input,pax8Text:text});
  for(const changed of [{source_account_id:'b'},{customer_name:'Renamed'},{product_name:'New name'},{product_sku:'New SKU'},{seat_count:'11'},{renewal_date:'2027-01-16'}]){
    const next=inspectRecords({...input,pax8Text:csv([row(changed)]),linkConfirmation:{confirmed:true,basis:first.reviewBasis}});
    assert.notEqual(next.reviewBasis,first.reviewBasis);assert.equal(next.status,'needs-record-link-confirmation');
  }
  const customer=inspectRecords({...input,pax8Text:csv([row({customer_ref:'other'})]),haloText:input.haloText.replace(',c,',',other,'),linkConfirmation:{confirmed:true,basis:first.reviewBasis}});
  assert.equal(customer.status,'needs-record-link-confirmation');
  const reordered=inspectRecords({...input,pax8Text:csv([row({subscription_id:'other'}),row()])});assert.equal(reordered.reviewBasis,first.reviewBasis);
});
test('account vocabulary/raw normalization and maximum optional-column fixture remain canonical',()=>{
  for(const account of [' UNKNOWN ',' n/A ','Not Sure','TBD','a\u200b'])assert.equal(selectCaseSubject(csv([row({source_account_id:account})]),'s').subject.identity.key,null);
  const columns=PAX8_COLUMNS.concat(extras,Array.from({length:50},(_,i)=>'extra'+i));
  const rows=Array.from({length:1023},(_,i)=>row({subscription_id:'s'+i,customer_ref:'c'+i}));const text=csv(rows,columns);
  const subject=selectCaseSubject(text,'s1022');assert.equal(assertCaseSubject(subject,text,'s1022').subject.recordNumber,1023);
  const decision=inspectRecords({...input,subscriptionId:'s1022',pax8Text:text,haloText:'line_id,subscription_id,customer_ref,billing_system\nl,s1022,c1022,HaloPSA'});
  assert.deepEqual(assertCaseIdentity(decision.caseIdentity,text,'s1022'),subject.subject.identity);
  assert.equal(captureSelectedRecord(decision).customerRef,'c1022');
});
