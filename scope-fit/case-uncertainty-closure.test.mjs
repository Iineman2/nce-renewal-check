import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAX8_COLUMNS, selectCaseSubject, confirmCaseSelection, reviewCaseSelection, assertCaseSelectionReview } from './preflight.mjs';

const columns=['source_account_id',...PAX8_COLUMNS];
const row=(account='a',id='s',customer='c',date='2027-01-15')=>[account,id,customer,'pax8','Microsoft 365','NCE','yes','annual',date,'renew'];
const csv=(rows,header=columns)=>header.map(quote).join(',')+'\n'+rows.map(r=>r.map(quote).join(',')).join('\n');
function quote(v){return '"'+v.replaceAll('"','""')+'"';}

test('P4-05-08 P4-34-01 three-way ambiguity and all incomplete identity combinations never promote',()=>{
  const text=csv([row(),row('', 's','different'),row('b','s','c','2028-01-15')]);
  assert.equal(selectCaseSubject(text,'s').matchCount,3);assert.equal(selectCaseSubject(text,'s').subject,null);assert.throws(()=>confirmCaseSelection(text,'s'));
  for(let mask=1;mask<8;mask++){const r=row();for(const [bit,index]of[[1,0],[2,2],[4,8]])if(mask&bit)r[index]='';const source=csv([r]);assert.equal(reviewCaseSelection(source,'s').canConfirm,false);assert.throws(()=>confirmCaseSelection(source,'s'));}
});
test('P4-06-02 P4-06-05 P4-06-06 exact preview borders and distinctions beyond row20 retain unresolved count',()=>{
  for(const count of [20,21,5000]){
    const rows=Array.from({length:count},(_,i)=>row(i===count-1?'distinct-account':'a','s',i===count-1?'distinct-customer':'c'));
    const selection=selectCaseSubject(csv(rows),'s');assert.equal(selection.matchCount,count);assert.equal(selection.candidates.length,Math.min(count,20));assert.equal(selection.subject,null);
  }
  const rows=Array.from({length:21},()=>row('א'.repeat(128),'s','ك'.repeat(128)));rows[0][0]='a\n'+ 'x'.repeat(120);
  const selection=selectCaseSubject(csv(rows),'s');assert.equal(selection.candidates[0].sourceAccountId,rows[0][0]);assert.equal(selection.candidates[19].customerRef.length,128);assert.equal(selection.canConfirm,false);
});
test('P4-09-07 visually similar account header never completes account identity',()=>{
  const source=csv([row()],columns.map(key=>key==='source_account_id'?'source_accоunt_id':key));
  const selection=reviewCaseSelection(source,'s');assert.equal(selection.subject.identity.sourceAccountId,null);assert.equal(selection.canConfirm,false);assert.equal(selection.uncertainty[0].code,'missing-account');
});
test('P4-34-02 128 independent domain combinations and receipt isolation preserve uncertainty',()=>{
  for(const account of ['a','','UNKNOWN','N/A','a\u034f','a\uFE0F',' a ','null'])for(const customer of ['c','','c\u034f','unknown'])for(const date of ['2027-01-15','','2027-02-29','2028-02-29']){
    const source=csv([row(account,'s',customer,date)]);const expected=['a',' a ','null'].includes(account)&&['c','unknown'].includes(customer)&&['2027-01-15','2028-02-29'].includes(date);
    assert.equal(reviewCaseSelection(source,'s').canConfirm,expected);if(expected){const receipt=confirmCaseSelection(source,'s');assert.equal(assertCaseSelectionReview(reviewCaseSelection(source,'s',receipt),source,'s',receipt).status,'confirmed');}else assert.throws(()=>confirmCaseSelection(source,'s'));
  }
  const source=csv([row(),row('a','other')]);assert.equal(reviewCaseSelection(source,'other',confirmCaseSelection(source,'s')).status,'candidate');
});
test('P4-12-07 P4-18-08 bounded repeated maximal review preserves full evidence and source binding',()=>{
  const extras=Array.from({length:54},(_,i)=>'extra_'+i);const header=columns.concat(extras);
  const rows=Array.from({length:1023},(_,i)=>row('a','s'+i,'c'+i).concat(Array(54).fill(i===1022?'x'.repeat(1024):'x')));const source=csv(rows,header);
  const start=performance.now();
  for(let i=0;i<4;i++){const receipt=confirmCaseSelection(source,'s1022');const selection=assertCaseSelectionReview(reviewCaseSelection(source,'s1022',receipt),source,'s1022',receipt);assert.equal(selection.status,'confirmed');assert.equal(selection.subject.evidence.fields.length,64);assert.equal(selection.subject.evidence.fields.at(-1).rawValue.length,1024);}
  const elapsedMs=performance.now()-start;assert.ok(elapsedMs<60000);console.log('P4-RESOURCE:'+JSON.stringify({repeats:4,rows:1023,columns:64,elapsedMs}));
});
test('P4-14-07 separate module instance rejects a foreign ephemeral receipt',async()=>{
  const source=csv([row()]);const other=await import('./preflight.mjs?independent-receipt-owner');
  assert.equal(other.reviewCaseSelection(source,'s',confirmCaseSelection(source,'s')).status,'candidate');
});
test('P4-22-02 P4-22-03 independent attestation explicitly precedes action and states exact source scope',()=>{
  const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
  const instruction=app.indexOf('Confirm only after checking the supplied account, customer reference, subscription ID and exact renewal occurrence against the original Pax8 record.');
  const combined = app.indexOf("setText(confirm, 'I checked this subscription, line, and customer in the original systems')");
  assert.ok(instruction>0);assert.ok(combined>instruction);assert.ok(app.includes('If you cannot check these facts, leave this case unconfirmed.'));assert.ok(app.includes('This records your attestation; it does not authenticate the source.'));
  assert.ok(!app.includes("confirm.textContent = 'Confirm this source case'"), 'The superseded second attestation control must not reappear in the information view');
  const handler = app.slice(combined, app.indexOf('appendResult(confirm)', combined));
  const readiness = handler.indexOf('if (!selectionReview().canConfirm) return;'), attestation = handler.indexOf('confirmCurrentSelection();');
  assert.ok(readiness >= 0 && attestation > readiness);
  assert.ok(handler.includes('currentCase.linkConfirmation = { confirmed: true, basis: decision.reviewBasis };'));
});
