import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFit, evaluateEarlyOutside, POLICY_VERSION } from './fit.mjs';
import { inspectRecords, parseCsv, rawCells } from './preflight.mjs';
import { frozenSnapshot, assertClaimReview } from './claims.mjs';

const today = '2026-09-30';
const answers = { reseller: 'yes', distributor: 'pax8', billing: 'halopsa', commitment: 'annual-m365-nce', renewal: 'exact', renewalDate: '2026-10-15', agreement: 'yes' };
const pax = 'subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\ns,c,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew\n';
const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
const input = { answers, today, pax8Text: pax, haloText: halo, subscriptionId: 's', renewalTerm: 'annual' };
const validate = (result, type = 'record') => assertClaimReview(result.claimReview, { type, policyVersion: POLICY_VERSION, today, status: result.status });

test('G1 descriptor capture rejects getters without invoking them and stabilizes proxies/options', () => {
  let calls = 0;
  const value = { ...answers }; Object.defineProperty(value, 'reseller', { get: () => { calls++; return 'yes'; }, enumerable: true });
  assert.throws(() => evaluateFit(value, { today }), /accessor/); assert.equal(calls, 0);
  assert.throws(() => evaluateEarlyOutside(value, { today, through: 0 }), /accessor/); assert.equal(calls, 0);
  let descriptors = 0;
  const proxy = new Proxy({ ...answers }, { getOwnPropertyDescriptor(target, key) { const descriptor = Reflect.getOwnPropertyDescriptor(target, key); if (key === 'reseller') { descriptor.value = ++descriptors === 1 ? 'yes' : 'no'; } return descriptor; } });
  const result = evaluateFit(proxy, { today });
  assert.equal(descriptors, 1); assert.equal(result.status, 'looks-in-scope'); assert.equal(result.claimReview.scopeInputs.reseller, 'yes');
  for (const key of ['today', 'policyReviewBy']) {
    const options = { today }; Object.defineProperty(options, key, { get: () => { calls++; return today; } });
    assert.throws(() => evaluateFit(answers, options), /accessor/);
  }
  const choice = {}; Object.defineProperty(choice, 'choice', { enumerable: true, get: () => { calls++; return 'accept-file'; } });
  assert.throws(() => inspectRecords({ ...input, resolutions: { distributor: choice } }), /accessor/); assert.equal(calls, 0);
  const confirmation = {}; Object.defineProperty(confirmation, 'basis', { get: () => { calls++; return 'x'; } });
  assert.throws(() => inspectRecords({ ...input, linkConfirmation: confirmation }), /accessor/); assert.equal(calls, 0);
});

test('G2 scalar input and snapshot limits reject mutable/exotic/cyclic shapes with controlled errors', () => {
  const cyclic = {}; cyclic.self = cyclic;
  const fn = () => {}; fn.label = 'before';
  const deep = {}; let cursor = deep; for (let index = 0; index < 20; index++) { cursor.child = {}; cursor = cursor.child; }
  for (const value of [cyclic, deep, fn, new Date(), new Map(), new Set(), [1], Symbol('x'), Infinity]) {
    assert.throws(() => evaluateFit({ ...answers, renewal: 'unknown', renewalDate: value }, { today }), TypeError);
    if (!Array.isArray(value)) assert.throws(() => frozenSnapshot(value), TypeError);
  }
  assert.throws(() => frozenSnapshot(new Array(3)), /dense/);
  assert.throws(() => frozenSnapshot({ [Symbol('x')]: 'value' }), /symbol/);
  assert.throws(() => frozenSnapshot(Array.from({ length: 10001 }, () => 'x')), /bounded|limit/);
  const plain = Object.create(null); Object.assign(plain, answers); assert.equal(evaluateFit(plain, { today }).status, 'looks-in-scope');
});

test('G3 decoded raw cell fidelity and exact selected evidence binding survive normalization', () => {
  const response = { ...answers, distributor: 'other' };
  const first = inspectRecords({ ...input, answers: response });
  const conflict = first.conflicts[0];
  const reviewed = { ...input, answers: response, linkConfirmation: { confirmed: true, basis: first.reviewBasis },
    resolutions: { distributor: { choice: 'accept-file', questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: first.reviewBasis } } };
  assert.equal(inspectRecords(reviewed).status, 'supplied-claims-look-in-scope');
  assert.throws(() => inspectRecords({ ...reviewed, pax8Text: pax.replace(',pax8,', ',  pax8  ,') }), /stale/);
  const changed = inspectRecords({ ...input, pax8Text: pax.replace(',pax8,', ',  pax8  ,') });
  assert.equal(changed.fileClaims.distributor, 'pax8'); assert.equal(changed.provenance.distributor.raw[0], '  pax8  ');
  assert.notEqual(changed.reviewBasis, first.reviewBasis);
  const rows = parseCsv('a,b\n"  value  ","one,two"\n', ['a', 'b']);
  assert.equal(rows[0].a, 'value'); assert.equal(rawCells(rows[0]).a, '  value  '); assert.equal(rawCells(rows[0]).b, 'one,two');
  assert.ok(Object.isFrozen(rawCells(rows[0])));
});

test('parser metadata/resources and trace basis exclude unrelated extra columns', () => {
  for (const header of [Array.from({ length: 65 }, (_, index) => `h${index}`).join(','), 'x'.repeat(65), 'a,']) {
    assert.throws(() => parseCsv(`${header}\n${header.split(',').map(() => 'x').join(',')}\n`, ['a']), /headers/);
  }
  const extra = pax.replace('end_of_term_state\n', 'end_of_term_state,private_note\n').replace(',renew\n', ',renew,UNRELATED-SECRET\n');
  const result = inspectRecords({ ...input, pax8Text: extra });
  assert.ok(!JSON.stringify(result.claimReview).includes('UNRELATED-SECRET'));
  assert.ok(!result.reviewBasis.includes('private_note'));
  const max = `${Array.from({ length: 64 }, (_, index) => `h${index}`).join(',')}\n${Array.from({ length: 64 }, () => 'x').join(',')}\n`;
  assert.equal(Object.keys(parseCsv(max, ['h0'])[0]).length, 64);
  assert.equal(parseCsv('a\n' + 'x\n'.repeat(5000), ['a']).length, 5000);
});

test('G6 mandatory trace schema rejects omissions, corruption, authority and serialized loss', () => {
  const result = evaluateFit(answers, { today }); validate(result, 'questionnaire');
  const mutations = [
    value => { value.originalInputs.reseller = 3; value.scopeInputs.reseller = 3; value.fields[0].original.value = 3; value.fields[0].effective.value = 3; },
    value => { value.schemaVersion = 'other'; }, value => { value.policyVersion = 'old'; }, value => { value.checkedToday = '2026-10-01'; },
    value => { value.authenticated = true; }, value => { value.actionAuthorized = true; }, value => { value.financialVerdict = 'covered'; },
    value => { value.usage = 'verified'; }, value => { value.fields.pop(); }, value => { value.fields[0].effective.origin.kind = 'vendor'; },
    value => { value.fields[0].effective.origin.reason = 'file-agrees'; }, value => { value.fields[0].effective.value = 'no'; },
    value => { value.fields[0].effective.state = 'unknown'; }, value => { value.fields[0].original.source = 'vendor'; },
    value => { value.originalInputs.reseller = 'no'; }, value => { value.stage = 'record-preflight'; },
  ];
  for (const mutate of mutations) { const trace = structuredClone(result.claimReview); mutate(trace); assert.throws(() => validate({ ...result, claimReview: trace }, 'questionnaire'), TypeError); }
  assert.throws(() => validate({ ...result, claimReview: undefined }, 'questionnaire'), TypeError);
  const inactive = evaluateFit({ ...answers, renewal: 'unknown', renewalDate: undefined }, { today });
  assert.throws(() => validate({ ...inactive, claimReview: JSON.parse(JSON.stringify(inactive.claimReview)) }, 'questionnaire'), TypeError);
  for (const changed of [{ ...answers, reseller: 'no' }, { ...answers, distributor: 'unknown' }]) {
    const other = evaluateFit(changed, { today });
    assert.throws(() => validate({ ...result, claimReview: other.claimReview }, 'questionnaire'), TypeError);
  }
  const blocked = evaluateFit(answers, { today, policyReviewBy: '2026-09-29' });
  assert.throws(() => validate({ ...result, claimReview: blocked.claimReview }, 'questionnaire'), TypeError);
  const pending = inspectRecords(input); validate(pending);
  for (const mutate of [trace => { delete trace.scopeInputs.reseller; }, trace => { trace.stage = 'questionnaire'; trace.usage = 'provisional-questionnaire-only'; }]) {
    const trace = structuredClone(pending.claimReview); mutate(trace); assert.throws(() => validate({ ...pending, claimReview: trace }), TypeError);
  }
  const broken = structuredClone(pending.claimReview); delete broken.contributors.endState;
  assert.throws(() => validate({ ...pending, claimReview: broken }), TypeError);
});

test('9720 combined review/economic/end-state/agreement/term scenarios have independent status and input oracles', () => {
  const response = { ...answers, distributor: 'other', billing: 'other', commitment: 'monthly', renewalDate: '2026-10-20' };
  let cases = 0;
  for (const economic of [false, true]) for (const end of ['renew', 'cancel', 'unknown'])
    for (const agreement of ['yes', 'no', 'unknown', 'not-asked']) for (const renewalTerm of ['annual', 'monthly', 'other', 'unknown', 'not-asked']) {
      let text = pax.replace(',renew\n', `,${end}\n`);
      if (economic) text = text.replace('end_of_term_state\n', 'end_of_term_state,billing_frequency\n').replace(`,${end}\n`, `,${end},weekly\n`);
      const current = { ...input, answers: { ...response, agreement }, renewalTerm, pax8Text: text };
      const initial = inspectRecords(current);
      for (const a of ['unresolved', 'accept-file', 'keep-answer']) for (const b of ['unresolved', 'accept-file', 'keep-answer'])
        for (const c of ['unresolved', 'accept-file', 'keep-answer']) for (const d of ['unresolved', 'accept-file', 'keep-answer']) {
          const choices = [a, b, c, d];
          const resolutions = Object.fromEntries(initial.conflicts.filter((_, index) => choices[index] !== 'unresolved').map(conflict => {
            const index = initial.conflicts.indexOf(conflict);
            return [conflict.key, { choice: choices[index], questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: initial.reviewBasis }];
          }));
          const result = inspectRecords({ ...current, resolutions, linkConfirmation: { confirmed: true, basis: initial.reviewBasis } }); validate(result);
          const expected = choices.includes('unresolved') ? 'needs-conflict-review' : end === 'cancel' || (!economic && ['monthly', 'other'].includes(renewalTerm)) ? 'outside-this-release' :
            choices.includes('keep-answer') || economic || end === 'unknown' || agreement !== 'yes' || ['unknown', 'not-asked'].includes(renewalTerm) ? 'needs-verification' : 'supplied-claims-look-in-scope';
          assert.equal(result.status, expected);
          assert.equal(result.claimReview.scopeInputs.distributor, a === 'accept-file' ? 'pax8' : 'unknown');
          assert.equal(result.claimReview.scopeInputs.billing, b === 'accept-file' ? 'halopsa' : 'unknown');
          assert.equal(result.claimReview.scopeInputs.commitment, economic || c !== 'accept-file' ? 'unknown' : 'annual-m365-nce');
          assert.equal(result.claimReview.scopeInputs.renewalDate, d === 'accept-file' ? '2026-10-15' : undefined);
          assert.deepEqual(result.claimReview.originalInputs, current.answers);
          assert.equal(result.actionAuthorized, false); assert.equal(result.claimReview.authenticated, false); cases++;
        }
    }
  assert.equal(cases, 9720);
});

test('array non-index holes cannot silently lose metadata and end-state contributors retain decoded raw cells', () => {
  const sparse = new Array(1); sparse[4294967295] = 'lost';
  assert.throws(() => frozenSnapshot(sparse), TypeError);
  const result = inspectRecords({ ...input, pax8Text: pax.replace(',renew\n', ', renew \n') });
  assert.equal(result.claimReview.contributors.endState.raw, ' renew ');
  assert.deepEqual(result.claimReview.fields.find(field => field.key === 'endState').supplied.raw, [' renew ']);
});
