import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmCaseSelection,reviewCaseSelection,revokeCaseSelectionConfirmation,assertCaseSelectionReview} from './preflight.mjs';
const header=['source_account_id','subscription_id','customer_ref','distributor','product_family','commerce_model','seat_based','commitment_term','renewal_date','end_of_term_state'];
const row=['a','s','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'];
const csv=(h=header,r=row)=>h.join(',')+'\n'+r.map(x=>'"'+x+'"').join(',');
const text=csv();
const variants={quotes:text.replaceAll('"',''),headerOrder:csv([...header].reverse(),[...row].reverse()),extraColumn:csv([...header,'extra'],[...row,'metadata']),unrelatedModify:text+'\n'+row.map((v,i)=>i===1?'other':v).join(','),selectedSpaces:csv(header,row.map((v,i)=>i===1?' s ':v)),unicode:csv(header,row.map((v,i)=>i===2?'c\u0301':v))};
for(const [name,value] of Object.entries(variants))test('P6C model evidence variant '+name,()=>{const receipt=confirmCaseSelection(text,'s');assert.notEqual(reviewCaseSelection(value,'s',receipt).status,'confirmed');revokeCaseSelectionConfirmation(receipt);assert.equal(reviewCaseSelection(text,'s',receipt).status,'candidate');});
test('P6C owner revokes on ABA; mismatch alone is not revocation',()=>{const receipt=confirmCaseSelection(text,'s');assert.notEqual(reviewCaseSelection(variants.quotes,'s',receipt).status,'confirmed');assert.equal(reviewCaseSelection(text,'s',receipt).status,'confirmed');revokeCaseSelectionConfirmation(receipt);revokeCaseSelectionConfirmation(receipt);assert.equal(reviewCaseSelection(text,'s',receipt).status,'candidate');});
test('P6C proxy wrapper and another module instance cannot inherit receipt',async()=>{const receipt=confirmCaseSelection(text,'s');assert.equal(reviewCaseSelection(text,'s',new Proxy(receipt,{})).status,'candidate');const other=await import('./preflight.mjs?isolated-confirmation-owner');assert.equal(other.reviewCaseSelection(text,'s',receipt).status,'candidate');revokeCaseSelectionConfirmation(receipt);});
test('P6C unrelated row changes and ordering cannot inherit a receipt',()=>{
  const other=row.map((v,i)=>i===1?'other':v).join(',');const original=text+'\n'+other;const receipt=confirmCaseSelection(original,'s');
  for(const changed of [original.replace('other','different'),header.join(',')+'\n'+other+'\n'+row.join(',')])assert.notEqual(reviewCaseSelection(changed,'s',receipt).status,'confirmed');
  revokeCaseSelectionConfirmation(receipt);
});
test('P6C maximal row/column source can confirm, revoke and freshly confirm',()=>{
  const headers=[...header,...Array.from({length:54},(_,i)=>'extra_'+i)];
  const lines=Array.from({length:1023},(_,i)=>[...row.map((v,j)=>j===1?'s'+i:v),...Array(54).fill('x')].join(','));
  const large=headers.join(',')+'\n'+lines.join('\n');const receipt=confirmCaseSelection(large,'s1022');
  assert.equal(reviewCaseSelection(large,'s1022',receipt).status,'confirmed');revokeCaseSelectionConfirmation(receipt);assert.equal(reviewCaseSelection(large,'s1022',receipt).status,'candidate');
  const fresh=confirmCaseSelection(large,'s1022');assert.equal(reviewCaseSelection(large,'s1022',fresh).status,'confirmed');revokeCaseSelectionConfirmation(fresh);
  assert.throws(()=>confirmCaseSelection(large+'\n'+lines[0],'s1022'));
});
test('P6C forged metadata, getters and prototypes do not confer authority',()=>{
  let reads=0;const accessor={get version(){reads++;throw Error('getter');}};
  for(const fake of [{version:'case-selection-confirmation-v1',authenticated:false},Object.create({version:'case-selection-confirmation-v1'}),accessor,new Proxy({}, {get(){reads++;throw Error('proxy');}}),Symbol('fake'),1,undefined])assert.equal(reviewCaseSelection(text,'s',fake).status,'candidate');
  assert.equal(reads,0);const receipt=confirmCaseSelection(text,'s');assert.throws(()=>receipt.authority=true);const wrapper=new Proxy(receipt,{});revokeCaseSelectionConfirmation(wrapper);assert.equal(reviewCaseSelection(text,'s',receipt).status,'confirmed');revokeCaseSelectionConfirmation(receipt);
});
test('P6C corrupted projections and accessors cannot inherit review authority',()=>{
  const receipt=confirmCaseSelection(text,'s');const review=reviewCaseSelection(text,'s',receipt);
  for(const key of Object.keys(review)){const changed=structuredClone(review);delete changed[key];assert.throws(()=>assertCaseSelectionReview(changed,text,'s',receipt),key);}
  let reads=0;const bad={get status(){reads++;return 'confirmed';}};assert.throws(()=>assertCaseSelectionReview(bad,text,'s',receipt));assert.equal(reads,0);revokeCaseSelectionConfirmation(receipt);
});
test('P6C optional metadata and unknown cell modifications are source changes',()=>{
  for(const column of ['customer_name','account_name','extra']){const original=csv([...header,column],[...row,'Acme']);const receipt=confirmCaseSelection(original,'s');assert.notEqual(reviewCaseSelection(original.replace('Acme','Other'),'s',receipt).status,'confirmed');revokeCaseSelectionConfirmation(receipt);}
});
test('P6C exact two megabytes and cell/column limits at receipt boundary',()=>{
  const headers=[...header,'padding1','padding2'];const rows=Array.from({length:1000},(_,i)=>[...row.map((v,j)=>j===1?'s'+i:v),'','']);
  const render=()=>headers.join(',')+'\n'+rows.map(r=>r.join(',')).join('\n');let remaining=2_000_000-render().length;
  for(const r of rows)for(const index of [10,11]){const count=Math.min(remaining,1024);r[index]='x'.repeat(count);remaining-=count;}
  assert.equal(remaining,0);const large=render();assert.equal(new TextEncoder().encode(large).length,2_000_000);
  const receipt=confirmCaseSelection(large,'s999');const review=reviewCaseSelection(large,'s999',receipt);assert.equal(review.status,'confirmed');assert.equal(assertCaseSelectionReview(review,large,'s999',receipt).status,'confirmed');revokeCaseSelectionConfirmation(receipt);
  assert.throws(()=>confirmCaseSelection(large+' ','s999'));
  assert.throws(()=>confirmCaseSelection(csv([...header,...Array.from({length:55},(_,i)=>'extra'+i)],[...row,...Array(55).fill('x')]),'s'));
  assert.throws(()=>confirmCaseSelection(csv([...header,'extra'],[...row,'x'.repeat(1025)]),'s'));
});
