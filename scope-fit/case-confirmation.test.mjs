import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmCaseSelection, revokeCaseSelectionConfirmation, reviewCaseSelection, assertCaseSelectionReview } from './preflight.mjs';
const row = (changes = {}) => ({ source_account_id: 'a', subscription_id: 's', customer_ref: 'c', distributor: 'pax8', product_family: 'Microsoft 365', commerce_model: 'NCE', seat_based: 'yes', commitment_term: 'annual', renewal_date: '2027-01-15', end_of_term_state: 'renew', ...changes });
const csv = (...rows) => Object.keys(rows[0]).join(',') + '\n' + rows.map(r => Object.values(r).map(v => '"' + v.replaceAll('"', '""') + '"').join(',')).join('\n');
const source = csv(row());
const passed = [];
const gate = (id, name, fn) => test(id + ' ' + name, async () => { await fn(); passed.push(id); });
test.after(() => console.log('P6-MODEL-ASSERTIONS:' + JSON.stringify({ source: 'scope-fit/case-confirmation.test.mjs', assertions: passed.sort() })));

gate('P6-M01', 'candidate needs explicit unauthenticated attestation', () => {
  assert.equal(reviewCaseSelection(source, 's').status, 'candidate');
  const receipt = confirmCaseSelection(source, 's');
  assert.equal(reviewCaseSelection(source, 's', receipt).status, 'confirmed');
  assert.equal(receipt.authenticated, false); assert.ok(Object.isFrozen(receipt));
});
gate('P6-M02', 'every identity and occurrence field is source-bound', () => {
  const receipt = confirmCaseSelection(source, 's');
  for (const changes of [{source_account_id:'b'}, {customer_ref:'d'}, {subscription_id:'other'}, {renewal_date:'2028-01-15'}]) {
    const changed = csv(row(changes));
    assert.notEqual(reviewCaseSelection(changed, changes.subscription_id || 's', receipt).status, 'confirmed');
  }
});
gate('P6-M03', 'all selected descriptive and scope cells are bound', () => {
  const receipt = confirmCaseSelection(source, 's');
  for (const changes of [{product_family:'Different'}, {distributor:'other'}, {commerce_model:'other'}, {seat_based:'no'}, {commitment_term:'monthly'}, {end_of_term_state:'stop'}]) assert.notEqual(reviewCaseSelection(csv(row(changes)), 's', receipt).status, 'confirmed');
});
gate('P6-M04', 'lexical bytes and unrelated records are evidence state', () => {
  const receipt = confirmCaseSelection(source, 's');
  for (const changed of [source + '\n', source.replaceAll('\n', '\r\n'), '\uFEFF' + source, source.replace('"a"','" a "'), csv(row(), row({subscription_id:'other'}))]) assert.notEqual(reviewCaseSelection(changed, 's', receipt).status, 'confirmed');
});
gate('P6-M05', 'selector is exact and other record never inherits', () => {
  const text = csv(row(),row({subscription_id:'other'})); const receipt = confirmCaseSelection(text,'s');
  for (const id of [' s ', 'other']) assert.equal(reviewCaseSelection(text,id,receipt).status,'candidate');
});
gate('P6-M06', 'unresolved and duplicate sources cannot confirm', () => {
  for (const text of [csv(row({source_account_id:''})),csv(row({customer_ref:''})),csv(row({renewal_date:''})),csv(row(),row())]) {
    assert.throws(() => confirmCaseSelection(text,'s')); assert.notEqual(reviewCaseSelection(text,'s',confirmCaseSelection(source,'s')).status,'confirmed');
  }
});
gate('P6-M07', 'clone serialized and forged receipts have no authority', () => {
  const receipt = confirmCaseSelection(source,'s');
  for(const fake of [structuredClone(receipt),JSON.parse(JSON.stringify(receipt)),{},true,'confirmed',null]) assert.equal(reviewCaseSelection(source,'s',fake).status,'candidate');
});
gate('P6-M08', 'revocation permanently removes old authority', () => {
  const receipt = confirmCaseSelection(source,'s'); revokeCaseSelectionConfirmation(receipt);
  assert.equal(reviewCaseSelection(source,'s',receipt).status,'candidate');
  reviewCaseSelection(csv(row({source_account_id:'b'})),'s',receipt);
  assert.equal(reviewCaseSelection(source,'s',receipt).status,'candidate');
});
gate('P6-M09', 'revocation is idempotent and never reads token fields', () => {
  let reads=0; const fake=new Proxy({}, {get(){reads++;throw Error('accessor');}});
  for(const value of [fake,null,undefined,true,1,'x',Symbol('token')]) {revokeCaseSelectionConfirmation(value);revokeCaseSelectionConfirmation(value);}
  assert.equal(reads,0);
});
gate('P6-M10', 'independent receipt remains live when sibling revoked', () => {
  const old=confirmCaseSelection(source,'s'), fresh=confirmCaseSelection(source,'s');
  revokeCaseSelectionConfirmation(old); assert.equal(reviewCaseSelection(source,'s',old).status,'candidate'); assert.equal(reviewCaseSelection(source,'s',fresh).status,'confirmed');
});
gate('P6-M11', 'stale confirmed projection cannot survive revocation', () => {
  const receipt=confirmCaseSelection(source,'s'); const projection=reviewCaseSelection(source,'s',receipt);
  revokeCaseSelectionConfirmation(receipt); assert.throws(()=>assertCaseSelectionReview(projection,source,'s',receipt));
  const fresh=reviewCaseSelection(source,'s',receipt); assert.deepEqual(assertCaseSelectionReview(fresh,source,'s',receipt),fresh);
});
gate('P6-M12', 'fresh attestation recovers without reviving old receipt', () => {
  const old=confirmCaseSelection(source,'s');revokeCaseSelectionConfirmation(old);
  const changed=csv(row({source_account_id:'b'}));const receipt=confirmCaseSelection(changed,'s');
  assert.equal(reviewCaseSelection(changed,'s',receipt).status,'confirmed'); assert.equal(reviewCaseSelection(source,'s',old).status,'candidate');
  assert.equal(reviewCaseSelection(source,'s',receipt).status,'candidate');
});
