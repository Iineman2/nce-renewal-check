// Private custody of acquired originals. A digest proves byte identity, never authenticity.
import { FILE_SUPPORT } from './file-support.mjs';
import { scanCsvEvidence } from './csv-evidence.mjs';
import { frozenData, sameData } from './input.mjs';
import { runBoundedStepsAsync } from './resource-packet.mjs';
import { takeProcessingPacket, bindProcessedHandle, releaseProcessedEvidence, assertProcessingPacketLive } from './bounded-reader.mjs';

const originals = new WeakMap();
const bufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
// A File's overridden method is not an independent observation of its Blob.
const nativeBlobBytes = typeof Blob === 'function' && Blob.prototype.arrayBuffer;
const hex = buffer => {
  let length;
  try { length = bufferLength.call(buffer); } catch { throw new TypeError('SHA-256 returned an invalid byte buffer.'); }
  if (length !== 32) throw new TypeError('SHA-256 returned an invalid byte length.');
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
};
function owner(handle, role) {
  const source = originals.get(handle);
  if (!source || source.role !== role) throw new TypeError('Original evidence requires its current live source and role.');
  source.handling?.assertCurrent();
  return source;
}
export function bindFileHandling(handle, role, file, assertCurrent, released) {
  const source = owner(handle, role);
  if (source.file !== file || source.handling || typeof assertCurrent !== 'function' || typeof released !== 'function') throw new TypeError('Original permission requires its exact current acquisition.');
  assertCurrent(); source.handling = { assertCurrent, released };
}
export function assertEvidenceRuntime() {
  if (typeof globalThis.crypto?.subtle?.digest !== 'function') throw new TypeError('SHA-256 original evidence is unavailable. Reload and reselect the original files.');
}
// Byte validity is independent of a substituted decoder's exception type/text.
// This recognizes UTF-8 scalar sequences; it never creates decoded evidence.
const EVIDENCE_WORK_CHUNK = 16384;
function finishEvidenceWork(iterator) {
  let step;
  do { step = iterator.next(); } while (!step.done);
  return step.value;
}
async function finishEvidenceWorkAsync(iterator, current) {
  return await runBoundedStepsAsync(iterator, current);
}
function* equalByteSteps(left, right) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (i && i % EVIDENCE_WORK_CHUNK === 0) yield;
    if (left[i] !== right[i]) return false;
  }
  return true;
}
function* wellFormedUtf8Steps(bytes) {
  let nextYield = EVIDENCE_WORK_CHUNK;
  for (let i = 0; i < bytes.length;) {
    if (i >= nextYield) { yield; nextYield = i + EVIDENCE_WORK_CHUNK; }
    const first = bytes[i++];
    if (first <= 0x7f) continue;
    let count, low = 0x80, high = 0xbf;
    if (first >= 0xc2 && first <= 0xdf) count = 1;
    else if (first >= 0xe0 && first <= 0xef) { count = 2; if (first === 0xe0) low = 0xa0; if (first === 0xed) high = 0x9f; }
    else if (first >= 0xf0 && first <= 0xf4) { count = 3; if (first === 0xf0) low = 0x90; if (first === 0xf4) high = 0x8f; }
    else return false;
    if (i + count > bytes.length || bytes[i] < low || bytes[i] > high) return false;
    i++;
    while (--count) { if (bytes[i] < 0x80 || bytes[i] > 0xbf) return false; i++; }
  }
  return true;
}
function* encodingProblemSteps(bytes) {
  if (bytes.length >= 4 && (bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0 && bytes[3] === 0 || bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0xfe && bytes[3] === 0xff)) return 'This file uses a UTF-32 byte-order mark. Keep the original and prepare a separate normalized CSV saved as UTF-8.';
  if (bytes.length >= 2 && (bytes[0] === 0xff && bytes[1] === 0xfe || bytes[0] === 0xfe && bytes[1] === 0xff)) return 'This file uses a UTF-16 byte-order mark. Keep the original and prepare a separate normalized CSV saved as UTF-8.';
  if (!(yield* wellFormedUtf8Steps(bytes))) return 'The original bytes are not valid UTF-8. Keep the original and prepare a separate normalized CSV saved as UTF-8.';
  return null;
}
function* wellFormedUtf16Steps(text) {
  let nextYield = EVIDENCE_WORK_CHUNK;
  for (let i = 0; i < text.length; i++) {
    if (i >= nextYield) { yield; nextYield = i + EVIDENCE_WORK_CHUNK; }
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = text.charCodeAt(++i);
      if (!(low >= 0xdc00 && low <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}
function* encodedByteSteps(text, bytes, current = null) {
  const encoder = new TextEncoder();
  current?.();
  let offset = 0, position = 0;
  do {
    let end = Math.min(text.length, offset + EVIDENCE_WORK_CHUNK);
    // Keep a Unicode scalar wholly in one native encoder invocation.
    if (end < text.length && text.charCodeAt(end - 1) >= 0xd800 && text.charCodeAt(end - 1) <= 0xdbff) end--;
    const encoded = encoder.encode(text.slice(offset, end));
    current?.();
    if (!ArrayBuffer.isView(encoded) || !Number.isInteger(encoded.length) || encoded.length > (end - offset) * 3 ||
        encoded.length > bytes.length - position) return false;
    for (let i = 0; i < encoded.length; i++) if (encoded[i] !== bytes[position + i]) return false;
    position += encoded.length; offset = end;
    if (offset < text.length) yield;
  } while (offset < text.length);
  return position === bytes.length;
}
export async function captureFileEvidence(buffer, role, file) {
  if (!['pax-file', 'halo-file'].includes(role) || !file || typeof file !== 'object') throw new TypeError('Original evidence requires a supplied file occurrence and role.');
  let length;
  try { length = bufferLength.call(buffer); } catch { throw new TypeError('The file reader returned an invalid byte buffer. Reload and reselect the original file.'); }
  if (length > FILE_SUPPORT.limits.inputBytes) throw new TypeError('Original evidence exceeds its byte limit.');
  // This copy runs synchronously, before the first await or any text transformation.
  const bytes = new Uint8Array(length); bytes.set(new Uint8Array(buffer));
  const name = file.name, type = file.type, lastModified = file.lastModified;
  const metadata = Object.freeze({ name: typeof name === 'string' ? name : '', type: typeof type === 'string' ? type : '',
    lastModified: Number.isFinite(lastModified) ? lastModified : null });
  assertEvidenceRuntime();
  const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
  if (hex(await digest('SHA-256', Uint8Array.of(97,98,99))) !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') throw new TypeError('SHA-256 does not implement the required original-byte contract.');
  const hashInput = bytes.slice();
  const identity = hex(await digest('SHA-256', hashInput));
  if (!finishEvidenceWork(equalByteSteps(hashInput, bytes))) throw new TypeError('Hashing changed its supplied defensive byte copy.');
  if (!/^[0-9a-f]{64}$/.test(identity)) throw new TypeError('SHA-256 returned an invalid original-byte identity.');
  let decoder;
  try { decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }); }
  catch { throw new TypeError('The UTF-8 decoder is unavailable. Reload and reselect the original file.'); }
  let invalid = false;
  try { decoder.decode(Uint8Array.of(0xff)); } catch { invalid = true; }
  if (!invalid || decoder.decode(Uint8Array.of(0x41,0xef,0xbf,0xbd)) !== 'A\uFFFD' || decoder.decode(Uint8Array.of(0xef,0xbb,0xbf,0x41)) !== '\uFEFFA') throw new TypeError('The UTF-8 decoder does not implement the required byte contract. Reload the page.');
  let text = null;
  const encodingProblem = finishEvidenceWork(encodingProblemSteps(bytes));
  if (encodingProblem === null) {
    const decodeInput = bytes.slice();
    try { text = decoder.decode(decodeInput); }
    catch { throw new TypeError('The UTF-8 decoder failed on valid original bytes. Reload and reselect the original file.'); }
    if (!finishEvidenceWork(equalByteSteps(decodeInput, bytes))) throw new TypeError('Decoding changed its supplied defensive byte copy.');
    if (typeof text !== 'string') throw new TypeError('The UTF-8 decoder returned invalid text.');
    if (text.length > bytes.length) throw new TypeError('The UTF-8 decoder expanded text beyond the original byte bound.');
    // TextEncoder replaces lone surrogates with U+FFFD, so byte roundtrip
    // alone is not injective until decoded text consists of Unicode scalars.
    if (!finishEvidenceWork(wellFormedUtf16Steps(text))) throw new TypeError('The UTF-8 decoder returned malformed UTF-16 text.');
    if (!finishEvidenceWork(encodedByteSteps(text, bytes))) throw new TypeError('Decoded text does not preserve its original UTF-8 byte sequence.');
  }
  const scan = text === null ? null : scanCsvEvidence(text);
  const handle = Object.freeze(Object.create(null));
  originals.set(handle, { role, file, bytes, metadata, identity, text, scan, encodingProblem });
  return handle;
}
export function sourceMatches(handle, role, file) { return owner(handle, role).file === file; }
export function sourceText(handle, role) { return owner(handle, role).text; }
export function sourceEncodingProblem(handle, role) { return owner(handle, role).encodingProblem; }
export function originalBytes(handle, role) { return owner(handle, role).bytes.slice(); }
export function releaseFileEvidence(handle) {
  if (handle && typeof handle === 'object') {
    const source = originals.get(handle);
    originals.delete(handle); releaseProcessedEvidence(handle);
    source?.handling?.released();
  }
}
export function transferFileEvidence(handle, role) {
  const source = owner(handle, role);
  return { bytes: source.bytes.slice().buffer, data: { text: source.text, sha256: source.identity,
    metadata: source.metadata, scan: source.scan, encodingProblem: source.encodingProblem } };
}
export async function adoptProcessedEvidence(packet, role, file) {
  const data = takeProcessingPacket(packet, role, file), bytes = new Uint8Array(data.bytes);
  const current = () => assertProcessingPacketLive(packet, role, file);
  current(); assertEvidenceRuntime();
  if (typeof nativeBlobBytes !== 'function') throw new TypeError('Native original verification is unavailable.');
  const supplied = await nativeBlobBytes.call(file);
  current();
  if (bufferLength.call(supplied) !== bytes.length || bytes.length > FILE_SUPPORT.limits.inputBytes ||
      !(await finishEvidenceWorkAsync(equalByteSteps(new Uint8Array(supplied), bytes), current))) throw new TypeError('Processed bytes disagree with the supplied original file.');
  current();
  const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
  const probe = await digest('SHA-256', Uint8Array.of(97,98,99));
  current();
  if (hex(probe) !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') throw new TypeError('Original hashing contract failed.');
  const hashInput = bytes.slice(); current();
  const identity = await digest('SHA-256', hashInput);
  current();
  if (hex(identity) !== data.sha256 || !(await finishEvidenceWorkAsync(equalByteSteps(hashInput, bytes), current))) throw new TypeError('Processed original bytes disagree with their identity.');
  current();
  const encodingProblem = await finishEvidenceWorkAsync(encodingProblemSteps(bytes), current);
  if (data.encodingProblem !== encodingProblem || (data.text === null) !== (encodingProblem !== null)) throw new TypeError('Processed original encoding diagnostic disagrees with its bytes.');
  if (data.text !== null) {
    if (data.text.length > bytes.length || !(await finishEvidenceWorkAsync(wellFormedUtf16Steps(data.text), current))) throw new TypeError('Processed original decoding is inconsistent.');
    if (!(await finishEvidenceWorkAsync(encodedByteSteps(data.text, bytes, current), current))) throw new TypeError('Processed original text disagrees with its bytes.');
  }
  current(); const handle = Object.freeze(Object.create(null));
  originals.set(handle, { role, file, bytes, metadata: data.metadata, identity: data.sha256,
    text: data.text, scan: data.scan, encodingProblem: data.encodingProblem });
  try { bindProcessedHandle(packet, handle, role, file); } catch (error) { originals.delete(handle); throw error; }
  return handle;
}
export const SOURCE_PREVIEW_RECORDS = 5;
export function sourceProjection(handle, role, offset = 0) {
  const source = owner(handle, role), scan = source.scan;
  const width = Math.max(1, ...((scan?.records ?? []).slice(offset, offset + SOURCE_PREVIEW_RECORDS).map(record => record.cells.length)));
  const pageSize = Math.min(SOURCE_PREVIEW_RECORDS, Math.max(1, Math.floor(FILE_SUPPORT.limits.previewCells / width)));
  if (!Number.isInteger(offset) || offset < 0 || (scan?.records.length ? offset >= scan.records.length : offset !== 0)) throw new TypeError('Choose a current original-evidence page.');
  return frozenData({ version: 'original-file-evidence-v1', role, sha256: source.identity, byteLength: source.bytes.length,
    metadata: source.metadata, authenticated: false, actionAuthorized: false, financialVerdict: null,
    decoding: source.encodingProblem ? 'unavailable' : 'UTF-8 with initial BOM retained', encodingProblem: source.encodingProblem,
    lexicalComplete: scan?.complete ?? false, failure: scan?.failure ?? null,
    recordCount: scan?.records.length ?? 0, sourceRecordCount: scan?.sourceRecordCount ?? 0,
    emptyRecordCount: scan?.emptyRuns.reduce((sum, run) => sum + run.count, 0) ?? 0,
    emptyRunCount: scan?.emptyRuns.length ?? 0, emptyRuns: scan?.emptyRuns.slice(0, SOURCE_PREVIEW_RECORDS) ?? [],
    headers: scan?.records[0]?.cells ?? [],
    offset, pageSize, records: scan?.records.slice(offset, offset + pageSize) ?? [] });
}
export function assertSourceProjection(projection, handle, role, offset = 0) {
  const captured = frozenData(projection), expected = sourceProjection(handle, role, offset);
  if (!sameData(captured, expected)) throw new TypeError('Displayed original evidence disagrees with its live byte owner.');
  return expected;
}
