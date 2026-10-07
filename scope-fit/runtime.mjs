import { InputProblem, SOURCES } from './actions.mjs';
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { validateFileProfile } from './preflight.mjs';
import { captureFileEvidence, assertEvidenceRuntime, sourceMatches, sourceText, sourceEncodingProblem, originalBytes, releaseFileEvidence } from './file-evidence.mjs';
import { assertProcessedAcquisition } from './bounded-reader.mjs';

const bufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const issuedEvidence = new WeakMap();
export function assertLocalEvidence(evidence, role, file) {
  const issued = issuedEvidence.get(evidence);
  if (!issued || issued.role !== role || issued.file !== file || !sourceMatches(evidence.handle, role, file) || evidence.text !== sourceText(evidence.handle, role)) throw new TypeError('Original reading outcome requires its issued current acquisition.');
  return evidence;
}
const now = () => globalThis.performance.now();
export function assertFileRuntime() {
  assertEvidenceRuntime();
  if (typeof globalThis.File !== 'function' || typeof File.prototype.text !== 'function' ||
      typeof File.prototype.arrayBuffer !== 'function' || typeof globalThis.TextDecoder !== 'function' ||
      typeof globalThis.TextEncoder !== 'function' || typeof globalThis.FormData !== 'function' ||
      typeof globalThis.performance?.now !== 'function' || typeof globalThis.setTimeout !== 'function' || typeof globalThis.clearTimeout !== 'function') {
    throw new TypeError('The local file reader is unavailable. Reload the page and reselect the original files; do not change source facts to repair the runtime.');
  }
  try {
    const encoded = new TextEncoder().encode('A\uFFFD😀');
    const expected = [0x41, 0xef, 0xbf, 0xbd, 0xf0, 0x9f, 0x98, 0x80];
    if (!ArrayBuffer.isView(encoded) || encoded.length !== expected.length || expected.some((byte, index) => encoded[index] !== byte)) throw new TypeError('Invalid encoder');
  } catch { throw new TypeError('The UTF-8 encoder does not implement the required text contract. Reload and reselect the original file.'); }
}

export class FileEvidenceRuntimeError extends TypeError {}
export const FILE_TEXT_DISAGREEMENT_MESSAGE = 'The byte and text readings of this file disagree. Reselect the unchanged original file; stop if the problem continues.';
// File.text is a separate platform observation. It can disagree with byte-owned
// decoding, but cannot replace the supplied original or its canonical facts.
export function observedFileText(evidence, role, file) {
  assertLocalEvidence(evidence, role, file);
  const issued = issuedEvidence.get(evidence);
  if (!Object.hasOwn(issued, 'observedText')) throw new FileEvidenceRuntimeError('The file text observation requires its original read issuance.');
  return issued.observedText;
}
export function* fileTextAgreementSteps(decoded, observed, byteLength) {
  if (!Number.isInteger(byteLength) || byteLength < 0 || byteLength > FILE_SUPPORT.limits.inputBytes ||
      typeof decoded !== 'string' || decoded.length > byteLength ||
      typeof observed !== 'string' || observed.length > byteLength || observed.length > FILE_SUPPORT.limits.decodedCodeUnits) {
    throw new TypeError('The file text observation exceeds its original byte or decoded-text bound.');
  }
  const initialBom = decoded.startsWith('\uFEFF') ? 1 : 0;
  if (decoded.length - initialBom !== observed.length) return false;
  for (let offset = 0; offset < observed.length; offset += 16384) {
    if (offset) yield;
    const end = Math.min(observed.length, offset + 16384);
    for (let index = offset; index < end; index++) {
      if (decoded.charCodeAt(index + initialBom) !== observed.charCodeAt(index)) return false;
    }
  }
  return true;
}
function fileTextAgrees(decoded, observed, byteLength) {
  const iterator = fileTextAgreementSteps(decoded, observed, byteLength); let step;
  do { step = iterator.next(); } while (!step.done);
  return step.value;
}
export function profileEncodingProblem(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Profile encoding diagnosis requires original byte data.');
  const pairs = Math.floor(Math.min(bytes.length, 64) / 2);
  const alternating = pairs >= 4 && [0, 1].some(zero => Array.from({ length: pairs }, (_, i) =>
    bytes[i * 2 + zero] === 0 && bytes[i * 2 + 1 - zero] > 0 && bytes[i * 2 + 1 - zero] < 128).every(Boolean));
  return alternating ? 'This file does not match the normalized CSV profile and contains alternating null bytes. UTF-16 without a byte-order mark is one possible cause; these bytes can also be valid UTF-8. Keep the original, verify its encoding and original facts, and prepare a separate normalized CSV saved as UTF-8.' : null;
}
export function issueLocalEvidence(handle, role, file, problemMessage = null, packet = null, operation = 'compare-records') {
  assertProcessedAcquisition(packet, handle, role, file, problemMessage);
  if (!sourceMatches(handle, role, file)) throw new FileEvidenceRuntimeError('Original processing has no current acquisition.');
  if (problemMessage === null) validateFileProfile(sourceText(handle, role), role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo, operation);
  const problem = problemMessage === null ? null : Object.freeze(new InputProblem(problemMessage, role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo));
  const outcome = Object.freeze({ handle, text: sourceText(handle, role), problem });
  issuedEvidence.set(outcome, { role, file }); return outcome;
}
function runtimeFailure(error) {
  // Foreign exception text may contain source contents. Error ownership, not
  // exception prose, distinguishes runtime failure from an issued input repair.
  return new FileEvidenceRuntimeError('Original evidence runtime is unavailable or inconsistent. Reload and reselect the original files.');
}
export async function readLocalEvidence(...args) {
  const ownedInputRepairs = new WeakSet();
  const inputRepair = (message, target, source) => {
    const error = new InputProblem(message, target, source);
    ownedInputRepairs.add(error); return error;
  };
  try { return await acquireLocalEvidence(inputRepair, ...args); }
  catch (error) {
    if (ownedInputRepairs.has(error)) throw error;
    throw runtimeFailure(error);
  }
}
async function acquireLocalEvidence(inputRepair, file, target, source, timeoutMs = FILE_SUPPORT.limits.readTimeoutMs, operation = 'compare-records') {
  qualifiedCsvProfile(target, operation);
  const expectedSource = target === 'pax-file' ? SOURCES.pax : SOURCES.halo;
  if (source !== expectedSource) throw new TypeError('File source and role must name the same current support owner.');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > FILE_SUPPORT.limits.readTimeoutMs) throw new TypeError('File read deadline is outside the current support contract.');
  assertFileRuntime();
  if (!file) throw inputRepair(`Choose the ${target === 'pax-file' ? 'Pax8' : 'HaloPSA'} CSV file.`, target, expectedSource);
  const size = file.size;
  if (!Number.isInteger(size) || size < 0) throw inputRepair('This file has no usable byte size. Reselect the original file.', target, expectedSource);
  if (size > FILE_SUPPORT.limits.inputBytes) throw inputRepair('This CSV must be two megabytes or smaller.', target, expectedSource);
  const textReader = file.text, byteReader = file.arrayBuffer;
  if (typeof textReader !== 'function' || typeof byteReader !== 'function') throw new TypeError('The selected file has no usable native read methods. Reload and reselect the original file.');
  const started = now();
  const timeout = () => inputRepair('Reading this file timed out. Cancel or reselect the file, then retry.', target, expectedSource);
  function withinDeadline() { if (now() - started >= timeoutMs) throw timeout(); }
  let timer, held = null, settled = false, returned = false, byteProblem = null;
  try {
    return await Promise.race([
      Promise.resolve().then(async () => {
        let text, handle;
        try {
          // Both handlers attach before either possibly throwing method runs.
          [text, handle] = await Promise.all([
            Promise.resolve().then(() => textReader.call(file)),
            Promise.resolve().then(() => byteReader.call(file)).catch(() => { throw inputRepair('Reading the original file bytes failed. Reselect an available, readable original file and retry.', target, expectedSource); }).then(async bytes => {
              try {
                let length;
                try { length = bufferLength.call(bytes); }
                catch { throw new TypeError('The file reader returned an invalid byte buffer. Reload and reselect the original file.'); }
                if (length > FILE_SUPPORT.limits.inputBytes || length !== size) throw inputRepair('The observed file bytes disagree with the admitted size. Reselect the unchanged original file.', target, expectedSource);
                // capture copies synchronously inside this fulfillment, before sibling text completes.
                let acquired;
                try { acquired = await captureFileEvidence(bytes, target, file); }
                catch (error) { throw runtimeFailure(error); }
                if (settled) { releaseFileEvidence(acquired); throw timeout(); }
                held = acquired; return acquired;
              } catch (error) { byteProblem = error; throw error; }
            }),
          ]);
        } catch {
          assertFileRuntime();
          if (byteProblem) throw byteProblem;
          throw inputRepair('Reading the original file failed before its UTF-8 content could be validated. Reselect an available, readable original file and retry.', target, expectedSource);
        }
        assertFileRuntime(); withinDeadline();
        const decoded = sourceText(handle, target), encodingProblem = sourceEncodingProblem(handle, target);
        const finish = problem => {
          assertFileRuntime(); withinDeadline(); returned = true;
          if (problem) Object.freeze(problem);
          const outcome = Object.freeze({ handle, text: decoded, problem });
          issuedEvidence.set(outcome, { role: target, file, observedText: encodingProblem ? null : text }); return outcome;
        };
        if (encodingProblem) return finish(inputRepair(encodingProblem, target, expectedSource));
        if (!fileTextAgrees(decoded, text, size)) return finish(inputRepair(FILE_TEXT_DISAGREEMENT_MESSAGE, target, expectedSource));
        withinDeadline();
        try { validateFileProfile(decoded, target, expectedSource, operation); }
        catch (error) {
          if (!(error instanceof InputProblem)) throw error;
          // Refine failed profiles only; valid UTF-8 CSV control cells stay data.
          const encodingDiagnostic = profileEncodingProblem(originalBytes(handle, target));
          if (encodingDiagnostic) return finish(inputRepair(encodingDiagnostic, target, expectedSource));
          return finish(error);
        }
        assertFileRuntime(); withinDeadline();
        return finish(null);
      }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(timeout()), timeoutMs); }),
    ]);
  } finally { settled = true; clearTimeout(timer); if (!returned) releaseFileEvidence(held); }
}

export async function readLocalFile(...args) {
  const evidence = await readLocalEvidence(...args);
  try { if (evidence.problem) throw evidence.problem; return evidence.text.replace(/^\uFEFF/, ''); }
  finally { releaseFileEvidence(evidence.handle); }
}
