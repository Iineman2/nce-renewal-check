// The page's selection permission, separate from custody and task lifetime.
// Permits never leave this closure or enter a Worker/source packet.
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { assertHandlingDeclaration } from './file-handling-policy.mjs';
import { InputProblem, SOURCES } from './actions.mjs';
import { readBoundedLocalEvidence } from './bounded-reader.mjs';
import { bindFileHandling, releaseFileEvidence } from './file-evidence.mjs';

export function createFileHandlingSession(getSelectedFile) {
  if (typeof getSelectedFile !== 'function') throw new TypeError('A current native selection owner is required.');
  const policy = FILE_SUPPORT.authorizedHandling, grants = new Map();
  function assertPolicy() {
    assertHandlingDeclaration(policy);
    assertHandlingDeclaration(FILE_SUPPORT.authorizedHandling);
  }
  function assertCurrent(grant, file, role, operation) {
    assertPolicy();
    qualifiedCsvProfile(role, operation);
    if (!grant?.live || grants.get(role) !== grant || grant.file !== file) {
      throw new InputProblem('Reselect the original file to authorize local processing.', role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo);
    }
    let selected;
    try { selected = getSelectedFile(role); }
    catch (error) { if (grants.get(role) === grant) revoke(role); throw error; }
    if (!grant.live || grants.get(role) !== grant || grant.file !== file || selected !== file) {
      // Only this observed occurrence retires. A late old callback must never
      // revoke a newer occurrence. Restoring an old File cannot revive access.
      if (grants.get(role) === grant) revoke(role);
      throw new InputProblem('Reselect the original file to authorize local processing.', role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo);
    }
  }
  function revoke(role) {
    const grant = grants.get(role);
    if (!grant) return;
    // Revoke authority before invoking native cleanup or a release callback.
    grants.delete(role); grant.live = false; grant.file = null;
    let failure;
    try { grant.controller.abort(); } catch (error) { failure = error; }
    for (const handle of [...grant.handles]) { try { releaseFileEvidence(handle); } catch (error) { failure ??= error; } }
    grant.handles.clear();
    if (failure) throw failure;
  }
  return Object.freeze({
    select(role) {
      qualifiedCsvProfile(role, 'compare-records');
      revoke(role);
      assertPolicy();
      const file = getSelectedFile(role);
      if (file === undefined || file === null) return;
      if (!(file instanceof File)) throw new TypeError('Selection requires a native File.');
      grants.set(role, { file, live: true, controller: new AbortController(), handles: new Set() });
    },
    revoke,
    observeDismissal(role) {
      assertPolicy(); qualifiedCsvProfile(role, 'compare-records');
      const grant = grants.get(role);
      // Dismissing the picker never creates a grant or starts processing.
      if (grant) {
        try { assertCurrent(grant, grant.file, role, 'compare-records'); return true; }
        catch (error) { if (error instanceof InputProblem && !getSelectedFile(role)) return false; throw error; }
      }
      if (getSelectedFile(role)) throw new InputProblem('Reselect the original file to authorize local processing.', role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo);
      return false;
    },
    clear() {
      let failure;
      for (const role of [...grants.keys()]) { try { revoke(role); } catch (error) { failure ??= error; } }
      if (failure) throw failure;
    },
    state() { return Object.freeze({ selectedRoles: grants.size, retainedHandles: [...grants.values()].reduce((n, grant) => n + grant.handles.size, 0) }); },
    async read(file, role, source, timeout, operation = 'compare-records') {
      assertPolicy();
      qualifiedCsvProfile(role, operation);
      const grant = grants.get(role);
      if (!file) throw new InputProblem(`Choose the ${role === 'pax-file' ? 'Pax8' : 'HaloPSA'} CSV file.`, role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo);
      const current = () => assertCurrent(grant, file, role, operation);
      current();
      let evidence;
      try {
        evidence = await readBoundedLocalEvidence(file, role, source, timeout, operation, grant.controller.signal, current);
        current();
        if (grant.handles.size >= policy.handlesPerRole) throw new TypeError('Retire the previous original before another publication.');
        bindFileHandling(evidence.handle, role, file, current, () => grant.handles.delete(evidence.handle));
        grant.handles.add(evidence.handle);
        return evidence;
      } catch (error) { releaseFileEvidence(evidence?.handle); throw error; }
    },
  });
}
