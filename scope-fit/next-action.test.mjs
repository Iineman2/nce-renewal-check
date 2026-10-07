import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateEarlyOutside, evaluateFit, reviewPolicy } from './fit.mjs';
import { inspectRecords, PAX8_COLUMNS, HALO_COLUMNS } from './preflight.mjs';

const today = '2026-09-29';
const answers = {
  reseller: 'yes', distributor: 'pax8', billing: 'halopsa', commitment: 'annual-m365-nce',
  renewal: 'exact', renewalDate: '2026-10-15', agreement: 'yes',
};
const pax = `${PAX8_COLUMNS.join(',')}\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew\n`;
const halo = `${HALO_COLUMNS.join(',')}\nline-1,sub-1,customer-a,HaloPSA\n`;
const record = (changes = {}) => inspectRecords({ pax8Text: pax, haloText: halo, subscriptionId: 'sub-1', today,
  answers, renewalTerm: 'annual', ...changes });
const confirmed = (changes = {}) => {
  const first = record(changes);
  return record({ ...changes, linkConfirmation: { confirmed: true, basis: first.reviewBasis } });
};

function assertAction(result, kind, source) {
  assert.equal(result.nextAction.kind, kind);
  assert.match(result.nextAction.source, source);
  assert.ok(result.nextAction.instruction.length > 35);
  assert.doesNotMatch(result.nextAction.instruction, /undefined|null|safe to (renew|cancel|pay)/i);
  assert.equal(result.actionAuthorized, false);
}

test('every questionnaire route names a next action, source, and correctable condition', () => {
  assertAction(evaluateFit(answers, { today }), 'prepare-records', /Pax8.*HaloPSA/);
  for (const [key, value, source] of [
    ['reseller', 'no', /reseller arrangement/i], ['distributor', 'other', /distributor/i],
    ['billing', 'other', /billing system/i], ['commitment', 'monthly', /Pax8/i],
    ['renewal', 'unknown', /Pax8/i],
  ]) {
    const decision = evaluateFit({ ...answers, [key]: value }, { today });
    assertAction(decision, value === 'unknown' ? 'verify-answer' : 'correct-or-stop', source);
    assert.equal(decision.nextAction.condition, key);
  }
  const mixed = evaluateFit({ ...answers, distributor: 'other', billing: 'unknown' }, { today });
  assertAction(mixed, 'correct-or-stop', /distributor/i);
  assert.equal(mixed.nextAction.condition, 'distributor');
  assert.equal(mixed.needsVerification[0].condition, 'billing');
  const early = evaluateEarlyOutside({ reseller: 'no' }, { through: 0, today });
  assertAction(early, 'correct-or-stop', /reseller arrangement/i);
  assertAction(reviewPolicy({ today: '2027-01-01' }), 'policy-review', /Microsoft.*Pax8.*HaloPSA/);
  assertAction(evaluateEarlyOutside({ reseller: 'no' }, { through: 0, today: '2027-01-01' }),
    'policy-review', /Microsoft.*Pax8.*HaloPSA/);
});

test('all record routes provide an action matched to the first unresolved issue', () => {
  assertAction(record({ subscriptionId: '' }), 'edit-subscription-id', /Pax8/i);
  assertAction(record({ haloText: `${HALO_COLUMNS.join(',')}\nline-1,other,customer-a,HaloPSA\n` }),
    'repair-record-link', /Pax8.*HaloPSA/i);
  assertAction(record(), 'confirm-record-link', /Pax8.*HaloPSA/i);
  const conflict = confirmed({ pax8Text: pax.replace(',pax8,', ',other,') });
  assertAction(conflict, 'resolve-conflict', /Pax8/i);
  assert.match(conflict.nextAction.instruction, /distributor disagreement/i);
  const outside = confirmed({ pax8Text: pax.replace(',renew\n', ',cancel\n') });
  assertAction(outside, 'correct-or-stop', /Pax8/i);
  assert.match(outside.errors.join(' '), /cancel/i);
  const resellerOutside = confirmed({ answers: { ...answers, reseller: 'no' } });
  assertAction(resellerOutside, 'correct-or-stop', /reseller arrangement/i);
  const verify = confirmed({ renewalTerm: 'unknown' });
  assertAction(verify, 'verify-source', /Pax8/i);
  assert.match(verify.nextAction.instruction, /next commitment term/i);
  assert.equal(verify.nextAction.target, 'renewal-term');
  const missingAgreement = confirmed({ answers: { ...answers, agreement: 'not-asked' } });
  assertAction(missingAgreement, 'verify-source', /agreement/i);
  assert.equal(missingAgreement.nextAction.target, 'agreement');
  assertAction(confirmed(), 'continue-outside-prototype', /Pax8.*HaloPSA.*agreement/i);
  assertAction(record({ today: '2027-01-01' }), 'policy-review', /Microsoft.*Pax8.*HaloPSA/);
});

test('record action changes when a source or review decision changes', () => {
  const first = record();
  const positive = confirmed();
  assert.equal(first.nextAction.kind, 'confirm-record-link');
  assert.equal(positive.nextAction.kind, 'continue-outside-prototype');
  const changed = record({ pax8Text: pax.replace('customer-a', 'customer-b') });
  assert.equal(changed.nextAction.kind, 'repair-record-link');
  assert.notEqual(changed.reviewBasis, first.reviewBasis);
});
