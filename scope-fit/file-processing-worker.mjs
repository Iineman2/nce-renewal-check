// Actual acquisition and canonical processing run in this terminable environment.
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { readLocalEvidence, observedFileText } from './runtime.mjs';
import { InputProblem } from './actions.mjs';
import { transferFileEvidence, releaseFileEvidence } from './file-evidence.mjs';
import { captureResourceData } from './resource-packet.mjs';

let used = false;
self.onmessage = async event => {
  if (used) return; used = true;
  const request = event.data;
  const identity = { protocol: FILE_SUPPORT.resourceVersion, id: request.id, role: request.role,
    operation: request.operation, profile: request.profile, policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion };
  let handle = null;
  try {
    const profile = qualifiedCsvProfile(request.role, request.operation);
    if (request.protocol !== identity.protocol || request.policy !== identity.policy || request.reader !== identity.reader || request.profile !== profile.id ||
        !Number.isSafeInteger(request.id) || request.id <= 0 || !(request.file instanceof File)) throw new TypeError('Invalid worker admission.');
    const evidence = await readLocalEvidence(request.file, request.role, request.source, request.timeoutMs, request.operation); handle = evidence.handle;
    const packet = transferFileEvidence(handle, request.role);
    // Transport originals and bounded scalar facts only. A large lexical graph
    // would be deserialized indivisibly before the receiver can yield or cancel.
    const bounded = captureResourceData({ ...identity, status: 'completed', text: packet.data.text, observedText: observedFileText(evidence, request.role, request.file), sha256: packet.data.sha256,
      metadata: packet.data.metadata, scan: null, encodingProblem: packet.data.encodingProblem, problem: evidence.problem?.message ?? null });
    self.postMessage({ ...bounded, bytes: packet.bytes }, [packet.bytes]);
  } catch (error) {
    self.postMessage({ ...identity, status: 'error', kind: error instanceof InputProblem ? 'input' : 'runtime',
      message: error instanceof InputProblem ? error.message : 'Local worker processing integrity failed. Reload and reselect the original files.' });
  } finally { releaseFileEvidence(handle); }
};
