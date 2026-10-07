// Sole CSV lexical owner. Normalized profile and case decisions stay in preflight.
import { FILE_SUPPORT } from './file-support.mjs';
import { cachedLexicalEvidence } from './bounded-reader.mjs';

// Standalone/worker reuse is bounded; browser acquired scans come from the
// private job owner. Neither cache can register a caller's invented scan.
const localScans = new Map();
const standaloneCache = typeof document === 'undefined';
class CanonicalLexicalRuntimeError extends Error {}
export const CSV_DATA_ROW_LIMIT_MESSAGE = `CSV exceeds ${FILE_SUPPORT.limits.dataRows} rows`;

// Shared lexical field and coordinate truth; both scan emission and received evidence use these.
export function decodeCsvLexeme(lexeme) {
  if (typeof lexeme !== 'string' || lexeme.length > FILE_SUPPORT.limits.lexemeCodeUnits) throw new TypeError('CSV lexical field exceeds its budget');
  if (!lexeme.startsWith('"')) {
    if (/[",\r\n]/.test(lexeme)) throw new TypeError('Unexpected delimiter or quote in a CSV field');
    return lexeme;
  }
  const match = /^"((?:""|[^"])*)"[ \t]*$/.exec(lexeme);
  if (!match) throw new TypeError('CSV quoted lexical field is incomplete');
  return match[1].replaceAll('""', '"');
}
export function* csvByteOffsetSteps(text) {
  if (typeof text !== 'string' || text.length > FILE_SUPPORT.limits.decodedCodeUnits) throw new TypeError('CSV exceeds the two-megabyte decoded text limit');
  // The synchronous lexer and yielding receiver share this coordinate pass.
  // Allocation is native; yield before it and bound each scalar walk after it.
  if (text.length >= 16384) yield;
  const offsets = new Uint32Array(text.length + 1); let bytes = 0;
  let nextYield = 16384;
  for (let i = 0; i < text.length;) {
    if (i >= nextYield) { yield; nextYield = i + 16384; }
    offsets[i] = bytes;
    const code = text.codePointAt(i), width = code > 0xffff ? 2 : 1;
    if (code >= 0xd800 && code <= 0xdfff) throw new TypeError('CSV must contain valid Unicode text saved as UTF-8');
    if (width === 2) offsets[i + 1] = 0xffffffff;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    i += width;
  }
  offsets[text.length] = bytes;
  if (bytes > FILE_SUPPORT.limits.decodedUtf8Bytes) throw new TypeError('CSV exceeds the two-megabyte preflight limit');
  return offsets;
}
export function csvByteOffsets(text) {
  const iterator = csvByteOffsetSteps(text); let step;
  do { step = iterator.next(); } while (!step.done);
  return step.value;
}

function* scanLexicalEvidenceSteps(text, context = null, fresh = false) {
  if (typeof text !== 'string') throw new TypeError('CSV text must be supplied');
  const cached = context || fresh ? null : cachedLexicalEvidence(text) ?? (standaloneCache ? localScans.get(text) : null);
  if (cached) return cached;
  const freezeEmission = value => {
    if (!fresh) return Object.freeze(value);
    try {
      if (!Array.isArray(value)) {
      Object.setPrototypeOf(value, null);
      if (Object.getPrototypeOf(value) !== null) throw new TypeError('Canonical lexical prototype cutover failed.');
      }
      const frozen = Object.freeze(value);
      if (frozen !== value || !Object.isFrozen(value)) throw new TypeError('Canonical lexical freeze did not retain its immutable emission.');
      return value;
    } catch {
      // Fresh acquisition owns this construction. A failed native cutover or
      // freeze is a runtime failure, never a malformed-source diagnostic.
      throw new CanonicalLexicalRuntimeError('Canonical lexical construction failed.');
    }
  };
  const records = [], emptyRuns = [];
  let failure = null, cursor = 0, ordinal = context?.sourceRecords ?? 0, totalCells = context?.totalCells ?? 0, constructedFields = 0;
  const priorRecords = context?.records ?? 0;
  let offsets;
  const location = (start, end) => freezeEmission({ startOffset: start, endOffset: end,
    startByte: offsets[start], endByte: offsets[end] });
  function fail(message, at = cursor, sourceOrdinal = ordinal + 1) {
    if (offsets[at] === 0xffffffff) at--;
    const error = new TypeError(message);
    failure = freezeEmission({ message, ...location(at, at), sourceRecordOrdinal: sourceOrdinal });
    throw error;
  }
  try {
    if (!text.length) throw new TypeError('CSV is empty');
    // One canonical bounded pass supplies byte coordinates, including BOM.
    offsets = context?.offsets ?? (yield* csvByteOffsetSteps(text));
    cursor = context?.startOffset ?? (text.startsWith('\uFEFF') ? 1 : 0);
    let recordStart = cursor, cellStart = cursor, cells = [], raw = '', quoted = false, closed = false;
    function pushCell(end) {
      if (end - cellStart > FILE_SUPPORT.limits.lexemeCodeUnits) fail(`CSV lexical field exceeds ${FILE_SUPPORT.limits.lexemeCodeUnits} UTF-16 code units`, cellStart);
      if (totalCells >= FILE_SUPPORT.limits.totalCells) fail(`CSV exceeds ${FILE_SUPPORT.limits.totalCells} total cells including headers and blanks`, cellStart);
      if (cells.length >= FILE_SUPPORT.limits.columns) fail(`CSV headers and rows must contain at most ${FILE_SUPPORT.limits.columns} columns`, cellStart);
      if (raw.length > FILE_SUPPORT.limits.cellCodeUnits) fail(`CSV row ${priorRecords + records.length + 1} has a value over ${FILE_SUPPORT.limits.cellCodeUnits} characters`, cellStart);
      const lexeme = text.slice(cellStart, end);
      if (decodeCsvLexeme(lexeme) !== raw) throw new TypeError('CSV lexical emission differs from its field decoder');
      totalCells++; constructedFields++;
      cells.push(freezeEmission({ columnIndex: cells.length + 1, lexeme,
        rawValue: raw, normalizedValue: raw.trim(), ...location(cellStart, end) }));
      if (cells.length > FILE_SUPPORT.limits.columns) fail(`CSV headers and rows must contain at most ${FILE_SUPPORT.limits.columns} columns`, cellStart);
    }
    function pushRecord(end, terminatorEnd) {
      if (ordinal >= FILE_SUPPORT.limits.sourceRecords) fail(`CSV exceeds ${FILE_SUPPORT.limits.sourceRecords} lexical source records including blanks`, recordStart);
      ordinal++;
      const nonempty = cells.some(cell => cell.rawValue !== '');
      if (nonempty && priorRecords + records.length >= FILE_SUPPORT.limits.dataRows + 1) fail(CSV_DATA_ROW_LIMIT_MESSAGE, recordStart, ordinal);
      const item = { sourceRecordOrdinal: ordinal, dataRecordNumber: records.length || null,
        originalRecord: text.slice(recordStart, end), ...location(recordStart, end),
        terminator: text.slice(end, terminatorEnd), terminatorLocation: location(end, terminatorEnd), cells: freezeEmission(cells) };
      if (nonempty) {
        records.push(freezeEmission(item));
        if (priorRecords + records.length > FILE_SUPPORT.limits.dataRows + 1) fail(CSV_DATA_ROW_LIMIT_MESSAGE, recordStart, ordinal);
      } else {
        item.dataRecordNumber = null;
        const previous = emptyRuns.at(-1);
        if (previous && previous.endOffset === recordStart) {
          previous.count++; previous.totalCells += cells.length; previous.lastSourceRecordOrdinal = ordinal;
          Object.assign(previous, location(previous.startOffset, terminatorEnd));
        } else emptyRuns.push({ count: 1, totalCells: cells.length, firstSourceRecordOrdinal: ordinal, lastSourceRecordOrdinal: ordinal,
          ...location(recordStart, terminatorEnd), firstRecord: freezeEmission(item) });
      }
    }
    let nextYield = cursor + 16384, nextFieldYield = 256;
    for (; cursor < text.length; cursor++) {
      if (cursor >= nextYield || constructedFields >= nextFieldYield) {
        yield; nextYield = cursor + 16384; nextFieldYield = constructedFields + 256;
      }
      if (cursor - cellStart > FILE_SUPPORT.limits.lexemeCodeUnits) fail(`CSV lexical field exceeds ${FILE_SUPPORT.limits.lexemeCodeUnits} UTF-16 code units`, cellStart);
      if (raw.length > FILE_SUPPORT.limits.cellCodeUnits) fail(`CSV row ${priorRecords + records.length + 1} has a value over ${FILE_SUPPORT.limits.cellCodeUnits} characters`, cellStart);
      const ch = text[cursor];
      if (quoted) {
        if (ch === '"' && text[cursor + 1] === '"') { raw += '"'; cursor++; }
        else if (ch === '"') { quoted = false; closed = true; }
        else raw += ch;
      } else if (ch === '"' && raw === '' && !closed) quoted = true;
      else if (ch === '"') fail('Unexpected quote in an unquoted CSV value');
      else if (ch === ',') { pushCell(cursor); raw = ''; closed = false; cellStart = cursor + 1; }
      else if (ch === '\n' || ch === '\r') {
        const end = cursor;
        if (ch === '\r' && text[cursor + 1] === '\n') cursor++;
        pushCell(end); pushRecord(end, cursor + 1);
        cells = []; raw = ''; closed = false; recordStart = cellStart = cursor + 1;
      } else if (closed && ch !== ' ' && ch !== '\t') fail('Unexpected text after a quoted CSV value');
      else if (!closed) raw += ch;
    }
    if (quoted) fail('CSV has an unclosed quoted value', cellStart);
    // A final terminator does not create a phantom EOF record.
    if (recordStart < text.length) {
      if (constructedFields >= nextFieldYield) yield;
      pushCell(text.length); pushRecord(text.length, text.length);
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    if (!failure) failure = freezeEmission({ message: error.message, startOffset: null, endOffset: null,
      startByte: null, endByte: null, sourceRecordOrdinal: null });
  }
  for (let index = 0; index < emptyRuns.length; index++) {
    if (index && index % 256 === 0) yield;
    freezeEmission(emptyRuns[index]);
  }
  const result = freezeEmission({ version: 'csv-lexical-evidence-v1', origin: 'decoded-text-only', complete: failure === null,
    records: freezeEmission(records), emptyRuns: freezeEmission(emptyRuns),
    sourceRecordCount: ordinal, failure });
  if (!context && !fresh && standaloneCache && text.length <= FILE_SUPPORT.limits.decodedCodeUnits) {
    if (localScans.size >= FILE_SUPPORT.limits.cachedSources) localScans.delete(localScans.keys().next().value);
    localScans.set(text, result);
  }
  return result;
}

function finishLexicalSteps(iterator) {
  let step;
  do { step = iterator.next(); } while (!step.done);
  return step.value;
}
export function scanCsvEvidence(text) { return finishLexicalSteps(scanLexicalEvidenceSteps(text)); }
// Fresh reconstruction never consumes or registers a pending acquisition in a
// standalone/current-source cache. Interpretation is the same lexical owner.
export function* scanCsvEvidenceSteps(text, fresh = false) {
  if (typeof fresh !== 'boolean') throw new TypeError('CSV reconstruction must name a scalar fresh-read mode.');
  return yield* scanLexicalEvidenceSteps(text, null, fresh);
}

// Resume the sole lexer at the verified prefix frontier. Interior BOMs remain
// data; the prefix's row/cell budgets and byte-offset truth are retained.
// This emits no cache entry or source authority and is used only for diagnosis.
export function* assertCsvFailureFrontierSteps(text, context, failure, sourceRecordCount) {
  const replay = yield* scanLexicalEvidenceSteps(text, context);
  if (!replay.failure || replay.sourceRecordCount !== sourceRecordCount ||
      Object.entries(replay.failure).some(([key, value]) => failure[key] !== value)) {
    throw new TypeError('Worker lexical failure differs from its canonical source frontier.');
  }
}
export function assertCsvFailureFrontier(text, context, failure, sourceRecordCount) {
  return finishLexicalSteps(assertCsvFailureFrontierSteps(text, context, failure, sourceRecordCount));
}
