import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCaseSubject, PAX8_COLUMNS } from './preflight.mjs';

const row = (id = 's', customer = 'c', date = '2027-01-15') => ['synthetic-account', id, customer, 'pax8', 'Microsoft 365', 'NCE', 'yes', 'annual', date, 'renew'].join(',');
const csv = (...rows) => ['source_account_id', ...PAX8_COLUMNS].join(',') + '\n' + rows.join('\n');

test('one explicit subject comes only from the unique selected source row', () => {
  const selected = selectCaseSubject(csv(row('other', 'else'), row()), ' s ');
  assert.equal(selected.status, 'candidate');
  assert.deepEqual([selected.subject.customerRef, selected.subject.subscriptionId, selected.subject.renewalDate, selected.subject.recordNumber], ['c', 's', '2027-01-15', 2]);
  assert.equal(selected.subject.authenticated, false);
  assert.equal(selectCaseSubject(csv(row(), row('other', 'else')), 's').subject.recordNumber, 1);
});
test('no missing or duplicate subscription can produce a subject', () => {
  for (const text of [csv(row('other')), csv(row(), row()), csv(row(), row('s', 'another'))]) {
    const selected = selectCaseSubject(text, 's');
    assert.equal(selected.status, 'unresolved'); assert.equal(selected.subject, null);
  }
});
test('invalid identifiers stay unresolved without coercion', () => {
  for (const id of ['', null, undefined, 12, {}, ['s'], 'x'.repeat(129), 's\u200b', 's\n']) {
    // Outer whitespace is intentionally normalized by the existing CSV selection contract.
    if (id === 's\n') continue;
    assert.equal(selectCaseSubject(csv(row()), id).subject, null);
  }
});
test('unknown customer and renewal stay explicit with no invented questionnaire values', () => {
  for (const customer of ['', 'c\u200b', 'x'.repeat(129)]) {
    const selected = selectCaseSubject(csv(row('s', customer, '2027-02-29')), 's');
    assert.equal(selected.status, 'unresolved'); assert.equal(selected.subject.customerRef, null);
    assert.equal(selected.subject.renewalDate, null); assert.equal(selected.subject.subscriptionId, 's');
  }
  for (const date of ['', 'unknown', '2027-02-29', '2027-13-01', 'not-a-date']) assert.equal(selectCaseSubject(csv(row('s', 'c', date)), 's').subject.renewalDate, null);
  assert.equal(selectCaseSubject(csv(row('s', 'c', '2028-02-29')), 's').status, 'candidate');
});
test('subject and original raw values are immutable and literal', () => {
  const selected = selectCaseSubject(csv(row('s', ' <img> ')), 's');
  assert.equal(selected.subject.customerRef, '<img>'); assert.equal(selected.subject.raw.customer_ref, ' <img> ');
  assert.throws(() => { selected.subject.subscriptionId = 'another'; }, TypeError);
  assert.throws(() => { selected.subject.raw.customer_ref = 'another'; }, TypeError);
});
test('malformed input cannot produce a partial subject; maximum supported rows select exactly one', () => {
  for (const text of ['', 'subscription_id\ns', csv(row()) + '\n"unterminated']) assert.throws(() => selectCaseSubject(text, 's'));
  const rows = Array.from({ length: 5000 }, (_, index) => row('s' + index, 'c' + index));
  const selected = selectCaseSubject(csv(...rows), 's4999');
  assert.equal(selected.subject.customerRef, 'c4999'); assert.equal(selected.subject.recordNumber, 5000);
});
