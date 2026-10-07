import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateFit, evaluateEarlyOutside, reviewPolicy, POLICY_VERSION } from './fit.mjs';

const today = '2026-09-29';
const base = Object.freeze({
  reseller: 'yes',
  distributor: 'pax8',
  billing: 'halopsa',
  commitment: 'annual-m365-nce',
  renewal: 'exact',
  renewalDate: '2026-10-15',
  agreement: 'yes',
});

const decide = (changes = {}) => evaluateFit({ ...base, ...changes }, { today });

test('all five supported claims yield only a provisional fit', () => {
  const result = decide();
  assert.equal(result.status, 'looks-in-scope');
  assert.equal(result.policyVersion, POLICY_VERSION);
  assert.match(result.nextStep, /compare the source records/i);
  assert.deepEqual(result.unsupported, []);
  assert.deepEqual(result.needsVerification, []);
});

test('agreement preparation is deferred without inventing an unknown scope answer', () => {
  const result = decide({ agreement: 'not-asked' });
  assert.equal(result.status, 'looks-in-scope');
  assert.deepEqual(result.needsVerification, []);
  assert.match(result.preparationTasks.join(' '), /signed customer order or agreement/i);
});

test('monthly invoice frequency does not change a stated annual commitment', () => {
  const annual = decide({ invoiceFrequency: 'monthly' });
  assert.equal(annual.status, 'looks-in-scope');
  assert.deepEqual(annual.unsupported, []);
  const monthlyTerm = decide({ commitment: 'monthly', invoiceFrequency: 'annual' });
  assert.equal(monthlyTerm.status, 'outside-this-release');
  assert.match(monthlyTerm.unsupported.find((item) => item.condition === 'commitment').message, /monthly invoicing alone does not establish a monthly commitment/i);
  assert.match(monthlyTerm.unsupported.find((item) => item.condition === 'commitment').message, /correct this answer if it is annual/i);
  const other = decide({ commitment: 'other' });
  assert.match(other.unsupported.find((item) => item.condition === 'commitment').message, /another product or commitment term/i);
  const unsure = decide({ commitment: 'unknown' });
  assert.equal(unsure.status, 'may-fit-verify');
  assert.match(unsure.needsVerification.find((item) => item.condition === 'commitment').message, /invoice frequency alone cannot establish/i);
});

test('early monthly commitment result explains the invoice distinction', () => {
  const early = evaluateEarlyOutside({ reseller: 'yes', distributor: 'pax8', billing: 'halopsa', commitment: 'monthly' }, { through: 3, today });
  assert.equal(early.status, 'outside-this-release');
  assert.match(early.unsupported[0].message, /monthly invoicing alone does not establish/i);
  assert.equal(early.actionAuthorized, false);
});

test('each decisive early outside answer stops only after a real answered condition', () => {
  const prefix = { reseller: 'yes', distributor: 'pax8', billing: 'halopsa', commitment: 'annual-m365-nce' };
  for (const [through, key, value] of [[0, 'reseller', 'no'], [1, 'distributor', 'other'], [2, 'billing', 'other'], [3, 'commitment', 'monthly'], [3, 'commitment', 'other']]) {
    const result = evaluateEarlyOutside({ ...prefix, [key]: value }, { through, today });
    assert.equal(result.status, 'outside-this-release', key);
    assert.deepEqual(result.unsupported.map((item) => item.condition), [key]);
    assert.equal(result.notAsked.length, 4 - through);
    assert.equal(result.actionAuthorized, false);
    assert.equal(result.financialVerdict, null);
  }
  for (const through of [0, 1, 2, 3]) {
    assert.equal(evaluateEarlyOutside(prefix, { through, today }), null);
    const key = ['reseller', 'distributor', 'billing', 'commitment'][through];
    assert.equal(evaluateEarlyOutside({ ...prefix, [key]: 'unknown' }, { through, today }), null);
  }
});

test('early route preserves policy priority and rejects skipped or invented answers', () => {
  const partial = { reseller: 'no' };
  assert.equal(evaluateEarlyOutside(partial, { through: 0, today: '2027-01-01' }).status, 'policy-review-required');
  assert.throws(() => evaluateEarlyOutside({}, { through: 0, today }), /explicit supported choice/i);
  assert.throws(() => evaluateEarlyOutside(partial, { through: 1, today }), /explicit supported choice/i);
  assert.throws(() => evaluateEarlyOutside(partial, { through: 4, today }), /through must name/i);
  assert.throws(() => evaluateEarlyOutside(partial, { through: 0, today: 'bad' }), /ISO calendar date/i);
});

test('all early answer combinations route only when an answered condition is known unsupported', () => {
  const options = [
    ['yes', 'no', 'unknown'], ['pax8', 'other', 'unknown'],
    ['halopsa', 'other', 'unknown'], ['annual-m365-nce', 'monthly', 'other', 'unknown'],
  ];
  let checked = 0;
  for (const reseller of options[0])
    for (const distributor of options[1])
      for (const billing of options[2])
        for (const commitment of options[3]) {
          const input = { reseller, distributor, billing, commitment };
          for (let through = 0; through < 4; through++) {
            const values = Object.values(input).slice(0, through + 1);
            const knownWrong = values.some((value, index) => value !== options[index][0] && value !== 'unknown');
            const decision = evaluateEarlyOutside(input, { through, today });
            assert.equal(decision?.status ?? null, knownWrong ? 'outside-this-release' : null, JSON.stringify({ input, through }));
            if (decision) assert.equal(decision.notAsked.length, 4 - through);
            checked++;
          }
        }
  assert.equal(checked, 432);
});

for (const [field, value] of [
  ['reseller', 'no'],
  ['distributor', 'other'],
  ['billing', 'other'],
  ['commitment', 'monthly'],
  ['commitment', 'other'],
]) {
  test(`${field}=${value} is outside scope with a named reason`, () => {
    const result = decide({ [field]: value });
    assert.equal(result.status, 'outside-this-release');
    assert.equal(result.unsupported[0].condition, field);
    assert.ok(result.unsupported[0].message.length > 15);
  });
}

for (const field of ['reseller', 'distributor', 'billing', 'commitment', 'renewal', 'agreement']) {
  test(`${field}=unknown requests verification instead of rejection`, () => {
    const result = decide({ [field]: 'unknown' });
    assert.equal(result.status, 'may-fit-verify');
    assert.deepEqual(result.unsupported, []);
    assert.ok(result.needsVerification.some((item) => item.condition === field));
  });
}

test('approximate renewal date cannot yield a positive fit', () => {
  const result = decide({ renewal: 'within-60-approx', renewalDate: undefined });
  assert.equal(result.status, 'may-fit-verify');
  assert.ok(result.needsVerification.some((item) => item.condition === 'renewal'));
});

test('missing signed agreement is a verification task, not a scope rejection', () => {
  const result = decide({ agreement: 'no' });
  assert.equal(result.status, 'may-fit-verify');
  assert.ok(result.needsVerification.some((item) => item.condition === 'agreement'));
});

test('unknown agreement and known missing agreement request different next facts', () => {
  const unknown = decide({ agreement: 'unknown' });
  const missing = decide({ agreement: 'no' });
  assert.match(unknown.needsVerification.find((item) => item.condition === 'agreement').message, /confirm whether/i);
  assert.match(missing.needsVerification.find((item) => item.condition === 'agreement').message, /locate/i);
  assert.equal(unknown.status, 'may-fit-verify');
  assert.equal(missing.status, 'may-fit-verify');
});

test('omitted or unexpected answers cannot silently become unknown', () => {
  assert.throws(() => evaluateFit({ ...base, distributor: undefined }, { today }), /explicit supported choice/i);
  assert.throws(() => evaluateFit({ ...base, billing: '' }, { today }), /explicit supported choice/i);
  assert.throws(() => evaluateFit({ ...base, agreement: null }, { today }), /explicit supported choice/i);
});

test('a known unsupported condition wins over an unrelated unknown', () => {
  const result = decide({ distributor: 'other', billing: 'unknown' });
  assert.equal(result.status, 'outside-this-release');
  assert.ok(result.unsupported.some((item) => item.condition === 'distributor'));
  assert.ok(result.needsVerification.some((item) => item.condition === 'billing'));
});

for (const [date, expected] of [
  ['2026-09-28', 'outside-this-release'],
  ['2026-09-29', 'may-fit-verify'],
  ['2026-11-28', 'looks-in-scope'],
  ['2026-11-29', 'outside-this-release'],
]) {
  test(`renewal ${date} has correct 60-day boundary result`, () => {
    assert.equal(decide({ renewalDate: date }).status, expected);
  });
}

test('calendar arithmetic handles leap day', () => {
  const result = evaluateFit({ ...base, renewalDate: '2028-02-29' }, { today: '2028-02-28', policyReviewBy: '2028-12-31' });
  assert.equal(result.status, 'looks-in-scope');
});

test('stale policy fails closed rather than classifying a case', () => {
  const result = evaluateFit(base, { today: '2027-01-01' });
  assert.equal(result.status, 'policy-review-required');
  assert.ok(result.needsVerification.some((item) => item.condition === 'policy'));
});

test('expired policy can be shown before collecting any questionnaire answer', () => {
  assert.equal(reviewPolicy({ today: '2026-12-31' }), null);
  const decision = reviewPolicy({ today: '2027-01-01' });
  assert.equal(decision.status, 'policy-review-required');
  assert.equal(decision.actionAuthorized, false);
  assert.deepEqual(decision.unsupported, []);
  assert.throws(() => reviewPolicy({ today: 'invalid' }), /ISO calendar date/i);
});

test('invalid dates and choices are rejected rather than silently accepted', () => {
  assert.throws(() => decide({ renewalDate: '2026-02-30' }), TypeError);
  assert.throws(() => decide({ distributor: 'Pax8?' }), TypeError);
  assert.throws(() => evaluateFit(base), TypeError);
});

test('the result never contains a financial or deadline verdict', () => {
  for (const result of [decide(), decide({ reseller: 'unknown' }), decide({ billing: 'other' })]) {
    const output = JSON.stringify(result);
    assert.doesNotMatch(output, /safe deadline|contract is covered|guaranteed savings/i);
    assert.equal(result.decisionKind, 'scope-fit-only');
    assert.equal(result.actionAuthorized, false);
    assert.equal(result.financialVerdict, null);
  }
});

test('every categorical answer combination obeys the scope precedence rules', () => {
  const renewalCases = [
    { renewal: 'exact', renewalDate: '2026-09-28', outside: true },
    { renewal: 'exact', renewalDate: '2026-09-29', outside: false, timeUncertain: true },
    { renewal: 'exact', renewalDate: '2026-10-15', outside: false },
    { renewal: 'exact', renewalDate: '2026-11-28', outside: false },
    { renewal: 'exact', renewalDate: '2026-11-29', outside: true },
    { renewal: 'within-60-approx', renewalDate: undefined, outside: false },
    { renewal: 'unknown', renewalDate: undefined, outside: false },
  ];
  let checked = 0;
  for (const reseller of ['yes', 'no', 'unknown'])
    for (const distributor of ['pax8', 'other', 'unknown'])
      for (const billing of ['halopsa', 'other', 'unknown'])
        for (const commitment of ['annual-m365-nce', 'monthly', 'other', 'unknown'])
          for (const renewalCase of renewalCases)
            for (const agreement of ['yes', 'no', 'unknown']) {
              const input = { reseller, distributor, billing, commitment, agreement, ...renewalCase };
              const outside = reseller === 'no' || distributor === 'other' || billing === 'other' ||
                commitment === 'monthly' || commitment === 'other' || renewalCase.outside;
              const uncertain = reseller === 'unknown' || distributor === 'unknown' || billing === 'unknown' ||
                commitment === 'unknown' || renewalCase.renewal !== 'exact' || renewalCase.timeUncertain || agreement !== 'yes';
              const expected = outside ? 'outside-this-release' : uncertain ? 'may-fit-verify' : 'looks-in-scope';
              assert.equal(decide(input).status, expected, JSON.stringify(input));
              checked++;
            }
  assert.equal(checked, 2268);
});
