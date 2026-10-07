// Finite shape and DOM work. These checks grant no source or packet authority.
import { FILE_SUPPORT } from './file-support.mjs';
import { csvByteOffsetSteps, decodeCsvLexeme, scanCsvEvidenceSteps, assertCsvFailureFrontierSteps } from './csv-evidence.mjs';

function resourceCapture(value) {
  const limits = FILE_SUPPORT.limits, active = new Set();
  let values = 0, strings = 0;
  function* copy(item, depth) {
    if (++values > limits.packetValues || depth > limits.packetDepth) throw new TypeError('Worker packet exceeds its value or depth budget.');
    if (values % 1024 === 0) yield;
    if (typeof item === 'string') {
      strings += item.length;
      if (strings > limits.packetStringCodeUnits) throw new TypeError('Worker packet exceeds its text budget.');
      return item;
    }
    if (item === null || typeof item === 'boolean' || typeof item === 'number' && Number.isFinite(item)) return item;
    if (!item || typeof item !== 'object' || active.has(item)) throw new TypeError('Worker packet must be finite plain data.');
    const array = Array.isArray(item), prototype = Object.getPrototypeOf(item);
    if (!array && prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(item).length) throw new TypeError('Worker packet has an unsupported shape.');
    if (array && (!Number.isInteger(item.length) || item.length > limits.packetValues)) throw new TypeError('Worker packet array exceeds its budget.');
    active.add(item);
    // Build compact own-data shapes, then remove the prototype before any
    // object is returned. defineProperty bypasses inherited setters and treats
    // reserved names as data; the final cutover preserves prototype-free data.
    const result = array ? [] : {}; let count = 0;
    if (array) {
      if (item.length > limits.packetValues - values) throw new TypeError('Worker packet exceeds its value budget.');
      // Indexed work yields before a large array's native own-name reflection.
      // Reflection itself cannot be interrupted; current worker schemas bound
      // their arrays before this generic defensive copy is entered.
      if (item.length >= 1024) yield;
      for (let index = 0; index < item.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new TypeError('Worker packet arrays must be dense data.');
        Object.defineProperty(result, index, { value: yield* copy(descriptor.value, depth + 1), enumerable: true });
      }
      if (item.length >= 1024) yield;
      if (Object.getOwnPropertyNames(item).length !== item.length + 1) throw new TypeError('Worker packet has non-data properties.');
      active.delete(item); return Object.freeze(result);
    }
    const keys = Object.getOwnPropertyNames(item);
    if (keys.length > limits.packetValues - values) throw new TypeError('Worker packet exceeds its value budget.');
    for (const key of keys) {
      if (key.length > limits.packetKeyCodeUnits) throw new TypeError('Worker packet property name exceeds its budget.');
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new TypeError('Worker packet has non-data properties.');
      Object.defineProperty(result, key, { value: yield* copy(descriptor.value, depth + 1), enumerable: true }); count++;
    }
    Object.setPrototypeOf(result, null);
    if (Object.getPrototypeOf(result) !== null) throw new TypeError('Worker packet prototype cutover failed.');
    active.delete(item); return Object.freeze(result);
  }
  return copy(value, 0);
}
export function captureResourceData(value) {
  const iterator = resourceCapture(value); let step;
  do { step = iterator.next(); } while (!step.done);
  return step.value;
}
// Count bounds keep every generator step finite. A short time/count batch
// avoids paying a platform timer quantum for every tiny step, without joining
// all admitted work back into one uninterrupted main-thread task.
export async function runBoundedStepsAsync(iterator, assertCurrent) {
  let firstYield = true;
  try {
    for (;;) {
      const started = globalThis.performance.now();
      if (!Number.isFinite(started)) throw new TypeError('The bounded work clock is unavailable.');
      for (let count = 0; count < 16; count++) {
        assertCurrent(); const step = iterator.next(); assertCurrent();
        if (step.done) return step.value;
        const current = globalThis.performance.now();
        if (!Number.isFinite(current) || current < started) throw new TypeError('The bounded work clock is inconsistent.');
        if (firstYield || current - started >= 4) { firstYield = false; break; }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } finally { iterator.return(); }
}
export async function captureResourceDataAsync(value, assertCurrent) {
  return await runBoundedStepsAsync(resourceCapture(value), assertCurrent);
}

export function assertPresentationBudget(root) {
  const limits = FILE_SUPPORT.limits, document = root.ownerDocument;
  const tree = document.createTreeWalker(document.documentElement, 0xffffffff);
  // Native TreeWalker visits parents before their descendants. Retain only
  // that current path, rather than allocating two entries for every DOM node.
  // Both stacks stay within the checked depth bound and expire with this call.
  const ancestors = [], ownership = [];
  let globalNodes = 0, globalElements = 0, ownedNodes = 0, ownedElements = 0, units = 0;
  for (let node = tree.currentNode; node; node = tree.nextNode()) {
    if (++globalNodes > limits.bodyNodes) throw new TypeError('Presentation exceeds the global node budget.');
    while (ancestors.length && ancestors[ancestors.length - 1] !== node.parentNode) { ancestors.pop(); ownership.pop(); }
    const depth = ancestors.length + 1;
    if (depth > limits.domDepth) throw new TypeError('Presentation exceeds the DOM depth budget.');
    if (node.nodeType === 1 && ++globalElements > limits.bodyElements) throw new TypeError('Presentation exceeds the global element budget.');
    const owned = node === root || ownership[ownership.length - 1];
    ancestors.push(node); ownership.push(Boolean(owned));
    if (owned) {
      if (++ownedNodes > limits.evidenceNodes) throw new TypeError('Original evidence exceeds its node budget.');
      if (node.nodeType === 1 && ++ownedElements > limits.evidenceElements) throw new TypeError('Original evidence exceeds its element budget.');
      if (node.nodeType === 3 && (units += node.data.length) > limits.evidenceCodeUnits) throw new TypeError('Original evidence exceeds its text budget.');
    }
  }
  return Object.freeze({ globalNodes, globalElements, ownedNodes, ownedElements, units });
}

const LOCATION_KEYS = ['startOffset','endOffset','startByte','endByte'];
const RECORD_KEYS = ['sourceRecordOrdinal','dataRecordNumber','originalRecord',...LOCATION_KEYS,'terminator','terminatorLocation','cells'];
const CELL_KEYS = ['columnIndex','lexeme','rawValue','normalizedValue',...LOCATION_KEYS];
const RUN_KEYS = ['count','totalCells','firstSourceRecordOrdinal','lastSourceRecordOrdinal',...LOCATION_KEYS,'firstRecord'];
const SCAN_KEYS = ['version','origin','complete','records','emptyRuns','sourceRecordCount','failure'];
const FAILURE_KEYS = ['message',...LOCATION_KEYS,'sourceRecordOrdinal'];
function exactDataShape(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.getOwnPropertySymbols(value).length) return false;
  const names = Object.getOwnPropertyNames(value);
  return names.length === keys.length && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
  });
}
function denseDataArray(value, maximum) {
  if (!Array.isArray(value) || value.length > maximum || Object.getOwnPropertySymbols(value).length ||
      Object.getOwnPropertyNames(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return false;
  }
  return true;
}
function* workerScanShape(scan) {
  const limits = FILE_SUPPORT.limits;
  const integer = (value, maximum) => Number.isInteger(value) && value >= 0 && value <= maximum;
  const location = value => LOCATION_KEYS.every(key => integer(value[key], key.endsWith('Byte') ? limits.inputBytes : limits.decodedCodeUnits));
  if (!exactDataShape(scan, SCAN_KEYS) || !denseDataArray(scan.records, limits.dataRows + 1) ||
      !denseDataArray(scan.emptyRuns, limits.sourceRecords) || scan.version !== 'csv-lexical-evidence-v1' || scan.origin !== 'decoded-text-only' ||
      typeof scan.complete !== 'boolean' || !integer(scan.sourceRecordCount, limits.sourceRecords) ||
      scan.failure !== null && (!exactDataShape(scan.failure, FAILURE_KEYS) || typeof scan.failure.message !== 'string' ||
        !scan.failure.message.length || scan.failure.message.length > 4096 ||
        !LOCATION_KEYS.every(key => scan.failure[key] === null || integer(scan.failure[key], key.endsWith('Byte') ? limits.inputBytes : limits.decodedCodeUnits)) ||
        scan.failure.sourceRecordOrdinal !== null && !integer(scan.failure.sourceRecordOrdinal, limits.sourceRecords + 1))) throw new TypeError('Worker lexical inventory exceeds its current shape contract.');
  let visited = 0, representedCells = 0;
  function* record(record) {
    if (++visited % 256 === 0) yield;
    if (!exactDataShape(record, RECORD_KEYS) || !exactDataShape(record.terminatorLocation, LOCATION_KEYS) ||
        !location(record) || !location(record.terminatorLocation) || !integer(record.sourceRecordOrdinal, limits.sourceRecords) ||
        record.dataRecordNumber !== null && !integer(record.dataRecordNumber, limits.dataRows) ||
        typeof record.originalRecord !== 'string' || record.originalRecord.length > limits.decodedCodeUnits || !['','\n','\r','\r\n'].includes(record.terminator) ||
        !denseDataArray(record.cells, limits.columns) || !record.cells.length ||
        (representedCells += record.cells.length) > limits.totalCells) throw new TypeError('Worker lexical record has an unsupported shape.');
    for (const cell of record.cells) {
      if (++visited % 256 === 0) yield;
      if (!exactDataShape(cell, CELL_KEYS) || !location(cell) || !integer(cell.columnIndex, limits.columns) ||
          typeof cell.lexeme !== 'string' || cell.lexeme.length > limits.lexemeCodeUnits ||
          typeof cell.rawValue !== 'string' || cell.rawValue.length > limits.cellCodeUnits ||
          typeof cell.normalizedValue !== 'string' || cell.normalizedValue.length > limits.cellCodeUnits) throw new TypeError('Worker lexical cell has an unsupported shape.');
    }
  }
  for (const item of scan.records) yield* record(item);
  for (const run of scan.emptyRuns) {
    if (!exactDataShape(run, RUN_KEYS) || !location(run) || !integer(run.count, limits.sourceRecords) ||
        !integer(run.totalCells, limits.totalCells) || !integer(run.firstSourceRecordOrdinal, limits.sourceRecords) ||
        !integer(run.lastSourceRecordOrdinal, limits.sourceRecords)) throw new TypeError('Worker empty-record inventory has an unsupported shape.');
    yield* record(run.firstRecord);
  }
  return scan;
}
export async function assertWorkerScanShapeAsync(scan, assertCurrent) {
  return await runBoundedStepsAsync(workerScanShape(scan), assertCurrent);
}

function* workerScanValidation(scan, text, byteLength) {
  const limits = FILE_SUPPORT.limits;
  yield* workerScanShape(scan);
  if (scan.version !== 'csv-lexical-evidence-v1' || scan.origin !== 'decoded-text-only' ||
      typeof scan.complete !== 'boolean' || !Array.isArray(scan.records) || !Array.isArray(scan.emptyRuns) ||
      scan.records.length > limits.dataRows + 1 || scan.emptyRuns.length > limits.sourceRecords ||
      !Number.isInteger(scan.sourceRecordCount) || scan.sourceRecordCount < 0 || scan.sourceRecordCount > limits.sourceRecords ||
      scan.complete !== (scan.failure === null)) throw new TypeError('Worker lexical inventory exceeds its current shape contract.');
  const offsets = yield* csvByteOffsetSteps(text);
  const location = value => LOCATION_KEYS.every(key => Number.isInteger(value[key]) && value[key] >= 0) &&
    value.startOffset <= value.endOffset && value.endOffset <= text.length && value.startByte <= value.endByte && value.endByte <= byteLength && offsets[value.startOffset] === value.startByte && offsets[value.endOffset] === value.endByte;
  let cells = 0, verifiedFields = 0;
  const segments = [];
  function* recordShape(record, dataNumber, ordinal) {
    if (!record || !location(record) || record.originalRecord !== text.slice(record.startOffset, record.endOffset) ||
        record.sourceRecordOrdinal !== ordinal || record.dataRecordNumber !== dataNumber ||
        !Array.isArray(record.cells) || !record.cells.length || record.cells.length > limits.columns || !location(record.terminatorLocation) ||
        record.terminatorLocation.startOffset !== record.endOffset || !['','\n','\r','\r\n'].includes(record.terminator) ||
        record.terminator === '\r' && text[record.terminatorLocation.endOffset] === '\n' ||
        record.terminator !== text.slice(record.terminatorLocation.startOffset, record.terminatorLocation.endOffset) ||
        !record.terminator && record.endOffset !== text.length) throw new TypeError('Worker lexical record is inconsistent.');
    let end = record.startOffset;
    for (const [index, cell] of record.cells.entries()) {
      if (++verifiedFields % 256 === 0) yield;
      if (!cell || !location(cell) || cell.columnIndex !== index + 1 || typeof cell.rawValue !== 'string' ||
          cell.startOffset !== end || cell.endOffset > record.endOffset ||
          cell.rawValue.length > limits.cellCodeUnits || cell.lexeme !== text.slice(cell.startOffset, cell.endOffset) ||
          cell.lexeme.length > limits.lexemeCodeUnits || decodeCsvLexeme(cell.lexeme) !== cell.rawValue || cell.normalizedValue !== cell.rawValue.trim()) throw new TypeError('Worker lexical cell exceeds its current contract.');
      end = cell.endOffset;
      if (index < record.cells.length - 1) { if (text[end] !== ',') throw new TypeError('Worker cell partition omits its delimiter.'); end++; }
    }
    if (end !== record.endOffset) throw new TypeError('Worker cell partition does not cover its record.');
  }
  for (const [index, record] of scan.records.entries()) {
    if (!Number.isInteger(record.sourceRecordOrdinal) || record.sourceRecordOrdinal < 1 || record.sourceRecordOrdinal > scan.sourceRecordCount || index && record.sourceRecordOrdinal <= scan.records[index - 1].sourceRecordOrdinal) throw new TypeError('Worker record ordinal is invalid.');
    yield* recordShape(record, index || null, record.sourceRecordOrdinal);
    if (!record.cells.some(cell => cell.rawValue !== '') || (cells += record.cells.length) > limits.totalCells) throw new TypeError('Worker retained record work exceeds its budget.');
    segments.push({ start: record.startOffset, end: record.terminatorLocation.endOffset, first: record.sourceRecordOrdinal, count: 1 });
  }
  let emptyCount = 0, previousRun = null;
  for (const run of scan.emptyRuns) {
    if (!location(run) || !Number.isInteger(run.count) || run.count <= 0 ||
        !Number.isInteger(run.firstSourceRecordOrdinal) || run.firstSourceRecordOrdinal < 1 || !Number.isInteger(run.lastSourceRecordOrdinal) ||
        previousRun && (run.firstSourceRecordOrdinal <= previousRun.lastSourceRecordOrdinal || run.startOffset <= previousRun.endOffset) ||
        run.lastSourceRecordOrdinal - run.firstSourceRecordOrdinal + 1 !== run.count || run.lastSourceRecordOrdinal > scan.sourceRecordCount ||
        !Number.isInteger(run.totalCells) || run.totalCells < run.count || run.totalCells > run.count * limits.columns ||
        !run.firstRecord || run.firstRecord.startOffset !== run.startOffset || run.firstRecord.terminatorLocation.endOffset > run.endOffset) throw new TypeError('Worker empty-record inventory is inconsistent.');
    yield* recordShape(run.firstRecord, null, run.firstSourceRecordOrdinal);
    // Reuse the sole lexical owner for compact omitted evidence. Never infer skipped work from its representative.
    const originalRun = yield* scanCsvEvidenceSteps(text.slice(run.startOffset, run.endOffset));
    if (!originalRun.complete || originalRun.records.length || originalRun.sourceRecordCount !== run.count ||
        originalRun.emptyRuns.reduce((sum, item) => sum + item.totalCells, 0) !== run.totalCells ||
        originalRun.emptyRuns[0]?.firstRecord.originalRecord !== run.firstRecord.originalRecord) throw new TypeError('Worker omitted-run evidence is inconsistent.');
    previousRun = run;
    emptyCount += run.count;
    if (emptyCount + scan.records.length > scan.sourceRecordCount || (cells += run.totalCells) > limits.totalCells) throw new TypeError('Worker skipped work exceeds its budget.');
    segments.push({ start: run.startOffset, end: run.endOffset, first: run.firstSourceRecordOrdinal, count: run.count });
  }
  segments.sort((a,b) => a.start - b.start);
  let position = text.startsWith('\uFEFF') ? 1 : 0, ordinal = 1;
  for (const segment of segments) {
    if (segment.start !== position || segment.first !== ordinal) throw new TypeError('Worker source inventory has gaps or reordered records.');
    position = segment.end; ordinal += segment.count;
    if (text[position - 1] === '\r' && text[position] === '\n') throw new TypeError('Worker source boundary splits a CRLF terminator.');
  }
  if (scan.complete && (ordinal - 1 !== scan.sourceRecordCount || position !== text.length)) throw new TypeError('Worker complete inventory is not complete.');
  if (scan.failure) {
    if (typeof scan.failure !== 'object' || Object.keys(scan.failure).length !== 6 ||
        typeof scan.failure.message !== 'string' || !scan.failure.message.length || scan.failure.message.length > 4096) throw new TypeError('Worker lexical failure is malformed.');
    if (text.length && position >= text.length) throw new TypeError('Worker partial failure has no remaining source frontier.');
    const keys = ['startOffset','endOffset','startByte','endByte'];
    if (keys.every(key => scan.failure[key] === null) && (text.length || scan.records.length || scan.emptyRuns.length || scan.sourceRecordCount || scan.failure.sourceRecordOrdinal !== null)) throw new TypeError('Worker partial lexical failure omits its known location.');
    if (keys.some(key => scan.failure[key] !== null) && (!location(scan.failure) || scan.failure.startOffset !== scan.failure.endOffset ||
        scan.failure.startOffset < position || scan.failure.sourceRecordOrdinal !== ordinal)) throw new TypeError('Worker lexical failure location is malformed.');
    yield* assertCsvFailureFrontierSteps(text, { startOffset: position, sourceRecords: ordinal - 1,
      records: scan.records.length, totalCells: cells, offsets }, scan.failure, scan.sourceRecordCount);
  } else if (!scan.complete) {
    throw new TypeError('Worker lexical failure is malformed.');
  }
  return scan;
}

export function assertWorkerScan(scan, text, byteLength) {
  const iterator = workerScanValidation(scan, text, byteLength); let step;
  do { step = iterator.next(); } while (!step.done);
  return step.value;
}
export async function assertWorkerScanAsync(scan, text, byteLength, assertCurrent) {
  return await runBoundedStepsAsync(workerScanValidation(scan, text, byteLength), assertCurrent);
}
