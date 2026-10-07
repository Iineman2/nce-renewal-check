// Sole browser task lifetime owner. There is no synchronous fallback or queue.
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { InputProblem, SOURCES } from './actions.mjs';
import { assertFileRuntime, FileEvidenceRuntimeError, issueLocalEvidence, profileEncodingProblem, fileTextAgreementSteps, FILE_TEXT_DISAGREEMENT_MESSAGE } from './runtime.mjs';
import { adoptProcessedEvidence, releaseFileEvidence } from './file-evidence.mjs';
import { captureResourceDataAsync, runBoundedStepsAsync } from './resource-packet.mjs';
import { scanCsvEvidenceSteps } from './csv-evidence.mjs';
import { prepareCsvRowsAsync } from './preflight.mjs';

const jobs = new Map(), packets = new WeakMap(), caches = new Map();
const bufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const blobSize = typeof Blob === 'function' && Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
let sequence = 0, reservedBytes = 0, halted = false;
const clock = () => {
  const time = globalThis.performance.now();
  if (!Number.isFinite(time) || time < 0) throw new TypeError('The monotonic processing clock is unavailable.');
  return time;
};
const integrityFailure = () => new FileEvidenceRuntimeError('Local processing integrity is unavailable. Reload and reselect the original files.');
export function assertBoundedRuntime() {
  assertFileRuntime();
  if (halted || typeof globalThis.Worker !== 'function' || typeof Worker.prototype.terminate !== 'function' ||
      typeof Worker.prototype.postMessage !== 'function' || typeof Worker.prototype.addEventListener !== 'function' ||
      typeof Worker.prototype.removeEventListener !== 'function' || typeof blobSize !== 'function') throw integrityFailure();
  clock();
}
export function processingState() {
  return Object.freeze({ activeJobs: jobs.size, reservedBytes, cachedSources: caches.size, halted });
}
export function cachedLexicalEvidence(text) {
  for (const entry of caches.values()) if (entry.text === text && entry.policy === FILE_SUPPORT.policyVersion) return entry.scan;
  return null;
}
export function releaseProcessedEvidence(handle) {
  for (const [role, entry] of caches) if (entry.handle === handle) caches.delete(role);
}
export function takeProcessingPacket(packet, role, file) {
  const owned = packets.get(packet);
  if (!owned || owned.consumed || !jobs.has(owned.job.id) || owned.job.done || owned.job.role !== role || owned.job.file !== file) throw integrityFailure();
  owned.job.assertLive();
  owned.consumed = true;
  return { ...owned.data, bytes: owned.bytes.slice(0) };
}
export function assertProcessingPacketLive(packet, role, file) {
  const owned = packets.get(packet);
  if (!owned || !owned.consumed || owned.job.role !== role || owned.job.file !== file) throw integrityFailure();
  owned.job.assertLive();
}
export function bindProcessedHandle(packet, handle, role, file) {
  const owned = packets.get(packet);
  if (!owned || !owned.consumed || owned.handle || !jobs.has(owned.job.id) || owned.job.done || owned.job.role !== role || owned.job.file !== file) throw integrityFailure();
  owned.job.assertLive();
  owned.handle = handle;
}
export function clearProcessedEvidence() {
  for (const entry of [...caches.values()]) releaseFileEvidence(entry.handle);
  caches.clear();
}
export function assertProcessedAcquisition(packet, handle, role, file, problemMessage) {
  const owned = packets.get(packet);
  if (!owned || !owned.consumed || owned.handle !== handle || !jobs.has(owned.job.id) || owned.job.done ||
      owned.job.role !== role || owned.job.file !== file || owned.data.problem !== problemMessage) throw integrityFailure();
}
async function packetFor(raw, job, assertCurrent) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype || Object.getOwnPropertySymbols(raw).length) throw integrityFailure();
  // Reject an unknown envelope before traversing any potentially large payload.
  const value = key => {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw integrityFailure();
    return descriptor.value;
  };
  const expected = { protocol: FILE_SUPPORT.resourceVersion, id: job.id, role: job.role, operation: job.operation,
    profile: job.profile.id, policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion };
  if (Object.entries(expected).some(([key, wanted]) => value(key) !== wanted)) throw integrityFailure();
  const status = value('status');
  const keys = status === 'completed' ? ['protocol','id','role','operation','profile','policy','reader','status','text','observedText','sha256','metadata','scan','encodingProblem','problem','bytes'] :
    status === 'error' ? ['protocol','id','role','operation','profile','policy','reader','status','kind','message'] : null;
  if (!keys || Object.getOwnPropertyNames(raw).length !== keys.length || keys.some(key => !Object.hasOwn(raw, key))) throw integrityFailure();
  if (status === 'completed') {
    // The native completion wire must never contain a lexical object graph.
    // Reject it before shape inspection or defensive traversal.
    if (value('scan') !== null) throw integrityFailure();
    const text = value('text'), observedText = value('observedText'), bytes = value('bytes'), length = bufferLength.call(bytes);
    if (length !== job.size || length > FILE_SUPPORT.limits.inputBytes || typeof value('sha256') !== 'string' || !/^[a-f0-9]{64}$/.test(value('sha256')) ||
        text !== null && (typeof text !== 'string' || text.length > length || typeof observedText !== 'string' || observedText.length > length || observedText.length > FILE_SUPPORT.limits.decodedCodeUnits) ||
        text === null && observedText !== null ||
        !['encodingProblem','problem'].every(key => value(key) === null || typeof value(key) === 'string' && value(key).length <= 4096) ||
        text !== null && value('encodingProblem') !== null) throw integrityFailure();
    const metadata = value('metadata');
    if (!metadata || Object.getPrototypeOf(metadata) !== Object.prototype || Object.getOwnPropertySymbols(metadata).length || Object.getOwnPropertyNames(metadata).length !== 3) throw integrityFailure();
    for (const [key, wanted] of Object.entries({name:job.file.name,type:job.file.type,lastModified:job.file.lastModified})) {
      const descriptor = Object.getOwnPropertyDescriptor(metadata, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value') || descriptor.value !== wanted) throw integrityFailure();
    }
    if (text === null && (!value('encodingProblem') || value('problem') !== value('encodingProblem'))) throw integrityFailure();
  } else if (!['input','runtime'].includes(value('kind')) || typeof value('message') !== 'string' || value('message').length > 4096) throw integrityFailure();
  const descriptors = Object.getOwnPropertyDescriptors(raw), data = Object.create(null);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw integrityFailure();
    if (key !== 'bytes') data[key] = descriptor.value;
  }
  const captured = await captureResourceDataAsync(data, assertCurrent);
  if (Object.entries(expected).some(([key, value]) => captured[key] !== value)) throw integrityFailure();
  if (captured.status === 'error') {
    if (Object.keys(captured).length !== 10 || !['input', 'runtime'].includes(captured.kind) || typeof captured.message !== 'string' || captured.message.length > 4096 || descriptors.bytes) throw integrityFailure();
    if (captured.kind === 'runtime') throw integrityFailure();
    throw job.repair('The selected file could not be read. Reselect the unchanged original file, then retry.');
  }
  const allowed = ['protocol','id','role','operation','profile','policy','reader','status','text','observedText','sha256','metadata','scan','encodingProblem','problem'];
  if (captured.status !== 'completed' || Object.keys(captured).length !== allowed.length || allowed.some(key => !Object.hasOwn(captured, key)) || !descriptors.bytes) throw integrityFailure();
  const bytes = descriptors.bytes.value, length = bufferLength.call(bytes);
  if (length !== job.size || length > FILE_SUPPORT.limits.inputBytes || !/^[a-f0-9]{64}$/.test(captured.sha256) ||
      captured.text !== null && (typeof captured.text !== 'string' || captured.text.length > length || typeof captured.observedText !== 'string' || captured.observedText.length > length || captured.observedText.length > FILE_SUPPORT.limits.decodedCodeUnits) ||
      captured.text === null && captured.observedText !== null ||
      ![captured.encodingProblem, captured.problem].every(value => value === null || typeof value === 'string' && value.length <= 4096) ||
      !captured.metadata || Object.keys(captured.metadata).length !== 3 || captured.metadata.name !== job.file.name || captured.metadata.type !== job.file.type || captured.metadata.lastModified !== job.file.lastModified) throw integrityFailure();
  if (captured.scan !== null || (captured.text === null ? !captured.encodingProblem || captured.problem !== captured.encodingProblem : captured.encodingProblem !== null)) throw integrityFailure();
  let scan = null;
  if (captured.text !== null) {
    // Emit one canonical graph from bounded text work. It is locally owned,
    // immutable and prototype-free; recapturing it would restore the redundant
    // graph allocation that this wire deliberately removes.
    scan = await runBoundedStepsAsync(scanCsvEvidenceSteps(captured.text, true), assertCurrent);
    let problem = null;
    if (!(await runBoundedStepsAsync(fileTextAgreementSteps(captured.text, captured.observedText, length), assertCurrent))) {
      problem = FILE_TEXT_DISAGREEMENT_MESSAGE;
    } else {
      try { await prepareCsvRowsAsync(scan, job.profile.requiredColumns, assertCurrent); }
      catch (error) {
        assertCurrent();
        if (!(error instanceof TypeError) || error instanceof FileEvidenceRuntimeError || error instanceof InputProblem) throw error;
        problem = profileEncodingProblem(new Uint8Array(bytes, 0, Math.min(length, 64))) ??
          `${error.message} (${job.source}). ${job.profile.label} is required for this operation. ${FILE_SUPPORT.alternative}`;
      }
    }
    if (problem !== captured.problem) throw integrityFailure();
  }
  assertCurrent();
  const derived = Object.create(null);
  for (const key of allowed) Object.defineProperty(derived, key, { value: key === 'scan' ? scan : captured[key], enumerable: true });
  const packet = Object.freeze(Object.create(null));
  packets.set(packet, { job, data: Object.freeze(derived), bytes, consumed: false });
  return packet;
}
export function cancelAllProcessing(message = 'Processing canceled. Retry or select a corrected file.') {
  for (const job of [...jobs.values()]) if (!job.done) job.cancel(message);
  return processingState();
}

export async function readBoundedLocalEvidence(file, role, source, timeoutMs = FILE_SUPPORT.limits.readTimeoutMs, operation = 'compare-records', signal = null, assertHandling = null) {
  const ownedRepairs = new WeakSet();
  const repair = message => { const error = new InputProblem(message, role, source); ownedRepairs.add(error); return error; };
  try {
  const profile = qualifiedCsvProfile(role, operation), expectedSource = role === 'pax-file' ? SOURCES.pax : SOURCES.halo;
  if (source !== expectedSource || !Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > FILE_SUPPORT.limits.readTimeoutMs) throw integrityFailure();
  if (assertHandling !== null && typeof assertHandling !== 'function') throw integrityFailure();
  assertHandling?.();
  assertBoundedRuntime();
  if (!file) throw repair(`Choose the ${role === 'pax-file' ? 'Pax8' : 'HaloPSA'} CSV file.`);
  if (!(file instanceof File)) throw integrityFailure();
  const size = blobSize.call(file);
  if (!Number.isInteger(size) || size < 0 || size > FILE_SUPPORT.limits.inputBytes) throw repair('This CSV must be two megabytes or smaller. Keep the original and prepare a smaller normalized export.');
  if (typeof file.name !== 'string' || typeof file.type !== 'string') throw integrityFailure();
  if (file.name.length > FILE_SUPPORT.limits.filenameCodeUnits || file.type.length > FILE_SUPPORT.limits.mediaTypeCodeUnits) throw repair('Selected-file metadata exceeds the supported filename or media-type length. Keep the original, prepare a separate copy with shorter display metadata and retry.');
  if (signal !== null && !(signal instanceof AbortSignal)) throw integrityFailure();
  if (signal?.aborted) throw repair('Processing canceled before admission. Retry when ready.');
  if (jobs.size >= FILE_SUPPORT.limits.activeJobs || [...jobs.values()].some(job => job.role === role) || reservedBytes + size > FILE_SUPPORT.limits.inFlightBytes) throw repair('The local processing capacity is full. Cancel an active task or wait for it to finish, then retry.');
  const started = clock(), id = ++sequence;
  return await new Promise((resolve, reject) => {
    const job = { id, file, role, source, operation, profile, size, repair, done: false, constructing: false,
      pendingSettlement: null, worker: null, stopped: false, terminating: false, settling: false, adopting: false, receiving: false, packet: null, timer: null };
    jobs.set(id, job); reservedBytes += size;
    const deadline = () => repair('Processing this file timed out. Active worker processing was stopped. Retry or prepare a smaller normalized export.');
    let previousTime = started;
    const current = () => {
      if (job.done || jobs.get(id) !== job) return false;
      assertHandling?.();
      const time = clock();
      if (time < previousTime) throw integrityFailure();
      previousTime = time;
      return time - started < timeoutMs;
    };
    job.assertLive = () => { if (job.pendingSettlement?.error) throw job.pendingSettlement.error; if (!current()) throw deadline(); };
    function terminate() {
      if (!job.worker || job.stopped) return;
      job.terminating = true;
      try { job.nativeTerminate.call(job.worker); job.stopped = true; }
      catch { halted = true; throw integrityFailure(); }
      finally { job.terminating = false; }
    }
    function releaseReservation() {
      if (!job.adopting && (!job.worker || job.stopped) && jobs.delete(id)) reservedBytes -= size;
    }
    function settle(error, result) {
      if (job.done) return;
      if (job.constructing || job.terminating || job.settling) { job.pendingSettlement ??= { error, result }; return; }
      job.settling = true;
      try { terminate(); } catch (failure) { error = failure; }
      if (job.pendingSettlement?.error && !halted) error = job.pendingSettlement.error;
      job.done = true;
      // One failed cleanup must not prevent the other independently owned cleanups.
      const cleanup = action => { try { action(); } catch { halted = true; error = integrityFailure(); } };
      cleanup(() => clearTimeout(job.timer));
      cleanup(() => signal?.removeEventListener('abort', aborted));
      if (job.worker) {
        cleanup(() => { job.worker.onmessage = null; });
        cleanup(() => { job.worker.onerror = null; });
        if (job.messageError) cleanup(() => job.worker.removeEventListener('messageerror', job.messageError));
      }
      if (job.packet) packets.delete(job.packet);
      // Known termination failure quarantines its reservation until reload.
      releaseReservation();
      if (error) { if (result) releaseFileEvidence(result.handle); reject(error); } else resolve(result);
    }
    const aborted = () => settle(repair('Processing canceled. Active worker processing was stopped. Retry when ready.'));
    job.cancel = message => settle(repair(message));
    const resume = () => {
      if (job.done) {
        // A reentrant setter/listener may install its callback after settlement's
        // cleanup has returned. Retire that installation before leaving setup.
        for (const action of [() => clearTimeout(job.timer), () => signal?.removeEventListener('abort', aborted),
          () => { if (job.worker) job.worker.onmessage = null; }, () => { if (job.worker) job.worker.onerror = null; },
          () => { if (job.worker && job.messageError) job.worker.removeEventListener('messageerror', job.messageError); }]) {
          try { action(); } catch { halted = true; }
        }
        return false;
      }
      if (job.pendingSettlement) { settle(job.pendingSettlement.error, job.pendingSettlement.result); return false; }
      if (!current()) { settle(deadline()); return false; }
      return true;
    };
    try {
      signal?.addEventListener('abort', aborted, { once: true });
      if (!resume()) return;
      if (signal?.aborted) { aborted(); return; }
      job.timer = setTimeout(() => settle(deadline()), timeoutMs);
      if (!resume()) { clearTimeout(job.timer); return; }
      job.constructing = true;
      try {
        job.worker = new Worker(new URL('./file-processing-worker.mjs', import.meta.url), { type: 'module', name: `csv-${role}-${id}` });
        job.nativeTerminate = job.worker.terminate;
        job.nativePostMessage = job.worker.postMessage;
      }
      finally { job.constructing = false; }
      if (typeof job.nativeTerminate !== 'function') { halted = true; throw integrityFailure(); }
      if (typeof job.nativePostMessage !== 'function') throw integrityFailure();
      if (!resume()) return;
      job.worker.onerror = event => {
        settle(repair('Local worker processing could not finish. Retry or reselect the file.'));
        try { event?.preventDefault?.(); } catch { /* Event suppression cannot delay settlement. */ }
      };
      if (!resume()) return;
      // Some native Workers lack an onmessageerror IDL setter. EventTarget owns delivery.
      job.messageError = () => settle(integrityFailure());
      job.worker.addEventListener('messageerror', job.messageError);
      if (!resume()) return;
      job.worker.onmessage = async event => {
        if (job.receiving) { settle(integrityFailure()); return; }
        let handle = null;
        try {
          if (!current()) { settle(deadline()); return; }
          job.receiving = true; job.adopting = true;
          terminate(); // Stop the worker before bounded packet verification and custody adoption.
          if (!resume()) return;
          job.packet = await packetFor(event.data, job, job.assertLive);
          if (!resume()) return;
          job.adopting = true;
          handle = await adoptProcessedEvidence(job.packet, role, file);
          if (!current()) { releaseFileEvidence(handle); settle(deadline()); return; }
          // Keep profile/row publication out of the final custody-validation
          // slice, and give retirement a task boundary before cache insertion.
          await new Promise(resolve => setTimeout(resolve, 0));
          if (!current()) { releaseFileEvidence(handle); settle(deadline()); return; }
          const data = packets.get(job.packet).data;
          if (data.problem === null) await prepareCsvRowsAsync(data.scan, profile.requiredColumns, job.assertLive);
          if (!current()) { releaseFileEvidence(handle); settle(deadline()); return; }
          caches.set(role, { handle, text: data.text, scan: data.scan, policy: FILE_SUPPORT.policyVersion, profile: profile.id });
          const evidence = issueLocalEvidence(handle, role, file, data.problem, job.packet, operation);
          if (!current()) { releaseFileEvidence(handle); settle(deadline()); return; }
          settle(null, evidence);
        } catch (error) { releaseFileEvidence(handle); settle(ownedRepairs.has(error) ? error : integrityFailure()); }
        finally { job.adopting = false; if (job.done) releaseReservation(); }
      };
      if (!resume()) return;
      job.nativePostMessage.call(job.worker, { protocol: FILE_SUPPORT.resourceVersion, id, role, operation, source, timeoutMs,
        profile: profile.id, policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion, file });
    } catch (error) { settle(ownedRepairs.has(error) ? error : integrityFailure()); }
  });
  } catch (error) { throw ownedRepairs.has(error) ? error : integrityFailure(); }
}
