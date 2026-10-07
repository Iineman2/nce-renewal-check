import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { FILE_SUPPORT } from './file-support.mjs';
import { InputProblem, SOURCES } from './actions.mjs';
import { parseCsv, prepareCsvRowsAsync, rawCells, rowSourceTrace, PAX8_COLUMNS, HALO_COLUMNS } from './preflight.mjs';
import { scanCsvEvidence } from './csv-evidence.mjs';
import { readLocalEvidence, observedFileText } from './runtime.mjs';
import { readBoundedLocalEvidence, processingState } from './bounded-reader.mjs';
import { originalBytes, releaseFileEvidence, transferFileEvidence } from './file-evidence.mjs';

const roles = ['pax-file', 'halo-file'];
const columnsFor = role => role === 'pax-file' ? PAX8_COLUMNS : HALO_COLUMNS;
const sourceFor = role => role === 'pax-file' ? SOURCES.pax : SOURCES.halo;
const operationFor = role => role === 'pax-file' ? 'find-case' : 'compare-records';
const quote = value => '"' + value.replaceAll('"', '""') + '"';
function textFor(role, count = 80, width = 64, suffix = '') {
  const required = columnsFor(role), header = [...required, ...Array.from({ length: width - required.length }, (_, i) => i === 0 ? '__proto__' : 'extra' + i)];
  const rows = Array.from({ length: count }, (_, i) => {
    const values = role === 'pax-file' ? [`case-${i}${suffix}`,'customer','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'] : [`line-${i}${suffix}`,`case-${i}${suffix}`,'customer','HaloPSA'];
    return [...values, ...Array(width - values.length).fill(' Café😀 "quoted"\r\n ')].map(quote).join(',');
  });
  return '\uFEFF' + header.join(',') + '\r\n' + rows.join('\r\n') + '\r\n';
}
const nativeEntries = Object.fromEntries, nativeTimer = globalThis.setTimeout, nativePerformance = globalThis.performance;
function countRowCopies(header, callback) {
  Object.fromEntries = entries => {
    const values = Array.from(entries);
    if (values.length === header.length && values[0]?.[0] === header[0]) callback(values);
    return nativeEntries(values);
  };
}
const restoreObservers = () => { Object.fromEntries = nativeEntries; globalThis.setTimeout = nativeTimer; globalThis.performance = nativePerformance; };

test('F13P3T-P01 both-role cold row publication yields by cells under a controlled work clock and preserves exact canonical traces', async () => {
  for (const role of roles) for (const width of [columnsFor(role).length, 63, 64]) {
    const text = textFor(role, 80, width, 'width-' + width), scan = scanCsvEvidence(text), required = columnsFor(role), header = scan.records[0].cells.map(cell => cell.normalizedValue.toLowerCase());
    const expected = parseCsv(text, [...required]);
    let time = 100, copies = 0, priorCopies = 0, checks = 0; const slices = [];
    globalThis.performance = { now: () => time };
    countRowCopies(header, () => { copies++; time += header.length / 64; });
    globalThis.setTimeout = (callback, delay, ...args) => {
      if (delay === 0) { slices.push((copies - priorCopies) * header.length / 2); priorCopies = copies; }
      return nativeTimer(callback, delay, ...args);
    };
    try {
      assert.equal(await prepareCsvRowsAsync(scan, required, () => { checks++; }), undefined);
      const actual = parseCsv(text, required);
      assert.deepEqual(actual, expected); assert.equal(copies, expected.length * 2);
      assert.ok(slices.length >= Math.ceil(80 / Math.floor(256 / width)) - 1); assert.ok(slices.every(cells => cells > 0 && cells <= 256));
      assert.ok(checks > slices.length * 2); assert.equal(Object.isFrozen(actual), true);
      for (const row of actual) {
        assert.equal(Object.isFrozen(row), true); assert.equal(Object.isFrozen(rawCells(row)), true);
        if (header.includes('__proto__')) {
          assert.equal(Object.hasOwn(row, '__proto__'), true); assert.equal(row.__proto__, 'Café😀 "quoted"');
          assert.equal(rawCells(row).__proto__, ' Café😀 "quoted"\r\n ');
        }
      }
      assert.deepEqual(rawCells(actual[0]), rawCells(expected[0]));
      const traced = header.includes('__proto__') ? [required[0], '__proto__'] : [required[0]];
      assert.deepEqual(rowSourceTrace(actual[0], traced), rowSourceTrace(expected[0], traced));
      const before = copies; assert.equal(parseCsv(text, required), actual);
      await prepareCsvRowsAsync(scan, required, () => {}); assert.equal(copies, before);
    } finally { restoreObservers(); }
  }
});

test('F13P3T-P07 foreign row preparation rejects oversized copied material before normalization or cache publication', async () => {
  const text = textFor('pax-file', 8, 64, 'bounded-foreign'), canonical = scanCsvEvidence(text);
  for (const [field, size] of [['rawValue', 1025], ['normalizedValue', 1025], ['lexeme', 4097]]) {
    const foreign = structuredClone(canonical); foreign.records[1].cells[1][field] = 'x'.repeat(size);
    await assert.rejects(prepareCsvRowsAsync(foreign, PAX8_COLUMNS, () => {}), /bounded raw normalized and lexical text/);
  }
  const header = structuredClone(canonical); header.records[0].cells[0].rawValue = 'x'.repeat(2000001);
  const trim = String.prototype.trim; let largeTrim = false;
  String.prototype.trim = function() { if (this.length > 1024) largeTrim = true; return trim.call(this); };
  try { await assert.rejects(prepareCsvRowsAsync(header, PAX8_COLUMNS, () => {}), /bounded raw lexical text/); assert.equal(largeTrim, false); }
  finally { String.prototype.trim = trim; }
  const foreign = structuredClone(canonical), first = foreign.records[1];
  foreign.records = [foreign.records[0], ...Array.from({ length: 5000 }, () => ({ ...first, originalRecord: 'x' }))];
  let copies = 0; countRowCopies(canonical.records[0].cells.map(cell => cell.normalizedValue.toLowerCase()), () => { copies++; });
  try {
    await assert.rejects(prepareCsvRowsAsync(foreign, PAX8_COLUMNS, () => {}), /65536 total cells/);
    assert.equal(copies, 1023 * 2); copies = 0;
    const actual = parseCsv(text, PAX8_COLUMNS); assert.equal(actual.length, 8); assert.equal(copies, 16);
  } finally { restoreObservers(); }
  const originals = structuredClone(canonical); originals.records[1].originalRecord = 'x'.repeat(2000001);
  await assert.rejects(prepareCsvRowsAsync(originals, PAX8_COLUMNS, () => {}), /original-text bound/);
  const unrelated = structuredClone(canonical); let readUnrelated = 0;
  Object.defineProperty(unrelated.records[1], 'unrelated', { enumerable: true, get() { readUnrelated++; throw Error('Unrelated properties must not be copied'); } });
  await prepareCsvRowsAsync(unrelated, PAX8_COLUMNS, () => {}); assert.equal(readUnrelated, 0);
});

test('F13P3T-P02 cancellation and deadline during genuine row preparation cannot publish a partial canonical cache', async () => {
  for (const role of roles) for (const kind of ['cancel', 'deadline']) {
    const text = textFor(role, 80, 64, kind), scan = scanCsvEvidence(text), required = columnsFor(role), header = scan.records[0].cells.map(cell => cell.normalizedValue.toLowerCase());
    let copies = 0, retired = false, queued = false;
    const stop = new InputProblem(kind === 'cancel' ? 'Owned publication cancellation' : 'Owned publication deadline', role, sourceFor(role));
    countRowCopies(header, () => {
      copies++;
      if (!queued) { queued = true; nativeTimer(() => { retired = true; }, 0); }
    });
    try {
      await assert.rejects(prepareCsvRowsAsync(scan, required, () => { if (retired) throw stop; }), error => error === stop);
      assert.equal(queued, true); assert.equal(retired, true); assert.ok(copies > 0 && copies < 160);
      copies = 0; const rows = parseCsv(text, required);
      assert.equal(rows.length, 80); assert.equal(copies, 160, 'Retry must build every row instead of consuming a partial cache');
      assert.equal(parseCsv(text, required), rows); assert.equal(copies, 160);
    } finally { restoreObservers(); }
  }
});

test('F13P3T-P03 a foreign prepared scan cannot register lexical text or change source-derived rows', async () => {
  const text = textFor('pax-file', 8, 64, 'foreign'), canonical = scanCsvEvidence(text), foreign = structuredClone(canonical);
  foreign.records[1].cells[0].rawValue = foreign.records[1].cells[0].normalizedValue = 'FORGED';
  assert.equal(await prepareCsvRowsAsync(foreign, PAX8_COLUMNS, () => {}), undefined);
  assert.equal(scanCsvEvidence(text), canonical); assert.equal(parseCsv(text, PAX8_COLUMNS)[0].subscription_id, 'case-0foreign');
  for (const scan of [null, {}, { ...canonical, records: Array(5002).fill(null) }, { ...canonical, records: [{ cells: Array(65).fill({ rawValue: 'h' }) }, canonical.records[1]] }]) {
    await assert.rejects(prepareCsvRowsAsync(scan, PAX8_COLUMNS, () => {}), TypeError);
  }
  await assert.rejects(prepareCsvRowsAsync(canonical, Array(65).fill('h'), () => {}), TypeError);
  const join = Array.prototype.join; let oversizedJoin = false;
  Array.prototype.join = function(...args) {
    if (this.some(value => typeof value === 'string' && value.length > 64)) oversizedJoin = true;
    return join.apply(this, args);
  };
  try {
    for (const length of [65, 2000001]) await assert.rejects(prepareCsvRowsAsync(canonical, ['x'.repeat(length)], () => {}), /bounded canonical lexical inventory and column list/);
    assert.equal(oversizedJoin, false, 'Oversized required names must reject before constructing a missing-column error');
  } finally { Array.prototype.join = join; }
});

test('F13P3T-P06 retirement at the final cache boundary rolls back new rows while preserving an existing complete cache', async () => {
  for (const role of roles) {
    const text = textFor(role, 8, 64, 'final-boundary'), scan = scanCsvEvidence(text), required = columnsFor(role);
    const header = scan.records[0].cells.map(cell => cell.normalizedValue.toLowerCase());
    let copies = 0, completedChecks = 0;
    const stop = new InputProblem('Owned final-boundary retirement', role, sourceFor(role));
    countRowCopies(header, () => { copies++; });
    try {
      await assert.rejects(prepareCsvRowsAsync(scan, required, () => {
        if (copies === 16 && ++completedChecks === 3) throw stop;
      }), error => error === stop);
      copies = 0; const rows = parseCsv(text, required); assert.equal(copies, 16);
      let checks = 0;
      await assert.rejects(prepareCsvRowsAsync(scan, required, () => { if (++checks === 4) throw stop; }), error => error === stop);
      assert.equal(parseCsv(text, required), rows); assert.equal(copies, 16);
    } finally { restoreObservers(); }
  }
});

const nativeFile = globalThis.File, nativeWorker = globalThis.Worker;
globalThis.File = File;
let packetData = null;
const workers = [];
class PublicationWorker extends EventTarget {
  constructor() { super(); this.stops = 0; workers.push(this); }
  terminate() { this.stops++; }
  postMessage(request) {
    const data = structuredClone({ protocol: request.protocol, id: request.id, role: request.role, operation: request.operation,
      profile: request.profile, policy: request.policy, reader: request.reader, status: 'completed', ...packetData, scan: null });
    this.completion = Promise.resolve().then(() => this.onmessage?.({ data }));
  }
}
globalThis.Worker = PublicationWorker;
after(async () => {
  restoreObservers(); await Promise.all(workers.map(worker => worker.completion));
  globalThis.File = nativeFile; globalThis.Worker = nativeWorker;
});
async function preparePacket(file, role) {
  const original = await readLocalEvidence(file, role, sourceFor(role), 30000, operationFor(role));
  try { const transfer = transferFileEvidence(original.handle, role); packetData = { ...transfer.data, observedText: observedFileText(original, role, file), bytes: transfer.bytes, problem: original.problem?.message ?? null }; }
  finally { releaseFileEvidence(original.handle); }
}
const clean = () => assert.deepEqual(processingState(), { activeJobs: 0, reservedBytes: 0, cachedSources: 0, halted: false });

test('F13P3T-P04 both-role publication cancellation and deadline stop the issued job once before source-cache insertion and allow retry', async () => {
  for (const role of roles) for (const kind of ['cancel', 'deadline']) {
    const text = textFor(role, 80, 64, 'issued-' + kind), file = new File([text], role + '.csv', { lastModified: 7 });
    await preparePacket(file, role);
    const header = packetData.scan.records[0].cells.map(cell => cell.normalizedValue.toLowerCase()), controller = new AbortController();
    let reached = 0, advance = 0, held = null, queued = false;
    globalThis.performance = { now: () => nativePerformance.now() + advance };
    countRowCopies(header, () => {
      reached++;
      if (!queued) {
        queued = true;
        nativeTimer(() => { held = processingState(); if (kind === 'cancel') controller.abort(); else advance = 30001; }, 0);
      }
    });
    try {
      const pending = readBoundedLocalEvidence(file, role, sourceFor(role), 30000, operationFor(role), controller.signal), worker = workers.at(-1);
      await assert.rejects(pending, error => error instanceof InputProblem && error.target === role && error.message.includes(kind === 'cancel' ? 'canceled' : 'timed out'));
      await worker.completion;
      assert.ok(reached > 0 && reached < 160); assert.deepEqual(held, { activeJobs: 1, reservedBytes: file.size, cachedSources: 0, halted: false });
      assert.equal(worker.stops, 1); assert.equal(worker.onmessage, null); clean();
    } finally { restoreObservers(); }
    const outcome = await readBoundedLocalEvidence(file, role, sourceFor(role), 30000, operationFor(role));
    await workers.at(-1).completion; assert.equal(outcome.problem, null);
    assert.deepEqual(originalBytes(outcome.handle, role), new Uint8Array(await file.arrayBuffer()));
    assert.equal(parseCsv(outcome.text, columnsFor(role)).length, 80); releaseFileEvidence(outcome.handle); clean();
  }
});

test('F13P3T-P05 malformed source profiles retain owned source repairs and genuine original custody', async () => {
  for (const role of roles) for (const text of ['a,b\nx,y\n', columnsFor(role).join(',') + '\n"unfinished']) {
    const file = new File([text], 'invalid.csv'); await preparePacket(file, role);
    const outcome = await readBoundedLocalEvidence(file, role, sourceFor(role), 30000, operationFor(role)); await workers.at(-1).completion;
    assert.ok(outcome.problem instanceof InputProblem); assert.equal(outcome.problem.target, role); assert.equal(outcome.problem.source, sourceFor(role));
    assert.deepEqual(originalBytes(outcome.handle, role), new Uint8Array(await file.arrayBuffer()));
    releaseFileEvidence(outcome.handle); clean();
  }
});
