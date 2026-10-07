// Read-only presentation projection. Classification and reconciliation stay in fit/preflight.
import { frozenData, RESPONSE_CHOICES, validIsoDate } from './input.mjs';
export const SCOPE_KEYS = Object.freeze(['reseller', 'distributor', 'billing', 'commitment', 'renewal', 'renewalDate', 'agreement']);
const QUESTION_KEYS = ['reseller', 'distributor', 'billing', 'commitment', 'renewal'];
const LABELS = Object.freeze({ reseller: 'Reseller responsibility', distributor: 'Subscription purchase system',
  billing: 'Customer billing system', commitment: 'Current product and commitment term', renewal: 'Renewal-date response',
  renewalDate: 'Commitment renewal date', agreement: 'Signed agreement availability', renewalTerm: 'Next commitment term response', endState: 'Subscription end-of-term state' });

export function frozenSnapshot(value) {
  return frozenData(value);
}

export function scopeValues(answers) {
  return Object.fromEntries(SCOPE_KEYS.map(key => [key, answers[key]]));
}

export function responseState(value) {
  if (value === undefined || value === null || value === 'not-asked') return 'not-asked';
  if (value === 'unknown') return 'unknown';
  if (value === 'within-60-approx') return 'approximate';
  return 'known';
}

export function selfReportOrigin(reason = 'carried-response') {
  return { kind: 'self-report', reason };
}

export function fileOrigin(system, reason) {
  return { kind: 'supplied-csv', system, reason };
}

const REASONS = Object.freeze({
  'carried-response': 'This response is carried as self-report, not a verified source fact.',
  'not-assessed': 'This field was not used in these scope rules. Any earlier response is retained but cannot determine this result.',
  'policy-blocked': 'The policy needs review; these responses cannot support a current classification.',
  'file-agrees': 'The supplied file agrees with the response. The check considers a CSV claim; agreement does not authenticate it.',
  'file-informs-unknown': 'A known supplied claim informs an unknown or approximate response for this check. The original response is unchanged.',
  'source-unavailable': 'The supplied fact is missing or unrecognized. A supported response cannot fill this source-evidence gap.',
  'outside-response-retained': 'The known outside-scope response is retained despite unavailable supplied evidence. It remains self-report.',
  'date-response-retained': 'The claimed exact date is retained while the source date is unavailable. The missing source still requires verification.',
  'conflict-unresolved': 'No usable value is available for this conflicted fact until it is reviewed.',
  'file-accepted': 'You chose the supplied value for this check. This records a review choice, not authentication; your original response is unchanged.',
  'answer-kept': 'You kept your response, but corrected source evidence is required. The conflicted input remains unknown.',
  'economic-guard': 'Inconsistent economic context makes the current commitment input uncertain, even if its supplied value was accepted.',
  'next-term-response': 'This is your record-stage next-term response. The current term or invoice frequency cannot establish the next term.',
  'agreement-response': 'This is your preparation response about availability. No signed agreement or terms were supplied or interpreted.',
  'end-state-file': 'The end-of-term state comes from the supplied Pax8 row. It is not independently observed vendor state.',
});

function row(key, originalValue, effectiveValue, origin, supplied = null, reviewChoice = 'none', included = true, effectiveState = null) {
  if (!origin || !REASONS[origin.reason]) throw new TypeError('Claim origin is missing a supported reason');
  return {
    key, label: LABELS[key], included,
    original: { value: originalValue, state: responseState(originalValue), source: key === 'agreement' ? 'preparation-self-report' : key === 'renewalTerm' ? 'record-stage-self-report' : key === 'endState' ? 'no-response' : 'questionnaire-self-report' },
    supplied,
    effective: { value: effectiveValue, state: effectiveState ?? (included ? responseState(effectiveValue) : 'not-assessed'), origin, reason: REASONS[origin.reason] },
    reviewChoice, authenticated: false,
  };
}

function header(stage, policyVersion, today) {
  return { schemaVersion: 'scope-claim-review-v3', stage, policyVersion, checkedToday: today,
    authenticated: false, freshnessVerified: false, financialVerdict: null, actionAuthorized: false };
}

export function questionnaireClaimReview(answers, { today, policyVersion, through = 4, policyBlocked = false, resultStatus } = {}) {
  const originalInputs = scopeValues(answers);
  const keys = QUESTION_KEYS.slice(0, through + 1);
  if (keys.includes('renewal')) keys.push('renewalDate');
  if (through === 4) keys.push('agreement');
  const scopeInputs = policyBlocked ? null : Object.fromEntries(keys.map(key => [key, originalInputs[key]]));
  const fields = SCOPE_KEYS.map(key => {
    const included = !policyBlocked && keys.includes(key) && (key !== 'renewalDate' || answers.renewal === 'exact');
    const reason = policyBlocked ? 'policy-blocked' : included ? key === 'agreement' ? 'agreement-response' : 'carried-response' : 'not-assessed';
    return row(key, originalInputs[key], !policyBlocked && keys.includes(key) ? originalInputs[key] : undefined, selfReportOrigin(reason), null, 'none', included);
  });
  return frozenSnapshot({ ...header(policyBlocked ? 'policy-blocked' : 'questionnaire', policyVersion, today),
    through, resultStatus, usage: policyBlocked ? 'unavailable' : 'provisional-questionnaire-only', originalInputs, scopeInputs, fields,
    explanation: policyBlocked ? 'No current classification is available until policy review.' : 'These are provisional responses. Record comparison may change the values considered for this check without rewriting your answers.' });
}

export function blockedClaimReview(answers, { today, policyVersion, stage } = {}) {
  if (!['identity-blocked', 'link-blocked', 'policy-blocked'].includes(stage)) throw new TypeError('Unknown blocked claim stage');
  return frozenSnapshot({ ...header(stage, policyVersion, today), usage: 'unavailable',
    originalInputs: scopeValues(answers), scopeInputs: null, fields: [],
    explanation: stage === 'policy-blocked' ? 'The policy needs review; no source comparison can support a current result.' : 'No usable selected record pair is available. Repair identity or linkage before relying on source claims.' });
}

export function recordClaimReview({ answers, merged, origins, fileClaims, provenance, sourceTraces, conflicts,
  renewalTerm, scheduledClaim, pax, paxRaw, halo, endState, endStateState, economicIssues, fit, status, basis, linkState, today, policyVersion }) {
  const fields = SCOPE_KEYS.map(key => {
    const factKey = key === 'renewal' ? 'renewalDate' : key;
    const fact = provenance[factKey];
    const supplied = fact?.system ? { value: key === 'renewal' ? fileClaims.renewal : fact.file,
      system: fact.system, rowId: fact.rowId, columns: fact.columns, raw: fact.raw, trace: fact.trace,
      authenticated: false } : null;
    const conflict = conflicts.find(item => item.key === factKey);
    const unresolvedDate = key === 'renewalDate' && conflict && conflict.resolution !== 'accept-file';
    const included = key !== 'renewalDate' || merged.renewal === 'exact' || Boolean(unresolvedDate);
    return row(key, answers[key], merged[key], included ? origins[key] : selfReportOrigin('not-assessed'), supplied, conflict?.resolution ?? 'none', included, unresolvedDate ? 'unknown' : null);
  });
  const scheduledProvided = Object.hasOwn(pax, 'scheduled_commitment_term');
  fields.push(row('renewalTerm', renewalTerm, renewalTerm, selfReportOrigin('next-term-response'), scheduledProvided ? {
    value: scheduledClaim, system: 'Pax8', rowId: pax.subscription_id, columns: ['scheduled_commitment_term'], raw: [paxRaw.scheduled_commitment_term], trace: sourceTraces.scheduledTerm, authenticated: false,
  } : null));
  fields.push(row('endState', undefined, endState, fileOrigin('Pax8', 'end-state-file'), {
    value: endState, system: 'Pax8', rowId: pax.subscription_id, columns: ['end_of_term_state'], raw: [paxRaw.end_of_term_state], trace: sourceTraces.endState, authenticated: false,
  }, 'none', true, endStateState));
  return frozenSnapshot({ ...header(linkState === 'self-attested' ? 'record-preflight' : 'record-comparison', policyVersion, today),
    usage: linkState === 'self-attested' ? 'provisional-scope-only' : 'comparison-only',
    explanation: linkState === 'self-attested'
      ? 'These are the values considered for this local scope check. Link confirmation is your self-attestation; all supplied claims remain unauthenticated.'
      : 'Comparison only: the selected pair is not yet usable for a completed scope result. Repair or confirm the original-system link first. No field below is authenticated.',
    originalInputs: scopeValues(answers), scopeInputs: scopeValues(merged), fields, checkBasis: basis,
    contributors: {
      identity: { subscriptionId: pax.subscription_id, haloLineId: halo.line_id, paxCustomerRef: pax.customer_ref, haloCustomerRef: halo.customer_ref, linkState, authenticated: false },
      nextTerm: { response: renewalTerm, origin: 'record-stage-self-report', scheduledProvided, scheduledClaim, authenticated: false },
      endState: { value: endState, state: endStateState, raw: paxRaw.end_of_term_state, origin: 'supplied-csv', authenticated: false },
      economicContext: { system: 'Pax8', rowId: pax.subscription_id, columns: provenance.renewalContext.columns, raw: provenance.renewalContext.raw ?? [], trace: provenance.renewalContext.trace ?? null, authenticated: false },
      economicIssues, scopeRuleStatus: fit.status, recordResultStatus: status,
    },
  });
}

function assertSourceTrace(trace, columns, raw, fail) {
  const keys = (value, names) => value && Object.keys(value).sort().join('|') === [...names].sort().join('|');
  if (!keys(trace, ['version','origin','sourceRecordOrdinal','dataRecordNumber','recordLocation','fields']) || trace.version !== 'csv-field-trace-v1' || trace.origin !== 'decoded-text-only' ||
      !Number.isInteger(trace.sourceRecordOrdinal) || trace.sourceRecordOrdinal < 2 || !Number.isInteger(trace.dataRecordNumber) || trace.dataRecordNumber < 1 || !Array.isArray(trace.fields) || trace.fields.length !== columns.length) fail();
  const validLocation = range => keys(range,['startOffset','endOffset','startByte','endByte']) && ['startOffset','endOffset','startByte','endByte'].every(key=>Number.isInteger(range[key])&&range[key]>=0&&range[key]<=2000000) && range.endOffset>=range.startOffset && range.endByte>=range.startByte;
  if (!validLocation(trace.recordLocation)) fail();
  const cellKeys = ['columnIndex','lexeme','rawValue','normalizedValue','startOffset','endOffset','startByte','endByte'];
  const validCell = cell => cell && Number.isInteger(cell.columnIndex) && cell.columnIndex>=1 && cell.columnIndex<=64 && ['lexeme','rawValue','normalizedValue'].every(key=>typeof cell[key]==='string') &&
    validLocation(Object.fromEntries(['startOffset','endOffset','startByte','endByte'].map(key=>[key,cell[key]]))) && cell.lexeme.length===cell.endOffset-cell.startOffset && new TextEncoder().encode(cell.lexeme).length===cell.endByte-cell.startByte && cell.rawValue.trim()===cell.normalizedValue;
  for (const [index,field] of trace.fields.entries()) {
    if (!keys(field,[...cellKeys,'column','originalHeader','header']) || !validCell(field) || field.column!==columns[index] || field.rawValue!==raw[index] ||
        !keys(field.header,cellKeys) || !validCell(field.header) || field.header.columnIndex!==field.columnIndex || field.originalHeader!==field.header.rawValue || field.header.rawValue.trim().toLowerCase()!==field.column ||
        field.startOffset<trace.recordLocation.startOffset || field.endOffset>trace.recordLocation.endOffset || field.startByte<trace.recordLocation.startByte || field.endByte>trace.recordLocation.endByte || field.header.endOffset>trace.recordLocation.startOffset || field.header.endByte>trace.recordLocation.startByte) fail();
  }
}

export function assertClaimReview(value, { type, policyVersion, today, status } = {}) {
  const review = frozenData(value);
  const fail = () => { throw new TypeError('Result has missing or inconsistent claim-trail metadata'); };
  if (!review || review.schemaVersion !== 'scope-claim-review-v3' || review.policyVersion !== policyVersion || review.checkedToday !== today ||
      review.authenticated !== false || review.freshnessVerified !== false || review.actionAuthorized !== false || review.financialVerdict !== null) fail();
  const usages = { questionnaire: 'provisional-questionnaire-only', 'policy-blocked': 'unavailable', 'identity-blocked': 'unavailable', 'link-blocked': 'unavailable', 'record-comparison': 'comparison-only', 'record-preflight': 'provisional-scope-only' };
  if (!Object.hasOwn(usages, review.stage) || review.usage !== usages[review.stage] || typeof review.explanation !== 'string' || !review.explanation) fail();
  const blocked = ['policy-blocked', 'identity-blocked', 'link-blocked'].includes(review.stage);
  const record = type === 'record';
  if (!['record', 'questionnaire'].includes(type) || (!record && !['questionnaire', 'policy-blocked'].includes(review.stage))) fail();
  const allowedStages = record ? ['policy-blocked', 'identity-blocked', 'link-blocked', 'record-comparison', 'record-preflight'] : ['questionnaire', 'policy-blocked'];
  const blockedStatuses = { 'policy-blocked': 'policy-review-required', 'identity-blocked': 'needs-record-identity', 'link-blocked': 'needs-record-link-review' };
  if (!allowedStages.includes(review.stage) || (blocked ? status !== blockedStatuses[review.stage] :
      !((record ? ['needs-record-link-confirmation', 'needs-record-link-review', 'needs-conflict-review', 'needs-verification', 'outside-this-release', 'supplied-claims-look-in-scope'] : ['looks-in-scope', 'may-fit-verify', 'outside-this-release']).includes(status)))) fail();
  if (!record && review.resultStatus !== status) fail();
  const keys = record ? blocked ? [] : [...SCOPE_KEYS, 'renewalTerm', 'endState'] : SCOPE_KEYS;
  if (!Array.isArray(review.fields) || review.fields.length !== keys.length || keys.some((key, index) => review.fields[index]?.key !== key)) fail();
  if (!review.originalInputs || Object.keys(review.originalInputs).join('|') !== SCOPE_KEYS.join('|') || (blocked ? review.scopeInputs !== null : !review.scopeInputs)) fail();
  if (!blocked && Object.keys(review.scopeInputs).some(key => !SCOPE_KEYS.includes(key))) fail();
  if (record && !blocked && Object.keys(review.scopeInputs).join('|') !== SCOPE_KEYS.join('|')) fail();
  if (!validIsoDate(review.checkedToday)) fail();
  if (!record) {
    if (!Number.isInteger(review.through) || review.through < 0 || review.through > 4 ||
        (!blocked && review.through < 4 && status !== 'outside-this-release')) fail();
    const assessedKeys = QUESTION_KEYS.slice(0, review.through + 1);
    if (review.through === 4) assessedKeys.push('renewalDate', 'agreement');
    if (!blocked && (Object.keys(review.scopeInputs).length !== assessedKeys.length || assessedKeys.some(key => !Object.hasOwn(review.scopeInputs, key)))) fail();
    for (const field of review.fields) {
      const included = !blocked && assessedKeys.includes(field.key) && (field.key !== 'renewalDate' || review.originalInputs.renewal === 'exact');
      const effective = !blocked && assessedKeys.includes(field.key) ? review.originalInputs[field.key] : undefined;
      const reason = blocked ? 'policy-blocked' : included ? field.key === 'agreement' ? 'agreement-response' : 'carried-response' : 'not-assessed';
      if (field.included !== included || field.effective?.value !== effective || field.effective?.origin?.reason !== reason || field.supplied !== null || field.reviewChoice !== 'none') fail();
    }
  }
  const suppliedContracts = {
    distributor: ['Pax8', ['distributor']], billing: ['HaloPSA', ['billing_system']],
    commitment: ['Pax8', ['product_family', 'commerce_model', 'seat_based', 'commitment_term']],
    renewal: ['Pax8', ['renewal_date']], renewalDate: ['Pax8', ['renewal_date']],
    renewalTerm: ['Pax8', ['scheduled_commitment_term']], endState: ['Pax8', ['end_of_term_state']],
  };
  const states = new Set(['known', 'unknown', 'approximate', 'not-asked', 'not-assessed', 'unrecognized']);
  for (const field of review.fields) {
    const origin = field.effective?.origin;
    if (record && field.included !== (field.key !== 'renewalDate' || review.scopeInputs.renewal === 'exact' || ['unresolved', 'keep-answer'].includes(field.reviewChoice))) fail();
    if (field.key === 'renewalDate' && field.included && review.originalInputs.renewal === 'exact' && !validIsoDate(field.original?.value)) fail();
    if (!field.original || !field.effective || !Object.hasOwn(field.original, 'value') || !Object.hasOwn(field.effective, 'value')) fail();
    if (field.key === 'renewalDate' && field.included && field.effective.value !== undefined && !validIsoDate(field.effective.value)) fail();
    if (field.key === 'renewalDate' && field.included && review.scopeInputs?.renewal === 'exact' && !validIsoDate(field.effective.value)) fail();
    const source = field.key === 'agreement' ? 'preparation-self-report' : field.key === 'renewalTerm' ? 'record-stage-self-report' : field.key === 'endState' ? 'no-response' : 'questionnaire-self-report';
    if (field.label !== LABELS[field.key] || typeof field.included !== 'boolean' || field.authenticated !== false || !field.original || field.original.source !== source ||
        !states.has(field.original.state) || !states.has(field.effective?.state) || field.original.state !== responseState(field.original.value) ||
        !origin || !['self-report', 'supplied-csv', 'unresolved', 'scope-guard'].includes(origin.kind) || !Object.hasOwn(REASONS, origin.reason) ||
        field.effective.reason !== REASONS[origin.reason] || !['none', 'unresolved', 'accept-file', 'keep-answer'].includes(field.reviewChoice)) fail();
    const allowed = field.key === 'renewalTerm' ? ['annual', 'monthly', 'other', 'unknown', 'not-asked'] : RESPONSE_CHOICES[field.key];
    if (allowed && field.included && (!allowed.includes(field.original.value) || !allowed.includes(field.effective.value))) fail();
    for (const value of [field.original.value, field.effective.value]) {
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > (field.key === 'endState' ? 1024 : 128) || (allowed && !allowed.includes(value)))) fail();
    }
    if (SCOPE_KEYS.includes(field.key) && field.original.value !== review.originalInputs[field.key]) fail();
    if (review.scopeInputs && Object.hasOwn(review.scopeInputs, field.key) && field.effective.value !== review.scopeInputs[field.key]) fail();
    if (!field.included && field.effective.state !== 'not-assessed') fail();
    const expectedState = !field.included ? 'not-assessed' : field.key === 'endState' ? field.effective.state :
      field.key === 'renewalDate' && field.effective.value === undefined && ['unresolved', 'keep-answer'].includes(field.reviewChoice) ? 'unknown' : responseState(field.effective.value);
    if (field.effective.state !== expectedState) fail();
    const fileReasons = ['file-agrees', 'file-informs-unknown', 'file-accepted', 'end-state-file'];
    const unresolvedReasons = ['source-unavailable', 'conflict-unresolved', 'answer-kept'];
    const expectedKind = fileReasons.includes(origin.reason) ? 'supplied-csv' : unresolvedReasons.includes(origin.reason) ? 'unresolved' : origin.reason === 'economic-guard' ? 'scope-guard' : 'self-report';
    if (origin.kind !== expectedKind) fail();
    if (field.key === 'endState' && ((field.effective.state === 'known') !== ['renew', 'cancel', 'extended'].includes(field.effective.value))) fail();
    if (field.effective.state === 'unknown' && field.effective.value !== 'unknown' && !(field.key === 'renewalDate' && field.effective.value === undefined) && field.key !== 'endState') fail();
    if (origin.kind === 'supplied-csv' && (!field.supplied || origin.system !== field.supplied.system || field.effective.value !== field.supplied.value)) fail();
    if (field.supplied) {
      const contract = suppliedContracts[field.key];
      if (!contract || field.supplied.system !== contract[0] || !Array.isArray(field.supplied.columns) ||
          field.supplied.columns.length !== contract[1].length || field.supplied.columns.some((column, index) => column !== contract[1][index]) ||
          typeof field.supplied.rowId !== 'string' || field.supplied.rowId.length > 1024 ||
          !Object.hasOwn(field.supplied, 'value') || (field.supplied.value !== undefined && (typeof field.supplied.value !== 'string' || field.supplied.value.length > 1024))) fail();
    }
    if (field.supplied && (field.supplied.authenticated !== false || !['Pax8', 'HaloPSA'].includes(field.supplied.system) || typeof field.supplied.rowId !== 'string' ||
        !Array.isArray(field.supplied.columns) || !Array.isArray(field.supplied.raw) || field.supplied.columns.length !== field.supplied.raw.length ||
        field.supplied.raw.some(cell => typeof cell !== 'string' || cell.length > 1024))) fail();
    if (field.supplied) assertSourceTrace(field.supplied.trace, field.supplied.columns, field.supplied.raw, fail);
  }
  if (record && !blocked) {
    const contributor = review.contributors;
    const link = contributor?.identity?.linkState;
    if (!contributor || contributor.recordResultStatus !== status || typeof review.checkBasis !== 'string' || !review.checkBasis ||
        !['unusable', 'awaiting-confirmation', 'self-attested'].includes(link) || (review.stage === 'record-preflight') !== (link === 'self-attested') ||
        [contributor.identity, contributor.nextTerm, contributor.endState, contributor.economicContext].some(item => !item || item.authenticated !== false)) fail();
    if ((link === 'unusable' && status !== 'needs-record-link-review') || (link === 'awaiting-confirmation' && status !== 'needs-record-link-confirmation') || (link === 'self-attested' && ['needs-record-link-review', 'needs-record-link-confirmation'].includes(status))) fail();
    for (const field of review.fields) {
      if (field.supplied && field.supplied.rowId !== (field.supplied.system === 'Pax8' ? contributor.identity.subscriptionId : contributor.identity.haloLineId)) fail();
    }
    if (contributor.nextTerm.scheduledProvided !== Boolean(review.fields[7].supplied) ||
        (review.fields[7].supplied && contributor.nextTerm.scheduledClaim !== review.fields[7].supplied.value)) fail();
    const boundedText = value => typeof value === 'string' && value.length <= 1024;
    const identity = contributor.identity, nextTerm = contributor.nextTerm, end = contributor.endState, economic = contributor.economicContext;
    if (economic.columns?.length) assertSourceTrace(economic.trace,economic.columns,economic.raw,fail);
    else if (economic.trace!==null) fail();
    if (![identity.subscriptionId, identity.haloLineId, identity.paxCustomerRef, identity.haloCustomerRef].every(boundedText) ||
        nextTerm.origin !== 'record-stage-self-report' || typeof nextTerm.scheduledProvided !== 'boolean' || nextTerm.response !== review.fields[7].effective.value ||
        !['annual', 'monthly', 'other', 'unknown'].includes(nextTerm.scheduledClaim) ||
        end.origin !== 'supplied-csv' || end.value !== review.fields[8].effective.value || end.state !== review.fields[8].effective.state || end.raw !== review.fields[8].supplied?.raw[0] ||
        economic.system !== 'Pax8' || economic.rowId !== identity.subscriptionId || !Array.isArray(economic.columns) || !Array.isArray(economic.raw) ||
        economic.columns.length !== economic.raw.length || new Set(economic.columns).size !== economic.columns.length ||
        economic.columns.some(column => !['billing_frequency', 'scheduled_commitment_term', 'scheduled_billing_frequency', 'term_start_date', 'term_end_date'].includes(column)) ||
        economic.raw.some(cell => typeof cell !== 'string' || cell.length > 1024) ||
        !Array.isArray(contributor.economicIssues) || contributor.economicIssues.some(issue => !issue || ['code', 'condition', 'source', 'message'].some(key => typeof issue[key] !== 'string' || !issue[key] || issue[key].length > 2048) || !['pax-file', 'renewal-term'].includes(issue.target)) ||
        !['looks-in-scope', 'may-fit-verify', 'outside-this-release'].includes(contributor.scopeRuleStatus)) fail();
    if (status === 'supplied-claims-look-in-scope' && (link !== 'self-attested' || contributor.scopeRuleStatus !== 'looks-in-scope' || contributor.economicIssues.length)) fail();
  }
  return review;
}
