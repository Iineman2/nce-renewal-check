import { evaluateFit, POLICY_VERSION } from './fit.mjs';
import { issue, conditionIssue, SOURCES, InputProblem, assertNextAction, assertInputFailure } from './actions.mjs';
import { SCOPE_KEYS, blockedClaimReview, recordClaimReview, selfReportOrigin, fileOrigin } from './claims.mjs';
import { captureAnswers, frozenData, validIsoDate, hasHiddenCharacters, sameData } from './input.mjs';
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { scanCsvEvidence } from './csv-evidence.mjs';
import { runBoundedStepsAsync } from './resource-packet.mjs';

export const PAX8_COLUMNS = qualifiedCsvProfile('pax-file', 'compare-records').requiredColumns;
export const HALO_COLUMNS = qualifiedCsvProfile('halo-file', 'compare-records').requiredColumns;
const IDENTITY_COLUMNS = ['source_account_id', 'customer_name', 'product_name', 'product_sku', 'seat_count'];

const MAX_ROWS = FILE_SUPPORT.limits.dataRows;
const MAX_CELL_LENGTH = FILE_SUPPORT.limits.cellCodeUnits;
const rawRows = new WeakMap();
const sourceRecords = new WeakMap();
const parsedRows = new WeakMap();
const rowPreparationResult = rows => Object.freeze(Object.assign(Object.create(null), { rows }));
const ECONOMIC_COLUMNS = ['billing_frequency', 'scheduled_commitment_term', 'scheduled_billing_frequency', 'term_start_date', 'term_end_date'];
export function rawCells(row) { return rawRows.get(row) ?? Object.freeze({}); }
function selectedRecord(row, columns) {
  const selected = Object.fromEntries(columns.filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));
  rawRows.set(selected, Object.freeze(Object.fromEntries(Object.keys(selected).map(key => [key, rawCells(row)[key]]))));
  sourceRecords.set(selected, sourceRecords.get(row));
  return selected;
}

function* csvRowSteps(scan, requiredColumns) {
  const limits = FILE_SUPPORT.limits;
  if (!scan || scan.version !== 'csv-lexical-evidence-v1' || scan.origin !== 'decoded-text-only' ||
      typeof scan.complete !== 'boolean' || !Array.isArray(scan.records) || scan.records.length > FILE_SUPPORT.limits.dataRows + 1 ||
      !Array.isArray(requiredColumns) || requiredColumns.length > FILE_SUPPORT.limits.columns ||
      requiredColumns.some(column => typeof column !== 'string' || column.length > limits.headerCodeUnits)) throw new TypeError('CSV rows require a bounded canonical lexical inventory and column list.');
  if (!scan.complete) {
    if (!scan.failure || typeof scan.failure.message !== 'string' || scan.failure.message.length > 4096) throw new TypeError('CSV lexical failure must contain bounded text.');
    throw new TypeError(scan.failure.message);
  }
  const canonicalProfile = FILE_SUPPORT.profiles.some(profile => profile.requiredColumns === requiredColumns);
  if (canonicalProfile && parsedRows.get(scan)?.has(requiredColumns)) return rowPreparationResult(parsedRows.get(scan).get(requiredColumns));
  const headerRecord = scan.records[0];
  if (scan.records.length < 2) throw new TypeError('CSV needs a header and at least one data row');
  if (!Array.isArray(headerRecord.cells) || !headerRecord.cells.length || headerRecord.cells.length > FILE_SUPPORT.limits.columns) throw new TypeError('CSV headers must contain bounded lexical cells.');
  const rawHeaders = headerRecord.cells.map(cell => {
    if (!cell || typeof cell.rawValue !== 'string' || cell.rawValue.length > limits.cellCodeUnits ||
        typeof cell.lexeme !== 'string' || cell.lexeme.length > limits.lexemeCodeUnits) throw new TypeError('CSV headers require bounded raw lexical text.');
    return cell.rawValue;
  });
  const header = rawHeaders.map(value => value.trim().toLowerCase());
  if (header.some(name => !name || name.length > FILE_SUPPORT.limits.headerCodeUnits)) throw new TypeError(`CSV headers must contain at most ${FILE_SUPPORT.limits.columns} nonempty names of at most ${FILE_SUPPORT.limits.headerCodeUnits} characters`);
  if (new Set(header).size !== header.length) throw new TypeError('CSV has duplicate column names');
  const missing = requiredColumns.filter(name => !header.includes(name));
  if (missing.length) throw new TypeError(`Missing columns: ${missing.join(', ')}`);
  if (typeof headerRecord.originalRecord !== 'string' || headerRecord.originalRecord.length > limits.decodedCodeUnits) throw new TypeError('CSV source records require bounded original text.');
  const rows = []; let copiedCells = 0, totalCells = header.length, sourceUnits = headerRecord.originalRecord.length;
  let copiedUnits = sourceUnits + headerRecord.cells.reduce((sum, cell) => sum + cell.lexeme.length + cell.rawValue.length, 0);
  for (let index = 1; index < scan.records.length; index++) {
    const source = scan.records[index];
    if (!Array.isArray(source.cells)) throw new TypeError('CSV rows require lexical cells.');
    if (source.cells.length !== header.length) throw new TypeError(`CSV row ${index + 1} has ${source.cells.length} values; expected ${header.length}`);
    if ((totalCells += source.cells.length) > limits.totalCells) throw new TypeError(`CSV exceeds ${limits.totalCells} total cells including headers and blanks`);
    if (typeof source.originalRecord !== 'string' || (sourceUnits += source.originalRecord.length) > limits.decodedCodeUnits) throw new TypeError('CSV source records exceed their original-text bound.');
    copiedUnits += source.originalRecord.length;
    if (copiedCells + header.length > 256) { yield; copiedCells = 0; }
    const normalizedEntries = [], rawEntries = [];
    for (let position = 0; position < header.length; position++) {
      const name = header[position], cell = source.cells[position];
      if (!cell || typeof cell.normalizedValue !== 'string' || cell.normalizedValue.length > limits.cellCodeUnits ||
          typeof cell.rawValue !== 'string' || cell.rawValue.length > limits.cellCodeUnits ||
          typeof cell.lexeme !== 'string' || cell.lexeme.length > limits.lexemeCodeUnits) throw new TypeError('CSV row cells must contain bounded raw normalized and lexical text.');
      if ((copiedUnits += cell.normalizedValue.length + cell.rawValue.length + cell.lexeme.length) > limits.packetStringCodeUnits) throw new TypeError('CSV row preparation exceeds its copied-text bound.');
      normalizedEntries.push([name, cell.normalizedValue]); rawEntries.push([name, cell.rawValue]); copiedCells++;
    }
    // Each native own-data construction contains at most the admitted 64
    // columns. Reserved names retain Object.fromEntries data semantics.
    const record = Object.fromEntries(normalizedEntries);
    rawRows.set(record, Object.freeze(Object.fromEntries(rawEntries)));
    sourceRecords.set(record, { sourceRecordOrdinal: source.sourceRecordOrdinal, dataRecordNumber: source.dataRecordNumber,
      originalRecord: source.originalRecord, startOffset: source.startOffset, endOffset: source.endOffset, startByte: source.startByte,
      endByte: source.endByte, terminator: source.terminator, terminatorLocation: source.terminatorLocation, cells: source.cells,
      rawHeaders, columns: header, headerRecord });
    rows.push(canonicalProfile ? Object.freeze(record) : record);
  }
  return rowPreparationResult(canonicalProfile ? Object.freeze(rows) : rows);
}
function publishCsvRows(scan, requiredColumns, rows) {
  if (FILE_SUPPORT.profiles.some(profile => profile.requiredColumns === requiredColumns)) {
    if (!parsedRows.has(scan)) parsedRows.set(scan, new Map());
    if (parsedRows.get(scan).has(requiredColumns)) return parsedRows.get(scan).get(requiredColumns);
    parsedRows.get(scan).set(requiredColumns, rows);
  }
  return rows;
}
export function parseCsv(text, requiredColumns) {
  const scan = scanCsvEvidence(text), iterator = csvRowSteps(scan, requiredColumns); let step;
  do { step = iterator.next(); } while (!step.done);
  return publishCsvRows(scan, requiredColumns, step.value.rows);
}

// Preparation returns no source or case authority. Its private row cache is
// keyed by this exact scan; it cannot install lexical text or supplied custody.
export async function prepareCsvRowsAsync(scan, requiredColumns, assertCurrent) {
  // Return a prototype-free outcome through the Promise boundary. An inherited
  // array thenable cannot substitute rows before private cache publication.
  const result = await runBoundedStepsAsync(csvRowSteps(scan, requiredColumns), assertCurrent);
  const rows = result.rows;
  assertCurrent();
  const hadCachedRows = parsedRows.get(scan)?.has(requiredColumns) ?? false;
  publishCsvRows(scan, requiredColumns, rows);
  try { assertCurrent(); }
  catch (error) {
    if (!hadCachedRows) {
      const cache = parsedRows.get(scan); cache?.delete(requiredColumns);
      if (cache?.size === 0) parsedRows.delete(scan);
    }
    throw error;
  }
}

export function rowSourceTrace(row, columns) {
  const source = sourceRecords.get(row);
  if (!source) throw new TypeError('A source row is required for a field trace.');
  return frozenData({ version: 'csv-field-trace-v1', origin: 'decoded-text-only',
    sourceRecordOrdinal: source.sourceRecordOrdinal, dataRecordNumber: source.dataRecordNumber,
    recordLocation: { startOffset: source.startOffset, endOffset: source.endOffset, startByte: source.startByte, endByte: source.endByte },
    fields: columns.map(column => {
      const index = source.columns.indexOf(column);
      if (index < 0 || !Object.hasOwn(row, column)) throw new TypeError('Field is absent from its source row.');
      return { column, originalHeader: source.rawHeaders[index], ...source.cells[index], header: source.headerRecord.cells[index] };
    }) });
}

function normalized(value) { return String(value ?? '').trim().toLowerCase(); }
const unknownTokens = new Set(['', 'unknown', 'n/a', 'na', 'not sure', 'unspecified', 'tbd']);
function isUnknown(value) { return unknownTokens.has(normalized(value)); }
function classifiedValue(value, supported, explicitlyUnsupported) {
  const token = normalized(value);
  if (token === supported) return supported;
  if (explicitlyUnsupported.includes(token)) return 'other';
  return 'unknown';
}
function termValue(value) {
  const token = normalized(value);
  if (token === 'annual') return 'annual';
  if (token === 'monthly') return 'monthly';
  if (['other', 'triennial', 'three-year', '3-year', 'p3y'].includes(token)) return 'other';
  return 'unknown';
}
function commitmentClaim(pax) {
  const product = classifiedValue(pax.product_family, 'microsoft 365', ['azure', 'other']);
  const model = classifiedValue(pax.commerce_model, 'nce', ['legacy', 'other']);
  const seats = classifiedValue(pax.seat_based, 'yes', ['no']);
  const term = termValue(pax.commitment_term);
  if ([product, model, seats].includes('other')) return 'other';
  if (term === 'monthly') return 'monthly';
  if (term === 'other') return 'other';
  if ([product, model, seats, term].includes('unknown')) return 'unknown';
  return 'annual-m365-nce';
}
function economicEvidenceIssues(pax) {
  const issues = [];
  const add = (code, condition, message) => issues.push(issue(code, condition, SOURCES.pax, 'pax-file', message));
  const term = termValue(pax.commitment_term);
  const has = (key) => Object.hasOwn(pax, key);
  const frequency = normalized(pax.billing_frequency);
  if (has('billing_frequency') && frequency && !isUnknown(frequency)) {
    if (!['monthly', 'annual', 'upfront'].includes(frequency)) {
      add('billing-unrecognized', 'billing-frequency', `The supplied Pax8 billing_frequency “${pax.billing_frequency}” is unrecognized. Confirm the billing plan and commitment term in Pax8.`);
    } else if (term === 'monthly' && frequency === 'annual') {
      add('billing-conflict', 'billing-frequency', 'The supplied Pax8 monthly commitment term conflicts with annual billing frequency. Confirm both fields in the original subscription.');
    }
  }
  const scheduledTerm = normalized(pax.scheduled_commitment_term);
  const scheduledFrequency = normalized(pax.scheduled_billing_frequency);
  if (has('scheduled_commitment_term') && scheduledTerm && isUnknown(scheduledTerm)) {
    add('scheduled-term-unknown', 'scheduled-term', 'The scheduled renewal commitment term is marked unknown. Confirm the next term in Pax8.');
  }
  if (has('scheduled_commitment_term') && scheduledTerm && !isUnknown(scheduledTerm)) {
    const planned = termValue(scheduledTerm);
    if (planned === 'unknown') add('scheduled-term-unrecognized', 'scheduled-term', `The scheduled commitment term “${pax.scheduled_commitment_term}” is unrecognized. Check the next term in Pax8.`);
    else if (planned !== term) add('scheduled-term-change', 'scheduled-term', `The scheduled renewal term is “${pax.scheduled_commitment_term}”, while the current term is “${pax.commitment_term}”. Confirm the term that will apply at renewal.`);
    if (planned === 'monthly' && scheduledFrequency === 'annual') add('scheduled-plan-conflict', 'scheduled-frequency', 'The scheduled monthly commitment conflicts with annual billing frequency. Confirm the renewal settings.');
  } else if (has('scheduled_billing_frequency') && scheduledFrequency && !isUnknown(scheduledFrequency)) {
    add('scheduled-term-missing', 'scheduled-frequency', 'A scheduled billing frequency was supplied without a scheduled commitment term. Confirm the renewal settings in Pax8.');
  }
  if (has('scheduled_billing_frequency') && scheduledFrequency && !isUnknown(scheduledFrequency) &&
      !['monthly', 'annual', 'upfront'].includes(scheduledFrequency)) {
    add('scheduled-frequency-unrecognized', 'scheduled-frequency', `The scheduled billing frequency “${pax.scheduled_billing_frequency}” is unrecognized. Confirm the renewal settings in Pax8.`);
  }
  const hasStart = has('term_start_date') && !isUnknown(pax.term_start_date);
  const hasEnd = has('term_end_date') && !isUnknown(pax.term_end_date);
  if (hasStart !== hasEnd) {
    add('term-date-partial', 'term-dates', 'Only one of the current term start and end dates was supplied. Confirm both dates in Pax8.');
  } else if (hasStart && hasEnd) {
    if (!validIsoDate(pax.term_start_date) || !validIsoDate(pax.term_end_date)) {
      add('term-date-invalid', 'term-dates', 'A current term start or end date is invalid. Confirm the actual term dates in Pax8.');
    } else {
      const start = Date.parse(`${pax.term_start_date}T00:00:00Z`);
      const end = Date.parse(`${pax.term_end_date}T00:00:00Z`);
      const days = (end - start) / 86_400_000 + 1;
      if (days <= 0) add('term-date-reversed', 'term-dates', 'The current term ends before it starts. Confirm the term dates in Pax8.');
      else if (term === 'annual' && (days < 365 || days > 366)) {
        add('term-duration', 'term-dates', `The supplied annual term spans ${days} days. Confirm any co-term alignment, migration, or term change before interpreting its duration.`);
      }
      if (validIsoDate(pax.renewal_date)) {
        const renewal = Date.parse(`${pax.renewal_date}T00:00:00Z`);
        const gap = (renewal - end) / 86_400_000;
        if (gap < 0 || gap > 2) add('renewal-alignment', 'renewal', 'The supplied commitment renewal date does not follow the current term end date. Confirm that this is the term renewal, not an invoice date.');
      }
    }
  }
  return issues;
}
function safeIdentifier(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
    !hasHiddenCharacters(value) && !value.includes('\uFFFD');
}

function paxSelection(rows, subscriptionId) {
  const id = typeof subscriptionId === 'string' ? subscriptionId.trim() : '';
  if (!safeIdentifier(id)) return { id, matches: [], reason: 'Enter one valid Pax8 subscription ID (at most 128 characters, without invisible or control characters).' };
  const matches = rows.map((row, index) => ({ row, recordNumber: index + 1 })).filter(item => item.row.subscription_id === id);
  return { id, matches, reason: matches.length === 1 ? null : `Expected one Pax8 row for subscription ${id}; found ${matches.length}.` };
}

function rowIdentity(row) {
  const usable = key => safeIdentifier(row[key]) ? row[key] : null;
  const sourceAccountId = isUnknown(row.source_account_id) ? null : usable('source_account_id');
  const customerRef = usable('customer_ref');
  const subscriptionId = usable('subscription_id');
  const key = sourceAccountId && customerRef && subscriptionId
    ? JSON.stringify(['Pax8', sourceAccountId, customerRef, subscriptionId]) : null;
  const renewalDate = validIsoDate(row.renewal_date) ? row.renewal_date : null;
  return frozenData({ version: 'source-case-identity-v1', system: 'Pax8', sourceAccountId,
    customerRef, subscriptionId, status: key ? 'source-scoped' : 'unresolved', key,
    occurrenceKey: key && renewalDate ? JSON.stringify([key, renewalDate]) : null,
    authenticated: false, scope: 'supplied-source-account' });
}

function rowDescriptions(row) {
  return frozenData({ customerName: row.customer_name || null, productName: row.product_name || null,
    sku: row.product_sku || null, seats: row.seat_count || null });
}

function rowEvidence(row) {
  const source = sourceRecords.get(row);
  return frozenData({ version: 'selected-source-evidence-v2', authenticated: false, origin: 'decoded-text-only',
    offsetUnit: 'UTF-16 code units in the decoded supplied CSV',
    startOffset: source.startOffset, endOffset: source.endOffset, startByte: source.startByte, endByte: source.endByte,
    originalRecord: source.originalRecord, terminator: source.terminator, terminatorLocation: source.terminatorLocation,
    sourceRecordOrdinal: source.sourceRecordOrdinal, dataRecordNumber: source.dataRecordNumber,
    fields: rowSourceTrace(row, source.columns.filter(column => Object.hasOwn(row, column))).fields });
}

// Selection establishes the subject, independently of billing linkage or eligibility.
function canonicalCaseSubject(pax8Text, subscriptionId) {
  const rows = parseSource(pax8Text, PAX8_COLUMNS, 'pax-file', SOURCES.pax);
  const selection = paxSelection(rows, subscriptionId);
  if (selection.reason) return frozenData({ status: 'unresolved', reason: selection.reason, subject: null,
    uncertainty: [{ code: selection.matches.length > 1 ? 'ambiguous-rows' : 'no-unique-row', instruction: selection.reason }],
    matchCount: selection.matches.length, candidates: selection.matches.slice(0, 20).map(({ row, recordNumber }) => ({
      recordNumber, subscriptionId: row.subscription_id, sourceAccountId: row.source_account_id ?? '',
      customerRef: row.customer_ref, renewalDate: row.renewal_date })), canConfirm: false });
  const { row, recordNumber } = selection.matches[0];
  const customerRef = safeIdentifier(row.customer_ref) ? row.customer_ref : null;
  const renewalDate = validIsoDate(row.renewal_date) ? row.renewal_date : null;
  const identity = rowIdentity(row);
  const uncertainty = [];
  if (!identity.sourceAccountId) uncertainty.push({ code: 'missing-account', instruction: 'Supply usable Pax8 source_account_id from the original source account; do not infer it from a filename or customer name.' });
  if (!customerRef) uncertainty.push({ code: 'missing-customer', instruction: 'Correct the supplied customer_ref against the original Pax8 record.' });
  if (!renewalDate) uncertainty.push({ code: 'missing-occurrence', instruction: 'Correct the supplied renewal_date to one exact valid calendar date using the original Pax8 record.' });
  return frozenData({ status: uncertainty.length ? 'unresolved' : 'candidate', reason: null,
    uncertainty, matchCount: 1, candidates: [], canConfirm: uncertainty.length === 0,
    subject: { subscriptionId: selection.id, customerRef, renewalDate,
      product: row.product_family || null, commitmentTerm: row.commitment_term || null,
      identity, descriptions: rowDescriptions(row), evidence: rowEvidence(row),
      recordNumber, raw: rawCells(row), source: 'Supplied Pax8 CSV', authenticated: false } });
}

export function selectCaseSubject(pax8Text, subscriptionId) {
  return canonicalCaseSubject(pax8Text, subscriptionId);
}

// Discovery narrows descriptions; it never narrows the identity selector's source.
const caseFinders = new WeakMap();
export function revokeCaseFinder(handle) { if (handle && typeof handle === 'object') caseFinders.delete(handle); }
const FINDER_FIELDS = ['query', 'account', 'customer', 'product', 'from', 'to'];
export function createCaseFinder(pax8Text) {
  const rows = parseSource(pax8Text, PAX8_COLUMNS, 'pax-file', SOURCES.pax);
  const counts = new Map();
  for (const row of rows) counts.set(row.subscription_id, (counts.get(row.subscription_id) ?? 0) + 1);
  const entries = rows.map((row, index) => {
    const source = sourceRecords.get(row);
    const summary = Object.freeze({ recordNumber: index + 1, sourceLocator: Object.freeze({ sourceRecordOrdinal: source.sourceRecordOrdinal, startOffset: source.startOffset, endOffset: source.endOffset, startByte: source.startByte, endByte: source.endByte }), subscriptionId: row.subscription_id,
      sourceAccountId: row.source_account_id ?? '', customerRef: row.customer_ref,
      customerName: row.customer_name ?? '', product: row.product_family,
      productName: row.product_name ?? '', sku: row.product_sku ?? '', seats: row.seat_count ?? '',
      commitmentTerm: row.commitment_term, renewalDate: row.renewal_date,
      duplicateCount: counts.get(row.subscription_id),
      selectable: safeIdentifier(row.subscription_id) && counts.get(row.subscription_id) === 1,
      blockedReason: !safeIdentifier(row.subscription_id) ? 'Missing or unusable subscription ID. Correct the original source.' :
        counts.get(row.subscription_id) > 1 ? 'This subscription ID occurs more than once in the full file. Correct the source; filtering cannot resolve it.' : null });
    return { summary, search: [row.subscription_id, row.source_account_id, row.customer_ref, row.customer_name,
      row.product_family, row.product_name, row.product_sku, row.seat_count, row.commitment_term, row.renewal_date].map(v => (v ?? '').toLowerCase()),
      customer: [row.customer_ref, row.customer_name ?? ''].map(v => v.toLowerCase()),
      product: [row.product_family, row.product_name ?? '', row.product_sku ?? ''].map(v => v.toLowerCase()) };
  });
  const handle = Object.freeze({ version: 'case-finder-v1' });
  caseFinders.set(handle, { text: pax8Text, entries });
  return handle;
}

function finderOwner(handle) {
  const owner = caseFinders.get(handle);
  if (!owner) throw new TypeError('Current source finder is unavailable. Load the source again.');
  return owner;
}

function finderFilters(input) {
  const captured = frozenData(input);
  if (!captured || Array.isArray(captured) || typeof captured !== 'object' || Object.keys(captured).some(k => !FINDER_FIELDS.includes(k))) throw new TypeError('Unsupported search filter.');
  const values = Object.fromEntries(FINDER_FIELDS.map(key => {
    const value = Object.hasOwn(captured, key) ? captured[key] : '';
    if (typeof value !== 'string' || value.length > (key === 'account' ? 128 : 160) || hasHiddenCharacters(value) || key === 'account' && value.includes('\uFFFD')) throw new TypeError('Search filters must be visible text within their stated length limits.');
    return [key, value.trim()];
  }));
  if (['from', 'to'].some(k => values[k] && !validIsoDate(values[k])) || values.from && values.to && values.from > values.to) throw new TypeError('Use valid renewal dates, with the start on or before the end.');
  return values;
}

function canonicalFinderResults(handle, filters = {}, offset = 0) {
  const { entries } = finderOwner(handle);
  const values = finderFilters(filters);
  if (!Number.isInteger(offset) || offset < 0 || offset % 20 !== 0) throw new TypeError('Unsupported search page.');
  const tokens = values.query.toLowerCase().split(/\s+/u).filter(Boolean);
  let excludedDates = 0;
  const matches = entries.filter(entry => {
    if (!tokens.every(token => entry.search.some(value => value.includes(token))) ||
      values.account && entry.summary.sourceAccountId !== values.account ||
      values.customer && !entry.customer.some(value => value.includes(values.customer.toLowerCase())) ||
      values.product && !entry.product.some(value => value.includes(values.product.toLowerCase()))) return false;
    if ((values.from || values.to) && !validIsoDate(entry.summary.renewalDate)) { excludedDates++; return false; }
    return (!values.from || entry.summary.renewalDate >= values.from) && (!values.to || entry.summary.renewalDate <= values.to);
  });
  if (offset > 0 && offset >= matches.length) throw new TypeError('Search page is no longer available. Return to the first page.');
  return frozenData({ version: 'case-finder-results-v1', totalRows: entries.length, matchCount: matches.length,
    excludedDates, offset, pageSize: 20, filters: values, rows: matches.slice(offset, offset + 20).map(entry => entry.summary) });
}

export function searchCaseFinder(handle, filters = {}, offset = 0) {
  return canonicalFinderResults(handle, filters, offset);
}

export function assertCaseFinder(projection, handle, filters = {}, offset = 0) {
  const captured = frozenData(projection);
  const canonical = canonicalFinderResults(handle, filters, offset);
  if (!sameData(captured, canonical)) throw new TypeError('Search results do not match current source and filters.');
  return canonical;
}

function canonicalFoundCase(handle, recordNumber) {
  const owner = finderOwner(handle);
  if (!Number.isInteger(recordNumber) || recordNumber < 1 || recordNumber > owner.entries.length) throw new TypeError('Choose a current source record.');
  const row = owner.entries[recordNumber - 1].summary;
  if (!row.selectable) throw new TypeError(row.blockedReason);
  return canonicalCaseSubject(owner.text, row.subscriptionId);
}

export function selectFoundCase(handle, recordNumber) {
  return canonicalFoundCase(handle, recordNumber);
}

export function assertFoundCase(projection, handle, recordNumber) {
  const captured = frozenData(projection);
  const canonical = canonicalFoundCase(handle, recordNumber);
  if (!sameData(captured, canonical)) throw new TypeError('Chosen case does not match the requested source record.');
  return canonical;
}

// The receipt records a self-attestation, not authentication or eligibility.
// Rebuild readiness from source on every use; a caller's status cannot promote it.
const caseConfirmations = new WeakMap();
export function confirmCaseSelection(pax8Text, subscriptionId) {
  const selection = canonicalCaseSubject(pax8Text, subscriptionId);
  if (!selection.canConfirm) throw new TypeError('Unresolved source selection cannot be confirmed.');
  const receipt = Object.freeze({ version: 'case-selection-confirmation-v1', authenticated: false });
  caseConfirmations.set(receipt, { pax8Text, subscriptionId });
  return receipt;
}

// The evidence owner revokes before replacement/reset. Deletion is irreversible
// for this token and never reads caller-controlled receipt properties.
export function revokeCaseSelectionConfirmation(receipt) {
  caseConfirmations.delete(receipt);
}

function canonicalCaseSelectionReview(pax8Text, subscriptionId, receipt = null) {
  const selection = canonicalCaseSubject(pax8Text, subscriptionId);
  const captured = caseConfirmations.get(receipt);
  const confirmed = selection.canConfirm && captured !== undefined &&
    captured.pax8Text === pax8Text && captured.subscriptionId === subscriptionId;
  return frozenData({ ...selection, status: confirmed ? 'confirmed' : selection.status,
    authenticated: false });
}

export function reviewCaseSelection(pax8Text, subscriptionId, receipt = null) {
  return canonicalCaseSelectionReview(pax8Text, subscriptionId, receipt);
}

export function assertCaseSelectionReview(projection, pax8Text, subscriptionId, receipt = null) {
  const captured = frozenData(projection);
  const canonical = canonicalCaseSelectionReview(pax8Text, subscriptionId, receipt);
  if (!sameData(captured, canonical)) throw new TypeError('Case selection review does not match current source evidence and confirmation.');
  return canonical;
}

const caseHandoffs = new WeakMap();
export function createCaseHandoff(pax8Text, subscriptionId, receipt = null) {
  const handoff = frozenData({ version: 'case-selection-handoff-v1',
    selection: canonicalCaseSelectionReview(pax8Text, subscriptionId, receipt),
    purpose: 'record-comparison-subject', authenticated: false,
    eligibilityVerdict: null, linkageVerdict: null, financialVerdict: null,
    actionAuthorized: false });
  caseHandoffs.set(handoff, { pax8Text, subscriptionId, receipt });
  return handoff;
}

export function assertCaseHandoff(projection, pax8Text, subscriptionId, receipt = null) {
  const owner = caseHandoffs.get(projection);
  if (!owner || owner.pax8Text !== pax8Text || owner.subscriptionId !== subscriptionId || owner.receipt !== receipt) throw new TypeError('Selection handoff source version is stale or unavailable. Rebuild the current handoff.');
  const captured = frozenData(projection);
  const canonical = createCaseHandoff(pax8Text, subscriptionId, receipt);
  if (!sameData(captured, canonical)) throw new TypeError('Selection handoff does not match the current source case and confirmation.');
  return canonical;
}

export function captureCaseHandoff(decision, pax8Text, subscriptionId, receipt = null) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new TypeError('Comparison handoff output must be an object.');
  const descriptor = Object.getOwnPropertyDescriptor(decision, 'caseHandoff');
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Comparison requires a plain-data selection handoff.');
  return assertCaseHandoff(descriptor.value, pax8Text, subscriptionId, receipt);
}

const RECORD_DECISION_KEYS = new Set(['status', 'errors', 'linkIssues', 'verify', 'conflicts',
  'checkedToday', 'nextStep', 'claimReview', 'nextAction', 'policyVersion', 'decisionKind',
  'actionAuthorized', 'financialVerdict', 'issues', 'informedUnknowns', 'selected', 'caseIdentity',
  'fileClaims', 'provenance', 'economicIssues', 'renewalTerm', 'endState', 'reviewBasis', 'caveat', 'caseHandoff']);
export function captureRecordDecision(decision, input = null) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new TypeError('Comparison output must be plain data.');
  if (![Object.prototype, null].includes(Object.getPrototypeOf(decision))) throw new TypeError('Comparison output must have a plain prototype.');
  const descriptors = Object.getOwnPropertyDescriptors(decision);
  const fields = [];
  for (const key of Reflect.ownKeys(descriptors)) {
    if (!RECORD_DECISION_KEYS.has(key) || !Object.hasOwn(descriptors[key], 'value')) throw new TypeError('Comparison output contains an unsupported field or accessor.');
    if (key !== 'caseHandoff') fields.push([key, descriptors[key].value]);
  }
  const captured = frozenData(Object.fromEntries(fields));
  if (captured.decisionKind !== 'scope-fit-only' || captured.actionAuthorized !== false || captured.financialVerdict !== null) throw new TypeError('Comparison output cannot grant financial or action authority.');
  if (['needs-input-repair', 'technical-error'].includes(captured.status)) {
    if (descriptors.caseHandoff) throw new TypeError('Repair output cannot carry a source selection handoff.');
    assertInputFailure(decision, captured);
  } else {
    if (input === null) throw new TypeError('Comparison capture requires its current source input.');
    assertRecordSourceTraces(captured, input);
  }
  return Object.freeze({ ...captured, ...(descriptors.caseHandoff ? { caseHandoff: descriptors.caseHandoff.value } : {}) });
}

export function assertRecordSourceTraces(decision, input) {
  // Reuse the sole comparison owner: authentic coordinates do not validate a
  // coherently altered interpretation, reconciliation, classification or action.
  const capturedInput = frozenData(input);
  const canonical = frozenData(inspectRecordClaims(capturedInput));
  if (!sameData(frozenData(decision), canonical)) throw new TypeError('Comparison interpretation disagrees with its current source and review inputs.');
}

export function assertCaseSubject(projection, pax8Text, subscriptionId) {
  const captured = frozenData(projection);
  const canonical = canonicalCaseSubject(pax8Text, subscriptionId);
  if (!sameData(captured, canonical)) throw new TypeError('The current case subject does not match the selected Pax8 source record. Recheck the supplied file and selection.');
  return canonical;
}

export function assertCaseIdentity(identity, pax8Text, subscriptionId) {
  const captured = frozenData(identity);
  const canonical = canonicalCaseSubject(pax8Text, subscriptionId).subject?.identity;
  if (!canonical || !sameData(captured, canonical)) throw new TypeError('Comparison identity does not match the selected source case.');
  return canonical;
}

// Read descriptor data once. Never reread an alias after identity validation.
export function captureSelectedRecord(decision) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new TypeError('Comparison output must be an object.');
  const descriptor = Object.getOwnPropertyDescriptor(decision, 'selected');
  if (!descriptor) return null;
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('Selected record must contain plain data, not an accessor.');
  const selected = frozenData(descriptor.value);
  if (!selected || Array.isArray(selected) || typeof selected !== 'object' ||
      Object.keys(selected).length !== 3 ||
      !['subscriptionId', 'customerRef', 'haloLineId'].every(key => Object.hasOwn(selected, key) && typeof selected[key] === 'string' && selected[key].length <= MAX_CELL_LENGTH)) {
    throw new TypeError('Selected record must contain the three supplied record identifiers.');
  }
  return selected;
}

const conflictFields = ['distributor', 'billing', 'commitment', 'renewalDate'];

function recordNextAction(status, { errors = [], linkIssues = [], verify = [], conflicts = [] } = {}) {
  let action;
  if (status === 'policy-review-required') action = {
    kind: 'policy-review', source: 'Current Microsoft, Pax8, and HaloPSA rules',
    instruction: 'This record check is unavailable until the product owner reviews the scope policy. Do not reuse an earlier result.',
  };
  else if (status === 'needs-record-identity' || status === 'needs-record-link-review') {
    const first = linkIssues[0];
    action = { kind: status === 'needs-record-identity' && first.target === 'subscription-id' ? 'edit-subscription-id' : 'repair-record-link',
      source: first.source, target: first.target, condition: first.condition,
      instruction: first.code === 'pax-duplicate'
        ? 'Reconcile the duplicate rows against the original Pax8 subscription. Supply one justified row for this subscription, then run the check again. Re-entering the same ID cannot fix duplicate evidence.'
        : first.code === 'pax-absent'
          ? 'Check the subscription ID against the original Pax8 subscription. If it is correct, obtain a corrected Pax8 file containing that subscription. Do not select another customer merely to obtain a match; run the check again after repair.'
          : status === 'needs-record-identity'
            ? 'Use the original Pax8 subscription to enter exactly one valid subscription ID, then run the check again.'
            : 'Correct the selected record IDs or customer references in the named supplied records using the original Pax8 and HaloPSA systems, then rerun. If this subscription legitimately has multiple billing lines or different customer IDs, this normalized prototype cannot establish that mapping: stop here rather than invent a match.' };
  }
  else if (status === 'needs-record-link-confirmation') action = {
    kind: 'confirm-record-link', source: SOURCES.both,
    instruction: 'Compare the selected subscription, customer, and recurring line in the original systems. Confirm the link here only when they describe the same case.',
  };
  else if (status === 'needs-conflict-review') {
    const first = conflicts.find(item => item.resolution === 'unresolved');
    action = { kind: 'resolve-conflict', source: first.system,
      instruction: `Review the ${first.key} disagreement against the original ${first.system} record. Choose the supplied value here or retain your answer and obtain corrected evidence.` };
  }
  else if (status === 'outside-this-release' || status === 'needs-verification') {
    const first = (status === 'outside-this-release' ? errors : verify)[0];
    action = { kind: status === 'outside-this-release' ? 'correct-or-stop' : 'verify-source',
      source: first.source, target: first.target, condition: first.condition,
      instruction: status === 'outside-this-release'
        ? `Review the first outside-scope condition listed in this result against ${first.source}. If an answer or supplied value is wrong, correct it and run the check again. If it is correct, this case is outside this release.`
        : first.target === 'renewal-term'
          ? 'Check Pax8 Manage renewal for the next commitment term, update your response above, then run the check again.'
          : `Resolve the first item to verify listed in this result using ${first.source}. Update the answer or supplied record, then run the check again. If the evidence is unavailable, keep this case unresolved and stop here.` };
  }
  else if (status === 'supplied-claims-look-in-scope') action = { kind: 'continue-outside-prototype',
    source: 'Live Pax8 and HaloPSA records and signed customer agreement',
    instruction: 'This is only a provisional scope result. Use it to prepare a separate agreement and billing review. Confirm current records and signed terms before any financial decision; this prototype stops here.' };
  else throw new TypeError(`No next action for record status ${status}`);
  return assertNextAction(action);
}

function parseSource(text, columns, target, source) {
  try { return parseCsv(text, columns); }
  catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new InputProblem(`${error.message} (${source}).`, target, source);
  }
}

export function validateFileProfile(text, target, source, operation) {
  const profile = qualifiedCsvProfile(target, operation);
  const expectedSource = target === 'pax-file' ? SOURCES.pax : SOURCES.halo;
  if (source !== expectedSource) throw new TypeError('File source must match the qualified role.');
  try { parseSource(text, profile.requiredColumns, target, source); }
  catch (error) {
    if (!(error instanceof InputProblem)) throw error;
    throw new InputProblem(`${error.message} ${profile.label} is required for this operation. ${FILE_SUPPORT.alternative}`, target, source);
  }
  // A capability check has no case/eligibility receipt or grant of authority.
}

function reviewBasis({ subscriptionId, today, answers, renewalTerm, pax, halo }) {
  // Exact selected evidence and all claims, not only the displayed derived values.
  // This is a local review token, never a proof that the supplied files are authentic.
  return JSON.stringify([
    POLICY_VERSION, subscriptionId, today,
    answers.reseller, answers.distributor, answers.billing, answers.commitment,
    answers.renewal, answers.renewalDate ?? null, answers.agreement, renewalTerm,
    pax, rawCells(pax), halo, rawCells(halo),
  ]);
}

export function inspectRecords(input, handoff = null, receipt = null) {
  // Receipt identity stays with its WeakMap owner, outside plain-data capture.
  let captured;
  try { captured = frozenData(input); }
  catch (error) { throw new TypeError(`Record input and resolutions must bind plain data: ${error.message}`); }
  const canonical = handoff === null ? null : assertCaseHandoff(handoff, captured.pax8Text, captured.subscriptionId, receipt);
  const decision = inspectRecordClaims(captured);
  return canonical === null ? decision : { ...decision, caseHandoff: canonical };
}

function inspectRecordClaims(input) {
  let captured;
  try { captured = frozenData(input); }
  catch (error) { throw new TypeError(`Record input and resolutions must bind plain data: ${error.message}`); }
  let { pax8Text, haloText, subscriptionId, today, answers, renewalTerm = 'not-asked', resolutions = {}, linkConfirmation = null } = captured;
  answers = captureAnswers(answers);
  const initialFit = evaluateFit(answers, { today });
  if (initialFit.status === 'policy-review-required') {
    return { status: 'policy-review-required', errors: [], linkIssues: [], verify: initialFit.needsVerification.map((item) => item.message),
      conflicts: [], checkedToday: today, nextStep: initialFit.nextStep,
      claimReview: blockedClaimReview(answers, { today, policyVersion: POLICY_VERSION, stage: 'policy-blocked' }),
      nextAction: recordNextAction('policy-review-required'), policyVersion: POLICY_VERSION,
      decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null };
  }
  if (linkConfirmation !== null && (typeof linkConfirmation !== 'object' || Array.isArray(linkConfirmation) ||
      linkConfirmation.confirmed !== true || typeof linkConfirmation.basis !== 'string')) {
    throw new TypeError('linkConfirmation must be bound to the current selected records');
  }
  if (!['annual', 'monthly', 'other', 'unknown', 'not-asked'].includes(renewalTerm)) {
    throw new TypeError('renewalTerm must be an explicit next-term choice');
  }
  if (!resolutions || typeof resolutions !== 'object' || Array.isArray(resolutions) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(resolutions)) ||
      Object.entries(resolutions).some(([key, value]) => !conflictFields.includes(key) || !value || typeof value !== 'object' ||
        !['accept-file', 'keep-answer'].includes(value.choice) || typeof value.questionnaire !== 'string' ||
        typeof value.fileValue !== 'string' || typeof value.basis !== 'string')) {
    throw new TypeError('resolutions must bind an allowed choice to the current case and conflicting values');
  }
  const pax8Rows = parseSource(pax8Text, PAX8_COLUMNS, 'pax-file', SOURCES.pax);
  const haloRows = parseSource(haloText, HALO_COLUMNS, 'halo-file', SOURCES.halo);
  const errors = [];
  const linkIssues = [];
  const verify = [];
  const conflicts = [];
  const id = String(subscriptionId ?? '').trim();
  const identityResult = (message, code = 'invalid-id', target = 'subscription-id') => { const problem = issue(code, 'identity', SOURCES.pax, target, message); return ({ status: 'needs-record-identity', errors, linkIssues: [message], issues: { errors: [], link: [problem], verify: [] }, verify, conflicts,
    nextStep: 'Select or correct one subscription ID, then check the supplied files again.',
    claimReview: blockedClaimReview(answers, { today, policyVersion: POLICY_VERSION, stage: 'identity-blocked' }),
    nextAction: recordNextAction('needs-record-identity', { linkIssues: [problem] }),
    decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null }); };
  if (!id) return identityResult('Select one Pax8 subscription ID.');
  if (!safeIdentifier(id)) return identityResult('Subscription ID contains unsupported invisible or control characters or exceeds 128 characters.');

  const paxMatches = paxSelection(pax8Rows, id).matches.map(item => item.row);
  if (paxMatches.length !== 1) {
    return identityResult(`Expected one Pax8 row for subscription ${id}; found ${paxMatches.length}.`, paxMatches.length ? 'pax-duplicate' : 'pax-absent', 'pax-file');
  }
  const pax = selectedRecord(paxMatches[0], [...PAX8_COLUMNS, ...ECONOMIC_COLUMNS, ...IDENTITY_COLUMNS]);
  const haloMatches = haloRows.filter((row) => row.subscription_id === id);
  if (haloMatches.length !== 1) {
    return { status: 'needs-record-link-review', errors, linkIssues: [`Expected one HaloPSA row linked to subscription ${id}; found ${haloMatches.length}.`],
      verify, conflicts, nextStep: 'Supply exactly one confirmed HaloPSA recurring line for this subscription, then run the check again.',
      claimReview: blockedClaimReview(answers, { today, policyVersion: POLICY_VERSION, stage: 'link-blocked' }),
      nextAction: recordNextAction('needs-record-link-review', { linkIssues: [issue('halo-match-count', 'link', SOURCES.both, 'halo-file', `Expected one HaloPSA row linked to subscription ${id}; found ${haloMatches.length}.`)] }),
      decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null };
  }
  const halo = selectedRecord(haloMatches[0], HALO_COLUMNS);
  if (![pax.subscription_id, pax.customer_ref].every(safeIdentifier)) {
    linkIssues.push(issue('pax-identifiers', 'link', SOURCES.pax, 'pax-file', 'Selected record identifiers in Pax8 contain missing, invisible, control, or overlong values. Confirm the original records.'));
  }
  if (![halo.subscription_id, halo.customer_ref, halo.line_id].every(safeIdentifier)) {
    linkIssues.push(issue('halo-identifiers', 'link', SOURCES.halo, 'halo-file', 'Selected record identifiers in HaloPSA contain missing, invisible, control, or overlong values. Confirm the original records.'));
  }
  if (haloRows.filter((row) => row.line_id === halo.line_id).length !== 1) {
    linkIssues.push(issue('halo-duplicate-line', 'link', SOURCES.halo, 'halo-file', 'The selected HaloPSA line ID is repeated in the supplied file. Confirm which line belongs to this subscription.'));
  }
  const basis = reviewBasis({ subscriptionId: id, today, answers, renewalTerm, pax, halo });
  if (!pax.customer_ref || !halo.customer_ref || pax.customer_ref !== halo.customer_ref) {
    linkIssues.push(issue('customer-link', 'link', SOURCES.both, 'both-files', 'Pax8 and HaloPSA customer references do not match. Confirm the link before using this case.'));
  }
  if (!pax.subscription_id || !halo.line_id) linkIssues.push(issue('missing-link-id', 'link', SOURCES.both, 'both-files', 'The selected records need a subscription ID and recurring line ID.'));

  const fileClaims = {
    distributor: classifiedValue(pax.distributor, 'pax8', ['other', 'microsoft direct']),
    billing: classifiedValue(halo.billing_system, 'halopsa', ['other']),
    commitment: commitmentClaim(pax),
    renewal: validIsoDate(pax.renewal_date) ? 'exact' : 'unknown',
    renewalDate: validIsoDate(pax.renewal_date) ? pax.renewal_date : undefined,
  };
  const economicIssues = economicEvidenceIssues(pax);
  const economicColumns = ECONOMIC_COLUMNS
    .filter((key) => Object.hasOwn(pax, key));
  const scheduledClaim = termValue(pax.scheduled_commitment_term);
  if (['annual', 'monthly', 'other'].includes(renewalTerm) &&
      ['annual', 'monthly', 'other'].includes(scheduledClaim) && renewalTerm !== scheduledClaim) {
    economicIssues.push(issue('next-term-conflict', 'next-term', SOURCES.pax, 'renewal-term', `Your reported next term “${renewalTerm}” conflicts with the supplied scheduled term “${pax.scheduled_commitment_term}”. Confirm the renewal setting in Pax8.`));
  }
  const paxRaw = rawCells(pax), haloRaw = rawCells(halo);
  const provenance = {
    distributor: { questionnaire: answers.distributor, file: fileClaims.distributor, system: 'Pax8', rowId: pax.subscription_id, columns: ['distributor'], raw: [paxRaw.distributor] },
    billing: { questionnaire: answers.billing, file: fileClaims.billing, system: 'HaloPSA', rowId: halo.line_id, columns: ['billing_system'], raw: [haloRaw.billing_system] },
    commitment: { questionnaire: answers.commitment, file: fileClaims.commitment, system: 'Pax8', rowId: pax.subscription_id, columns: ['product_family', 'commerce_model', 'seat_based', 'commitment_term'], raw: ['product_family', 'commerce_model', 'seat_based', 'commitment_term'].map(key => paxRaw[key]) },
    renewalDate: { questionnaire: answers.renewal === 'exact' ? answers.renewalDate : answers.renewal, file: fileClaims.renewalDate ?? 'unknown', system: 'Pax8', rowId: pax.subscription_id, columns: ['renewal_date'], raw: [paxRaw.renewal_date] },
    reseller: { questionnaire: answers.reseller, file: 'not established by these CSVs', system: null, rowId: null, columns: [] },
    agreement: { questionnaire: answers.agreement, file: 'not supplied', system: null, rowId: null, columns: [] },
    renewalContext: { questionnaire: renewalTerm, file: economicColumns.length ? 'optional source context supplied' : 'not supplied',
      system: economicColumns.length ? 'Pax8' : null, rowId: economicColumns.length ? pax.subscription_id : null,
      columns: economicColumns, raw: economicColumns.map((key) => paxRaw[key]) },
  };
  for (const fact of Object.values(provenance)) {
    if (fact.system && fact.columns.length) fact.trace = rowSourceTrace(fact.system === 'Pax8' ? pax : halo, fact.columns);
  }
  const sourceTraces = { endState: rowSourceTrace(pax, ['end_of_term_state']), scheduledTerm: Object.hasOwn(pax, 'scheduled_commitment_term') ? rowSourceTrace(pax, ['scheduled_commitment_term']) : null };
  const merged = { ...answers };
  const origins = Object.fromEntries(SCOPE_KEYS.map(key => [key, selfReportOrigin(key === 'agreement' ? 'agreement-response' : 'carried-response')]));
  const setOrigin = (key, origin) => {
    origins[key] = origin;
    if (key === 'renewalDate') origins.renewal = origin;
  };
  const informedUnknowns = [];
  for (const key of conflictFields) {
    const fact = provenance[key];
    const questionnaireUnknown = fact.questionnaire === 'unknown' || fact.questionnaire === 'within-60-approx';
    const fileUnknown = fact.file === 'unknown';
    if (fileUnknown) {
      if (key === 'renewalDate') {
        if (answers.renewal !== 'exact') merged.renewal = answers.renewal;
        setOrigin(key, selfReportOrigin(answers.renewal === 'exact' ? 'date-response-retained' : 'carried-response'));
      } else if (questionnaireUnknown || fact.questionnaire === (key === 'distributor' ? 'pax8' : key === 'billing' ? 'halopsa' : 'annual-m365-nce')) {
        merged[key] = 'unknown';
        setOrigin(key, { kind: 'unresolved', reason: 'source-unavailable' });
      } else {
        setOrigin(key, selfReportOrigin('outside-response-retained'));
      }
      verify.push(issue('source-unknown', key, fact.system === 'HaloPSA' ? SOURCES.halo : SOURCES.pax, fact.system === 'HaloPSA' ? 'halo-file' : 'pax-file', `The supplied ${fact.system} value for ${key} is missing or unknown. Check the original record.`));
      continue;
    }
    if (questionnaireUnknown || fact.questionnaire === fact.file) {
      if (key === 'renewalDate') { merged.renewal = 'exact'; merged.renewalDate = fact.file; }
      else merged[key] = fact.file;
      setOrigin(key, fileOrigin(fact.system, questionnaireUnknown ? 'file-informs-unknown' : 'file-agrees'));
      if (questionnaireUnknown) informedUnknowns.push({ key, questionnaire: fact.questionnaire, fileValue: fact.file, system: fact.system, rowId: fact.rowId });
      continue;
    }
    const saved = Object.hasOwn(resolutions, key) ? resolutions[key] : undefined;
    if (saved && (saved.questionnaire !== fact.questionnaire || saved.fileValue !== fact.file || saved.basis !== basis)) {
      throw new TypeError(`The ${key} resolution is stale; review the changed claims again`);
    }
    const resolution = saved?.choice ?? 'unresolved';
    conflicts.push({ key, questionnaire: fact.questionnaire, fileValue: fact.file, system: fact.system,
      rowId: fact.rowId, columns: fact.columns, resolution });
    if (resolution === 'accept-file') {
      if (key === 'renewalDate') { merged.renewal = 'exact'; merged.renewalDate = fact.file; }
      else merged[key] = fact.file;
      setOrigin(key, fileOrigin(fact.system, 'file-accepted'));
    } else {
      if (key === 'renewalDate') { merged.renewal = 'unknown'; merged.renewalDate = undefined; }
      else merged[key] = 'unknown';
      setOrigin(key, { kind: 'unresolved', reason: resolution === 'keep-answer' ? 'answer-kept' : 'conflict-unresolved' });
      if (resolution === 'keep-answer') verify.push(issue('corrected-evidence', key, fact.system === 'HaloPSA' ? SOURCES.halo : SOURCES.pax, fact.system === 'HaloPSA' ? 'halo-file' : 'pax-file', `Updated ${fact.system} evidence is needed for ${key}; the questionnaire claim alone cannot clear the discrepancy.`));
    }
  }
  if (Object.keys(resolutions).some((key) => !conflicts.some((conflict) => conflict.key === key))) {
    throw new TypeError('A resolution does not match a current conflict; review the current answers and files again');
  }
  if (answers.reseller === 'no') {
    verify.push(conditionIssue('reseller', 'A supplied Pax8 row does not establish reseller responsibility. Confirm who is financially responsible and change the questionnaire answer if it was mistaken.'));
  }
  if (answers.agreement === 'not-asked') verify.push(conditionIssue('agreement', 'Before a record-based coverage check, say whether the signed customer order or agreement is available.'));
  const endState = normalized(pax.end_of_term_state);
  let endStateState;
  if (isUnknown(endState)) {
    endStateState = 'unknown';
    verify.push(issue('end-state-unknown', 'end-state', SOURCES.pax, 'pax-file', 'Confirm the subscription end-of-term state in Pax8.'));
  } else if (!['renew', 'cancel', 'extended'].includes(endState)) {
    endStateState = 'unrecognized';
    verify.push(issue('end-state-unrecognized', 'end-state', SOURCES.pax, 'pax-file', `End-of-term state "${pax.end_of_term_state}" is not recognized; confirm it in Pax8.`));
  } else {
    endStateState = 'known';
    if (endState !== 'renew') errors.push(issue('end-state-outside', 'end-state', SOURCES.pax, 'pax-file', `The uploaded Pax8 row shows end-of-term state "${endState}". This release checks annual renewals set to renew.`));
  }
  if (fileClaims.renewal === 'unknown') verify.push(issue('renewal-source-unknown', 'renewal', SOURCES.pax, 'pax-file', 'Confirm the exact commitment renewal date in Pax8.'));

  if (economicIssues.length) {
    verify.push(...economicIssues);
    if (['annual-m365-nce', 'monthly'].includes(fileClaims.commitment)) {
      merged.commitment = 'unknown';
      setOrigin('commitment', { kind: 'scope-guard', reason: 'economic-guard' });
    }
  }
  if (renewalTerm === 'annual' && fileClaims.commitment === 'monthly' && !economicIssues.length) {
    verify.push(issue('scheduled-change-missing', 'next-term', SOURCES.pax, 'pax-file', 'You reported an annual term at renewal, but the supplied current term is monthly and no matching scheduled term was supplied. Confirm the scheduled change in Pax8.'));
  }
  if (renewalTerm === 'not-asked' || renewalTerm === 'unknown') {
    verify.push(issue('next-term-unknown', 'next-term', SOURCES.pax, 'renewal-term', 'Check Pax8 Manage renewal for the commitment term that will apply at the next renewal. The current term or invoice frequency cannot establish it.'));
  } else if (renewalTerm !== 'annual' && !economicIssues.length) {
    errors.push(issue('next-term-outside', 'next-term', SOURCES.pax, 'renewal-term', `You reported that the next commitment term is “${renewalTerm}”. This release checks upcoming annual commitments; confirm the renewal setting in Pax8 if this is mistaken.`));
  }

  const fit = evaluateFit(merged, { today });
  const routedFitIssue = item => {
    const key = item.condition === 'renewal' || item.condition === 'renewal-time' ? 'renewalDate' : item.condition;
    const fromFile = provenance[key]?.system && provenance[key].file !== 'unknown' && !conflicts.some(conflict => conflict.key === key && conflict.resolution !== 'accept-file');
    // Same-day cutoff is not repairable by changing a CSV date without new evidence.
    const target = item.condition === 'renewal-time' ? 'renewal-answer' : fromFile ? (key === 'billing' ? 'halo-file' : 'pax-file') : item.target;
    return issue(item.code, item.condition, fromFile ? (key === 'billing' ? SOURCES.halo : SOURCES.pax) : item.source, target, item.message);
  };
  if (fit.status === 'outside-this-release') errors.push(...fit.unsupported.map(routedFitIssue));
  verify.push(...fit.needsVerification.map(routedFitIssue));
  const status = fit.status === 'policy-review-required' ? 'policy-review-required' :
    linkIssues.length ? 'needs-record-link-review' :
    linkConfirmation?.basis !== basis ? 'needs-record-link-confirmation' :
    conflicts.some((conflict) => conflict.resolution === 'unresolved') ? 'needs-conflict-review' :
      errors.length ? 'outside-this-release' :
      verify.length ? 'needs-verification' : 'supplied-claims-look-in-scope';
  const nextStep = {
    'policy-review-required': 'Review and update the scope policy before classifying this case.',
    'needs-record-link-review': 'Correct the selected record IDs or customer references in the supplied files, then run this check again.',
    'needs-record-link-confirmation': 'Compare the selected subscription, HaloPSA line, and customer against the original systems. Confirm the link only if they describe this same case.',
    'needs-conflict-review': 'Review each conflicting claim. Use a supplied value explicitly or obtain corrected evidence before proceeding.',
    'outside-this-release': 'Review the named outside-scope conditions. If an answer or supplied value is wrong, correct it and run the check again.',
    'needs-verification': 'Check the listed missing facts in the original systems, then run this check again.',
    'supplied-claims-look-in-scope': 'This is only a provisional scope result. Verify live records and the signed agreement before any financial decision or action.',
  }[status];
  return {
    status, errors: [...new Set(errors.map(item => item.message))], linkIssues: [...new Set(linkIssues.map(item => item.message))], verify: [...new Set(verify.map(item => item.message))],
    issues: { errors, link: linkIssues, verify }, conflicts, informedUnknowns,
    claimReview: recordClaimReview({ answers, merged, origins, fileClaims, provenance, sourceTraces, conflicts,
      renewalTerm, scheduledClaim, pax, paxRaw, halo, endState, endStateState, economicIssues, fit, status, basis,
      linkState: linkIssues.length ? 'unusable' : linkConfirmation?.basis === basis ? 'self-attested' : 'awaiting-confirmation',
      today, policyVersion: POLICY_VERSION }),
    selected: { subscriptionId: pax.subscription_id, customerRef: pax.customer_ref, haloLineId: halo.line_id },
    caseIdentity: rowIdentity(pax),
    fileClaims, provenance, economicIssues: economicIssues.map(item => item.message), renewalTerm, endState, reviewBasis: basis, checkedToday: today, nextStep,
    nextAction: recordNextAction(status, { errors, linkIssues, verify, conflicts }),
    decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
    caveat: 'Questionnaire answers and the next-term selection are self-reported. The current subscription commitment is read from the supplied Pax8 commitment_term field, not invoice frequency. Missing scheduled-change columns do not prove that no change is scheduled. Uploaded CSV values and their customer-reference link are supplied claims; this check cannot establish vendor authenticity, file freshness, active billing state, or signed agreement terms. Accepting a file value records your choice; it does not verify financial coverage or a safe action deadline.',
  };
}
