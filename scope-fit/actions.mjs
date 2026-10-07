// Routing metadata is independent of presentation text and raw customer values.
import { frozenData, sameData } from './input.mjs';
const issuedInputFailures = new WeakMap();
export const SOURCES = Object.freeze({
  pax: 'Original Pax8 subscription and renewal settings', halo: 'Original HaloPSA recurring line',
  both: 'Original Pax8 subscription and HaloPSA recurring line',
  reseller: 'Customer subscription and reseller arrangement', agreement: 'Signed customer order or agreement',
});
export const TARGETS = new Set(['pax-file', 'halo-file', 'both-files', 'subscription-id',
  'reseller-answer', 'distributor-answer', 'billing-answer', 'commitment-answer', 'renewal-answer', 'agreement', 'renewal-term']);
const KINDS = new Set(['policy-review', 'correct-or-stop', 'verify-answer', 'prepare-records',
  'edit-subscription-id', 'repair-record-link', 'confirm-record-link', 'resolve-conflict',
  'verify-source', 'continue-outside-prototype', 'repair-input', 'technical-stop']);

export function issue(code, condition, source, target, message) {
  if (![code, condition, source, message].every(value => typeof value === 'string' && value.trim()) || !TARGETS.has(target)) {
    throw new TypeError('Invalid issue routing metadata');
  }
  return { code, condition, source, target, message };
}

export function conditionIssue(condition, message, code = condition, target) {
  const source = condition === 'reseller' ? SOURCES.reseller : condition === 'agreement' ? SOURCES.agreement :
    condition === 'billing' ? 'The recurring customer charge in HaloPSA or the original billing system' :
      condition === 'distributor' ? 'The subscription purchase record in Pax8 or the original distributor' : SOURCES.pax;
  const control = condition === 'agreement' ? 'agreement' : `${condition === 'renewal-time' ? 'renewal' : condition}-answer`;
  return issue(code, condition, source, target ?? control, message);
}

export function assertNextAction(action) {
  if (!action || !KINDS.has(action.kind) || !['source', 'instruction'].every(key => typeof action[key] === 'string' && action[key].trim()) ||
      Object.values(action).some(value => value === null || value === undefined) ||
      (Object.hasOwn(action, 'target') && !TARGETS.has(action.target)) ||
      (Object.hasOwn(action, 'condition') && (typeof action.condition !== 'string' || !action.condition.trim()))) {
    throw new TypeError('Result has invalid next-action metadata');
  }
  return action;
}

export class InputProblem extends TypeError {
  constructor(message, target, source) { super(message); this.name = 'InputProblem'; this.target = target; this.source = source; }
}

export function inputFailure(error) {
  const known = error instanceof InputProblem;
  const result = {
    status: known ? 'needs-input-repair' : 'technical-error', errors: [], linkIssues: [], conflicts: [],
    verify: [known ? error.message : 'The check could not finish. No current record result is available.'],
    nextAction: assertNextAction(known ? { kind: 'repair-input', source: error.source, target: error.target,
      instruction: `${error.message} Correct the named input, then run the record check again.` } :
      { kind: 'technical-stop', source: 'This local prototype', instruction: 'Stop using this result. Retry the check; if the problem continues, reload the page and reselect your files. Do not change source facts to work around a technical error.' }),
    decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
  };
  issuedInputFailures.set(result, frozenData(result));
  return result;
}

// A repair has no source-derived claims. Its status alone cannot bypass comparison.
export function assertInputFailure(result, projection) {
  const expected = issuedInputFailures.get(result);
  if (!expected || !sameData(expected, projection)) throw new TypeError('Repair output requires its unchanged source-free failure owner.');
  return expected;
}
