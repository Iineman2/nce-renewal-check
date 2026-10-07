import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCaseSubject, assertCaseSubject, PAX8_COLUMNS } from './preflight.mjs';
const row = (id = 's', customer = 'c', date = '2027-01-15') => [id, customer, 'pax8', 'Microsoft 365', 'NCE', 'yes', 'annual', date, 'renew'].join(',');
const csv = (...rows) => PAX8_COLUMNS.join(',') + '\n' + rows.join('\n');
const source = csv(row());
const clone = value => structuredClone(value);

test('canonical assertion accepts reordered coherent projections and returns fresh immutable source truth', () => {
  const original = selectCaseSubject(source, 's');
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  const canonical = assertCaseSubject(reordered, source, 's');
  assert.deepEqual(canonical, original); assert.notEqual(canonical, original);
  assert.ok(Object.isFrozen(canonical.subject.raw));
});
test('projection cannot omit fields, add authority or change structural shape', () => {
  const original = selectCaseSubject(source, 's');
  for (const key of Object.keys(original)) { const value = clone(original); delete value[key]; assert.throws(() => assertCaseSubject(value, source, 's')); }
  for (const key of Object.keys(original.subject)) { const value = clone(original); delete value.subject[key]; assert.throws(() => assertCaseSubject(value, source, 's')); }
  for (const value of [null, [], 1, {}, {...original, actionAuthorized: true}, {...original, subject: []}]) assert.throws(() => assertCaseSubject(value, source, 's'));
});
test('every identity, date, status, source locator and raw field is source-bound', () => {
  const original = selectCaseSubject(source, 's');
  for (const [key, altered] of [['subscriptionId','else'],['customerRef','else'],['renewalDate','2027-01-16'],['product','else'],['commitmentTerm','monthly'],['recordNumber',2],['source','Live authenticated Pax8'],['authenticated',true]]) {
    const value = clone(original); value.subject[key] = altered; assert.throws(() => assertCaseSubject(value, source, 's'), key);
  }
  for (const key of Object.keys(original.subject.raw)) {
    const value = clone(original); value.subject.raw[key] += 'changed'; assert.throws(() => assertCaseSubject(value, source, 's'), key);
  }
  for (const [key, altered] of [['status','confirmed'],['reason','invented']]) { const value = clone(original); value[key] = altered; assert.throws(() => assertCaseSubject(value, source, 's')); }
});
test('unresolved selections and partial subjects cannot be promoted or invented', () => {
  for (const text of [csv(row('other')), csv(row(),row()), csv(row('s','','bad-date'))]) {
    const original = selectCaseSubject(text, 's'); assert.deepEqual(assertCaseSubject(original, text, 's'), original);
    assert.throws(() => assertCaseSubject({...original,status:'selected'},text,'s'));
    assert.throws(() => assertCaseSubject(selectCaseSubject(source,'s'),text,'s'));
  }
});
test('projection capture rejects getters, exotic values and cycles before display', () => {
  let reads=0; const value={get subject(){reads++;return {};}};
  assert.throws(() => assertCaseSubject(value,source,'s')); assert.equal(reads,0);
  const cycle={}; cycle.self=cycle;
  for (const value of [cycle,new Date(),{subject:()=>{}}]) assert.throws(() => assertCaseSubject(value,source,'s'));
});
test('same-ID source replacement or source record reordering invalidates old projection', () => {
  const original=selectCaseSubject(source,'s');
  for (const replacement of [csv(row('s','different')),csv(row('s','c','2027-01-16')),csv(row('other'),row()),source.replace('annual','monthly')]) assert.throws(() => assertCaseSubject(original,replacement,'s'));
  assert.throws(() => assertCaseSubject(original,source,'other'));
});
test('normalization boundaries, case, leading zeros and logical multiline records stay distinct', () => {
  assert.equal(selectCaseSubject(csv(row('001'),row('1')),'001').subject.subscriptionId,'001');
  assert.equal(selectCaseSubject(csv(row('S')),'s').subject,null);
  assert.equal(selectCaseSubject(csv(row(' s '),row('s')),'s').subject,null);
  const text=csv(row('other','"multi\nline"'),row('s','" c,quoted "'));
  const selected=selectCaseSubject(text,'s'); assert.equal(selected.subject.recordNumber,2);
  assert.equal(selected.subject.customerRef,'c,quoted'); assert.equal(selected.subject.raw.customer_ref,' c,quoted ');
  assert.equal(selectCaseSubject(csv(row('s','unknown')),'s').subject.customerRef,'unknown'); // A syntactically valid reference cannot be authenticated by vocabulary.
});
test('maximal combined 1023-row 64-column source supports canonical validation without partial output', () => {
  const extra=Array.from({length:55},(_,i)=>'extra'+i);
  const text=PAX8_COLUMNS.concat(extra).join(',')+'\n'+Array.from({length:1023},(_,i)=>row('s'+i,'c'+i)+','+extra.map(()=> 'x').join(',')).join('\n');
  const selected=selectCaseSubject(text,'s1022');
  assert.equal(assertCaseSubject(selected,text,'s1022').subject.recordNumber,1023);
  assert.equal(Object.keys(selected.subject.raw).length,64);
});
