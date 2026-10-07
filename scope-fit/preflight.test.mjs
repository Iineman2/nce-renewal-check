import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectRecords, parseCsv, PAX8_COLUMNS, HALO_COLUMNS } from './preflight.mjs';

const today = '2026-09-29';
const answers = {
  reseller: 'yes', distributor: 'pax8', billing: 'halopsa',
  commitment: 'annual-m365-nce', renewal: 'exact', renewalDate: '2026-10-15', agreement: 'yes',
};
const pax = `${PAX8_COLUMNS.join(',')}\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew\n`;
const halo = `${HALO_COLUMNS.join(',')}\nline-1,sub-1,customer-a,HaloPSA\n`;
const rawInspect = (changes = {}) => inspectRecords({ pax8Text: pax, haloText: halo, subscriptionId: 'sub-1', today, answers, renewalTerm: 'annual', ...changes });
const inspect = (changes = {}) => {
  const first = rawInspect(changes);
  return first.status === 'needs-record-link-confirmation'
    ? rawInspect({ ...changes, linkConfirmation: { confirmed: true, basis: first.reviewBasis } }) : first;
};
const decide = (changes, choices) => {
  const initial = inspect(changes);
  const resolutions = Object.fromEntries(Object.entries(choices).map(([key, choice]) => {
    const conflict = initial.conflicts.find((item) => item.key === key);
    assert.ok(conflict, `Expected conflict for ${key}`);
    return [key, { choice, questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: initial.reviewBasis }];
  }));
  return inspect({ ...changes, resolutions });
};

test('one matching pair with supported source fields remains only a scope result', () => {
  const result = inspect();
  assert.equal(result.status, 'supplied-claims-look-in-scope');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.verify, []);
  assert.match(result.caveat, /cannot establish vendor authenticity/i);
});

test('commitment term and invoice frequency cannot substitute for one another', () => {
  const extraHeader = `${PAX8_COLUMNS.join(',')},billing_frequency`;
  const annualMonthlyBill = `${extraHeader}\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew,monthly\n`;
  const annual = inspect({ pax8Text: annualMonthlyBill });
  assert.equal(annual.fileClaims.commitment, 'annual-m365-nce');
  assert.equal(annual.status, 'supplied-claims-look-in-scope');
  assert.deepEqual(annual.provenance.commitment.columns, ['product_family', 'commerce_model', 'seat_based', 'commitment_term']);
  assert.deepEqual(annual.provenance.renewalContext.columns, ['billing_frequency']);
  assert.deepEqual(annual.provenance.renewalContext.raw, ['monthly']);
  assert.match(annual.caveat, /commitment_term field, not invoice frequency/i);

  const monthlyAnnualBill = `${extraHeader}\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,monthly,2026-10-15,renew,annual\n`;
  const monthly = inspect({ pax8Text: monthlyAnnualBill, answers: { ...answers, commitment: 'unknown' } });
  assert.equal(monthly.fileClaims.commitment, 'monthly');
  assert.equal(monthly.status, 'needs-verification');
  assert.match(monthly.verify.join(' '), /conflicts with annual billing frequency/i);

  const invoiceOnly = `${extraHeader}\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,billed monthly,2026-10-15,renew,monthly\n`;
  const ambiguous = inspect({ pax8Text: invoiceOnly, answers: { ...answers, commitment: 'unknown' } });
  assert.equal(ambiguous.fileClaims.commitment, 'unknown');
  assert.equal(ambiguous.status, 'needs-verification');
  assert.match(ambiguous.verify.join(' '), /commitment/i);
});

test('contradictory and unknown economic fields block a positive record result', () => {
  const withFields = (fields, values) => `${PAX8_COLUMNS.join(',')},${fields.join(',')}\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew,${values.join(',')}\n`;
  const cases = [
    { fields: ['billing_frequency'], values: ['weekly'], reason: /billing_frequency.*unrecognized/i },
    { fields: ['scheduled_commitment_term'], values: ['monthly'], reason: /scheduled renewal term.*monthly/i },
    { fields: ['scheduled_commitment_term'], values: ['triennial'], reason: /scheduled renewal term.*triennial/i },
    { fields: ['scheduled_commitment_term'], values: ['unknown'], reason: /scheduled renewal commitment term is marked unknown/i },
    { fields: ['scheduled_billing_frequency'], values: ['monthly'], reason: /without a scheduled commitment term/i },
    { fields: ['scheduled_commitment_term', 'scheduled_billing_frequency'], values: ['monthly', 'annual'], reason: /scheduled monthly commitment conflicts/i },
    { fields: ['scheduled_commitment_term'], values: ['annual'], renewalTerm: 'monthly', reason: /reported next term.*conflicts with the supplied scheduled term/i },
    { fields: ['term_start_date', 'term_end_date'], values: ['2026-08-01', '2026-10-14'], reason: /annual term spans 75 days/i },
    { fields: ['term_start_date', 'term_end_date'], values: ['2026-10-14', '2026-08-01'], reason: /ends before it starts/i },
    { fields: ['term_start_date', 'term_end_date'], values: ['2025-10-15', '2026-09-30'], reason: /renewal date does not follow/i },
    { fields: ['term_start_date'], values: ['2025-10-15'], reason: /only one of the current term start and end dates/i },
  ];
  for (const { fields, values, reason, renewalTerm } of cases) {
    const result = inspect({ pax8Text: withFields(fields, values), ...(renewalTerm ? { renewalTerm } : {}) });
    assert.equal(result.status, 'needs-verification', JSON.stringify({ fields, values }));
    assert.match(result.verify.join(' '), reason);
    assert.equal(result.actionAuthorized, false);
  }
  const stable = inspect({ pax8Text: withFields(['scheduled_commitment_term', 'scheduled_billing_frequency'], ['annual', 'monthly']) });
  assert.equal(stable.status, 'supplied-claims-look-in-scope');
});

test('next-renewal term must be distinguished from current term', () => {
  for (const renewalTerm of ['not-asked', 'unknown']) {
    const result = inspect({ renewalTerm });
    assert.equal(result.status, 'needs-verification');
    assert.match(result.verify.join(' '), /commitment term that will apply at the next renewal/i);
  }
  for (const renewalTerm of ['monthly', 'other']) {
    const result = inspect({ renewalTerm });
    assert.equal(result.status, 'outside-this-release');
    assert.match(result.errors.join(' '), /next commitment term/i);
  }
  const currentMonthly = inspect({ renewalTerm: 'annual', answers: { ...answers, commitment: 'unknown' }, pax8Text: pax.replace(',annual,', ',monthly,') });
  assert.equal(currentMonthly.status, 'outside-this-release');
  assert.match(currentMonthly.verify.join(' '), /current term is monthly/i);
  assert.throws(() => rawInspect({ renewalTerm: 'yearly' }), /explicit next-term choice/i);
});

test('next-term and optional source edits invalidate a previous confirmation', () => {
  const source = `${PAX8_COLUMNS.join(',')},billing_frequency\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew,monthly\n`;
  const first = rawInspect({ pax8Text: source });
  assert.equal(first.status, 'needs-record-link-confirmation');
  const confirmation = { confirmed: true, basis: first.reviewBasis };
  assert.equal(rawInspect({ pax8Text: source, linkConfirmation: confirmation }).status, 'supplied-claims-look-in-scope');
  assert.equal(rawInspect({ pax8Text: source, renewalTerm: 'unknown', linkConfirmation: confirmation }).status, 'needs-record-link-confirmation');
  const changed = source.replace(',renew,monthly', ',renew,annual');
  assert.equal(rawInspect({ pax8Text: changed, linkConfirmation: confirmation }).status, 'needs-record-link-confirmation');
});

test('annual term date spans preserve normal and co-termed boundaries', () => {
  const withDates = (start, end, renewal = '2026-10-15') =>
    `${PAX8_COLUMNS.join(',')},term_start_date,term_end_date\nsub-1,customer-a,pax8,Microsoft 365,NCE,yes,annual,${renewal},renew,${start},${end}\n`;
  const standard = inspect({ pax8Text: withDates('2025-10-15', '2026-10-14') });
  assert.equal(standard.status, 'supplied-claims-look-in-scope');
  const shortened = inspect({ pax8Text: withDates('2025-10-16', '2026-10-14') });
  assert.equal(shortened.status, 'needs-verification');
  assert.match(shortened.verify.join(' '), /annual term spans 364 days/i);
  const leapRenewal = '2024-10-15';
  const leap = inspect({ today: '2024-10-01', answers: { ...answers, renewalDate: leapRenewal },
    pax8Text: withDates('2023-10-15', '2024-10-14', leapRenewal) });
  assert.equal(leap.status, 'supplied-claims-look-in-scope');
});

test('known other commitment length is outside rather than unknown', () => {
  for (const term of ['other', 'triennial', 'three-year', '3-year', 'P3Y']) {
    const result = inspect({ pax8Text: pax.replace(',annual,', `,${term},`), answers: { ...answers, commitment: 'unknown' } });
    assert.equal(result.fileClaims.commitment, 'other', term);
    assert.equal(result.status, 'outside-this-release', term);
  }
});

test('contradictory supplied values cannot silently override questionnaire claims', () => {
  const result = inspect({ answers: { ...answers, distributor: 'other', renewalDate: '2026-10-14' } });
  assert.equal(result.status, 'needs-conflict-review');
  assert.equal(result.conflicts.length, 2);
  assert.deepEqual(result.conflicts.map(({ key, resolution }) => [key, resolution]), [['distributor', 'unresolved'], ['renewalDate', 'unresolved']]);
  assert.equal(result.fileClaims.renewalDate, '2026-10-15');
  assert.equal(result.provenance.renewalDate.questionnaire, '2026-10-14');
  assert.deepEqual(result.provenance.renewalDate.columns, ['renewal_date']);
  assert.deepEqual(result.provenance.commitment.raw, ['Microsoft 365', 'NCE', 'yes', 'annual']);
  assert.equal(result.provenance.agreement.file, 'not supplied');
});

test('each material discrepancy requires an explicit current-case choice', () => {
  const changed = { ...answers, distributor: 'other', renewalDate: '2026-10-14' };
  assert.equal(decide({ answers: changed }, { distributor: 'accept-file' }).status, 'needs-conflict-review');
  const accepted = decide({ answers: changed }, { distributor: 'accept-file', renewalDate: 'accept-file' });
  assert.equal(accepted.status, 'supplied-claims-look-in-scope');
  assert.ok(accepted.conflicts.every((conflict) => conflict.resolution === 'accept-file'));
  assert.match(accepted.caveat, /cannot establish vendor authenticity/i);
  const retained = decide({ answers: changed }, { distributor: 'keep-answer', renewalDate: 'accept-file' });
  assert.equal(retained.status, 'needs-verification');
  assert.match(retained.verify.join(' '), /updated Pax8 evidence/i);
});

test('disagreement in each supported source field blocks a positive scope result', () => {
  for (const [key, value] of [['distributor', 'other'], ['billing', 'other'], ['commitment', 'monthly'], ['renewalDate', '2026-10-14']]) {
    const result = inspect({ answers: { ...answers, [key]: value } });
    assert.equal(result.status, 'needs-conflict-review', key);
    assert.deepEqual(result.conflicts.map((conflict) => conflict.key), [key]);
  }
});

test('unsupported supplied value with conflicting positive answer remains under review', () => {
  const changed = pax.replace(',pax8,', ',other,');
  assert.equal(inspect({ pax8Text: changed }).status, 'needs-conflict-review');
  assert.equal(decide({ pax8Text: changed }, { distributor: 'accept-file' }).status, 'outside-this-release');
  assert.equal(decide({ pax8Text: changed }, { distributor: 'keep-answer' }).status, 'needs-verification');
});

test('unknown claims do not create false conflicts and do not become verified facts', () => {
  const result = inspect({ answers: { ...answers, distributor: 'unknown', renewal: 'within-60-approx', renewalDate: undefined } });
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.status, 'supplied-claims-look-in-scope');
  assert.equal(result.provenance.distributor.questionnaire, 'unknown');
  assert.deepEqual(result.informedUnknowns.map((item) => item.key), ['distributor', 'renewalDate']);
  assert.match(result.caveat, /supplied claims/i);
});

test('questionnaire and CSV states preserve unknown versus known false for each decisive file field', () => {
  const fields = [
    { key: 'distributor', supported: 'pax8', unsupported: 'other', source: (value) => ({ pax8Text: pax.replace(',pax8,', `,${value},`) }) },
    { key: 'billing', supported: 'halopsa', unsupported: 'other', source: (value) => ({ haloText: halo.replace(',HaloPSA\n', `,${value}\n`) }) },
    { key: 'commitment', supported: 'annual-m365-nce', unsupported: 'monthly', source: (value) => ({ pax8Text: pax.replace(',annual,', `,${value},`) }), sourceSupported: 'annual' },
  ];
  const expected = {
    supported: { supported: 'supplied-claims-look-in-scope', unsupported: 'needs-conflict-review', unknown: 'supplied-claims-look-in-scope' },
    unsupported: { supported: 'needs-conflict-review', unsupported: 'outside-this-release', unknown: 'outside-this-release' },
    unknown: { supported: 'needs-verification', unsupported: 'outside-this-release', unknown: 'needs-verification' },
  };
  for (const field of fields) {
    for (const fileState of ['supported', 'unsupported', 'unknown']) {
      const sourceValue = fileState === 'supported' ? (field.sourceSupported ?? field.supported) :
        fileState === 'unsupported' ? field.unsupported : 'unknown';
      for (const answerState of ['supported', 'unsupported', 'unknown']) {
        const answerValue = answerState === 'supported' ? field.supported :
          answerState === 'unsupported' ? field.unsupported : 'unknown';
        const result = inspect({ ...field.source(sourceValue), answers: { ...answers, [field.key]: answerValue } });
        assert.equal(result.status, expected[fileState][answerState], `${field.key}: file=${fileState}, answer=${answerState}`);
        if (answerState === 'unknown' && fileState !== 'unknown') {
          assert.deepEqual(result.informedUnknowns.map((item) => item.key), [field.key]);
        }
        if (fileState === 'unknown') {
          assert.match(result.verify.join(' '), new RegExp(field.key));
        }
      }
    }
  }
});

test('known unsupported commitment evidence wins over another missing component', () => {
  const answerUnknown = { ...answers, commitment: 'unknown' };
  const wrongProductMissingTerm = pax.replace('Microsoft 365', 'Azure').replace(',annual,', ',,');
  const monthlyMissingProduct = pax.replace('Microsoft 365', 'unknown').replace(',annual,', ',monthly,');
  for (const changed of [wrongProductMissingTerm, monthlyMissingProduct]) {
    const result = inspect({ pax8Text: changed, answers: answerUnknown });
    assert.equal(result.status, 'outside-this-release');
    assert.notEqual(result.fileClaims.commitment, 'unknown');
  }
});

test('all 81 three-state commitment-component combinations preserve known false over unknown', () => {
  const components = [
    ['Microsoft 365', 'Azure', 'unknown'],
    ['NCE', 'legacy', 'unknown'],
    ['yes', 'no', 'unknown'],
    ['annual', 'monthly', 'unknown'],
  ];
  let checked = 0;
  for (const product of components[0])
    for (const model of components[1])
      for (const seats of components[2])
        for (const term of components[3]) {
          const row = `sub-1,customer-a,pax8,${product},${model},${seats},${term},2026-10-15,renew`;
          const result = inspect({ pax8Text: `${PAX8_COLUMNS.join(',')}\n${row}\n`, answers: { ...answers, commitment: 'unknown' } });
          const knownWrong = product === 'Azure' || model === 'legacy' || seats === 'no';
          const expected = knownWrong ? 'other' : term === 'monthly' ? 'monthly' :
            [product, model, seats, term].includes('unknown') ? 'unknown' : 'annual-m365-nce';
          assert.equal(result.fileClaims.commitment, expected, row);
          assert.equal(result.status, expected === 'unknown' ? 'needs-verification' :
            expected === 'annual-m365-nce' ? 'supplied-claims-look-in-scope' : 'outside-this-release', row);
          checked++;
        }
  assert.equal(checked, 81);
});

test('unknown source tokens remain unknown instead of becoming other', () => {
  for (const token of ['', 'unknown', 'N/A', 'not sure', 'unspecified', 'TBD']) {
    const result = inspect({ pax8Text: pax.replace(',pax8,', `,${token},`) });
    assert.equal(result.fileClaims.distributor, 'unknown', token);
    assert.equal(result.status, 'needs-verification', token);
  }
});

test('exact, approximate, and unknown renewal claims use distinct safe routes', () => {
  const noDate = pax.replace('2026-10-15', 'unknown');
  const farDate = pax.replace('2026-10-15', '2026-11-29');
  assert.equal(inspect({ pax8Text: noDate, answers: { ...answers, renewalDate: '2026-11-29' } }).status, 'outside-this-release');
  assert.equal(inspect({ pax8Text: noDate, answers: { ...answers, renewal: 'unknown', renewalDate: undefined } }).status, 'needs-verification');
  assert.equal(inspect({ pax8Text: noDate, answers: { ...answers, renewal: 'within-60-approx', renewalDate: undefined } }).status, 'needs-verification');
  const informed = inspect({ answers: { ...answers, renewal: 'within-60-approx', renewalDate: undefined } });
  assert.equal(informed.status, 'supplied-claims-look-in-scope');
  assert.deepEqual(informed.informedUnknowns.map((item) => item.key), ['renewalDate']);
  const outside = inspect({ pax8Text: farDate, answers: { ...answers, renewal: 'unknown', renewalDate: undefined } });
  assert.equal(outside.status, 'outside-this-release');
  assert.deepEqual(outside.informedUnknowns.map((item) => item.key), ['renewalDate']);
});

test('unknown and contradictory fields cannot bypass an expired scope policy', () => {
  const result = inspect({ today: '2027-01-01', answers: { ...answers, distributor: 'unknown' }, pax8Text: pax.replace(',pax8,', ',other,') });
  assert.equal(result.status, 'policy-review-required');
  assert.match(result.verify.join(' '), /policy needs review/i);
});

test('resolution input cannot silently apply to a different or absent conflict', () => {
  const initial = inspect({ answers: { ...answers, distributor: 'other' } });
  const saved = { choice: 'accept-file', questionnaire: 'other', fileValue: 'pax8', basis: initial.reviewBasis };
  assert.throws(() => inspect({ resolutions: { distributor: saved } }), /does not match a current conflict/i);
  assert.throws(() => inspect({ resolutions: { agreement: saved } }), /resolutions must bind/i);
  assert.throws(() => inspect({ resolutions: { distributor: 'verified' } }), /resolutions must bind/i);
  assert.throws(() => inspect({ answers: { ...answers, distributor: 'other' }, resolutions: { distributor: { ...saved, questionnaire: 'pax8' } } }), /stale/i);
  assert.throws(() => inspect({ answers: { ...answers, distributor: 'other' }, resolutions: Object.create({ distributor: saved }) }), /resolutions must bind/i);
});

test('review decision cannot transfer to a different subscription with identical conflicting values', () => {
  const changed = { ...answers, distributor: 'other' };
  const initial = inspect({ answers: changed });
  const conflict = initial.conflicts[0];
  const resolutions = { distributor: { choice: 'accept-file', questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: initial.reviewBasis } };
  const nextPax = pax.replace('sub-1', 'sub-2');
  const nextHalo = halo.replaceAll('sub-1', 'sub-2');
  assert.throws(() => inspect({ pax8Text: nextPax, haloText: nextHalo, subscriptionId: 'sub-2', answers: changed, resolutions }), /stale/i);
  assert.throws(() => inspect({ pax8Text: pax.replace('pax8', 'PAX8'), answers: changed, resolutions }), /stale/i);
  assert.throws(() => inspect({ today: '2026-09-30', answers: changed, resolutions }), /stale/i);
});

test('record identity is required and duplicates are never silently selected', () => {
  assert.equal(inspect({ subscriptionId: '' }).status, 'needs-record-identity');
  assert.equal(inspect({ pax8Text: pax + pax.split('\n')[1] + '\n' }).status, 'needs-record-identity');
  assert.equal(inspect({ haloText: halo + halo.split('\n')[1] + '\n' }).status, 'needs-record-link-review');
  assert.equal(inspect({ subscriptionId: 'sub-1\u200b' }).status, 'needs-record-identity');
  assert.equal(inspect({ subscriptionId: 'sub-1\u200e' }).status, 'needs-record-identity');
  assert.equal(inspect({ subscriptionId: 'sub-1\uFFFD' }).status, 'needs-record-identity');
  assert.equal(inspect({ subscriptionId: 'x'.repeat(129) }).status, 'needs-record-identity');
  const repeatedLine = `${HALO_COLUMNS.join(',')}\nline-1,sub-1,customer-a,HaloPSA\nline-1,sub-2,customer-a,HaloPSA\n`;
  assert.equal(inspect({ haloText: repeatedLine }).status, 'needs-record-link-review');
});

test('expired policy wins across every early input and link failure', () => {
  const cases = [
    { subscriptionId: '' },
    { subscriptionId: 'x'.repeat(129) },
    { pax8Text: 'bad' },
    { haloText: 'bad' },
    { pax8Text: pax + pax.split('\n')[1] + '\n' },
    { haloText: halo + halo.split('\n')[1] + '\n' },
    { haloText: halo.replace('customer-a', 'customer-b') },
    { resolutions: { distributor: 'invalid' } },
    { linkConfirmation: { confirmed: false, basis: 'stale' } },
  ];
  for (const changes of cases) {
    const result = rawInspect({ today: '2027-01-01', ...changes });
    assert.equal(result.status, 'policy-review-required', JSON.stringify(changes));
    assert.equal(result.actionAuthorized, false);
    assert.equal(result.financialVerdict, null);
  }
});

test('an equal customer reference still requires an explicit current-case link confirmation', () => {
  const first = rawInspect();
  assert.equal(first.status, 'needs-record-link-confirmation');
  assert.match(first.nextStep, /original systems/i);
  const confirmed = { confirmed: true, basis: first.reviewBasis };
  assert.equal(rawInspect({ linkConfirmation: confirmed }).status, 'supplied-claims-look-in-scope');
  assert.equal(rawInspect({ linkConfirmation: confirmed, pax8Text: pax.replace('customer-a', 'customer-c') }).status, 'needs-record-link-review');
  assert.equal(rawInspect({ linkConfirmation: confirmed, pax8Text: pax.replace(',renew\n', ',unknown\n') }).status, 'needs-record-link-confirmation');
  assert.equal(rawInspect({ linkConfirmation: confirmed, today: '2026-09-30' }).status, 'needs-record-link-confirmation');
  assert.throws(() => rawInspect({ linkConfirmation: { confirmed: false, basis: first.reviewBasis } }), /linkConfirmation/i);
});

test('unrecognized source labels request verification instead of falsely excluding a case', () => {
  for (const changes of [
    { pax8Text: pax.replace(',pax8,', ',Pax 8,') },
    { haloText: halo.replace(',HaloPSA\n', ',Halo PSA\n') },
    { pax8Text: pax.replace('Microsoft 365', 'M365 Business') },
    { pax8Text: pax.replace(',NCE,', ',New Commerce,') },
    { pax8Text: pax.replace(',yes,', ',true,') },
    { pax8Text: pax.replace(',annual,', ',12 months,') },
  ]) {
    const result = inspect(changes);
    assert.equal(result.status, 'needs-verification', JSON.stringify(changes));
  }
  assert.equal(inspect({ pax8Text: pax.replace(',pax8,', ',other,'), answers: { ...answers, distributor: 'other' } }).status, 'outside-this-release');
});

test('cross-customer link is blocked', () => {
  const result = inspect({ haloText: halo.replace('customer-a', 'customer-b') });
  assert.equal(result.status, 'needs-record-link-review');
  assert.match(result.linkIssues.join(' '), /customer references do not match/i);
  assert.equal(inspect({ haloText: halo.replace('customer-a', 'Customer-A') }).status, 'needs-record-link-review');
  const invisible = pax.replace('customer-a', 'customer-a\u200b');
  const invisibleHalo = halo.replace('customer-a', 'customer-a\u200b');
  assert.equal(inspect({ pax8Text: invisible, haloText: invisibleHalo }).status, 'needs-record-link-review');
});

test('identity errors take priority over an unrelated unresolved conflict', () => {
  const result = inspect({ haloText: halo.replace('customer-a', 'customer-b'), answers: { ...answers, distributor: 'other' } });
  assert.equal(result.status, 'needs-record-link-review');
  assert.equal(result.conflicts.length, 1);
  assert.match(result.linkIssues.join(' '), /customer references do not match/i);
});

test('asymmetric error-cost precedence keeps uncertain and unlinked cases out of final scope classification', () => {
  const cancellation = pax.replace(',renew\n', ',cancel\n');
  const conflictAnswers = { ...answers, distributor: 'other' };
  assert.equal(inspect({ today: '2027-01-01', pax8Text: cancellation }).status, 'policy-review-required');
  assert.equal(inspect({ haloText: halo.replace('customer-a', 'customer-b'), pax8Text: cancellation, answers: conflictAnswers }).status, 'needs-record-link-review');
  assert.equal(inspect({ pax8Text: cancellation, answers: conflictAnswers }).status, 'needs-conflict-review');
  assert.equal(decide({ pax8Text: cancellation, answers: conflictAnswers }, { distributor: 'accept-file' }).status, 'outside-this-release');
  assert.equal(inspect({ pax8Text: cancellation }).status, 'outside-this-release');
  assert.equal(inspect({ pax8Text: pax.replace(',renew\n', ',unknown\n') }).status, 'needs-verification');
  assert.equal(inspect().status, 'supplied-claims-look-in-scope');
});

test('every result explicitly denies financial verdict and action authority and gives a repair path', () => {
  const variants = [
    inspect(),
    inspect({ subscriptionId: '' }),
    inspect({ haloText: halo.replace('customer-a', 'customer-b') }),
    inspect({ answers: { ...answers, distributor: 'other' } }),
    inspect({ answers: { ...answers, commitment: 'unknown' }, pax8Text: pax.replace(',annual,', ',unknown,') }),
    inspect({ answers: { ...answers, reseller: 'no' } }),
    inspect({ today: '2027-01-01' }),
  ];
  for (const result of variants) {
    assert.equal(result.decisionKind, 'scope-fit-only', result.status);
    assert.equal(result.actionAuthorized, false, result.status);
    assert.equal(result.financialVerdict, null, result.status);
    assert.ok(result.nextStep?.length > 20, result.status);
  }
  assert.match(variants.find((result) => result.status === 'needs-record-link-review').nextStep, /correct.*record IDs or customer references/i);
  assert.match(variants.find((result) => result.status === 'outside-this-release').nextStep, /correct it and run the check again/i);
});

test('missing or invalid supplied fields never create a positive result', () => {
  const cases = [
    { pax8Text: pax.replace(',pax8,', ',,'), field: 'distributor' },
    { haloText: halo.replace(',HaloPSA\n', ',\n'), field: 'billing' },
    { pax8Text: pax.replace(',NCE,', ',,'), field: 'commitment' },
    { pax8Text: pax.replace('2026-10-15', '2026-02-30'), field: 'renewal' },
    { pax8Text: pax.replace(',renew\n', ',unknown\n'), field: 'end state' },
  ];
  for (const example of cases) {
    const { field, ...changes } = example;
    assert.notEqual(inspect(changes).status, 'supplied-claims-look-in-scope', field);
  }
});

test('raw source cell changes invalidate a review even when the derived value agrees', () => {
  const changed = { ...answers, distributor: 'other' };
  const initial = inspect({ answers: changed });
  const c = initial.conflicts[0];
  const resolutions = { distributor: { choice: 'accept-file', questionnaire: c.questionnaire, fileValue: c.fileValue, basis: initial.reviewBasis } };
  assert.throws(() => inspect({ answers: changed, pax8Text: pax.replace(',pax8,', ',PAX8,'), resolutions }), /stale/i);
});

for (const [field, value] of [
  ['distributor', 'other'], ['product_family', 'Azure'], ['commerce_model', 'legacy'],
  ['seat_based', 'no'], ['commitment_term', 'monthly'], ['end_of_term_state', 'cancel'],
  ['end_of_term_state', 'extended'],
]) {
  test(`unsupported source ${field}=${value} cannot pass`, () => {
    const row = pax.split('\n')[1].split(',');
    row[PAX8_COLUMNS.indexOf(field)] = value;
    const changed = `${PAX8_COLUMNS.join(',')}\n${row.join(',')}\n`;
    assert.notEqual(inspect({ pax8Text: changed }).status, 'supplied-claims-look-in-scope');
  });
}

test('unknown end state and missing agreement remain verification tasks', () => {
  const stateUnknown = pax.replace(',renew\n', ',unknown\n');
  const result = inspect({ pax8Text: stateUnknown, answers: { ...answers, agreement: 'no' } });
  assert.equal(result.status, 'needs-verification');
  assert.match(result.verify.join(' '), /end-of-term state/i);
  assert.match(result.verify.join(' '), /signed customer agreement/i);
});

test('record preflight does not silently treat deferred agreement preparation as completed', () => {
  const result = inspect({ answers: { ...answers, agreement: 'not-asked' } });
  assert.equal(result.status, 'needs-verification');
  assert.match(result.verify.join(' '), /signed customer order or agreement/i);
});

test('same-day renewal does not imply time remains', () => {
  const result = inspect({ pax8Text: pax.replace('2026-10-15', today), answers: { ...answers, renewalDate: today } });
  assert.equal(result.status, 'needs-verification');
  assert.match(result.verify.join(' '), /exact cutoff and time zone/i);
});

test('known direct purchase remains outside despite an unauthenticated supplied row', () => {
  const result = inspect({ answers: { ...answers, reseller: 'no' } });
  assert.equal(result.status, 'outside-this-release');
  assert.match(result.verify.join(' '), /financially responsible/i);
  assert.match(result.errors.join(' '), /manages and resells/i);
});

test('unknown reseller responsibility is not settled by the presence of a Pax8 row', () => {
  const result = inspect({ answers: { ...answers, reseller: 'unknown' } });
  assert.equal(result.status, 'needs-verification');
  assert.match(result.verify.join(' '), /who holds the Microsoft 365 subscription commitment/i);
  assert.equal(result.provenance.reseller.file, 'not established by these CSVs');
});

test('malformed or incompatible CSV fails explicitly', () => {
  assert.throws(() => parseCsv('', ['a']), /empty/i);
  assert.throws(() => parseCsv('a,b\n"unterminated,b', ['a']), /unclosed/i);
  assert.throws(() => parseCsv('a,b\n1', ['a']), /row 2/i);
  assert.throws(() => parseCsv('a,a\n1,2', ['a']), /duplicate/i);
  assert.throws(() => parseCsv('a,b\n1,2', ['missing']), /Missing columns/i);
  assert.throws(() => parseCsv('a,b\n"x"bad,y', ['a']), /Unexpected text/i);
  assert.throws(() => parseCsv('a,b\nx"y,z', ['a']), /Unexpected quote/i);
  assert.throws(() => parseCsv(`a\n${'x\n'.repeat(5001)}`, ['a']), /5000 rows/i);
  assert.throws(() => parseCsv(`a\n${'x'.repeat(1025)}\n`, ['a']), /1024 characters/i);
  assert.throws(() => parseCsv(`a\n${'é'.repeat(999_999)}\n`, ['a']), /two-megabyte/i);
  assert.equal(parseCsv('\uFEFFa,b\r\n"x,y",z\r\n', ['a'])[0].a, 'x,y');
  assert.equal(parseCsv('a,b\n"x\ny",z\n', ['a'])[0].a, 'x\ny');
});
