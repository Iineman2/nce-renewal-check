import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { FILE_SUPPORT } from './file-support.mjs';
import { HALO_COLUMNS, PAX8_COLUMNS } from './preflight.mjs';
import { scanCsvEvidence, csvByteOffsets, csvByteOffsetSteps, scanCsvEvidenceSteps, assertCsvFailureFrontierSteps } from './csv-evidence.mjs';
import { captureResourceData, captureResourceDataAsync, assertWorkerScan, assertWorkerScanShapeAsync, assertWorkerScanAsync, runBoundedStepsAsync } from './resource-packet.mjs';
import { maximumCellByteCsv, padCsvBytes } from './qc-resource-fixtures.mjs';
import { readLocalEvidence, FileEvidenceRuntimeError, observedFileText } from './runtime.mjs';
import { readBoundedLocalEvidence, processingState, cachedLexicalEvidence } from './bounded-reader.mjs';
import { transferFileEvidence, originalBytes, sourceProjection, sourceText, releaseFileEvidence } from './file-evidence.mjs';
import { InputProblem, SOURCES } from './actions.mjs';

// This double exercises the public receiver and private packet issuance/adoption.
// Both the original packet and each deliberately altered packet pass through
// native structuredClone. It makes no claim about native Worker scheduling.
const roles = ['pax-file', 'halo-file'];
const header = role => role === 'pax-file' ? 'source_account_id,' + PAX8_COLUMNS.join(',') : HALO_COLUMNS.join(',');
const row = (role, customer = 'c') => role === 'pax-file' ? `a,s,${customer},pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew` : `l,s,${customer},HaloPSA`;
const textFor = role => header(role) + '\n' + row(role) + '\n\n';
const source = role => role === 'pax-file' ? SOURCES.pax : SOURCES.halo;
const operation = role => role === 'pax-file' ? 'find-case' : 'compare-records';
const input = (role, value = textFor(role), name = 'source.csv') => new File([value], name, { lastModified: 7 });
const nativeWorker = globalThis.Worker, nativeFile = globalThis.File;
globalThis.File = File;
let mutation = null, receiving = null;
const instances = [];
class IssuedPacketWorker extends EventTarget {
  constructor() { super(); this.stops = 0; this.sent = 0; this.mutated = false; this.received = false; instances.push(this); }
  postMessage(request) {
    this.sent++;
    const change = mutation, before = receiving;
    this.completion = this.emit(request, change, before).catch(error => {
      this.failure = error; this.onerror?.({ preventDefault() {} });
    });
  }
  terminate() { this.stops++; }
  async emit(request, change, before) {
    let handle = null;
    try {
      const evidence = await readLocalEvidence(request.file, request.role, request.source, request.timeoutMs, request.operation);
      handle = evidence.handle;
      const transferred = transferFileEvidence(handle, request.role);
      const packet = structuredClone({ protocol: FILE_SUPPORT.resourceVersion, id: request.id, role: request.role,
        operation: request.operation, profile: request.profile, policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion,
        status: 'completed', ...transferred.data, observedText: observedFileText(evidence, request.role, request.file), scan: null, problem: evidence.problem?.message ?? null, bytes: transferred.bytes });
      change?.(packet); this.mutated = true; this.completedWireScan = packet.scan;
      const delivered = structuredClone(packet);
      before?.(delivered); this.received = true;
      await this.onmessage?.({ data: delivered });
    } finally { releaseFileEvidence(handle); }
  }
}
globalThis.Worker = IssuedPacketWorker;
after(async () => {
  await Promise.all(instances.map(worker => worker.completion));
  globalThis.Worker = nativeWorker; globalThis.File = nativeFile;
});
const read = (role, file = input(role), signal = null) => readBoundedLocalEvidence(file, role, source(role), 30000, operation(role), signal);
const idle = () => {
  const state = processingState();
  assert.equal(state.activeJobs, 0); assert.equal(state.reservedBytes, 0); assert.equal(state.halted, false);
};
const technical = error => error instanceof FileEvidenceRuntimeError && !(error instanceof InputProblem) && !error.message.includes('CONFIDENTIAL');
async function rejected(role, transform, file = input(role), before = null) {
  mutation = transform; receiving = before;
  try {
    const pending = read(role, file), worker = instances.at(-1);
    await assert.rejects(pending, technical); await worker.completion;
    assert.equal(worker.failure, undefined); assert.equal(worker.mutated, true); assert.equal(worker.received, true);
    assert.equal(worker.sent, 1); assert.equal(worker.stops, 1); idle();
    assert.equal(processingState().cachedSources, 0);
  } finally { mutation = receiving = null; }
}
async function accepted(role, file = input(role)) {
  const pending = read(role, file), worker = instances.at(-1), result = await pending;
  await worker.completion;
  assert.equal(worker.failure, undefined); assert.equal(worker.received, true); assert.equal(worker.stops, 1); assert.equal(worker.completedWireScan,null); idle();
  assert.deepEqual(originalBytes(result.handle, role), new Uint8Array(await file.arrayBuffer()));
  const projection = sourceProjection(result.handle, role);
  assert.equal(projection.authenticated, false); assert.equal(projection.actionAuthorized, false); assert.equal(projection.financialVerdict, null);
  return result;
}
const schemas = {
  record: ['sourceRecordOrdinal','dataRecordNumber','originalRecord','startOffset','endOffset','startByte','endByte','terminator','terminatorLocation','cells'],
  cell: ['columnIndex','lexeme','rawValue','normalizedValue','startOffset','endOffset','startByte','endByte'],
  location: ['startOffset','endOffset','startByte','endByte'],
  run: ['count','totalCells','firstSourceRecordOrdinal','lastSourceRecordOrdinal','startOffset','endOffset','startByte','endByte','firstRecord'],
  scan: ['version','origin','complete','records','emptyRuns','sourceRecordCount','failure'],
  failure: ['message','startOffset','endOffset','startByte','endByte','sourceRecordOrdinal']
};
const targets = [
  ['record', p => p.scan.records[1]],
  ['cell', p => p.scan.records[1].cells[0]],
  ['location', p => p.scan.records[1].terminatorLocation],
  ['run', p => p.scan.emptyRuns[0]],
  ['record', p => p.scan.emptyRuns[0].firstRecord],
  ['cell', p => p.scan.emptyRuns[0].firstRecord.cells[0]],
  ['location', p => p.scan.emptyRuns[0].firstRecord.terminatorLocation]
];
// Canonical graph validators remain independently tested. The actual Worker
// wire carries scan:null; these mutations must never claim receiver coverage.
async function rejectedCanonical(role, transform, file = input(role)) {
  const text = await file.text();
  const packet = { scan: structuredClone(scanCsvEvidence(text)) };
  transform(packet); // A failed or unreached mutation is a test failure.
  await assert.rejects(async () => {
    await assertWorkerScanShapeAsync(packet.scan, () => {});
    await assertWorkerScanAsync(packet.scan, text, Buffer.byteLength(text), () => {});
  }, error => error instanceof TypeError);
}

test('F13P3C-M01 both-role graph-free private-issued positive reconstructs exact immutable schemas and originals', async () => {
  for (const role of roles) {
    const result = await accepted(role); assert.equal(result.problem, null);
    const projection = sourceProjection(result.handle, role), canonical = cachedLexicalEvidence(result.text);
    assert.ok(canonical); assert.ok(Object.isFrozen(canonical)); assert.equal(Object.getPrototypeOf(canonical),null);
    for (const [kind,target] of targets) {
      const value=target({scan:canonical}); assert.ok(Object.isFrozen(value)); assert.equal(Object.getPrototypeOf(value),null);
      assert.deepEqual(Object.keys(value).sort(),[...schemas[kind]].sort());
    }
    for (const [kind, target] of targets) {
      const packet = { scan: { records: [null, projection.records[1]], emptyRuns: projection.emptyRuns } };
      assert.deepEqual(Object.keys(target(packet)).sort(), [...schemas[kind]].sort());
    }
    assert.equal(projection.decoding, 'UTF-8 with initial BOM retained'); assert.equal(projection.encodingProblem, null);
    releaseFileEvidence(result.handle); assert.equal(processingState().cachedSources, 0);
  }
});
for (const [index, [kind, target]] of targets.entries()) test(`F13P3C-M02-${index + 1} standalone canonical ${kind} guards reject extra missing and equal-count foreign substitution for both role sources`, async () => {
  for (const role of roles) {
    await rejectedCanonical(role, p => { target(p).actionAuthorized = true; });
    for (const key of schemas[kind]) {
      await rejectedCanonical(role, p => { delete target(p)[key]; });
      await rejectedCanonical(role, p => { const item = target(p); item.foreign = item[key]; delete item[key]; });
    }
  }
});

test('F13P3C-M03 standalone canonical named scalar guards reject nested arrays objects or wrong primitives', async () => {
  for (const role of roles) for (const [kind, target] of targets) {
    const nested = kind === 'record' ? new Set(['cells','terminatorLocation']) : kind === 'run' ? new Set(['firstRecord']) : new Set();
    for (const key of schemas[kind].filter(key => !nested.has(key))) for (const value of [[], {}, false]) {
      await rejectedCanonical(role, p => { target(p)[key] = value; });
    }
  }
});

test('F13P3C-M04 standalone canonical full scan and partial failure guards reject missing renamed and extra fields', async () => {
  for (const role of roles) {
    for (const key of schemas.scan) {
      await rejectedCanonical(role, p => { delete p.scan[key]; });
      await rejectedCanonical(role, p => { p.scan.foreign = p.scan[key]; delete p.scan[key]; });
    }
    await rejectedCanonical(role, p => { p.scan.foreign = 'CONFIDENTIAL'; });
    const malformed = input(role, header(role) + '\n' + row(role) + '\n"unterminated');
    for (const key of schemas.failure) {
      await rejectedCanonical(role, p => { delete p.scan.failure[key]; }, malformed);
      await rejectedCanonical(role, p => { p.scan.failure.foreign = p.scan.failure[key]; delete p.scan.failure[key]; }, malformed);
    }
    await rejectedCanonical(role, p => { p.scan.failure.extra = true; }, malformed);
  }
});

test('F13P3C-M05 complete or null text cannot advertise an encoding failure', async () => {
  for (const role of roles) {
    for (const diagnostic of ['This file uses UTF-16.', '', 'CONFIDENTIAL', false, {}, []]) await rejected(role, p => { p.encodingProblem = diagnostic; });
    await rejected(role, p => { p.text = null; p.scan = null; p.encodingProblem = 'The original bytes are not valid UTF-8. Keep the original and prepare a separate normalized CSV saved as UTF-8.'; });
  }
});

const utf16Problem = 'This file uses a UTF-16 byte-order mark. Keep the original and prepare a separate normalized CSV saved as UTF-8.';
const utf8Problem = 'The original bytes are not valid UTF-8. Keep the original and prepare a separate normalized CSV saved as UTF-8.';
test('F13P3C-M06 both-role genuine invalid encodings retain canonical byte-derived diagnosis and recoverable originals', async () => {
  for (const role of roles) for (const [bytes, diagnostic] of [
    [Uint8Array.of(0xff,0xfe,0x41,0), utf16Problem], [Uint8Array.of(0xfe,0xff,0,0x41), utf16Problem],
    [Uint8Array.of(0xff), utf8Problem], [Uint8Array.of(0xc0,0x80), utf8Problem],
    [Uint8Array.of(0xed,0xa0,0x80), utf8Problem], [Uint8Array.of(0xf4,0x90,0x80,0x80), utf8Problem],
    [Uint8Array.of(0xf0,0x9f,0x98), utf8Problem]
  ]) {
    const result = await accepted(role, input(role, bytes));
    assert.ok(result.problem instanceof InputProblem); assert.equal(result.problem.target, role);
    const projection = sourceProjection(result.handle, role);
    assert.equal(sourceText(result.handle, role), null); assert.equal(projection.encodingProblem, diagnostic);
    assert.equal(projection.decoding, 'unavailable'); assert.equal(projection.lexicalComplete, false); assert.equal(projection.recordCount, 0);
    releaseFileEvidence(result.handle); assert.equal(processingState().cachedSources, 0);
  }
});

test('F13P3C-M07 invalid-byte diagnostics cannot be deleted swapped retagged or paired with text', async () => {
  for (const role of roles) for (const [bytes, actual] of [[Uint8Array.of(0xff,0xfe), utf16Problem], [Uint8Array.of(0xff), utf8Problem]]) {
    const file = input(role, bytes);
    for (const diagnostic of [null, '', 'CONFIDENTIAL', actual === utf16Problem ? utf8Problem : utf16Problem]) await rejected(role, p => { p.encodingProblem = diagnostic; }, file);
    for (const problem of [null, 'CONFIDENTIAL', actual === utf16Problem ? utf8Problem : utf16Problem]) await rejected(role, p => {
      assert.equal(p.text, null); assert.equal(p.encodingProblem, actual); p.problem = problem;
    }, file);
    await rejected(role, p => { p.text = ''; p.scan = null; p.encodingProblem = null; }, file);
  }
});

test('F13P3C-M08 empty BOM-only and replacement-scalar UTF8 are profile repairs rather than encoding failures', async () => {
  for (const role of roles) for (const text of ['', '\uFEFF', '\uFFFD']) {
    const result = await accepted(role, input(role, text)); assert.ok(result.problem instanceof InputProblem);
    const projection = sourceProjection(result.handle, role);
    assert.equal(sourceText(result.handle, role), text); assert.equal(projection.encodingProblem, null);
    assert.equal(projection.decoding, 'UTF-8 with initial BOM retained');
    releaseFileEvidence(result.handle); assert.equal(processingState().cachedSources, 0);
  }
});

test('F13P3C-M09 Unicode raw and normalized context survives BOM mixed terminators quoted newlines and variable blanks', async () => {
  for (const role of roles) {
    const raw = '  \u{1f600}\r\n漢\uFEFF  ', text = '\uFEFF' + header(role) + '\r\n' + row(role, '"' + raw + '"') + '\r' + '\r\n,,,\n"" ,\r';
    const result = await accepted(role, input(role, text)); assert.equal(result.problem, null);
    const projection = sourceProjection(result.handle, role), customer = projection.records[1].cells[2];
    assert.equal(customer.rawValue, raw); assert.equal(customer.normalizedValue, raw.trim()); assert.equal(customer.lexeme, '"' + raw + '"');
    assert.equal(projection.sourceRecordCount, 5); assert.equal(projection.emptyRecordCount, 3); assert.equal(projection.emptyRuns[0].totalCells, 7);
    assert.equal(projection.records[0].startOffset, 1); assert.equal(projection.records[0].startByte, 3);
    assert.equal(projection.records[1].terminator, '\r'); assert.equal(sourceText(result.handle, role), text);
    releaseFileEvidence(result.handle);
  }
});

function intersectingText(role) {
  const base = header(role) + '\n' + (row(role, '\u{1f600}') + '\n').repeat(5000);
  let cells = FILE_SUPPORT.limits.totalCells - (role === 'pax-file' ? 10 : 4) * 5001, blanks = '';
  for (let remaining = 4999; remaining > 0; remaining--) {
    const width = Math.min(FILE_SUPPORT.limits.columns, cells - remaining + 1);
    blanks += ','.repeat(width - 1) + (remaining % 3 === 0 ? '\r\n' : remaining % 3 === 1 ? '\r' : '\n'); cells -= width;
  }
  assert.equal(cells, 0); return base + blanks;
}
test('F13P3C-M10 both-role joint row source-cell column and Unicode limits issue immutable canonical caches', async () => {
  const held = [];
  try {
    for (const role of roles) {
      const text = intersectingText(role), result = await accepted(role, input(role, text)); held.push([role, result]);
      assert.equal(result.problem, null); const scan = cachedLexicalEvidence(text);
      assert.ok(Object.isFrozen(scan)); assert.equal(scan.records.length, 5001); assert.equal(scan.sourceRecordCount, 10000);
      assert.equal(scan.records.reduce((sum,r) => sum + r.cells.length, 0) + scan.emptyRuns.reduce((sum,r) => sum + r.totalCells, 0), 65536);
      assert.equal(scan.emptyRuns[0].firstRecord.cells.length, 64); assert.ok(Object.isFrozen(scan.records[1].cells[0]));
      const original = originalBytes(result.handle, role); original.fill(0); assert.notEqual(originalBytes(result.handle, role)[0], 0);
    }
    assert.equal(processingState().cachedSources, 2);
  } finally { for (const [, result] of held) releaseFileEvidence(result.handle); }
  assert.equal(processingState().cachedSources, 0);
});

test('F13P3C-M11 intersecting over-cell source and row failures preserve exact partial frontier and originals', async () => {
  for (const role of roles) {
    const text = intersectingText(role) + row(role) + '\n', result = await accepted(role, input(role, text));
    assert.ok(result.problem instanceof InputProblem); const projection = sourceProjection(result.handle, role);
    assert.equal(projection.lexicalComplete, false); assert.match(projection.failure.message, /65536 total cells/);
    assert.equal(projection.sourceRecordCount, 10000); assert.equal(projection.recordCount, 5001);
    assert.equal(projection.encodingProblem, null); assert.equal(sourceText(result.handle, role), text);
    releaseFileEvidence(result.handle); assert.equal(processingState().cachedSources, 0);
  }
});

test('F13P3C-M12 mixed-width lexical pages stay bounded through EOF and new occurrences retire only their own cache', async () => {
  for (const role of roles) {
    const widths = [role === 'pax-file' ? 10 : 4,1,64,2,63,3,62,4,61,5,60,6,59], text = widths.map((width,index) => Array(width).fill('x' + index).join(',')).join('\n');
    const first = await accepted(role, input(role, text, 'first.csv'));
    try {
      assert.ok(first.problem instanceof InputProblem); let offset = 0, seen = 0;
      while (offset < widths.length) {
        const page = sourceProjection(first.handle, role, offset);
        assert.ok(page.records.length); assert.ok(page.records.reduce((sum,r) => sum + r.cells.length, 0) <= 64);
        for (const record of page.records) { assert.equal(record.cells.length, widths[seen]); seen++; }
        offset += page.pageSize;
      }
      assert.equal(seen, widths.length);
      const second = await accepted(role, input(role, text, 'second.csv'));
      try {
        releaseFileEvidence(first.handle); assert.equal(processingState().cachedSources, 1);
        assert.equal(sourceProjection(second.handle, role).metadata.name, 'second.csv');
        assert.ok(cachedLexicalEvidence(text)); assert.throws(() => sourceProjection(first.handle, role));
      } finally { releaseFileEvidence(second.handle); }
    } finally { releaseFileEvidence(first.handle); }
    assert.equal(processingState().cachedSources, 0);
  }
});

test('F13P3C-M13 repeated two-role churn cannot grow caches or retain retired lexical packets', async () => {
  const current = new Map();
  try {
    for (let round = 0; round < 8; round++) for (const role of roles) {
      const text = header(role) + '\n' + row(role, 'c' + round) + '\n', prior = current.get(role);
      const result = await accepted(role, input(role, text, `${role}-${round}.csv`)); current.set(role, { result, text });
      if (prior) { releaseFileEvidence(prior.result.handle); assert.equal(cachedLexicalEvidence(prior.text), null); }
      assert.ok(processingState().cachedSources <= 2); assert.equal(cachedLexicalEvidence(text)?.records[1].cells[2].rawValue, 'c' + round);
    }
    assert.equal(processingState().cachedSources, 2);
  } finally { for (const {result} of current.values()) releaseFileEvidence(result.handle); }
  assert.equal(processingState().cachedSources, 0);
});

test('F13P3C-M14 graph-free receiver rejects supplied graphs before traversal and standalone canonical guards reject near-cap nested arrays', async () => {
  for (const role of roles) for (const scan of [undefined,false,0,'',[],{},structuredClone(scanCsvEvidence(textFor(role)))]) {
    await rejected(role, packet => { packet.scan=scan; });
  }
  for (const role of roles) for (const kind of ['foreign-envelope','nonnull-scan','nonscalar-text']) {
    let forbidden = null, touches = 0;
    const names = Object.getOwnPropertyNames, descriptor = Object.getOwnPropertyDescriptor;
    try {
      Object.getOwnPropertyNames = value => { if (value === forbidden) touches++; return names(value); };
      Object.getOwnPropertyDescriptor = (value,key) => { if (value === forbidden) touches++; return descriptor(value,key); };
      const key = kind === 'foreign-envelope' ? 'foreign' : kind === 'nonnull-scan' ? 'scan' : 'text';
      await rejected(role, packet => { packet[key] = Array(999000).fill(0); }, input(role), delivered => {
        forbidden = delivered[key]; assert.ok(Array.isArray(forbidden)); assert.equal(forbidden.length,999000);
      });
      assert.equal(touches,0);
    } finally { Object.getOwnPropertyNames = names; Object.getOwnPropertyDescriptor = descriptor; }
  }
  for (const role of roles) for (const target of [p => p.scan, p => p.scan.records[1], p => p.scan.records[1].cells[0], p => p.scan.records[1].terminatorLocation, p => p.scan.emptyRuns[0]]) {
    let forbidden = null, touches = 0;
    const originalNames = Object.getOwnPropertyNames, originalDescriptor = Object.getOwnPropertyDescriptor;
    try {
      Object.getOwnPropertyNames = value => { if (value === forbidden) touches++; return originalNames(value); };
      Object.getOwnPropertyDescriptor = (value,key) => { if (value === forbidden) touches++; return originalDescriptor(value,key); };
      await rejectedCanonical(role, p => { target(p).foreign = Array(999000).fill(0); forbidden = target(p).foreign; });
      assert.equal(touches, 0);
    } finally { Object.getOwnPropertyNames = originalNames; Object.getOwnPropertyDescriptor = originalDescriptor; }
  }
  for (const role of roles) for (const key of ['rawValue','lexeme','normalizedValue']) {
    let forbidden = null, touches = 0; const names = Object.getOwnPropertyNames, descriptor = Object.getOwnPropertyDescriptor;
    try {
      Object.getOwnPropertyNames = value => { if (value === forbidden) touches++; return names(value); };
      Object.getOwnPropertyDescriptor = (value,key) => { if (value === forbidden) touches++; return descriptor(value,key); };
      await rejectedCanonical(role, p => { p.scan.records[1].cells[0][key] = Array(999000).fill(0); forbidden = p.scan.records[1].cells[0][key]; });
      assert.equal(touches, 0);
    } finally { Object.getOwnPropertyNames = names; Object.getOwnPropertyDescriptor = descriptor; }
  }
});

test('F13P3C-M15 standalone canonical dense-array and represented-cell guards reject before generic copying', async () => {
  for (const role of roles) {
    await rejectedCanonical(role, p => { p.scan.records = Array(5002).fill(p.scan.records[1]); });
    await rejectedCanonical(role, p => { p.scan.emptyRuns = Array(10001).fill(p.scan.emptyRuns[0]); });
    await rejectedCanonical(role, p => { p.scan.records[1].cells = Array(65).fill(p.scan.records[1].cells[0]); });
    await rejectedCanonical(role, p => { p.scan.records[1].cells[0] = null; });
    await rejectedCanonical(role, p => { p.scan.records[1].terminatorLocation = null; });
    await rejectedCanonical(role, p => { p.scan.emptyRuns[0].firstRecord = null; });
    await rejectedCanonical(role, p => { p.scan.records = Array.from({length:5001}, () => ({...p.scan.records[1], cells:Array(64).fill(p.scan.records[1].cells[0])})); p.scan.emptyRuns=[]; });
  }
});

test('F13P3C-M16 cancellation during yielded canonical reconstruction stops once and publishes no cached evidence', async () => {
  for (const role of roles) {
    const controller = new AbortController(), file = input(role, header(role) + '\n' + (row(role) + '\n').repeat(5000));
    const freeze = Object.freeze, keys = schemas.cell; let fields = 0, reached = false, held = null, worker;
    Object.freeze = function (object) {
      const frozen = freeze.call(Object,object);
      // The double's initial lexer must not count: only the current receiver's
      // fresh canonical cells after delivery and Worker retirement are observed.
      if (worker?.received && worker.stops === 1 && worker.completedWireScan === null && object &&
          !Array.isArray(object) && Object.getPrototypeOf(object) === null &&
          Object.getOwnPropertyNames(object).length === 8 && keys.every(key => Object.hasOwn(object,key)) &&
          Number.isInteger(object.columnIndex) && object.columnIndex >= 1 && object.columnIndex <= 64 &&
          typeof object.rawValue === 'string' && object.normalizedValue === object.rawValue.trim()) {
        if (++fields === 1000) setTimeout(() => { reached=true; held=processingState(); controller.abort(); },0);
      }
      return frozen;
    };
    try {
      const pending = read(role, file, controller.signal); worker = instances.at(-1);
      await assert.rejects(pending, error => error instanceof InputProblem && error.target === role && error.source === source(role) && /canceled/.test(error.message));
      await worker.completion; assert.equal(reached,true); assert.ok(fields >= 1000 && fields < 5001*header(role).split(',').length);
      assert.equal(held.activeJobs,1); assert.equal(held.reservedBytes,file.size); assert.equal(held.cachedSources,0);
      assert.equal(worker.failure, undefined); assert.equal(worker.stops, 1); idle(); assert.equal(processingState().cachedSources, 0);
    } finally { Object.freeze = freeze; }
  }
});

test('F13P3C-M17 generic large array reaches a cancellable yield before native own-name reflection', async () => {
  const array = Array(999999).fill(0), names = Object.getOwnPropertyNames; let enumerations = 0, checks = 0;
  try {
    Object.getOwnPropertyNames = value => { if (value === array) enumerations++; return names(value); };
    await assert.rejects(captureResourceDataAsync(array, () => { if (++checks === 2) throw new Error('stop before reflection'); }), /stop before reflection/);
    assert.equal(checks, 2); assert.equal(enumerations, 0); assert.equal(Object.isFrozen(array), false);
  } finally { Object.getOwnPropertyNames = names; }
});

test('F13P3C-M18 indexed generic copy retains dense data-only semantics and rejects array extras without invoking accessors', () => {
  let calls = 0;
  const hidden = [0]; Object.defineProperty(hidden, 'hidden', { value: 1 });
  const extra = [0]; extra.foreign = 1;
  const accessor = [0]; Object.defineProperty(accessor, '0', { get() { calls++; return 0; }, enumerable:true });
  const symbol = [0]; symbol[Symbol('extra')] = 1;
  const largeHole = Array(2048).fill(0); delete largeHole[2047];
  for (const value of [hidden,extra,accessor,symbol,[,0],largeHole]) assert.throws(() => captureResourceData(value));
  assert.equal(calls, 0);
  const array = Array(2048).fill(0), captured = captureResourceData(array);
  assert.ok(Object.isFrozen(captured)); assert.equal(captured.length, 2048); assert.notEqual(captured, array);
});

test('F13P3C-M19 early shape descriptors reject accessors symbols hidden keys sparse cells and cyclic substitutions', async () => {
  let calls = 0;
  for (const change of [
    scan => { Object.defineProperty(scan.records[1].cells[0], 'rawValue', { get() { calls++; return 'x'; }, enumerable:true }); },
    scan => { Object.defineProperty(scan.records[1], 'hidden', {value:true}); },
    scan => { scan.emptyRuns[0][Symbol('foreign')] = true; },
    scan => { delete scan.records[1].cells[0]; },
    scan => { scan.records[1].originalRecord = scan; }
  ]) {
    const scan = structuredClone(scanCsvEvidence(textFor('halo-file'))); change(scan);
    await assert.rejects(assertWorkerScanShapeAsync(scan, () => {}));
  }
  assert.equal(calls, 0);
});

test('F13P3C-M20 canonical scanner positives remain compatible with both shared shape and semantic guard', async () => {
  for (const text of ['','\uFEFF','h\nx\n','h\n\n,,,\r\n"" ,\n', 'h\n"unterminated','h\nx\n'+Array(65).fill('x').join(','),'h\nx\n'+ '\u{1f600}'.repeat(513)]) {
    const scan = captureResourceData(scanCsvEvidence(text));
    await assertWorkerScanShapeAsync(scan, () => {}); assertWorkerScan(scan, text, new TextEncoder().encode(text).length);
  }
});

test('F13P3C-M21 shared yielding offsets preserve scalar boundary sentinels and synchronous failures', () => {
  const text = '\uFEFF' + 'a'.repeat(16382) + '\u{1f600}' + '\r\n' + 'é漢'.repeat(20000), expected = csvByteOffsets(text);
  const iterator = csvByteOffsetSteps(text); let step, yields = 0;
  do { step = iterator.next(); if (!step.done) yields++; } while (!step.done);
  assert.ok(yields >= 3); assert.deepEqual(step.value, expected);
  for (const index of [0,1,16383,16385,16387,text.length]) assert.equal(expected[index], Buffer.byteLength(text.slice(0,index)));
  assert.equal(expected[16384], 0xffffffff);
  for (const value of ['a'.repeat(16383)+'\uD800', 'a'.repeat(16384)+'\uDC00', 'a'.repeat(2000001)]) {
    let sync;
    try { csvByteOffsets(value); } catch (error) { sync = error; }
    assert.ok(sync instanceof TypeError);
    assert.throws(() => { const steps = csvByteOffsetSteps(value); while (!steps.next().done) {} }, error => error instanceof TypeError && error.message === sync.message);
  }
});

function chunkBoundaryText(role) {
  const columns = header(role).split(','), values = row(role).split(',');
  const text = maximumCellByteCsv([...columns,...Array.from({length:64-columns.length},(_,i) => 'extra'+i)], values);
  assert.equal(text.slice(16383,16387), 'xxxx');
  const unicode = text.slice(0,16383) + '\u{1f600}' + text.slice(16387);
  assert.equal(Buffer.byteLength(unicode), 2000000); return unicode;
}

test('F13P3C-M22 both-role maximum originals encode in scalar-aligned finite chunks with exact custody', async () => {
  const Encoder = globalThis.TextEncoder;
  for (const role of roles) {
    const text = chunkBoundaryText(role); let chunks = 0, maximum = 0;
    receiving = () => { globalThis.TextEncoder = class extends Encoder {
      encode(value) {
        if (value.length > 3) { chunks++; maximum = Math.max(maximum,value.length); assert.ok(value.length <= 16384); }
        assert.equal(/\p{Cs}/u.test(value),false); return super.encode(value);
      }
    }; };
    let result;
    try { result = await accepted(role,input(role,text)); assert.equal(result.problem,null); assert.ok(chunks > 100); assert.equal(maximum,16384); assert.equal(sourceText(result.handle,role),text); }
    finally { receiving = null; globalThis.TextEncoder = Encoder; if (result) releaseFileEvidence(result.handle); }
    idle(); assert.equal(processingState().cachedSources,0);
  }
});

test('F13P3C-M23 corruption in a later native encoder chunk rejects both-role custody without caches', async () => {
  const Encoder = globalThis.TextEncoder;
  for (const role of roles) {
    let chunks = 0;
    try {
      await rejected(role, () => {}, input(role,chunkBoundaryText(role)), () => {
        globalThis.TextEncoder = class extends Encoder { encode(value) {
          const bytes = super.encode(value);
          if (value.length > 3 && ++chunks === 2) bytes[bytes.length-1] ^= 1;
          return bytes;
        } };
      });
      assert.equal(chunks,2);
    } finally { globalThis.TextEncoder = Encoder; }
  }
});

test('F13P3C-M24 cancellation and deadline during yielded custody comparison stop both roles without late publication', async () => {
  const digest = crypto.subtle.digest, performance = globalThis.performance;
  for (const role of roles) for (const kind of ['cancel','deadline']) {
    const controller = new AbortController(); let fullHashes = 0, reached = false, advance = 0, held;
    globalThis.performance = { now: () => performance.now() + advance };
    crypto.subtle.digest = async function(algorithm,bytes) {
      const value = await digest.call(this,algorithm,bytes);
      if (bytes.length > 3 && ++fullHashes === 2) setTimeout(() => {
        reached = true; held = processingState();
        if (kind === 'cancel') controller.abort(); else advance = 30001;
      },0);
      return value;
    };
    try {
      const pending = read(role,input(role,header(role)+'\n'+(row(role)+'\n').repeat(3000)),controller.signal), worker = instances.at(-1);
      await assert.rejects(pending,error => error instanceof InputProblem && error.target === role && error.message.includes(kind === 'cancel' ? 'canceled' : 'timed out'));
      await worker.completion; assert.equal(reached,true); assert.equal(held.activeJobs,1); assert.ok(held.reservedBytes > 16384);
      assert.equal(fullHashes,2); assert.equal(worker.failure,undefined); assert.equal(worker.stops,1); idle(); assert.equal(processingState().cachedSources,0);
    } finally { crypto.subtle.digest = digest; globalThis.performance = performance; }
  }
  const Encoder = globalThis.TextEncoder;
  for (const role of roles) for (const kind of ['constructor','encode']) {
    const controller = new AbortController(); let encodes = 0, reads = 0;
    receiving = () => { globalThis.TextEncoder = class extends Encoder {
      constructor() { super(); if (kind === 'constructor') controller.abort(); }
      encode(value) {
        encodes++; const bytes = super.encode(value), length = bytes.length;
        Object.defineProperty(bytes,'length',{get() { reads++; return length; }});
        controller.abort(); return bytes;
      }
    }; };
    try {
      const pending = read(role,input(role),controller.signal), worker = instances.at(-1);
      await assert.rejects(pending,error => error instanceof InputProblem && error.target === role && /canceled/.test(error.message));
      await worker.completion; assert.equal(encodes,kind === 'constructor' ? 0 : 1); assert.equal(reads,0);
      assert.equal(worker.failure,undefined); assert.equal(worker.stops,1); idle(); assert.equal(processingState().cachedSources,0);
    } finally { receiving = null; globalThis.TextEncoder = Encoder; }
  }
});

test('F13P3C-M25 standalone canonical coordinates yield before traversing the full original text', async () => {
  const text = 'h\n'+('""'+' '.repeat(4094)+'\n').repeat(400), scan = captureResourceData(scanCsvEvidence(text));
  const codePointAt = String.prototype.codePointAt; let walked = 0;
  try {
    String.prototype.codePointAt = function(index) { if (this.valueOf() === text) walked++; return codePointAt.call(this,index); };
    await assert.rejects(assertWorkerScanAsync(scan,text,Buffer.byteLength(text),() => { if (walked) throw new Error('stop inside coordinate pass'); }),/stop inside coordinate pass/);
    assert.equal(walked,16384); assert.ok(walked < text.length);
  } finally { String.prototype.codePointAt = codePointAt; }
});

test('F13P3C-M26 sole yielding lexer preserves large skipped-run failures and retires canonical replay midway', async () => {
  const text = padCsvBytes('h\nx\n',1900000)+'"unfinished', canonical = scanCsvEvidence(text), offsets = csvByteOffsets(text);
  assert.equal(canonical.failure.message,'CSV has an unclosed quoted value');
  assert.equal(canonical.failure.startOffset,1900000); assert.equal(canonical.failure.startByte,1900000);
  const scanSteps = scanCsvEvidenceSteps(text); let step;
  do { step = scanSteps.next(); } while (!step.done);
  assert.deepEqual(step.value,canonical);
  const context = {startOffset:0,sourceRecords:0,records:0,totalCells:0,offsets};
  const replay = assertCsvFailureFrontierSteps(text,context,canonical.failure,canonical.sourceRecordCount); let yields = 0;
  do { step = replay.next(); if (!step.done) yields++; } while (!step.done);
  assert.ok(yields > 100);
  const slice = String.prototype.slice; let slices = 0, canceled = false;
  try {
    String.prototype.slice = function(...args) { if (this.valueOf() === text) slices++; return slice.apply(this,args); };
    setTimeout(() => { canceled = true; },0);
    await assert.rejects(runBoundedStepsAsync(assertCsvFailureFrontierSteps(text,context,canonical.failure,canonical.sourceRecordCount), () => { if (canceled) throw new Error('retired canonical replay'); }),/retired canonical replay/);
    assert.ok(slices > 0 && slices < 32);
  } finally { String.prototype.slice = slice; }
  const changed = {...canonical.failure,startOffset:canonical.failure.startOffset+1,endOffset:canonical.failure.endOffset+1,startByte:canonical.failure.startByte+1,endByte:canonical.failure.endByte+1};
  assert.throws(() => { const replay = assertCsvFailureFrontierSteps(text,context,changed,canonical.sourceRecordCount); while (!replay.next().done) {} },/canonical source frontier/);
});

test('F13P3C-M27 later mutation of the supplied hash copy across a task yield rejects both-role custody', async () => {
  const digest = crypto.subtle.digest;
  for (const role of roles) {
    let fullHashes = 0, altered = false;
    const file = input(role,header(role)+'\n'+(row(role)+'\n').repeat(5000));
    assert.ok(file.size > 50000);
    crypto.subtle.digest = async function(algorithm,bytes) {
      const value = await digest.call(this,algorithm,bytes);
      if (bytes.length > 3 && ++fullHashes === 2) setTimeout(() => { bytes[50000] ^= 1; altered = true; },0);
      return value;
    };
    try {
      const pending = read(role,file), worker = instances.at(-1);
      await assert.rejects(pending,technical); await worker.completion;
      assert.equal(altered,true); assert.equal(fullHashes,2); assert.equal(worker.failure,undefined); assert.equal(worker.stops,1);
      idle(); assert.equal(processingState().cachedSources,0);
    } finally { crypto.subtle.digest = digest; }
  }
});

test('F13P3C-M28 dense empty-cell canonical replay yields within its field budget and retires exact source work', async () => {
  const text = 'h\n'+(','.repeat(63)+'\r\n').repeat(1023)+'"unfinished', canonical = scanCsvEvidence(text), offsets = csvByteOffsets(text);
  assert.equal(canonical.failure.message,'CSV has an unclosed quoted value');
  assert.equal(canonical.records.length,1); assert.equal(canonical.sourceRecordCount,1024);
  assert.equal(canonical.emptyRuns[0].totalCells,65472); assert.equal(canonical.failure.sourceRecordOrdinal,1025);
  const context = {startOffset:0,sourceRecords:0,records:0,totalCells:0,offsets};
  const iterator = assertCsvFailureFrontierSteps(text,context,canonical.failure,canonical.sourceRecordCount);
  const slice = String.prototype.slice; let slices = 0, step, yields = 0;
  try {
    String.prototype.slice = function(...args) { if (this.valueOf() === text) slices++; return slice.apply(this,args); };
    step = iterator.next(); assert.equal(step.done,false); assert.ok(slices >= 256 && slices < 270);
    do { step = iterator.next(); if (!step.done) yields++; } while (!step.done);
    assert.ok(yields > 250);
    let canceled = false; slices = 0;
    setTimeout(() => { canceled = true; },0);
    await assert.rejects(runBoundedStepsAsync(assertCsvFailureFrontierSteps(text,context,canonical.failure,canonical.sourceRecordCount), () => { if (canceled) throw new Error('retired dense lexical replay'); }),/retired dense lexical replay/);
    assert.ok(slices >= 256 && slices < 270);
  } finally { String.prototype.slice = slice; iterator.return(); }
});

test('F13P3C-M29 compact capture preserves prototype-free own data and rejects inherited or failed-cutover authority through both roles', async () => {
  const leaf = { text: 'é漢😀', flag: false }, source = Object.fromEntries([
    ['__proto__', { actionAuthorized: true }], ['constructor', { prototype: 'literal' }],
    ['toString', 'literal'], ['items', [leaf, leaf]], ['nothing', null]
  ]);
  const nullSource = Object.assign(Object.create(null), source);
  const sourceBefore = Object.getOwnPropertyDescriptors(source), leafBefore = Object.getOwnPropertyDescriptors(leaf);
  function ownCopy(copy, original) {
    if (original === null || typeof original !== 'object') { assert.equal(copy, original); return; }
    assert.notEqual(copy, original); assert.ok(Object.isFrozen(copy));
    assert.equal(Object.getPrototypeOf(copy), Array.isArray(original) ? Array.prototype : null);
    assert.deepEqual(Reflect.ownKeys(copy), Reflect.ownKeys(original));
    for (const key of Object.getOwnPropertyNames(copy)) {
      const descriptor = Object.getOwnPropertyDescriptor(copy, key);
      assert.ok(Object.hasOwn(descriptor, 'value')); assert.equal(descriptor.configurable, false); assert.equal(descriptor.writable, false);
      assert.equal(descriptor.enumerable, !(Array.isArray(original) && key === 'length'));
      ownCopy(descriptor.value, Object.getOwnPropertyDescriptor(original, key).value);
    }
  }
  const copies = [];
  for (const original of [source, nullSource]) for (const copy of [captureResourceData(original), await captureResourceDataAsync(original, () => {})]) {
    ownCopy(copy, original); assert.notEqual(copy.items[0], copy.items[1]); copies.push(copy);
  }
  assert.deepEqual(Object.getOwnPropertyDescriptors(source), sourceBefore);
  assert.deepEqual(Object.getOwnPropertyDescriptors(leaf), leafBefore);
  assert.equal(Object.getPrototypeOf(source), Object.prototype); assert.equal(Object.getPrototypeOf(nullSource), null);
  assert.equal(Object.isFrozen(source), false); assert.equal(Object.isFrozen(leaf), false);
  leaf.text = 'changed'; source.constructor.prototype = 'changed';
  for (const copy of copies) { assert.equal(copy.items[0].text, 'é漢😀'); assert.equal(copy.items[1].text, 'é漢😀'); assert.equal(copy.constructor.prototype, 'literal'); }

  let getters = 0, setters = 0;
  const traps = ['__captureOwned', '__captureForeign', 'then', 'rawValue'];
  const prior = new Map(traps.map(key => [key, Object.getOwnPropertyDescriptor(Object.prototype, key)]));
  try {
    Object.defineProperty(Object.prototype, '__captureOwned', { configurable: true, get() { getters++; return 'foreign'; }, set() { setters++; } });
    Object.defineProperty(Object.prototype, '__captureForeign', { configurable: true, get() { getters++; return { actionAuthorized: true }; } });
    Object.defineProperty(Object.prototype, 'then', { configurable: true, get() { getters++; return undefined; } });
    const original = Object.fromEntries([['__captureOwned', 'owned'], ['nested', { text: 'value' }]]);
    for (const copy of [captureResourceData(original), await captureResourceDataAsync(original, () => {})]) {
      assert.equal(copy.__captureOwned, 'owned'); assert.equal(copy.__captureForeign, undefined); assert.equal(copy.then, undefined);
      assert.equal(copy.toString, undefined); assert.equal(copy.constructor, undefined);
      assert.equal(Object.hasOwn(copy, '__captureForeign'), false); assert.equal(Object.hasOwn(copy, 'then'), false);
      ownCopy(copy, original);
    }
    assert.equal(getters, 0); assert.equal(setters, 0);
    // Promise assimilation of the existing public outcome is outside this
    // capture test. Keep the scalar inheritance probe specific to its schema.
    delete Object.prototype.then;
    Object.defineProperty(Object.prototype, 'rawValue', { configurable: true, get() { getters++; return 'a'; }, set() { setters++; } });
    for (const role of roles) {
      const genuine = await accepted(role); assert.equal(genuine.problem, null); releaseFileEvidence(genuine.handle);
      await rejectedCanonical(role, packet => { delete packet.scan.records[1].cells[0].rawValue; });
      assert.equal(getters, 0); assert.equal(setters, 0); assert.equal(processingState().cachedSources, 0);
    }
  } finally {
    for (const key of traps) { if (prior.get(key)) Object.defineProperty(Object.prototype, key, prior.get(key)); else delete Object.prototype[key]; }
  }

  const setPrototype = Object.setPrototypeOf;
  try {
    for (const kind of ['ineffective', 'throwing']) {
      Object.setPrototypeOf = kind === 'ineffective' ? value => value : () => { throw new TypeError('CONFIDENTIAL prototype cutover'); };
      assert.throws(() => captureResourceData(source), TypeError);
      await assert.rejects(captureResourceDataAsync(source, () => {}), TypeError);
      for (const role of roles) await rejected(role, () => {});
      assert.equal(Object.getPrototypeOf(source), Object.prototype); assert.equal(Object.isFrozen(source), false);
    }
  } finally { Object.setPrototypeOf = setPrototype; }
});
