import test from 'node:test';
import assert from 'node:assert/strict';
import { PAX8_COLUMNS, selectCaseSubject, assertCaseSubject, confirmCaseSelection, reviewCaseSelection, assertCaseSelectionReview } from './preflight.mjs';

const row = (changes = {}) => ({ source_account_id: 'a', subscription_id: 's', customer_ref: 'c', distributor: 'pax8', product_family: 'Microsoft 365', commerce_model: 'NCE', seat_based: 'yes', commitment_term: 'annual', renewal_date: '2027-01-15', end_of_term_state: 'renew', ...changes });
const csv = (...rows) => Object.keys(rows[0]).join(',') + '\n' + rows.map(r => Object.values(r).map(v => '"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
const source = csv(row());

test('unique complete evidence is only a candidate until explicit ephemeral self-attestation', () => {
  const candidate = selectCaseSubject(source, 's');
  assert.equal(candidate.status, 'candidate'); assert.equal(candidate.canConfirm, true); assert.deepEqual(candidate.uncertainty, []);
  assert.equal(reviewCaseSelection(source, 's').status, 'candidate');
  const receipt = confirmCaseSelection(source, 's');
  assert.equal(reviewCaseSelection(source, 's', receipt).status, 'confirmed');
  assert.equal(receipt.authenticated, false); assert.equal(reviewCaseSelection(source, 's', receipt).authenticated, false);
});
test('every combination of missing namespace, customer and occurrence stays explicit and unconfirmable', () => {
  for (let mask = 1; mask < 8; mask++) {
    const r = row(); const expected = [];
    for (const [bit, field, code] of [[1,'source_account_id','missing-account'],[2,'customer_ref','missing-customer'],[4,'renewal_date','missing-occurrence']]) if (mask & bit) { r[field] = ''; expected.push(code); }
    const text = csv(r); const result = reviewCaseSelection(text,'s');
    assert.equal(result.status,'unresolved'); assert.equal(result.canConfirm,false);
    assert.deepEqual(result.uncertainty.map(i=>i.code),expected); assert.ok(result.subject.evidence);
    assert.throws(()=>confirmCaseSelection(text,'s')); assert.equal(reviewCaseSelection(text,'s',confirmCaseSelection(source,'s')).status,'unresolved');
  }
});
test('unusable namespace vocabulary and hidden or oversized identifiers cannot be confirmed', () => {
  for (const value of ['', 'unknown','N/A','NA','not sure','unspecified','tbd','a\u200b','x'.repeat(129)]) {
    const text=csv(row({source_account_id:value})); assert.equal(reviewCaseSelection(text,'s').canConfirm,false); assert.throws(()=>confirmCaseSelection(text,'s'));
  }
  for (const value of ['', 'c\u034f','c\nfoo','x'.repeat(129)]) assert.equal(reviewCaseSelection(csv(row({customer_ref:value})),'s').canConfirm,false);
});
test('invalid occurrence boundaries do not inherit questionnaire dates or eligibility claims', () => {
  for(const date of ['', 'unknown','2027-02-29','2028-02-30','2027-13-01','2027-00-01','2027-01-00','2027-01-15T00:00:00','15/01/2027']) {
    const result=reviewCaseSelection(csv(row({renewal_date:date})),'s'); assert.equal(result.canConfirm,false); assert.equal(result.subject.renewalDate,null);
  }
  assert.equal(reviewCaseSelection(csv(row({renewal_date:'2028-02-29'})),'s').canConfirm,true);
});
test('identical duplicates, conflicting fields and cross-account matches never default to a row', () => {
  for (const second of [row(),row({source_account_id:'b'}),row({customer_ref:'d'}),row({renewal_date:'2028-01-15'}),row({product_family:'other'})]) {
    const text=csv(row(),second); const result=reviewCaseSelection(text,'s');
    assert.equal(result.matchCount,2); assert.equal(result.subject,null); assert.equal(result.canConfirm,false); assert.equal(result.uncertainty[0].code,'ambiguous-rows');
    assert.equal(result.candidates.length,2); assert.throws(()=>confirmCaseSelection(text,'s'));
  }
});
test('maximum duplicate resource bound preserves true count with bounded previews and no chooser', () => {
  const result=reviewCaseSelection(csv(...Array.from({length:5000},()=>row())),'s');
  assert.equal(result.matchCount,5000); assert.equal(result.candidates.length,20); assert.equal(result.status,'unresolved');
  assert.equal(result.candidates[19].recordNumber,20); assert.equal(result.subject,null);
});
test('absent and invalid selectors retain no fabricated source evidence or authority', () => {
  for (const id of ['absent','',null,undefined,12,{},'s\u034f','x'.repeat(129)]) {
    const result=reviewCaseSelection(source,id); assert.equal(result.subject,null); assert.equal(result.canConfirm,false); assert.equal(result.matchCount,0); assert.throws(()=>confirmCaseSelection(source,id));
  }
});
test('forged, cloned, serialized, primitive or accessor receipts cannot claim confirmation', () => {
  let reads=0; const getter={get confirmed(){reads++;return true;}};
  const receipt=confirmCaseSelection(source,'s');
  for(const fake of [undefined,null,true,1,'confirmed',{},getter,{confirmed:true},structuredClone(receipt),JSON.parse(JSON.stringify(receipt))]) assert.equal(reviewCaseSelection(source,'s',fake).status,'candidate');
  assert.equal(reads,0); assert.throws(()=>{receipt.authenticated=true;});
});
test('receipt binds exact source state and selector, including unrelated rows and lexical changes', () => {
  const receipt=confirmCaseSelection(source,'s');
  for(const changed of [source+'\n',source.replace('Microsoft 365','Different'),csv(row(),row({subscription_id:'other'})),source.replace('"a"','" a "'),source.replace('2027-01-15','2028-01-15')]) assert.notEqual(reviewCaseSelection(changed,'s',receipt).status,'confirmed');
  assert.equal(reviewCaseSelection(source,' s ',receipt).status,'candidate');
});
test('canonical uncertainty, previews and readiness cannot be projected or mutated into authority', () => {
  for(const text of [source,csv(row({source_account_id:''})),csv(row(),row())]) {
    const original=selectCaseSubject(text,'s');
    for(const [key,value] of [['status','confirmed'],['canConfirm',!original.canConfirm],['uncertainty',[]],['matchCount',99],['candidates',[{recordNumber:999}]]]) {
      const altered=structuredClone(original); altered[key]=value;
      if(JSON.stringify(altered)!==JSON.stringify(original)) assert.throws(()=>assertCaseSubject(altered,text,'s'));
    }
    assert.ok(Object.isFrozen(original.uncertainty)); assert.ok(Object.isFrozen(original.candidates));
  }
});
test('source correction establishes a new candidate but does not inherit confirmation', () => {
  const incomplete=csv(row({source_account_id:''})); assert.equal(reviewCaseSelection(incomplete,'s').status,'unresolved');
  const duplicate=csv(row(),row()); assert.equal(reviewCaseSelection(duplicate,'s').status,'unresolved');
  assert.equal(reviewCaseSelection(source,'s').status,'candidate');
  assert.equal(reviewCaseSelection(source,'s',confirmCaseSelection(source,'s')).status,'confirmed');
});
test('missing optional namespace remains parseable and inspectable but blocks source confirmation', () => {
  const text=PAX8_COLUMNS.join(',')+'\ns,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew';
  const result=reviewCaseSelection(text,'s'); assert.equal(result.status,'unresolved'); assert.equal(result.subject.evidence.fields.length,9); assert.equal(result.uncertainty[0].code,'missing-account');
});

test('selection review assertion independently validates readiness, state, evidence and private confirmation', () => {
  const receipt=confirmCaseSelection(source,'s'); const original=reviewCaseSelection(source,'s',receipt);
  assert.deepEqual(assertCaseSelectionReview(original,source,'s',receipt),original);
  assert.throws(()=>assertCaseSelectionReview(original,source,'s',structuredClone(receipt)));
  for(const [key,value] of [['status','candidate'],['canConfirm',false],['authenticated',true],['matchCount',2],['uncertainty',[{code:'fake'}]]]) {
    const changed=structuredClone(original);changed[key]=value;assert.throws(()=>assertCaseSelectionReview(changed,source,'s',receipt));
  }
  const changed=structuredClone(original);changed.subject.identity.sourceAccountId='FORGED';assert.throws(()=>assertCaseSelectionReview(changed,source,'s',receipt));
  let reads=0;const getter=structuredClone(original);Object.defineProperty(getter,'canConfirm',{enumerable:true,get(){reads++;return true;}});
  assert.throws(()=>assertCaseSelectionReview(getter,source,'s',receipt));assert.equal(reads,0);
});
