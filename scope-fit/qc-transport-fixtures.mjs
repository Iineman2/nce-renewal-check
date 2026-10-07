// Model-only positive wire factory. It never grants custody or registers scans.
import { FILE_SUPPORT } from './file-support.mjs';
import { transferFileEvidence } from './file-evidence.mjs';
import { observedFileText } from './runtime.mjs';

export function graphFreeCompletion(request, evidence) {
  const transferred = transferFileEvidence(evidence.handle, request.role);
  return { protocol: FILE_SUPPORT.resourceVersion, id: request.id, role: request.role, operation: request.operation,
    profile: request.profile, policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion, status: 'completed',
    text: transferred.data.text, observedText: observedFileText(evidence, request.role, request.file), sha256: transferred.data.sha256, metadata: transferred.data.metadata,
    scan: null, encodingProblem: transferred.data.encodingProblem, problem: evidence.problem?.message ?? null, bytes: transferred.bytes };
}
