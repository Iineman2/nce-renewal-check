import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateFit, evaluateEarlyOutside, POLICY_VERSION } from './fit.mjs';
import { inspectRecords, PAX8_COLUMNS, HALO_COLUMNS } from './preflight.mjs';
import { scopeValues } from './claims.mjs';

const today = '2026-09-30';
const base = { reseller: 'yes', distributor: 'pax8', billing: 'halopsa', commitment: 'annual-m365-nce', renewal: 'exact', renewalDate: '2026-10-15', agreement: 'yes' };
const paxRow = { subscription_id: 'sub-1', customer_ref: 'customer-a', distributor: 'pax8', product_family: 'Microsoft 365', commerce_model: 'NCE', seat_based: 'yes', commitment_term: 'annual', renewal_date: '2026-10-15', end_of_term_state: 'renew' };
const haloRow = { line_id: 'line-1', subscription_id: 'sub-1', customer_ref: 'customer-a', billing_system: 'HaloPSA' };
const csv = row => `${Object.keys(row).join(',')}\n${Object.values(row).join(',')}\n`;
const raw = (changes = {}) => inspectRecords({ pax8Text: csv(paxRow), haloText: csv(haloRow), subscriptionId: 'sub-1', today, answers: base, renewalTerm: 'annual', ...changes });
function checked(changes = {}, choices = {}) {
  let result = raw(changes);
  if (result.status === 'needs-record-link-confirmation') {
    changes = { ...changes, linkConfirmation: { confirmed: true, basis: result.reviewBasis } };
    result = raw(changes);
  }
  const resolutions = Object.fromEntries(Object.entries(choices).map(([key, choice]) => {
    const conflict = result.conflicts.find(item => item.key === key);
    assert.ok(conflict, `Missing ${key} conflict`);
    return [key, { choice, questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: result.reviewBasis }];
  }));
  return Object.keys(resolutions).length ? raw({ ...changes, resolutions }) : result;
}
const field = (result, key) => result.claimReview.fields.find(item => item.key === key);
function frozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value));
  for (const child of Object.values(value)) frozen(child);
}
function invariants(result, answers) {
  const review = result.claimReview;
  frozen(review);
  assert.deepEqual(review.originalInputs, scopeValues(answers));
  assert.equal(review.policyVersion, POLICY_VERSION);
  for (const key of ['authenticated', 'freshnessVerified', 'actionAuthorized']) assert.equal(review[key], false);
  assert.equal(review.financialVerdict, null);
  for (const item of review.fields) {
    assert.equal(item.authenticated, false);
    if (item.supplied) assert.equal(item.supplied.authenticated, false);
    assert.ok(item.effective.origin.reason);
    if (review.scopeInputs && item.key in review.scopeInputs) assert.equal(item.effective.value, review.scopeInputs[item.key]);
  }
  if (review.contributors) {
    assert.equal(evaluateFit(review.scopeInputs, { today }).status, review.contributors.scopeRuleStatus);
    assert.equal(review.contributors.recordResultStatus, result.status);
    assert.equal(review.checkBasis, result.reviewBasis);
  }
}

test('questionnaire trail preserves every categorical state without truth escalation', () => {
  let cases = 0;
  for (const reseller of ['yes', 'no', 'unknown'])
    for (const distributor of ['pax8', 'other', 'unknown'])
      for (const billing of ['halopsa', 'other', 'unknown'])
        for (const commitment of ['annual-m365-nce', 'monthly', 'other', 'unknown'])
          for (const renewal of ['exact', 'within-60-approx', 'unknown'])
            for (const agreement of ['yes', 'no', 'unknown', 'not-asked']) {
              const answers = { ...base, reseller, distributor, billing, commitment, renewal, agreement };
              const result = evaluateFit(answers, { today });
              invariants(result, answers);
              assert.deepEqual(result.claimReview.scopeInputs, answers);
              assert.equal(field(result, 'renewal').original.state, renewal === 'exact' ? 'known' : renewal === 'unknown' ? 'unknown' : 'approximate');
              assert.equal(field(result, 'agreement').original.source, 'preparation-self-report');
              cases++;
            }
  assert.equal(cases, 1296);
});

test('early exits exclude retained later responses; expired policy excludes all', () => {
  const keys = ['reseller', 'distributor', 'billing', 'commitment'];
  for (let through = 0; through < 4; through++) {
    const answers = { ...base, [keys[through]]: through === 0 ? 'no' : 'other' };
    const result = evaluateEarlyOutside(answers, { through, today });
    invariants(result, answers);
    assert.deepEqual(Object.keys(result.claimReview.scopeInputs), keys.slice(0, through + 1));
    for (const item of result.claimReview.fields) {
      assert.equal(item.included, keys.slice(0, through + 1).includes(item.key));
      assert.equal(item.original.value, answers[item.key]);
      if (!item.included) assert.equal(item.effective.state, 'not-assessed');
    }
    const expired = evaluateEarlyOutside(answers, { through, today: '2027-01-01' });
    assert.equal(expired.claimReview.scopeInputs, null);
    assert.ok(expired.claimReview.fields.every(item => !item.included));
  }
  const expired = evaluateFit(base, { today: '2027-01-01' });
  assert.equal(expired.claimReview.scopeInputs, null);
  assert.ok(expired.claimReview.fields.every(item => item.effective.origin.reason === 'policy-blocked'));
});

test('record field matrix follows each source and conflict branch with explicit expected inputs', () => {
  const scenarios = [
    { key: 'distributor', supported: 'pax8', outside: 'other', system: 'Pax8', recordKey: 'distributor', supplied: ['pax8', 'other', ''] },
    { key: 'billing', supported: 'halopsa', outside: 'other', system: 'HaloPSA', recordKey: 'billing_system', supplied: ['HaloPSA', 'other', ''] },
    { key: 'commitment', supported: 'annual-m365-nce', outside: 'monthly', system: 'Pax8', recordKey: 'commitment_term', supplied: ['annual', 'monthly', ''] },
  ];
  let cases = 0;
  for (const scenario of scenarios) {
    for (const response of [scenario.supported, scenario.outside, 'unknown']) {
      for (let supplied = 0; supplied < 3; supplied++) {
        const answers = { ...base, [scenario.key]: response };
        const row = { ...(scenario.system === 'HaloPSA' ? haloRow : paxRow), [scenario.recordKey]: scenario.supplied[supplied] };
        const changes = { answers, [scenario.system === 'HaloPSA' ? 'haloText' : 'pax8Text']: csv(row) };
        const suppliedValue = [scenario.supported, scenario.outside, 'unknown'][supplied];
        const conflict = supplied < 2 && response !== 'unknown' && response !== suppliedValue;
        for (const choice of conflict ? ['unresolved', 'accept-file', 'keep-answer'] : ['none']) {
          const result = checked(changes, ['accept-file', 'keep-answer'].includes(choice) ? { [scenario.key]: choice } : {});
          invariants(result, answers);
          const item = field(result, scenario.key);
          const expected = supplied === 2 ? response === scenario.outside ? response : 'unknown'
            : conflict ? choice === 'accept-file' ? suppliedValue : 'unknown' : suppliedValue;
          const reason = supplied === 2 ? response === scenario.outside ? 'outside-response-retained' : 'source-unavailable'
            : conflict ? { unresolved: 'conflict-unresolved', 'accept-file': 'file-accepted', 'keep-answer': 'answer-kept' }[choice]
              : response === 'unknown' ? 'file-informs-unknown' : 'file-agrees';
          assert.equal(item.original.value, response);
          assert.equal(item.supplied.value, suppliedValue);
          assert.equal(item.supplied.system, scenario.system);
          assert.equal(item.effective.value, expected);
          assert.equal(item.effective.origin.reason, reason);
          assert.equal(item.reviewChoice, choice);
          assert.equal(answers[scenario.key], response);
          cases++;
        }
      }
    }
  }
  assert.equal(cases, 39);
});

test('renewal date matrix preserves approximation, exact self-report and explicit conflicting choices', () => {
  for (const renewal of ['exact', 'within-60-approx', 'unknown']) {
    for (const supplied of ['2026-10-15', '2026-10-20', '', 'bad-date']) {
      const answers = { ...base, renewal, renewalDate: renewal === 'exact' ? base.renewalDate : undefined };
      const changes = { answers, pax8Text: csv({ ...paxRow, renewal_date: supplied }) };
      const valid = supplied.startsWith('2026');
      const conflict = renewal === 'exact' && valid && supplied !== base.renewalDate;
      for (const choice of conflict ? ['unresolved', 'accept-file', 'keep-answer'] : ['none']) {
        const result = checked(changes, ['accept-file', 'keep-answer'].includes(choice) ? { renewalDate: choice } : {});
        invariants(result, answers);
        const date = field(result, 'renewalDate');
        const response = field(result, 'renewal');
        const expectedDate = !valid ? answers.renewalDate : conflict && choice !== 'accept-file' ? undefined : supplied;
        const expectedRenewal = !valid ? renewal : conflict && choice !== 'accept-file' ? 'unknown' : 'exact';
        assert.equal(date.effective.value, expectedDate);
        assert.equal(response.effective.value, expectedRenewal);
        assert.equal(date.original.value, answers.renewalDate);
        assert.equal(response.original.value, renewal);
        if (date.included) assert.deepEqual(date.effective.origin, response.effective.origin);
        if (conflict && choice !== 'accept-file') assert.equal(date.effective.state, 'unknown');
        if (!valid && renewal !== 'exact') assert.equal(date.effective.state, 'not-assessed');
        assert.equal(date.reviewChoice, choice);
      }
    }
  }
});

test('economic guard supersedes an accepted commitment while preserving choice and contributors', () => {
  const answers = { ...base, commitment: 'monthly' };
  const result = checked({ answers, pax8Text: csv({ ...paxRow, scheduled_commitment_term: 'monthly' }) }, { commitment: 'accept-file' });
  invariants(result, answers);
  const item = field(result, 'commitment');
  assert.equal(item.original.value, 'monthly');
  assert.equal(item.supplied.value, 'annual-m365-nce');
  assert.equal(item.reviewChoice, 'accept-file');
  assert.equal(item.effective.value, 'unknown');
  assert.equal(item.effective.origin.kind, 'scope-guard');
  assert.equal(item.effective.origin.reason, 'economic-guard');
  assert.equal(result.status, 'needs-verification');
  assert.ok(result.claimReview.contributors.economicIssues.length >= 1);
  assert.equal(field(result, 'renewalTerm').supplied.value, 'monthly');
  assert.equal(field(result, 'renewalTerm').effective.value, 'annual');
  assert.equal(field(result, 'renewalTerm').original.source, 'record-stage-self-report');
});

test('all record-stage self-report and end-state contributors remain distinct', () => {
  for (const reseller of ['yes', 'no', 'unknown'])
    for (const agreement of ['yes', 'no', 'unknown', 'not-asked'])
      for (const renewalTerm of ['annual', 'monthly', 'other', 'unknown', 'not-asked'])
        for (const endState of ['renew', 'cancel', 'extended', 'unknown', '', 'n/a', 'invented']) {
          const answers = { ...base, reseller, agreement };
          const result = checked({ answers, renewalTerm, pax8Text: csv({ ...paxRow, end_of_term_state: endState }) });
          invariants(result, answers);
          assert.equal(field(result, 'reseller').effective.origin.kind, 'self-report');
          assert.equal(field(result, 'agreement').supplied, null);
          assert.equal(field(result, 'renewalTerm').effective.origin.kind, 'self-report');
          assert.equal(field(result, 'endState').effective.origin.kind, 'supplied-csv');
          assert.equal(result.claimReview.contributors.endState.value, endState);
          const expectedState = ['renew', 'cancel', 'extended'].includes(endState) ? 'known' : endState === 'invented' ? 'unrecognized' : 'unknown';
          assert.equal(field(result, 'endState').effective.state, expectedState);
          assert.equal(result.claimReview.contributors.endState.state, expectedState);
          assert.equal(result.claimReview.contributors.nextTerm.scheduledProvided, false);
        }
});

test('inactive retained dates are snapshots of input, not dates evaluated by the scope rules', () => {
  for (const renewal of ['unknown', 'within-60-approx']) {
    const answers = { ...base, renewal };
    const question = evaluateFit(answers, { today });
    assert.equal(question.claimReview.scopeInputs.renewalDate, base.renewalDate);
    assert.equal(field(question, 'renewalDate').original.value, base.renewalDate);
    assert.equal(field(question, 'renewalDate').included, false);
    assert.equal(field(question, 'renewalDate').effective.state, 'not-assessed');
    const result = checked({ answers, pax8Text: csv({ ...paxRow, renewal_date: '' }) });
    assert.equal(result.claimReview.scopeInputs.renewalDate, base.renewalDate);
    assert.equal(field(result, 'renewalDate').included, false);
    assert.equal(field(result, 'renewalDate').effective.state, 'not-assessed');
    assert.equal(field(result, 'renewalDate').effective.origin.reason, 'not-assessed');
    assert.equal(field(result, 'renewal').effective.value, renewal);
    assert.equal(result.status, 'needs-verification');
  }
});

test('unusable identity, link and policy stages cannot masquerade as completed preflight', () => {
  for (const changes of [{ subscriptionId: '' }, { subscriptionId: 'absent' }, { pax8Text: csv(paxRow) + Object.values(paxRow).join(',') + '\n' }]) {
    const result = raw(changes);
    assert.equal(result.claimReview.stage, 'identity-blocked');
    assert.equal(result.claimReview.scopeInputs, null);
    assert.deepEqual(result.claimReview.fields, []);
  }
  const absent = raw({ haloText: csv({ ...haloRow, subscription_id: 'another' }) });
  assert.equal(absent.claimReview.stage, 'link-blocked');
  assert.equal(absent.claimReview.scopeInputs, null);
  const pending = raw();
  assert.equal(pending.claimReview.usage, 'comparison-only');
  assert.equal(pending.claimReview.contributors.identity.linkState, 'awaiting-confirmation');
  const mismatch = raw({ haloText: csv({ ...haloRow, customer_ref: 'another' }) });
  assert.equal(mismatch.claimReview.usage, 'comparison-only');
  assert.equal(mismatch.claimReview.contributors.identity.linkState, 'unusable');
  const expired = raw({ today: '2027-01-01', pax8Text: 'invalid', haloText: 'invalid' });
  assert.equal(expired.claimReview.stage, 'policy-blocked');
  assert.equal(expired.claimReview.scopeInputs, null);
});

test('snapshots are recursively frozen, detached from callers and do not mutate inputs', () => {
  const answers = { ...base, distributor: 'other' };
  const before = structuredClone(answers);
  const result = checked({ answers }, { distributor: 'accept-file' });
  invariants(result, answers);
  assert.deepEqual(answers, before);
  answers.distributor = 'unknown';
  result.provenance.distributor.raw[0] = 'changed';
  result.conflicts[0].resolution = 'keep-answer';
  assert.equal(field(result, 'distributor').original.value, 'other');
  assert.equal(field(result, 'distributor').supplied.raw[0], 'pax8');
  assert.equal(field(result, 'distributor').reviewChoice, 'accept-file');
  assert.throws(() => { result.claimReview.fields[0].original.value = 'no'; }, TypeError);
  const questionAnswers = { ...base };
  const question = evaluateFit(questionAnswers, { today });
  questionAnswers.renewalDate = '2026-12-30';
  assert.equal(question.claimReview.scopeInputs.renewalDate, '2026-10-15');
});

test('raw evidence, answer, date, term, agreement and identity changes reject bound review choices', () => {
  const answers = { ...base, distributor: 'other' };
  const accepted = checked({ answers }, { distributor: 'accept-file' });
  const conflict = accepted.conflicts[0];
  const resolutions = { distributor: { choice: 'accept-file', questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: accepted.reviewBasis } };
  for (const changes of [
    { pax8Text: csv({ ...paxRow, distributor: 'PAX8' }) },
    { answers: { ...answers, agreement: 'no' } },
    { answers: { ...answers, reseller: 'unknown' } },
    { today: '2026-10-01' }, { renewalTerm: 'unknown' },
    { haloText: csv({ ...haloRow, line_id: 'line-2' }) },
  ]) assert.throws(() => raw({ answers, resolutions, ...changes }), /stale/);
  assert.deepEqual(PAX8_COLUMNS, Object.keys(paxRow));
  assert.deepEqual(HALO_COLUMNS, Object.keys(haloRow));
});
