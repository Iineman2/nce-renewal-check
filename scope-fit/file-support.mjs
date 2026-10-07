// The only current capability declaration. Qualification is local and synthetic;
// an enabled normalized profile does not authenticate the system it names.
import { AUTHORIZED_HANDLING, assertHandlingDeclaration } from './file-handling-policy.mjs';
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}

export const FILE_SUPPORT = freeze({
  policyVersion: 'file-support-v4', readerVersion: 'normalized-csv-v4', resourceVersion: 'resource-csv-v3',
  qualification: 'local-synthetic-normalized-csv', qualificationLabel: 'local synthetic normalized CSV', format: 'csv',
  authorizedHandling: AUTHORIZED_HANDLING,
  contentHandling: {
    version: 'data-only-csv-v1', reader: 'literal-csv', presentation: 'text-only',
    formulas: 'literal-text', instructions: 'literal-text', suppliedLinks: 'inactive',
    activeReaders: [], sourceAuthority: false,
    originalRecovery: { trigger: 'explicit-user-action', mediaType: 'application/octet-stream', filename: 'generated-role-digest-bin' },
  },
  encoding: 'UTF-8, with or without an initial BOM',
  dialect: 'Comma-separated; double-quoted fields, doubled quotes and quoted line breaks; LF, CRLF or CR records.',
  normalization: 'Headers are trimmed and lowercased, nonempty and unique. Values are trimmed. Completely empty records are skipped. At least one data record is required; every record must match the header width.',
  limits: { inputBytes: 2_000_000, decodedUtf8Bytes: 2_000_000, decodedCodeUnits: 2_000_000,
    dataRows: 5000, sourceRecords: 10_000, totalCells: 65_536, columns: 64,
    headerCodeUnits: 64, cellCodeUnits: 1024, lexemeCodeUnits: 4096, readTimeoutMs: 30_000,
    filenameCodeUnits: 16_384, mediaTypeCodeUnits: 1024, activeJobs: 2, inFlightBytes: 4_000_000, cachedSources: 2,
    packetValues: 1_000_000, packetKeyCodeUnits: 64, packetDepth: 12, packetStringCodeUnits: 16_000_000,
    previewCells: 64, evidenceElements: 1500, evidenceNodes: 3000, evidenceCodeUnits: 4_000_000,
    bodyElements: 10_000, bodyNodes: 20_000, domDepth: 64, opaqueCovers: 64,
    cancelAckMs: 250, selectionAckMs: 100 },
  pickerAccept: '',
  operations: { 'find-case': 'Find and inspect a case in the supplied Pax8 records', 'compare-records': 'Compare supplied record facts for one selected case' },
  profiles: [
    { id: 'normalized-pax8-v1', label: 'Normalized Pax8 CSV', target: 'pax-file', operations: ['find-case', 'compare-records'],
      requiredColumns: ['subscription_id', 'customer_ref', 'distributor', 'product_family', 'commerce_model', 'seat_based', 'commitment_term', 'renewal_date', 'end_of_term_state'] },
    { id: 'normalized-halo-v1', label: 'Normalized HaloPSA CSV', target: 'halo-file', operations: ['compare-records'],
      requiredColumns: ['line_id', 'subscription_id', 'customer_ref', 'billing_system'] },
  ],
  unavailable: ['Native Pax8/HaloPSA export profiles', 'Generic CSV field mapping', 'XLSX workbooks', 'PDF agreements', 'DOCX agreements', 'OCR'],
  alternative: 'Keep the original file. Prepare a separate normalized comma-separated CSV saved as UTF-8 with the required columns and original source facts. Do not invent missing values. Reselect the corrected copy and retry. Agreement files cannot be read here.',
  boundary: 'Readable normalized records do not verify vendor origin, authenticity, freshness, completeness, case identity, a billing link, eligibility or agreement coverage. No financial action is authorized.',
  recordGuidance: [
    'Pax8 identity context: source_account_id is accepted as an optional CSV column, but a usable original account identifier is required to confirm the intended case. Missing account, customer or exact renewal date blocks case progression. Supply corrected evidence from the original system and rerun; do not invent an identifier. Optional customer_name, product_name, product_sku and seat_count help you recognize a row; names, product labels and seat text do not establish identity.',
    'Use Microsoft 365, NCE, yes, annual, and renew for a supported Pax8 row. The commitment_term column means subscription duration, not how often Pax8 invoices you. Monthly invoicing can accompany an annual commitment; do not write monthly unless the commitment term itself is monthly. Dates use YYYY-MM-DD.',
    'Optional Pax8 context columns: billing_frequency, scheduled_commitment_term, scheduled_billing_frequency, term_start_date, and term_end_date. Use monthly, annual, or upfront for billing frequency. A known scheduled term change, contradictory billing plan, or inconsistent term dates requires review. Missing optional columns do not prove there are no scheduled changes.',
    'Blank, unknown, N/A, not sure, unspecified, and TBD mean a value is not established; they do not mean another distributor, billing system, or commitment. Unrecognized labels also require verification instead of an automatic outside-scope result.',
  ],
});

// Text derives from the same capability owner; the DOM is checked against it.
export function supportProjection() {
  const limits = FILE_SUPPORT.limits;
  return freeze({
    controlReadStatus: 'Processing files.',
    summary: `Current file support: ${FILE_SUPPORT.profiles.map(profile => profile.label).join('; ')} only. File names and MIME labels cannot establish support. Open the support details before preparing files.`,
    readStatus: `Processing the selected files locally in stoppable workers. No current record result is available. Each task deadline is ${limits.readTimeoutMs / 1000} seconds. Cancel stops active processing.`,
    lines: [
      `Enabled: ${FILE_SUPPORT.profiles.map(profile => profile.label).join('; ')}. ${FILE_SUPPORT.encoding}. ${FILE_SUPPORT.dialect}`,
      FILE_SUPPORT.normalization,
      ...FILE_SUPPORT.profiles.flatMap(profile => [
        `${profile.label} required columns: ${profile.requiredColumns.join(', ')}.`,
        `${profile.label} permits: ${profile.operations.map(op => FILE_SUPPORT.operations[op]).join('; ')}.`,
      ]),
      `Limits per CSV, all applied together: ${limits.inputBytes.toLocaleString('en-US')} original bytes and ${limits.decodedUtf8Bytes.toLocaleString('en-US')} decoded UTF-8 bytes; ${limits.decodedCodeUnits.toLocaleString('en-US')} decoded UTF-16 code units; ${limits.dataRows.toLocaleString('en-US')} data records; ${limits.sourceRecords.toLocaleString('en-US')} lexical source records including blanks; ${limits.totalCells.toLocaleString('en-US')} total cells including headers and blanks; ${limits.columns} columns; ${limits.headerCodeUnits} normalized header units; ${limits.cellCodeUnits.toLocaleString('en-US')} raw cell units; ${limits.lexemeCodeUnits.toLocaleString('en-US')} lexical field units. UTF-16 units count supplementary characters twice. Worker task deadline: ${limits.readTimeoutMs / 1000} seconds through original custody publication.`,
      `Resource policy ${FILE_SUPPORT.resourceVersion}: at most ${limits.activeJobs} active tasks, no queue, ${limits.inFlightBytes.toLocaleString('en-US')} admitted input bytes in flight and ${limits.cachedSources} current source caches. Original previews show at most 5 records and ${limits.previewCells} cells per source page. Presentation caps: ${limits.evidenceElements} evidence elements, ${limits.evidenceNodes} evidence nodes, ${limits.evidenceCodeUnits.toLocaleString('en-US')} evidence text units; ${limits.bodyElements.toLocaleString('en-US')} global elements, ${limits.bodyNodes.toLocaleString('en-US')} global nodes, depth ${limits.domDepth}, ${limits.opaqueCovers} cover candidates. Selected-file metadata: ${limits.filenameCodeUnits.toLocaleString('en-US')} filename units and ${limits.mediaTypeCodeUnits} media-type units. Worker packets: ${limits.packetValues.toLocaleString('en-US')} values, depth ${limits.packetDepth}, ${limits.packetStringCodeUnits.toLocaleString('en-US')} string value units; ${limits.packetKeyCodeUnits} units per property name. Cancellation target ${limits.cancelAckMs} ms and selection acknowledgement target ${limits.selectionAckMs} ms apply to the measured reference environment. Input reservations are not peak resident memory. Scheduling suspension, wider devices and actual peak memory remain unqualified. Failed native termination halts admission until reload. Pending native custody verification stays reserved until settled; cancellation cannot erase browser platform crypto work.`,
      `Unavailable: ${FILE_SUPPORT.unavailable.join('; ')}.`, FILE_SUPPORT.alternative, FILE_SUPPORT.boundary,
      `Current contract: ${FILE_SUPPORT.policyVersion}; reader: ${FILE_SUPPORT.readerVersion}; profiles: ${FILE_SUPPORT.profiles.map(profile => profile.id).join(', ')}. Qualification: ${FILE_SUPPORT.qualificationLabel}.`,
      ...FILE_SUPPORT.recordGuidance,
      `Content handling ${FILE_SUPPORT.contentHandling.version}: formulas, scripts, links and instructions remain literal data. Only fixed CSV rules interpret supplied business fields; file text cannot grant application or financial authority. Original recovery is an explicit opaque binary download.`,
    ],
  });
}

// A concise UI reference. Detailed capabilities and limits remain owned above;
// the glossary does not grant support or turn supplied records into verification.
export function glossaryProjection() {
  assertHandlingDeclaration(FILE_SUPPORT.authorizedHandling);
  qualifiedCsvProfile('pax-file', 'compare-records');
  qualifiedCsvProfile('halo-file', 'compare-records');
  return freeze([
    { term: 'Normalized CSV', definition: 'Comma-separated UTF-8 data using the example columns. Native exports, XLSX and agreement files are unsupported.' },
    { term: 'Pax8 CSV', definition: 'Subscription records. Include source_account_id to confirm a case.' },
    { term: 'HaloPSA CSV', definition: 'Recurring billing records linked by subscription_id and customer_ref.' },
    { term: 'Subscription ID', definition: 'The exact Pax8 identifier in the subscription_id column.' },
    { term: 'Commitment term', definition: 'How long the subscription lasts, separate from how often it is billed.' },
    { term: 'Original file', definition: 'The unchanged file you supplied, available to inspect or save.' },
    ...FILE_SUPPORT.authorizedHandling.glossary,
  ]);
}

export function qualifiedCsvProfile(target, operation) {
  // Scalars only: an object/accessor/foreign declaration cannot grant capability.
  if (typeof target !== 'string' || typeof operation !== 'string') throw new TypeError('File role and operation must name the current support contract.');
  const profile = FILE_SUPPORT.profiles.find(item => item.target === target);
  if (!profile || !Object.hasOwn(FILE_SUPPORT.operations, operation) || !profile.operations.includes(operation)) {
    throw new TypeError('This file role or operation is unavailable under the current support contract.');
  }
  return profile;
}
