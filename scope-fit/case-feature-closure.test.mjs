import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaseFinder, searchCaseFinder, selectFoundCase, assertFoundCase, confirmCaseSelection,
  reviewCaseSelection, revokeCaseSelectionConfirmation, createCaseHandoff, assertCaseHandoff,
  inspectRecords, captureRecordDecision } from './preflight.mjs';

const columns = ['source_account_id', 'subscription_id', 'customer_ref', 'distributor', 'product_family', 'commerce_model', 'seat_based', 'commitment_term', 'renewal_date', 'end_of_term_state', 'customer_name'];
const quote = value => '"' + value.replaceAll('"', '""') + '"';

test('F12-M01 48 full identity chains preserve lexical evidence and revoke stale handoffs', () => {
  let cases = 0;
  for (const eol of ['\n', '\r\n', '\r']) for (const bom of ['', '\uFEFF']) for (const customer of ['c', 'café', 'c,quoted', 'c😀']) for (const description of ['Same name', 'A,"B"\nC']) {
    const rows = [['a', 'other', 'else', 'pax8', 'Microsoft 365', 'NCE', 'yes', 'annual', '2027-01-15', 'renew', 'Other'], ['a', 's', customer, 'pax8', 'Microsoft 365', 'NCE', 'yes', 'annual', '2027-01-15', 'renew', description]];
    const text = bom + columns.map(quote).join(',') + eol + rows.map(row => row.map(quote).join(',')).join(eol) + eol;
    const finder = createCaseFinder(text);
    assert.ok(searchCaseFinder(finder, { query: customer }).rows.some(row => row.subscriptionId === 's'));
    const chosen = assertFoundCase(selectFoundCase(finder, 2), finder, 2);
    assert.equal(chosen.subject.customerRef, customer);
    assert.equal(chosen.subject.evidence.originalRecord, text.slice(chosen.subject.evidence.startOffset, chosen.subject.evidence.endOffset));
    const receipt = confirmCaseSelection(text, 's'), handoff = createCaseHandoff(text, 's', receipt);
    assert.equal(assertCaseHandoff(handoff, text, 's', receipt).selection.status, 'confirmed');
    revokeCaseSelectionConfirmation(receipt);
    assert.equal(reviewCaseSelection(text, 's', receipt).status, 'candidate');
    assert.throws(() => assertCaseHandoff(handoff, text, 's', receipt));
    cases++;
  }
  assert.equal(cases, 48);
});

test('F12-M02 combined 1023 rows 64 columns and 1024 character multibyte fields survive full chain', () => {
  const headers = columns.slice(0, 10); while (headers.length < 64) headers.push('extra' + headers.length);
  const text = headers.join(',') + '\n' + Array.from({ length: 1023 }, (_, i) => {
    const extra = i === 1022 ? Array(54).fill('é'.repeat(1024)) : ['x'.repeat(100), ...Array(53).fill('')];
    return ['a', 'S' + i, 'C' + i, 'pax8', 'Microsoft 365', 'NCE', 'yes', 'annual', '2027-01-15', 'renew', ...extra].map(quote).join(',');
  }).join('\n');
  assert.ok(Buffer.byteLength(text, 'utf8') < 2_000_000);
  const finder = createCaseFinder(text), found = searchCaseFinder(finder, { query: 'C1022' });
  assert.equal(found.matchCount, 1);
  const chosen = assertFoundCase(selectFoundCase(finder, 1023), finder, 1023);
  assert.equal(chosen.subject.evidence.fields.length, 64);
  assert.equal(chosen.subject.evidence.fields.at(-1).rawValue, 'é'.repeat(1024));
  for (let attempt = 0; attempt < 3; attempt++) {
    const receipt = confirmCaseSelection(text, 'S1022'), handoff = createCaseHandoff(text, 'S1022', receipt);
    const current = { pax8Text: text, haloText: 'line_id,subscription_id,customer_ref,billing_system\nl,S1022,C1022,HaloPSA\n', subscriptionId: 'S1022', today: '2026-12-30', answers: { reseller: 'yes', distributor: 'pax8', billing: 'halopsa', commitment: 'annual-m365-nce', renewal: 'exact', renewalDate: '2027-01-15', agreement: 'yes' }, renewalTerm: 'annual' };
    const decision = captureRecordDecision(inspectRecords(current, handoff, receipt), current);
    assert.equal(decision.selected.customerRef, 'C1022');
    assert.equal(assertCaseHandoff(decision.caseHandoff, text, 'S1022', receipt).selection.status, 'confirmed');
    revokeCaseSelectionConfirmation(receipt);
    assert.throws(() => assertCaseHandoff(decision.caseHandoff, text, 'S1022', receipt));
  }
});
