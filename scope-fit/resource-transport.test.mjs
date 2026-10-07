import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { FILE_SUPPORT } from './file-support.mjs';
import { InputProblem, SOURCES } from './actions.mjs';
import { PAX8_COLUMNS, HALO_COLUMNS, parseCsv, prepareCsvRowsAsync, rawCells } from './preflight.mjs';
import { scanCsvEvidence, scanCsvEvidenceSteps } from './csv-evidence.mjs';
import { runBoundedStepsAsync } from './resource-packet.mjs';
import { readLocalEvidence, FileEvidenceRuntimeError, observedFileText, fileTextAgreementSteps, FILE_TEXT_DISAGREEMENT_MESSAGE } from './runtime.mjs';
import { readBoundedLocalEvidence, cachedLexicalEvidence, processingState } from './bounded-reader.mjs';
import { originalBytes, sourceProjection, releaseFileEvidence } from './file-evidence.mjs';
import { graphFreeCompletion } from './qc-transport-fixtures.mjs';

const roles = ['pax-file', 'halo-file'];
const columns = role => role === 'pax-file' ? PAX8_COLUMNS : HALO_COLUMNS;
const source = role => role === 'pax-file' ? SOURCES.pax : SOURCES.halo;
const operation = role => role === 'pax-file' ? 'find-case' : 'compare-records';
const quote = value => '"' + value.replaceAll('"', '""') + '"';
function textFor(role, count = 20) {
  const required = columns(role), header = [...required, ...Array.from({ length: 64 - required.length }, (_, i) => 'extra' + i)];
  const values = role === 'pax-file' ? ['s','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'] : ['l','s','c','HaloPSA'];
  return '\uFEFF' + header.join(',') + '\r\n' + Array.from({ length: count }, (_, i) => [...values.map(value => value === 's' ? 's' + i : value), ...Array(64 - values.length).fill(' Café😀 "x"\r\n ')].map(quote).join(',')).join('\r\n') + '\r\n';
}
const nativeFile = globalThis.File, nativeWorker = globalThis.Worker, nativeSelf = globalThis.self;
globalThis.File = File;
let transform = null;
const prepared = new Map(), workers = [];
class WireWorker extends EventTarget {
  constructor() { super(); this.stops = 0; workers.push(this); }
  terminate() { this.stops++; }
  postMessage(request) {
    const evidence = prepared.get(request.file);
    const wire = structuredClone(graphFreeCompletion(request, evidence));
    this.originalWire = wire; transform?.(wire, request);
    this.completion = Promise.resolve().then(() => this.onmessage?.({ data: wire }));
  }
}
globalThis.Worker = WireWorker;
after(async () => {
  await Promise.all(workers.map(worker => worker.completion));
  for (const evidence of prepared.values()) releaseFileEvidence(evidence.handle);
  globalThis.File = nativeFile; globalThis.Worker = nativeWorker; globalThis.self = nativeSelf;
});
async function inputFor(role, bytes = textFor(role), observed = undefined) {
  const file = new File([bytes], role + '.csv', { lastModified: 7 });
  if (observed !== undefined) file.text = async () => observed;
  prepared.set(file, await readLocalEvidence(file, role, source(role), 30000, operation(role))); return file;
}
const clean = () => assert.deepEqual(processingState(), { activeJobs: 0, reservedBytes: 0, cachedSources: 0, halted: false });
const read = (role, file, signal = null) => readBoundedLocalEvidence(file, role, source(role), 30000, operation(role), signal);
async function rejectWire(role, file, change) {
  transform = change;
  try {
    const pending = read(role, file), worker = workers.at(-1);
    await assert.rejects(pending, error => error instanceof FileEvidenceRuntimeError && !(error instanceof InputProblem));
    await worker.completion; assert.equal(worker.stops, 1); clean();
  } finally { transform = null; }
}

test('F13P3T-W01 actual Worker producer sends scan:null and one transferable original with no lexical graph', async () => {
  assert.equal(FILE_SUPPORT.resourceVersion, 'resource-csv-v3');
  for (const role of roles) {
    const file = new File([textFor(role)], 'producer.csv', { lastModified: 7 }); let observed = null, detached = false;
    globalThis.self = { postMessage(wire, transfers) {
      assert.equal(wire.scan, null); assert.deepEqual(transfers, [wire.bytes]);
      observed = structuredClone(wire, { transfer: transfers }); detached = wire.bytes.byteLength === 0;
    } };
    await import('./file-processing-worker.mjs?graph-free-' + role);
    await self.onmessage({ data: { protocol: FILE_SUPPORT.resourceVersion, id: 1, role, operation: operation(role),
      source: source(role), timeoutMs: 30000, profile: role === 'pax-file' ? 'normalized-pax8-v1' : 'normalized-halo-v1',
      policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion, file } });
    assert.equal(detached, true); assert.equal(observed.status, 'completed'); assert.equal(observed.scan, null);
    assert.equal(observed.text, textFor(role)); assert.equal(observed.problem, null);
    assert.equal(observed.observedText, textFor(role).slice(1));
    assert.deepEqual(new Uint8Array(observed.bytes), new Uint8Array(await file.arrayBuffer()));
  }
  globalThis.self = nativeSelf; clean();
});

test('F13P3T-W02 both roles reconstruct fresh canonical frozen prototype-free evidence and preserve exact originals', async () => {
  for (const role of roles) {
    const file = await inputFor(role), text = textFor(role), prior = scanCsvEvidence(text), outcome = await read(role, file);
    await workers.at(-1).completion; const scan = cachedLexicalEvidence(text);
    assert.equal(outcome.problem, null); assert.notEqual(scan, prior); assert.deepEqual(JSON.parse(JSON.stringify(scan)), JSON.parse(JSON.stringify(prior)));
    for (const value of [scan, scan.records[0], scan.records[1], scan.records[1].terminatorLocation, scan.records[1].cells[1]]) {
      assert.equal(Object.getPrototypeOf(value), null); assert.equal(Object.isFrozen(value), true);
    }
    assert.deepEqual(originalBytes(outcome.handle, role), new Uint8Array(await file.arrayBuffer()));
    const projection = sourceProjection(outcome.handle, role); assert.equal(projection.authenticated, false); assert.equal(projection.actionAuthorized, false);
    assert.equal(projection.sourceRecordCount, 21); releaseFileEvidence(outcome.handle); clean();
  }
});

test('F13P3T-W03 every nonnull incoming scan rejects before nested schema reflection or copying', async () => {
  for (const role of roles) {
    const file = await inputFor(role), names = Object.getOwnPropertyNames;
    for (const hostile of [{}, [], { records: Array(5000).fill({ CONFIDENTIAL: true }) }]) {
      let inspected = 0;
      Object.getOwnPropertyNames = value => { if (value === hostile) { inspected++; throw Error('Nested wire graph must not be inspected'); } return names(value); };
      try { await rejectWire(role, file, wire => { wire.scan = hostile; }); assert.equal(inspected, 0); }
      finally { Object.getOwnPropertyNames = names; }
    }
  }
});

test('F13P3T-W04 omitted spurious and retagged Worker profile problems cannot grant acquisition', async () => {
  for (const role of roles) {
    const good = await inputFor(role), malformed = await inputFor(role, 'a,b\nx,y\n');
    await rejectWire(role, good, wire => { wire.problem = 'Spurious source repair'; });
    await rejectWire(role, malformed, wire => { wire.problem = null; });
    await rejectWire(role, malformed, wire => { wire.problem = wire.problem.replace(source(role), source(role === 'pax-file' ? 'halo-file' : 'pax-file')); });
    await rejectWire(role, good, wire => { wire.metadata.name = 'borrowed.csv'; });
    await rejectWire(role, good, wire => { wire.sha256 = '0'.repeat(64); });
    await rejectWire(role, good, wire => { wire.text = wire.text.replace('Café', 'Fake'); });
  }
});

test('F13P3T-W05 exact source repairs including UTF16 noBOM and invalid-byte originals remain recoverable through graph-free wire', async () => {
  for (const role of roles) for (const bytes of ['a,b\nx,y\n', columns(role).join(',') + '\n"unfinished', Uint8Array.of(255),
    Buffer.concat([Buffer.from([255, 254]), Buffer.from(textFor(role), 'utf16le')]), Buffer.from(textFor(role).replace(/^\uFEFF/u, ''), 'utf16le')]) {
    const file = await inputFor(role, bytes), expected = prepared.get(file), outcome = await read(role, file); await workers.at(-1).completion;
    assert.ok(outcome.problem instanceof InputProblem); assert.equal(outcome.problem.message, expected.problem.message); assert.equal(outcome.problem.target, role);
    assert.deepEqual(originalBytes(outcome.handle, role), new Uint8Array(await file.arrayBuffer()));
    releaseFileEvidence(outcome.handle); clean();
  }
});

test('F13P3T-W06 cancel and deadline reached during real fresh lexical emission retire the stopped Worker with no custody or source cache', async () => {
  const freeze = Object.freeze, performance = globalThis.performance;
  for (const role of roles) for (const kind of ['cancel', 'deadline']) {
    const file = await inputFor(role, textFor(role, 40)), controller = new AbortController(); let cells = 0, queued = false, held = null, advance = 0;
    // Force the production four-ms batching fence at the first 256-cell
    // emission step; retirement still arrives in a real timer task.
    globalThis.performance = { now: () => performance.now() + advance + cells / 32 };
    Object.freeze = value => {
      if (value && Object.hasOwn(value, 'rawValue') && Object.hasOwn(value, 'normalizedValue') && Object.getPrototypeOf(value) === null) {
        cells++;
        if (!queued) { queued = true; setTimeout(() => { held = processingState(); if (kind === 'cancel') controller.abort(); else advance = 30001; }, 0); }
      }
      return freeze(value);
    };
    try {
      const pending = read(role, file, controller.signal), worker = workers.at(-1);
      await assert.rejects(pending, error => error instanceof InputProblem && error.target === role && error.message.includes(kind === 'cancel' ? 'canceled' : 'timed out'));
      await worker.completion; assert.ok(cells > 0 && cells <= 256); assert.equal(queued, true);
      assert.deepEqual(held, { activeJobs: 1, reservedBytes: file.size, cachedSources: 0, halted: false }); assert.equal(worker.stops, 1); clean();
    } finally { Object.freeze = freeze; globalThis.performance = performance; }
  }
});

test('F13P3T-W07 simultaneous both-role graph-free completions retain capacity and independent exact canonical ownership', async () => {
  const files = await Promise.all(roles.map(role => inputFor(role))), pending = roles.map((role, i) => read(role, files[i]));
  assert.deepEqual(processingState(), { activeJobs: 2, reservedBytes: files.reduce((sum, file) => sum + file.size, 0), cachedSources: 0, halted: false });
  const outcomes = await Promise.all(pending); await Promise.all(workers.slice(-2).map(worker => worker.completion));
  assert.equal(processingState().cachedSources, 2);
  for (let i = 0; i < roles.length; i++) {
    assert.equal(outcomes[i].problem, null); assert.deepEqual(originalBytes(outcomes[i].handle, roles[i]), new Uint8Array(await files[i].arrayBuffer()));
    releaseFileEvidence(outcomes[i].handle);
  }
  clean();
});

test('F13P3T-W08 fresh sole-lexer mode bypasses existing scans and never registers its derivative in standalone cache', async () => {
  const text = textFor('pax-file'), original = scanCsvEvidence(text);
  const fresh = await runBoundedStepsAsync(scanCsvEvidenceSteps(text, true), () => {});
  assert.notEqual(fresh, original); assert.equal(scanCsvEvidence(text), original);
  assert.deepEqual(JSON.parse(JSON.stringify(fresh)), JSON.parse(JSON.stringify(original)));
  assert.equal(Object.getPrototypeOf(fresh), null); assert.equal(Object.isFrozen(fresh), true);
});

test('F13P3T-W09 cold and cached row publication never assimilate inherited array thenables', async () => {
  for (const role of roles) {
    const text = textFor(role, 8).replace('s0', 's0thenable'), scan = scanCsvEvidence(text), required = columns(role);
    let interceptions = 0;
    const trap = { configurable: true, get() {
      if (!Array.isArray(this)) return undefined;
      interceptions++;
      return resolve => resolve([{ subscription_id: 'FORGED', line_id: 'FORGED' }]);
    } };
    const originalObject = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
    const originalArray = Object.getOwnPropertyDescriptor(Array.prototype, 'then');
    Object.defineProperty(Object.prototype, 'then', trap); Object.defineProperty(Array.prototype, 'then', trap);
    try {
      assert.equal(await prepareCsvRowsAsync(scan, required, () => {}), undefined);
      assert.equal(await prepareCsvRowsAsync(scan, required, () => {}), undefined);
    } finally {
      if (originalObject) Object.defineProperty(Object.prototype, 'then', originalObject); else delete Object.prototype.then;
      if (originalArray) Object.defineProperty(Array.prototype, 'then', originalArray); else delete Array.prototype.then;
    }
    assert.equal(interceptions, 0);
    const rows = parseCsv(text, required);
    assert.equal(rows.length, 8); assert.equal(rows[0].subscription_id, 's0thenable');
    assert.equal(rawCells(rows[0]).subscription_id, 's0thenable');
  }
});

test('F13P3T-W10 fresh native prototype and freeze failures remain technical even with a matching hostile repair claim', async () => {
  const cutover = Object.setPrototypeOf, freeze = Object.freeze;
  for (const role of roles) for (const kind of ['refused-cutover', 'throwing-cutover', 'cell-array-freeze']) {
    const file = await inputFor(role); let reached = 0;
    transform = wire => { wire.problem = `Canonical lexical construction failed. (${source(role)}). ${role === 'pax-file' ? 'Normalized Pax8 CSV' : 'Normalized HaloPSA CSV'} is required for this operation. ${FILE_SUPPORT.alternative}`; };
    Object.setPrototypeOf = (value, prototype) => {
      if (kind !== 'cell-array-freeze' && value && Object.hasOwn(value, 'rawValue') && Object.hasOwn(value, 'normalizedValue')) {
        reached++; if (kind === 'throwing-cutover') throw new TypeError('Native cutover failure'); return value;
      }
      return cutover(value, prototype);
    };
    Object.freeze = value => {
      if (kind === 'cell-array-freeze' && Array.isArray(value) && value[0] && Object.hasOwn(value[0], 'rawValue')) {
        reached++; throw new TypeError('Native array freeze failure');
      }
      return freeze(value);
    };
    try {
      const pending = read(role, file), worker = workers.at(-1);
      await assert.rejects(pending, error => error instanceof FileEvidenceRuntimeError && !(error instanceof InputProblem));
      await worker.completion; assert.equal(reached, 1); assert.equal(worker.stops, 1); clean();
    } finally { Object.setPrototypeOf = cutover; Object.freeze = freeze; transform = null; }
  }
});

test('F13P3T-W11 silent native freeze refusal and frozen substitutes never publish a mutable or foreign cell or array', async () => {
  const freeze = Object.freeze;
  for (const role of roles) for (const kind of ['refused-cell', 'refused-array', 'substitute-cell', 'substitute-array']) {
    const file = await inputFor(role); let reached = 0;
    transform = wire => { wire.problem = `Canonical lexical construction failed. (${source(role)}). ${role === 'pax-file' ? 'Normalized Pax8 CSV' : 'Normalized HaloPSA CSV'} is required for this operation. ${FILE_SUPPORT.alternative}`; };
    Object.freeze = value => {
      const cell = value && Object.hasOwn(value, 'rawValue') && Object.hasOwn(value, 'normalizedValue') && Object.getPrototypeOf(value) === null;
      const array = Array.isArray(value) && value[0] && Object.hasOwn(value[0], 'rawValue');
      if (kind.endsWith('cell') ? cell : array) {
        reached++;
        if (kind.startsWith('refused')) return value;
        return freeze(cell ? { ...value } : [...value]);
      }
      return freeze(value);
    };
    try {
      const pending = read(role, file), worker = workers.at(-1);
      await assert.rejects(pending, error => error instanceof FileEvidenceRuntimeError && !(error instanceof InputProblem));
      await worker.completion; assert.equal(reached, 1); assert.equal(worker.stops, 1); clean();
    } finally { Object.freeze = freeze; transform = null; }
  }
});

test('F13P3T-W12 genuine separate text disagreements preserve exact byte custody and never promote observed text to facts', async () => {
  for (const role of roles) for (const text of [textFor(role, 8), textFor(role, 8).slice(1), 'a,b\nx,y\n']) {
    const canonicalObservation = text.replace(/^\uFEFF/u, '');
    const readings = ['FOREIGN', canonicalObservation.slice(0, -1) + 'x', '\uD800'];
    for (const reading of readings) {
      const file = await inputFor(role, text, reading), evidence = prepared.get(file);
      assert.equal(observedFileText(evidence, role, file), reading);
      assert.equal(evidence.text, text); assert.equal(evidence.problem.message, FILE_TEXT_DISAGREEMENT_MESSAGE);
      assert.equal(Object.hasOwn(evidence, 'observedText'), false);
      assert.throws(() => observedFileText({ ...evidence }, role, file), TypeError);
      assert.throws(() => observedFileText(evidence, role, new File([text], file.name)), TypeError);
      const outcome = await read(role, file); await workers.at(-1).completion;
      assert.ok(outcome.problem instanceof InputProblem); assert.equal(outcome.problem.message, FILE_TEXT_DISAGREEMENT_MESSAGE);
      assert.equal(outcome.text, text); assert.deepEqual(originalBytes(outcome.handle, role), new Uint8Array(await file.arrayBuffer()));
      const projection = sourceProjection(outcome.handle, role);
      assert.equal(projection.actionAuthorized, false); assert.equal(projection.financialVerdict, null);
      assert.equal(JSON.stringify(projection).includes('FOREIGN'), false);
      assert.throws(() => observedFileText(outcome, role, file), FileEvidenceRuntimeError);
      releaseFileEvidence(outcome.handle); clean();
    }
  }
});

test('F13P3T-W13 exact observation schema and independently derived disagreement reject omitted spurious and substituted profile claims', async () => {
  for (const role of roles) {
    const ordinary = await inputFor(role);
    for (const reading of [null, undefined, 7, {}, [], 'x'.repeat(ordinary.size + 1), 'x'.repeat(FILE_SUPPORT.limits.decodedCodeUnits + 1)]) {
      await rejectWire(role, ordinary, wire => { wire.observedText = reading; });
    }
    await rejectWire(role, ordinary, wire => { delete wire.observedText; });
    await rejectWire(role, ordinary, wire => { wire.problem = FILE_TEXT_DISAGREEMENT_MESSAGE; });
    await rejectWire(role, ordinary, wire => { wire.observedText = 'FOREIGN'; });
    const different = await inputFor(role, textFor(role), 'FOREIGN');
    await rejectWire(role, different, wire => { wire.problem = null; });
    await rejectWire(role, different, wire => { wire.problem = `Missing columns: invented (${source(role)}).`; });
    const malformed = await inputFor(role, 'a,b\nx,y\n');
    await rejectWire(role, malformed, wire => { wire.problem = FILE_TEXT_DISAGREEMENT_MESSAGE; });
    const invalidBytes = await inputFor(role, Uint8Array.of(255));
    await rejectWire(role, invalidBytes, wire => { wire.observedText = '\uFFFD'; });
    const interiorBom = textFor(role, 8).replace('Café', 'Ca\uFEFFfé');
    const agrees = await inputFor(role, interiorBom), outcome = await read(role, agrees); await workers.at(-1).completion;
    assert.equal(outcome.problem, null); assert.equal(observedFileText(prepared.get(agrees), role, agrees), interiorBom.slice(1));
    releaseFileEvidence(outcome.handle); clean();
    for (const reading of [textFor(role), textFor(role).slice(1).replace('Café', 'Cafe\u0301'), textFor(role).slice(1).replace('😀', '😁')]) {
      const file = await inputFor(role, textFor(role), reading), mismatch = await read(role, file); await workers.at(-1).completion;
      assert.equal(mismatch.problem.message, FILE_TEXT_DISAGREEMENT_MESSAGE); assert.equal(mismatch.text, textFor(role));
      releaseFileEvidence(mismatch.handle); clean();
    }
  }
});

test('F13P3T-W14 shared observation comparison strips one initial BOM and enforces N-1 N N+1 chunk and scalar frontiers', () => {
  function inspect(decoded, observed, bytes) {
    const iterator = fileTextAgreementSteps(decoded, observed, bytes); let yields = 0, step;
    do { step = iterator.next(); if (!step.done) yields++; } while (!step.done);
    return { agrees: step.value, yields };
  }
  for (const length of [16383, 16384, 16385]) {
    const text = 'x'.repeat(length), expectedYields = Math.floor((length - 1) / 16384);
    assert.deepEqual(inspect(text, text, length), { agrees: true, yields: expectedYields });
    assert.deepEqual(inspect('\uFEFF' + text, text, length + 3), { agrees: true, yields: expectedYields });
    assert.deepEqual(inspect(text, text.slice(0, -1) + 'y', length), { agrees: false, yields: expectedYields });
    assert.throws(() => inspect(text, text, length - 1), /original byte or decoded-text bound/);
    assert.deepEqual(inspect(text, text, length + 1), { agrees: true, yields: expectedYields });
    assert.throws(() => inspect(text, text + 'x', length), /original byte or decoded-text bound/);
  }
  assert.equal(inspect('\uFEFF\uFEFFa', '\uFEFFa', 7).agrees, true);
  assert.equal(inspect('\uFEFF\uFEFFa', 'a', 7).agrees, false);
  assert.equal(inspect('a\uFEFFb', 'ab', 5).agrees, false);
  assert.equal(inspect('Café😀', 'Cafe\u0301😀', 10).agrees, false);
  for (const length of [1999999, 2000000]) assert.equal(inspect('a', 'x'.repeat(length), length).agrees, false);
  assert.throws(() => inspect('a', 'x'.repeat(2000001), 2000001), /original byte or decoded-text bound/);
  for (const observed of [null, undefined, {}, [], 3]) assert.throws(() => inspect('a', observed, 1), TypeError);
});

test('F13P3T-W15 cancellation and deadline during actual observed-text comparison stop before profile or custody publication', async () => {
  const charCodeAt = String.prototype.charCodeAt, performance = globalThis.performance;
  for (const role of roles) for (const kind of ['cancel', 'deadline']) {
    const file = await inputFor(role, textFor(role, 40)), observation = observedFileText(prepared.get(file), role, file);
    const controller = new AbortController(); let comparisons = 0, queued = false, held = null, advance = 0;
    globalThis.performance = { now: () => performance.now() + advance + comparisons / 1024 };
    String.prototype.charCodeAt = function(index) {
      if (this.valueOf() === observation) {
        comparisons++;
        if (!queued) { queued = true; setTimeout(() => { held = processingState(); if (kind === 'cancel') controller.abort(); else advance = 30001; }, 0); }
      }
      return charCodeAt.call(this, index);
    };
    try {
      const pending = read(role, file, controller.signal), worker = workers.at(-1);
      await assert.rejects(pending, error => error instanceof InputProblem && error.target === role && error.message.includes(kind === 'cancel' ? 'canceled' : 'timed out'));
      await worker.completion; assert.ok(comparisons > 0 && comparisons <= 16384); assert.equal(queued, true);
      assert.deepEqual(held, { activeJobs: 1, reservedBytes: file.size, cachedSources: 0, halted: false }); assert.equal(worker.stops, 1); clean();
    } finally { String.prototype.charCodeAt = charCodeAt; globalThis.performance = performance; }
  }
});

test('F13P3T-W16 actual Worker producer keeps the separate issued File.text contradiction on its bounded scalar wire', async () => {
  for (const role of roles) {
    const file = new File([textFor(role)], 'producer-mismatch.csv', { lastModified: 7 }); file.text = async () => 'FOREIGN';
    let observed = null;
    globalThis.self = { postMessage(wire, transfers) { observed = structuredClone(wire, { transfer: transfers }); } };
    try {
      await import('./file-processing-worker.mjs?graph-free-mismatch-' + role);
      await self.onmessage({ data: { protocol: FILE_SUPPORT.resourceVersion, id: 1, role, operation: operation(role),
        source: source(role), timeoutMs: 30000, profile: role === 'pax-file' ? 'normalized-pax8-v1' : 'normalized-halo-v1',
        policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion, file } });
      assert.equal(observed.status, 'completed'); assert.equal(observed.scan, null); assert.equal(observed.observedText, 'FOREIGN');
      assert.equal(observed.problem, FILE_TEXT_DISAGREEMENT_MESSAGE); assert.equal(observed.text, textFor(role));
      assert.deepEqual(new Uint8Array(observed.bytes), new Uint8Array(await file.arrayBuffer()));
    } finally { globalThis.self = nativeSelf; }
    clean();
  }
});
