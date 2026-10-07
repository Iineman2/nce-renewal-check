import { reviewPolicy, POLICY_VERSION } from './fit.mjs';
import { assertClaimReview } from './claims.mjs';
import { inspectRecords, createCaseHandoff, captureCaseHandoff, captureRecordDecision, selectCaseSubject, assertCaseSubject, assertCaseIdentity, captureSelectedRecord, reviewCaseSelection, confirmCaseSelection, revokeCaseSelectionConfirmation, revokeCaseFinder, assertCaseSelectionReview, createCaseFinder, searchCaseFinder, assertCaseFinder, selectFoundCase, assertFoundCase } from './preflight.mjs';
import { assertNextAction, inputFailure, SOURCES, InputProblem } from './actions.mjs';
import { assertFileRuntime, FileEvidenceRuntimeError } from './runtime.mjs';
import { cancelAllProcessing, clearProcessedEvidence, assertBoundedRuntime, processingState } from './bounded-reader.mjs';
import { createFileHandlingSession } from './file-handling.mjs';
import { releaseFileEvidence } from './file-evidence.mjs';
import { createOriginalEvidenceView, assertReadableInspectionOpener, observableViewport } from './file-evidence-view.mjs';
import { FILE_SUPPORT, supportProjection, glossaryProjection } from './file-support.mjs';
import { assertPresentationBudget } from './resource-packet.mjs';
import { visibleText, exactTextJson } from './input.mjs';

const preflight = document.querySelector('#preflight');
const fileGuide = document.querySelector('#file-guide');
const evidencePanels = document.querySelector('#evidence-panels');
const evidencePanelsTitle = document.querySelector('#evidence-panels-title');
const evidenceOpener = document.querySelector('#open-evidence');
const recordInfo = document.querySelector('#record-info');
const recordForm = document.querySelector('#record-form');
const selectedInputs = new Map(['pax-file', 'halo-file'].map(role => [role, document.getElementById(role)]));
const nativeFiles = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').get;
const nativeInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
const nativeReplaceChildren = Element.prototype.replaceChildren;
function clearOwnedNode(node) {
  try { node.replaceChildren(); }
  catch (error) { nativeReplaceChildren.call(node); throw error; }
}
const fileHandling = createFileHandlingSession(role => {
  const input = selectedInputs.get(role);
  if (!input?.isConnected || document.querySelectorAll('#' + role).length !== 1 || document.getElementById(role) !== input || input.type !== 'file' || input.multiple) throw new TypeError('One current native file selection is required.');
  const files = nativeFiles.call(input);
  if (files.length > 1) throw new TypeError('Select one original for this role.');
  return files[0];
});
const readLocalEvidence = (...args) => fileHandling.read(...args);
const recordResult = document.querySelector('#record-result');
const clearRecords = document.querySelector('#clear-records');
const recordSubmit = recordForm.querySelector('button[type="submit"]');
const timeWarning = document.querySelector('#time-warning');
let preflightRun = 0;
let currentCase = null;
let resultCheckedDate = null;
let currentControls = null;
let recordRenderSerial = 0;
let subjectControls = null;
let selectionContext = null;
let subjectRenderSerial = 0;
let subjectEvidence = null;
// Provenance for operator assertions only; never a selectable case or authority.
let recordAssertionBasis = null;
let supportNodes = null;
let supportHalted = false;
let originalEvidenceView = null;
let currentResultValidation = null;
function assertSupportBoundary() {
  if (supportHalted) throw new TypeError('Reload to restore a qualified file-support projection.');
  if (!supportNodes) return; // Only the sequential bootstrap may build the projection.
  assertFileRuntime();
  assertBoundedRuntime();
  originalEvidenceView?.assertRetained();
  currentResultValidation?.();
  const expected = supportProjection();
  const glossary = glossaryProjection();
  for (const [id, node] of Object.entries(supportNodes)) {
    if (!node.isConnected || document.querySelectorAll('#' + id).length !== 1 || document.getElementById(id) !== node) throw new TypeError('File support requires one current projection.');
  }
  const contract = supportNodes['file-support-contract'], title = supportNodes['file-support-title'];
  function attributes(node, allowed) {
    if ([...node.attributes].some(attribute => !allowed.includes(attribute.name))) throw new TypeError('File support has undeclared presentation semantics.');
  }
  for (const [node, tag, parent] of [[title, 'H2', fileGuide], [contract, 'DL', fileGuide]]) {
    if (node.tagName !== tag || node.parentElement !== parent) throw new TypeError('File support has an unowned structure.');
    attributes(node, ['id', 'style', 'class']);
  }
  attributes(preflight, ['id', 'hidden', 'style', 'class']);
  attributes(fileGuide, ['id', 'hidden', 'style', 'class']);
  if (document.querySelectorAll('#file-guide').length !== 1 || fileGuide.parentElement !== preflight.parentElement ||
      fileGuide.tagName !== 'SECTION' || !fileGuide.isConnected) throw new TypeError('File guide ownership changed.');
  assertInspectionPanel();
  if (title.nextElementSibling !== contract || title.textContent !== 'File guide' || title.childNodes.length !== 1 || title.firstChild.nodeType !== Node.TEXT_NODE ||
      contract.childNodes.length !== glossary.length) throw new TypeError('Displayed file glossary disagrees with its declaration.');
  const definitions = [];
  for (const [index, node] of [...contract.childNodes].entries()) {
    if (node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'DIV' || node.childNodes.length !== 2 || node.firstChild.tagName !== 'DT' || node.lastChild.tagName !== 'DD') throw new TypeError('Displayed file glossary has an unowned definition.');
    attributes(node, ['style', 'class']);
    for (const [text, value] of [[node.firstChild, glossary[index].term], [node.lastChild, glossary[index].definition]]) {
      if (text.textContent !== value || text.childNodes.length !== 1 || text.firstChild.nodeType !== Node.TEXT_NODE) throw new TypeError('Displayed file glossary contains undeclared or changed claims.');
      attributes(text, ['style', 'class']); definitions.push(text);
    }
  }
  for (const node of [preflight, fileGuide, evidencePanels, evidencePanelsTitle, ...Object.values(supportNodes), ...contract.children, ...definitions]) {
    for (const pseudo of ['::before', '::after']) {
      if (!['none', 'normal', '""'].includes(getComputedStyle(node, pseudo).content)) throw new TypeError('File support contains undeclared generated text.');
    }
  }
  for (const node of [title, contract, ...contract.children, ...definitions]) {
    const style = getComputedStyle(node);
    if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility !== 'visible' ||
        Number(style.opacity) === 0 || style.fontSize === '0px' || style.lineHeight === '0px' || style.contentVisibility === 'hidden' || style.clipPath !== 'none' ||
        style.clip !== 'auto' || style.maskImage && style.maskImage !== 'none') throw new TypeError('Current file support is hidden.');
  }
  for (const profile of FILE_SUPPORT.profiles) if (supportNodes[profile.target].accept !== FILE_SUPPORT.pickerAccept) throw new TypeError('The file picker disagrees with current support.');
  const readStatus = supportNodes['read-status'], readMessage = supportNodes['read-status-message'], cancelRead = supportNodes['cancel-read'];
  attributes(readStatus, ['id', 'hidden', 'style', 'class']); attributes(readMessage, ['id', 'role', 'style', 'class']); attributes(cancelRead, ['id', 'type', 'style', 'class']);
  if (readStatus.tagName !== 'DIV' || readStatus.parentElement !== recordForm || readStatus.children.length !== 2 ||
      readStatus.firstElementChild !== readMessage || readMessage.tagName !== 'P' || readMessage.getAttribute('role') !== 'status' ||
      readMessage.nextElementSibling !== cancelRead || cancelRead.tagName !== 'BUTTON' || cancelRead.type !== 'button' || cancelRead.textContent !== 'Cancel this check' ||
      cancelRead.childNodes.length !== 1 || cancelRead.firstChild.nodeType !== Node.TEXT_NODE ||
      readMessage.textContent !== expected.controlReadStatus || readMessage.childNodes.length !== 1 || readMessage.firstChild.nodeType !== Node.TEXT_NODE ||
      [...readStatus.childNodes].some(node => node !== readMessage && node !== cancelRead && (node.nodeType !== Node.TEXT_NODE || node.textContent.trim() !== ''))) throw new TypeError('The read deadline display disagrees with current support.');
  if (!preflight.hidden && !readStatus.hidden) {
    assertPresentationBudget(readStatus);
    requireVisibleSubject(readMessage);
    requireVisibleSubject(cancelRead);
    if (observableViewport()) assertReadableInspectionOpener(cancelRead);
  }
  if (!fileGuide.hidden) {
    requireVisibleSubject(title);
    requireVisibleSubject(contract);
    for (const text of [title, ...definitions]) {
      const range = document.createRange(); range.selectNodeContents(text);
      for (let ancestor = text; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
        if (style.transform !== 'none' || style.filter !== 'none' || style.textIndent !== '0px' || /rgba\([^)]*,\s*0\)$/.test(style.color)) throw new TypeError('File support text is visually displaced or hidden.');
        for (const rect of observableViewport() ? range.getClientRects() : []) {
          if (['hidden', 'clip'].includes(style.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) ||
              ['hidden', 'clip'].includes(style.overflowY) && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) throw new TypeError('File support text is partially clipped.');
        }
      }
    }
  }
}
let hasCaseHistory = false;
function resetRecordAssertions() {
  for (const control of recordForm.querySelectorAll('select[name="renewalTerm"], select[name="agreement"]')) control.value = 'not-asked';
}
function bindRecordAssertions(id, file) {
  hasCaseHistory = true;
  recordAssertionBasis = { id, file };
  document.querySelector('#correction-status').textContent = '';
}
const evidenceSpacingProperties = ['letter-spacing', 'word-spacing', 'line-height'];
function assertInspectionPanel() {
  if (!evidencePanels.isConnected || document.querySelectorAll('#evidence-panels').length !== 1 ||
      document.getElementById('evidence-panels') !== evidencePanels || evidencePanels.tagName !== 'SECTION' ||
      evidencePanels.parentElement !== preflight.parentElement || evidencePanels.children.length !== 5 ||
      evidencePanels.firstElementChild !== document.getElementById('close-evidence') || evidencePanels.children[1] !== evidencePanelsTitle || evidencePanelsTitle.tagName !== 'H2' ||
      evidencePanelsTitle.textContent !== 'Evidence' || evidencePanelsTitle.childNodes.length !== 1 ||
      document.querySelectorAll('#evidence-panels-title').length !== 1 || document.getElementById('evidence-panels-title') !== evidencePanelsTitle ||
      evidencePanelsTitle.firstChild.nodeType !== Node.TEXT_NODE ||
      evidencePanelsTitle.nextElementSibling !== recordInfo || recordInfo.nextElementSibling !== document.getElementById('original-evidence') ||
      recordInfo.nextElementSibling.nextElementSibling !== document.getElementById('case-subject') ||
      recordInfo.tagName !== 'SECTION' || recordInfo.attributes.length !== 1 || document.querySelectorAll('#record-info').length !== 1 ||
      [...evidencePanels.attributes].some(attribute => !['id', 'hidden'].includes(attribute.name)) ||
      [...evidencePanelsTitle.attributes].some(attribute => attribute.name !== 'id') ||
      [...evidencePanels.childNodes].some(node => ![...evidencePanels.children].includes(node) &&
        (node.nodeType !== Node.TEXT_NODE || node.textContent.trim() !== ''))) throw new TypeError('Evidence inspection ownership changed.');
  if (!evidenceOpener.isConnected || document.querySelectorAll('#open-evidence').length !== 1 || evidenceOpener.tagName !== 'A' ||
      evidenceOpener.getAttribute('href') !== '#evidence-panels' || evidenceOpener.textContent !== 'Evidence') throw new TypeError('Evidence navigation changed.');
  if (!preflight.hidden && observableViewport()) assertReadableInspectionOpener(evidenceOpener);
}
function requireVisibleSubject(node) {
  const geometry = observableViewport();
  const deferred = evidencePanels.contains(node) && evidencePanels.hidden;
  if (deferred) assertInspectionPanel();
  for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
    if (deferred && ancestor === evidencePanels) continue; // Only this owned, separate information view may defer.
    const style = getComputedStyle(ancestor);
    if (ancestor.hidden || ancestor.inert || ancestor.getAttribute('aria-hidden') === 'true' ||
        style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 ||
        style.contentVisibility === 'hidden' || style.lineHeight === '0px' || style.clipPath !== 'none' ||
        style.clip !== 'auto' || (style.maskImage && style.maskImage !== 'none')) {
      throw new TypeError('Current case evidence is hidden. Restore visible evidence and recheck.');
    }
    if (geometry && !deferred && (['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY))) {
      const evidence = node.getBoundingClientRect(), bounds = ancestor.getBoundingClientRect();
      if (Math.min(evidence.right,bounds.right) <= Math.max(evidence.left,bounds.left) ||
          Math.min(evidence.bottom,bounds.bottom) <= Math.max(evidence.top,bounds.top)) {
        throw new TypeError('Current case evidence is clipped. Restore visible evidence and recheck.');
      }
    }
  }
  const rect = node.getBoundingClientRect();
  if (geometry && !deferred && (rect.width <= 0 || rect.height <= 0)) throw new TypeError('Current case evidence has no visible area.');
  for (const text of node.querySelectorAll('p,dt,dd,h3,summary,button,pre')) {
    let disclosed = true;
    for (let ancestor = text.parentElement; ancestor && ancestor !== node; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS' && !ancestor.open && !ancestor.firstElementChild?.contains(text)) { disclosed = false; break; }
    }
    if (!disclosed) continue;
    const style = getComputedStyle(text), bounds = text.getBoundingClientRect();
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 ||
        style.fontSize === '0px' || style.lineHeight === '0px' || style.clipPath !== 'none' ||
        (style.maskImage && style.maskImage !== 'none') || (geometry && !deferred && (bounds.width <= 0 || bounds.height <= 0))) {
      throw new TypeError('Material case evidence is hidden. Restore readable evidence and recheck.');
    }
  }
}
function subjectSnapshot() {
  assertPresentationBudget(document.querySelector('#case-subject'));
  const regions = document.querySelectorAll('#case-subject');
  if (regions.length !== 1) throw new TypeError('One current-case evidence region is required.');
  const node = regions[0];
  if (selectionContext) requireVisibleSubject(node);
  const copy = node.cloneNode(true);
  // Focus and disclosure state do not alter material evidence. Visibility does.
  copy.removeAttribute('tabindex');
  for (const property of evidenceSpacingProperties) copy.style.removeProperty(property);
  if (!copy.style.length) copy.removeAttribute('style');
  copy.querySelectorAll('details').forEach(detail => detail.removeAttribute('open'));
  const ancestors=[];
  for(let ancestor=node.parentElement;ancestor;ancestor=ancestor.parentElement) ancestors.push(ancestor);
  return { node, html: copy.outerHTML, nodes: [...node.querySelectorAll('*')], ancestors };
}
function sameSubjectEvidence() {
  if (!selectionContext) return true;
  if (!subjectEvidence) return false;
  let current;
  try { current = subjectSnapshot(); } catch { return false; }
  return current.node === subjectEvidence.node && current.html === subjectEvidence.html &&
    current.ancestors.length === subjectEvidence.ancestors.length && current.ancestors.every((node,index)=>node===subjectEvidence.ancestors[index]) &&
    current.nodes.length === subjectEvidence.nodes.length &&
    current.nodes.every((node, index) => node === subjectEvidence.nodes[index]);
}
let finderContext = null;
let finderBasis = null;
let finderSerial = 0;
let finderDiscovery = null;
const finderFields = { query: 'case-query' };
function finderSnapshot() {
  const controls = Object.entries(finderFields).map(([key, id]) => {
    const matches = document.querySelectorAll('#' + id);
    if (matches.length !== 1) throw new TypeError('One current search control is required.');
    return { key, node: matches[0], value: matches[0].value, badInput: matches[0].validity.badInput };
  });
    const targets = ['finder-results', 'finder-status', 'cancel-case-finder'].map(id => {
      const matches = document.querySelectorAll('#' + id);
      if (matches.length !== 1) throw new TypeError('One current discovery target is required.');
      return matches[0];
    });
    return { controls, targets, values: Object.fromEntries(controls.map(c => [c.key, c.value])),
    json: JSON.stringify(controls.map(c => [c.value, c.badInput])),
    badDates: controls.some(c => ['from', 'to'].includes(c.key) && c.badInput) };
}
function sameFinderDiscovery() {
  if (!finderDiscovery) return true;
  const current = finderSnapshot();
  return finderDiscovery.serial === finderSerial && finderDiscovery.json === current.json &&
      finderDiscovery.controls.every((control, i) => control.node === current.controls[i].node) &&
      finderDiscovery.targets.every((node, i) => node === current.targets[i]) &&
      (!finderDiscovery.rendered || (finderDiscovery.rendered.html === current.targets[0].innerHTML && [...current.targets[0].children].every((node, i) => node === finderDiscovery.rendered.nodes[i])));
}
function clearFinder() {
  revokeCaseFinder(finderContext?.handle);
  finderSerial++; finderContext = null; finderBasis = null; finderDiscovery = null;
  document.querySelectorAll('#cancel-case-finder, #finder-controls').forEach(el => { el.hidden = true; });
  document.querySelectorAll('#finder-results').forEach(el => el.replaceChildren());
  document.querySelectorAll('#finder-status').forEach(el => { el.textContent = ''; });
  for (const id of Object.values(finderFields)) document.querySelectorAll('#' + id).forEach(el => { el.value = ''; });
}
function finderInteraction(serial, filtersJSON) {
  if (preflight.hidden || !observableViewport() || serial !== finderSerial || !finderContext || expireOldResult()) return false;
  if (!sameControls(finderBasis) || JSON.stringify(finderSnapshot().values) !== filtersJSON) { invalidateRecordReview(); return false; }
  return true;
}
function renderFinder(offset = 0) {
  if (!finderContext) return;
  const sourceDigest = originalEvidenceView.assertText('pax-file', finderContext.text, finderContext.file);
  const snapshot = finderSnapshot();
  const filters = snapshot.values;
  const serial = ++finderSerial;
  finderDiscovery = { ...snapshot, serial };
  const results = document.querySelector('#finder-results'); results.replaceChildren();
  let projection;
  try {
    if (snapshot.badDates) throw new TypeError('Finish or clear the invalid renewal date.');
    projection = searchCaseFinder(finderContext.handle, filters, offset);
  }
  catch (error) {
    if (!(error instanceof TypeError)) throw error;
    document.querySelector('#finder-status').textContent = error.message + ' Clear or correct the search and filters, then try again.';
    return;
  }
  projection = assertCaseFinder(projection, finderContext.handle, filters, offset);
  const filtersJSON = JSON.stringify(filters);
  const status = document.querySelector('#finder-status');
  status.textContent = '';
  const label = document.createElement('label'); label.htmlFor = 'case-choice'; label.textContent = 'Choose a subscription';
  const choice = document.createElement('select'); choice.id = 'case-choice';
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = projection.matchCount ? 'Choose a subscription.' : 'No matching subscriptions.'; choice.append(placeholder);
  for (const row of projection.rows) {
    const option = document.createElement('option'); option.value = String(row.recordNumber);
    option.textContent = visibleText(`${row.customerName || row.customerRef || 'Unknown customer'} · ${row.subscriptionId || 'Unknown subscription'} · ${row.renewalDate || 'Unknown renewal'}`);
    option.disabled = !row.selectable; choice.append(option);
  }
  choice.addEventListener('change', guarded(() => {
    if (!finderInteraction(serial, filtersJSON) || !choice.isConnected || !results.contains(choice)) return;
    if (choice.value === '') {
      document.querySelector('#subscription-id').value = '';
      invalidateRecordReview(true); resetRecordAssertions(); recordAssertionBasis = null;
      finderBasis = controlSnapshot(); renderFinder(); document.querySelector('#case-choice').focus(); return;
    }
    const row = projection.rows.find(row => String(row.recordNumber) === choice.value);
    if (!row?.selectable) return;
    const context = finderContext;
    const candidate = assertFoundCase(selectFoundCase(context.handle, row.recordNumber), context.handle, row.recordNumber);
    const id = candidate.subject?.subscriptionId;
    const selection = assertCaseSubject(candidate, context.text, id);
    document.querySelector('#subscription-id').value = id;
    invalidateRecordReview(true); bindRecordAssertions(id, context.file);
    finderBasis = controlSnapshot(); subjectControls = finderBasis;
    selectionContext = { text: context.text, id, file: context.file, receipt: null };
    renderCaseSubject(selection, context.file);
    recordSubmit.focus();
  }));
  results.append(label, choice);
  const navigation = document.createElement('nav'); navigation.setAttribute('aria-label', 'Case pages');
  for (const [label, page] of [['Previous cases',offset - 20],['Next cases',offset + 20]]) {
    if (page < 0 || page >= projection.matchCount) continue;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', guarded(() => { if (!finderInteraction(serial, filtersJSON)) return; invalidateRecordReview(true); renderFinder(page); status.focus(); })); navigation.append(button);
  }
    if (navigation.childElementCount) results.prepend(navigation);
    finderDiscovery.rendered = { html: results.innerHTML, nodes: [...results.children] };
}
function updateFinder() {
  if (preflight.hidden || !finderContext) return;
  // A normal edit owns the new discovery state. Clear derived authority before
  // checking other freshness inputs; an old filter fingerprint must not kill typing.
  invalidateRecordReview(true); finderDiscovery = null;
  if (expireOldResult()) return;
  renderFinder();
}
const findCases = guarded(async () => {
  if (preflight.hidden || !observableViewport()) return;
  if (expireOldResult()) return;
  invalidateRecordReview();
    const serial = finderSerial; const basis = controlSnapshot(); finderBasis = basis;
    const discoveryTargets = finderSnapshot();
  document.querySelector('#cancel-case-finder').hidden = false;
  const status = document.querySelector('#finder-status'); status.textContent = 'Reading subscriptions.';
  try {
    const evidence = await readLocalEvidence(basis.files[0], 'pax-file', SOURCES.pax, FILE_SUPPORT.limits.readTimeoutMs, 'find-case');
    let committed = false;
    try {
    assertSupportBoundary();
      if (serial !== finderSerial || expireOldResult()) return;
      if (!sameControls(basis)) { changedControlsStop(); return; }
      const currentDiscovery = finderSnapshot();
      if (!currentDiscovery.targets.every((node, i) => node === discoveryTargets.targets[i]) || !currentDiscovery.controls.every((control, i) => control.node === discoveryTargets.controls[i].node)) { changedControlsStop(); return; }
    originalEvidenceView.commit(evidence, 'pax-file', basis.files[0]); committed = true;
    if (evidence.problem) throw evidence.problem;
    const text = evidence.text;
    finderContext = { text, file: basis.files[0], handle: createCaseFinder(text) };
    document.querySelector('#finder-controls').hidden = false;
    renderFinder();
    // Discovery has finished before focus can commit a native ID change event.
    // That event may refresh finderBasis for the same ready case list, so the
    // task's finally fence alone cannot own this completed control transition.
    document.querySelector('#cancel-case-finder').hidden = true;
    document.querySelector('#case-query').focus();
    originalEvidenceView.assertCurrent();
    } finally { if (!committed) releaseFileEvidence(evidence.handle); }
  } catch (error) {
    if (finderBasis !== basis || expireOldResult()) return;
    if (!sameControls(basis)) { changedControlsStop(); return; }
    if (!(error instanceof InputProblem)) throw error;
    clearFinder(); showRecordResult(inputFailure(error));
  } finally {
    if (finderBasis === basis) document.querySelector('#cancel-case-finder').hidden = true;
  }
});
document.querySelector('#cancel-case-finder').addEventListener('click', () => {
  if (supportHalted) return;
  try { invalidateRecordReview(); document.querySelector('#pax-file').focus(); } catch { stopUnexpected(); }
});
for (const id of Object.values(finderFields)) {
    document.querySelector('#' + id).addEventListener('input', guarded(updateFinder));
    const acknowledgeNativeEdit = guarded(() => {
      if (finderContext && !sameFinderDiscovery()) updateFinder();
    });
    for (const event of ['change', 'keyup', 'blur']) document.querySelector('#' + id).addEventListener(event, acknowledgeNativeEdit);
  document.querySelector('#' + id).addEventListener('keydown', guarded(event => { if (event.key === 'Enter') { event.preventDefault(); updateFinder(); document.querySelector('#finder-status').focus(); } }));
}
for (const id of ['case-query']) {
  document.querySelector('#' + id).addEventListener('paste', guarded(event => {
    const text = event.clipboardData?.getData('text/plain');
    if (typeof text !== 'string' || !/[\r\n\t]/u.test(text)) return;
    event.preventDefault();
    const control = event.currentTarget;
    control.setRangeText(text.replace(/[\r\n\t]+/gu, ' '), control.selectionStart, control.selectionEnd, 'end');
    updateFinder();
  }));
}


function selectionReview() {
  if (!selectionContext) throw new TypeError('Current source selection is unavailable.');
  if (!sameFinderDiscovery() || !sameSubjectEvidence()) throw new TypeError('Selection evidence changed. Recheck the current source case.');
  const { text, id, receipt } = selectionContext;
  return assertCaseSelectionReview(reviewCaseSelection(text, id, receipt), text, id, receipt);
}

function confirmCurrentSelection() {
  const context = selectionContext;
  const controls = controlSnapshot();
  if (!context || expireOldResult() || !sameControls(subjectControls)) throw new TypeError('Recheck the current source case.');
  selectionReview();
  const inspectorOpen = document.querySelector('#case-subject > .case-source-inspector')?.open === true;
  revokeCaseSelectionConfirmation(selectionContext.receipt);
  const receipt = confirmCaseSelection(context.text, context.id);
  try {
    if (selectionContext !== context || !sameControls(controls) || expireOldResult() ||
        !sameFinderDiscovery() || !sameSubjectEvidence()) throw new TypeError('Evidence changed during confirmation.');
    const reviewed=assertCaseSelectionReview(reviewCaseSelection(context.text, context.id, receipt), context.text, context.id, receipt);
    if(reviewed.status !== 'confirmed') throw new TypeError('Confirmation owner did not issue current authority.');
  } catch (error) {
    revokeCaseSelectionConfirmation(receipt);
    invalidateRecordReview();
    throw error;
  }
  context.receipt = receipt;
  renderCaseSubject(selectionReview(), selectionContext.file);
  const inspector = document.querySelector('#case-subject > .case-source-inspector');
  if (inspector) inspector.open = inspectorOpen;
  const region = document.querySelector('#case-subject');
  region.tabIndex = -1;
  region.focus();
}

function renderCaseSubject(selection = null, file = null, sourceTextForRender = null) {
  const serial = ++subjectRenderSerial;
  subjectEvidence = null;
  const regions = document.querySelectorAll('#case-subject');
  if (regions.length !== 1) throw new TypeError('One current-case region is required before checking records. Reload the page.');
  const target = regions[0];
  // A new render restores the app-owned evidence region, not a mutated shell.
  const spacing = evidenceSpacingProperties.map(property => [property, target.style.getPropertyValue(property), target.style.getPropertyPriority(property)]);
  for (const name of target.getAttributeNames()) if (!['id', 'tabindex'].includes(name)) target.removeAttribute(name);
  for (const [property, value, priority] of spacing) if (value) target.style.setProperty(property, value, priority);
  target.setAttribute('aria-labelledby', 'case-subject-title');
  target.setAttribute('aria-live', 'polite');
  const region = document.createDocumentFragment();
  const heading = document.createElement('h3');
  heading.id = 'case-subject-title'; heading.textContent = 'Current case'; region.append(heading);
  const caseDetails = document.createElement('details'), caseSummary = document.createElement('summary');
  caseSummary.textContent = 'Case details'; caseDetails.append(caseSummary); region.append(caseDetails);
  const line = text => { const p = document.createElement('p'); p.textContent = visibleText(text); caseDetails.append(p); };
  if (!selection) { line('No source-selected case. Enter one subscription ID and check the supplied records.'); target.replaceChildren(region); subjectEvidence = subjectSnapshot(); return; }
  const originalDigest = originalEvidenceView.assertText('pax-file', sourceTextForRender ?? selectionContext?.text ?? finderContext?.text, file);
  if (!selection.subject) {
    line(`Selection unresolved: ${selection.reason}`);
    line(`Matching records: ${selection.matchCount}. No row has been chosen. Correct the ID or reconcile source evidence against the original system and rerun.`);
    for (const candidate of selection.candidates) line(`Candidate data record ${candidate.recordNumber}: account ${candidate.sourceAccountId || 'unknown'}; customer ${candidate.customerRef || 'unknown'}; subscription ${candidate.subscriptionId}; renewal ${candidate.renewalDate || 'unknown'}.`);
    if (selection.matchCount > selection.candidates.length) line(`Showing ${selection.candidates.length} of ${selection.matchCount} matches. The remaining matches are also unresolved.`);
    target.replaceChildren(region); subjectEvidence = subjectSnapshot(); return;
  }
  const subject = selection.subject;
  line(`Original file SHA-256: ${originalDigest}. Inspect Supplied original files to recover the exact bytes.`);
  line(`Customer reference: ${subject.customerRef ?? 'Unresolved — missing or unusable supplied identifier'}`);
  line(`Pax8 subscription: ${subject.subscriptionId}`);
  line(`Renewal occurrence: ${subject.renewalDate ?? 'Unresolved — missing or invalid supplied renewal date'}`);
  line(`Product: ${subject.product ?? 'Unknown'}; commitment term: ${subject.commitmentTerm ?? 'Unknown'}.`);
  line(`Source: supplied Pax8 CSV ${originalEvidenceView.fileName('pax-file', file)}; data record ${subject.recordNumber} (header excluded).`);
  line(`Pax8 source account: ${subject.identity.sourceAccountId ?? 'Unresolved — not supplied or unusable'}. This is supplied context, not authenticated account ownership.`);
  line(subject.identity.key ? 'Identity has supplied account, customer and subscription identifiers. It is scoped to that supplied source account.' : 'Source identity is incomplete. No complete account-scoped identity key is available; this row is selected only within the current file.');
  const description = subject.descriptions;
  if (Object.values(description).some(value => value !== null)) {
    line(`Descriptive labels only — customer name: ${description.customerName ?? 'Unknown'}; product name: ${description.productName ?? 'Unknown'}; SKU: ${description.sku ?? 'Unknown'}; supplied seat text: ${description.seats ?? 'Unknown'}. Names, products and seat values do not establish identity.`);
  }
  line('This identifies the subject of the check using supplied claims. It does not confirm eligibility, a HaloPSA link, signed coverage or authority to act.');
  line(`Case selection: ${selection.status}. ${selection.status === 'confirmed' ? 'You confirmed the intended case against the original source. This is self-attested and unauthenticated.' : 'A matching row alone does not confirm the intended case.'}`);
  for (const issue of selection.uncertainty) line(`Selection unresolved (${issue.code}): ${issue.instruction}`);
  if (selection.canConfirm && selection.status !== 'confirmed') {
    line('Confirm only after checking the supplied account, customer reference, subscription ID and exact renewal occurrence against the original Pax8 record. If you cannot check these facts, leave this case unconfirmed. This records your attestation; it does not authenticate the source.');
  }
  const details = document.createElement('details'); details.className = 'case-source-inspector'; const summary = document.createElement('summary');
  summary.textContent = 'Inspect original selected Pax8 record'; details.append(summary);
  const raw = document.createElement('pre'); raw.style.whiteSpace = 'pre-wrap'; raw.style.overflowWrap = 'anywhere';
  raw.textContent = Object.entries(subject.raw).map(([key, value]) => `${visibleText(key)}: ${visibleText(value)}`).join('\n');
  details.append(raw);
  const explanation = document.createElement('p');
  explanation.textContent = 'Raw cells are decoded CSV values before trimming. Normalized cells are trimmed values; column names are trimmed and lowercased. Empty cells are shown as "". Control and invisible characters appear as [U+XXXX] markers in every evidence view; these markers are display escapes, not changes to the supplied record.';
  details.append(explanation);
  const table = document.createElement('table');
  table.style.width = '100%'; table.style.tableLayout = 'fixed'; table.style.overflowWrap = 'anywhere';
  table.className = 'case-evidence-fields';
  const caption = document.createElement('caption'); caption.textContent = 'Selected record: supplied and normalized fields'; table.append(caption);
  const head = document.createElement('thead'); const headerRow = document.createElement('tr');
  for (const title of ['Column / original header', 'Raw supplied cell', 'Normalized cell']) {
    const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = title; headerRow.append(cell);
  }
  head.append(headerRow); table.append(head);
  const body = document.createElement('tbody');
  for (const field of subject.evidence.fields) {
    const row = document.createElement('tr'); row.dataset.column = field.column;
    for (const [index, value] of [field.column + ' / ' + JSON.stringify(field.originalHeader), field.rawValue, field.normalizedValue].entries()) {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      cell.textContent = visibleText(value === '' ? '""' : value); cell.style.whiteSpace = 'pre-wrap'; row.append(cell);
    }
    body.append(row);
  }
  table.append(body); details.append(table);
  const locations = document.createElement('details'); const locationSummary = document.createElement('summary');
  locationSummary.textContent = 'Inspect exact header and cell source locations'; locations.append(locationSummary);
  for (const field of subject.evidence.fields) {
    const entry = document.createElement('p'); entry.style.overflowWrap = 'anywhere';
    entry.textContent = `Column ${field.columnIndex} (${visibleText(field.column)}), lexical record ${subject.evidence.sourceRecordOrdinal}: UTF-16 ${field.startOffset}–${field.endOffset}, original bytes ${field.startByte}–${field.endByte}; header UTF-16 ${field.header.startOffset}–${field.header.endOffset}, bytes ${field.header.startByte}–${field.header.endByte}; exact lexeme ${exactTextJson(field.lexeme)}. All ends exclusive; original SHA-256 ${originalDigest}.`;
    locations.append(entry);
  }
  details.append(locations);
  const originalTitle = document.createElement('h4'); originalTitle.textContent = 'Original CSV record (display escaped)'; details.append(originalTitle);
  const locator = document.createElement('p');
  locator.textContent = `Decoded source offsets ${subject.evidence.startOffset}–${subject.evidence.endOffset} (end exclusive), measured in UTF-16 code units including any leading BOM. The record terminator is excluded; quoting, delimiters and embedded newlines are retained. Data record numbers exclude the header and empty records; they are not physical line numbers. Compare this record with the original supplied file and Pax8 system before relying on it.`;
  details.append(locator);
  const original = document.createElement('pre'); original.className = 'case-evidence-original';
  original.style.whiteSpace = 'pre-wrap'; original.style.overflowWrap = 'anywhere';
  original.textContent = visibleText(subject.evidence.originalRecord); details.append(original);
  const exactLabel = document.createElement('p');
  exactLabel.textContent = 'Exact record as a JSON string: escape sequences distinguish real invisible characters from literal marker text. Decoding this string reproduces the selected CSV record.';
  details.append(exactLabel);
  const exact = document.createElement('pre'); exact.className = 'case-evidence-json';
  exact.style.whiteSpace = 'pre-wrap'; exact.style.overflowWrap = 'anywhere';
  exact.textContent = exactTextJson(subject.evidence.originalRecord);
  details.append(exact);
  region.append(details);
  target.replaceChildren(region);
  subjectEvidence = subjectSnapshot();
}

function invalidateRecordReview(keepFinder = false) {
  currentResultValidation = null;
  cancelAllProcessing();
  originalEvidenceView?.refresh();
  const assertionChanged = recordAssertionBasis &&
    (document.querySelector('#subscription-id')?.value !== recordAssertionBasis.id ||
     document.querySelector('#pax-file')?.files?.[0] !== recordAssertionBasis.file);
  if (assertionChanged) { resetRecordAssertions(); recordAssertionBasis = null; }
  revokeCaseSelectionConfirmation(selectionContext?.receipt);
  subjectEvidence = null;
  if (!keepFinder) clearFinder();
  preflightRun++;
  recordRenderSerial++;
  currentCase = null;
  currentControls = null;
  subjectControls = null;
  selectionContext = null;
  subjectRenderSerial++;
  const subjectRegions = document.querySelectorAll('#case-subject');
  if (subjectRegions.length === 1) renderCaseSubject();
  else subjectRegions.forEach(region => region.replaceChildren());
  recordSubmit.disabled = false;
  recordSubmit.hidden = false;
  document.querySelector('#read-status').hidden = true;
  recordResult.replaceChildren(); recordInfo.replaceChildren();
  recordResult.hidden = true;
}

function clearRecordData() {
  // Removal has no presentation/runtime prerequisite. Independent phases run
  // even if a native operation or damaged view throws. The cancelable reset
  // event cannot own picker cleanup; never call form.reset recursively.
  let failure;
  const clean = action => { try { action(); } catch (error) { failure ??= error; } };
  currentResultValidation = null;
  clean(() => fileHandling.clear());
  clean(() => cancelAllProcessing());
  clean(() => clearProcessedEvidence());
  clean(() => revokeCaseSelectionConfirmation(selectionContext?.receipt));
  clean(() => revokeCaseFinder(finderContext?.handle));
  preflightRun++; finderSerial++; recordRenderSerial++; subjectRenderSerial++;
  currentCase = null; currentControls = null; subjectControls = null; selectionContext = null; subjectEvidence = null;
  finderContext = null; finderBasis = null; finderDiscovery = null; recordAssertionBasis = null;
  for (const input of selectedInputs.values()) clean(() => nativeInputValue.call(input, ''));
  // Changed/duplicate pickers can be cleared, never authorized.
  for (const input of document.querySelectorAll('input[type="file"]')) clean(() => nativeInputValue.call(input, ''));
  for (const id of ['subscription-id', ...Object.values(finderFields)]) for (const input of document.querySelectorAll('#' + id)) clean(() => { input.value = ''; });
  clean(resetRecordAssertions);
  clean(() => originalEvidenceView?.clear());
  for (const node of document.querySelectorAll('#original-evidence-sources, #record-result, #record-info, #finder-results, #correction-status, #case-subject')) clean(() => clearOwnedNode(node));
  if (!supportHalted) clean(renderCaseSubject);
  for (const node of document.querySelectorAll('#record-result, #read-status, #cancel-case-finder, #finder-controls, #clear-records')) clean(() => { node.hidden = true; });
  clean(() => { document.querySelector('#finder-status').textContent = ''; });
  clean(() => { recordSubmit.disabled = false; recordSubmit.hidden = false; });
  if (failure) throw failure;
}

function inspectCurrentCase(input = currentCase) {
  selectionReview();
  if (!input || input.pax8Text !== selectionContext.text || input.subscriptionId !== selectionContext.id ||
      !sameControls(currentControls)) throw new TypeError('Comparison handoff is no longer current.');
  originalEvidenceView.assertText('pax-file', input.pax8Text, currentControls.files[0]);
  originalEvidenceView.assertText('halo-file', input.haloText, currentControls.files[1]);
  return inspectRecords(input, createCaseHandoff(input.pax8Text, input.subscriptionId, selectionContext.receipt), selectionContext.receipt);
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updatePolicyAccess() {
  const blocked = Boolean(reviewPolicy({ today: localToday() }));
  if (blocked) {
    recordSubmit.disabled = true;
      timeWarning.textContent = 'Scope rules need review. Reload after the rules are updated.';
    timeWarning.hidden = false;
  }
  return blocked;
}
function expireOldResult() {
  if (!sameSubjectEvidence() || !sameFinderDiscovery()) { invalidateRecordReview(); return true; }
  if (finderBasis && !sameControls(finderBasis)) { changedControlsStop(); return true; }
  if (resultCheckedDate !== localToday()) {
    clearRecordData(); resultCheckedDate = localToday();
    timeWarning.textContent = 'The local date changed. Reselect files and check the records again.';
    timeWarning.hidden = false; if (!preflight.hidden) timeWarning.focus();
    updatePolicyAccess(); return true;
  }
  if (subjectControls && !sameControls(subjectControls)) { changedControlsStop(); return true; }
  return updatePolicyAccess();
}
setInterval(guarded(expireOldResult), 15_000);
window.addEventListener('focus', guarded(expireOldResult));
document.addEventListener('visibilitychange', guarded(() => { if (!document.hidden) expireOldResult(); }));
window.addEventListener('pagehide', () => { try { clearRecordData(); } catch { stopUnexpected(); } });
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  try { clearRecordData(); } catch { stopUnexpected(); return; }
  guarded(() => {
    fileGuide.hidden = true; evidencePanels.hidden = true; preflight.hidden = false;
    resultCheckedDate = localToday();
    timeWarning.textContent = 'Page restored. Reselect files and check the records again.';
    timeWarning.hidden = false; timeWarning.focus(); updatePolicyAccess();
  })();
});
function answers() {
  return {
    // No opening questionnaire: omitted facts are explicitly unestablished.
    // Supplied records establish term/date/distributor/billing, never reseller role.
    reseller: 'unknown', distributor: 'unknown', billing: 'unknown',
    commitment: 'unknown', renewal: 'unknown',
    agreement: new FormData(recordForm).get('agreement') || 'not-asked',
  };
}
function controlSnapshot() {
  const controls = ['subscription-id', 'pax-file', 'halo-file', 'renewal-term', 'agreement'].map(id => {
    const matches = document.querySelectorAll('#' + id);
    if (matches.length !== 1) throw new TypeError('One current ' + id + ' control is required. Reload and recheck.');
    return matches[0];
  });
  return { json: JSON.stringify([answers(), document.querySelector('#subscription-id').value,
    new FormData(recordForm).get('renewalTerm') || 'not-asked', localToday(), POLICY_VERSION]),
    controls, files: [controls[1].files[0], controls[2].files[0]] };
}
function sameControls(snapshot) {
  const current = controlSnapshot();
  return Boolean(snapshot && snapshot.json === current.json && snapshot.controls.every((control, index) => control === current.controls[index]) && snapshot.files.every((file, index) => file === current.files[index]));
}
function changedControlsStop() {
  invalidateRecordReview();
  timeWarning.textContent = 'Case inputs changed. Check the selected records again.';
  timeWarning.hidden = false; if (!preflight.hidden) timeWarning.focus();
}
function usableInteraction(serial) {
  if (preflight.hidden || serial !== recordRenderSerial || expireOldResult()) return false;
  if (currentCase && !sameControls(currentControls)) { changedControlsStop(); return false; }
  return true;
}
function stopUnexpected() {
  // Retire authority first. Every independent cleanup runs even when a damaged
  // presentation target or native task operation throws persistently.
  const clean = action => { try { action(); } catch { /* Remain terminal. */ } };
  supportHalted = true;
  currentResultValidation = null;
  const receipt = selectionContext?.receipt;
  clean(() => fileHandling.clear());
  clean(() => cancelAllProcessing('Processing stopped because the current runtime is inconsistent. Reload to retry.'));
  clean(clearRecordData);
  clean(() => originalEvidenceView?.clear());
  clean(() => revokeCaseSelectionConfirmation(receipt));
  preflightRun++; finderSerial++; recordRenderSerial++; subjectRenderSerial++;
  currentCase = null; currentControls = null; subjectControls = null; selectionContext = null; subjectEvidence = null;
  finderContext = null; finderBasis = null; finderDiscovery = null; recordAssertionBasis = null;
  for (const node of document.querySelectorAll('#record-result, #record-info, #case-subject, #finder-results, #original-evidence-sources, #original-evidence')) {
    clean(() => clearOwnedNode(node)); clean(() => { node.hidden = true; });
  }
  for (const node of [preflight, fileGuide, evidencePanels, document.querySelector('#read-status')]) clean(() => { node.hidden = true; });
  resultCheckedDate = null;
  const warning = document.querySelector('#runtime-warning');
  clean(() => { warning.textContent = 'The check could not produce a consistent claim trail. No current result is available. Reload and recheck; stop if the problem continues.'; });
  clean(() => { warning.hidden = false; warning.tabIndex = -1; }); clean(() => warning.focus());
}
function guarded(callback) { return (...args) => {
  // A failed early guard must still cancel native form submission.
  if (args[0]?.type === 'submit') args[0].preventDefault();
  if (supportHalted) return;
  try {
    assertSupportBoundary();
    // A minimized viewport preserves owned evidence but cannot grant workflow
    // authority. Cancellation has its separate, unconditional stop handlers.
    if (!observableViewport() && ['click', 'submit'].includes(args[0]?.type) &&
        !document.getElementById('original-evidence').contains(args[0]?.target)) {
      args[0].preventDefault(); return;
    }
    const value = callback(...args);
    if (value instanceof Promise) return value.then(result => { assertSupportBoundary(); return result; }).catch(stopUnexpected);
    assertSupportBoundary(); return value;
  } catch { stopUnexpected(); }
}; }
// Resize alone restores observable metrics; every current page shares the same
// read-only boundary. This does not select a case, admit work or attest facts.
window.addEventListener('resize', guarded(() => {}));
function presentationNode(tag, attributes = {}) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function renderList(messages, setText = (node, text) => { node.textContent = text; }, make = presentationNode) {
  const list = make('ul');
  for (const message of messages) {
    const li = make('li');
    setText(li, visibleText(message));
    list.append(li);
  }
  return list;
}

function appendClaimReview(container, review, append = (...nodes) => container.append(...nodes), setText = (node, text) => { node.textContent = text; }, make = presentationNode) {
  if (!review) return;
  const trail = make('details', { class: 'claim-trail', 'data-stage': review.stage });
  const summary = make('summary');
  setText(summary, 'Review the values considered by this check');
  const explanation = make('p');
  setText(explanation, visibleText(`${review.explanation} No vendor authenticity, freshness, financial coverage, or action permission is established.`));
  trail.append(summary, explanation);
  const display = value => value === undefined || value === null ? 'Not provided' : value === 'not-asked' ? 'Not answered' : value === 'unknown' ? 'Unknown' : value === 'within-60-approx' ? 'Approximately within 60 days' : visibleText(value);
  const appendTrace = (target, trace, system) => {
    if (!trace) return;
    const role = system === 'Pax8' ? 'pax-file' : 'halo-file', index = role === 'pax-file' ? 0 : 1;
    const digest = originalEvidenceView.assertText(role, role === 'pax-file' ? currentCase?.pax8Text : currentCase?.haloText, currentControls?.files[index]);
    const location = make('p', { style: 'overflow-wrap: anywhere;' });
    setText(location, visibleText(`Original ${system} SHA-256 ${digest}; lexical record ${trace.sourceRecordOrdinal}, data record ${trace.dataRecordNumber}; ${trace.fields.map(field => `column ${field.columnIndex} (${field.column}), UTF-16 ${field.startOffset}–${field.endOffset}, bytes ${field.startByte}–${field.endByte}`).join('; ')}. All ends exclusive. Inspect Supplied original files for exact lexemes and header positions.`));
    target.append(location);
  };
  for (const field of review.fields) {
    const section = make('section', { class: 'claim-trail-row', 'data-field': field.key });
    const label = make('h4');
    setText(label, field.label);
    const original = make('p');
    // This adapter collects no opening questionnaire. The reusable domain API
    // retains its legacy input labels; do not present app defaults as self-report.
    const uncollected = ['reseller','distributor','billing','commitment','renewal','renewalDate'].includes(field.key);
    const unanswered = uncollected || field.original.state === 'not-asked';
    const originLabel = { 'preparation-self-report': 'Agreement availability response', 'record-stage-self-report': 'Next-term response', 'no-response': 'Original response' }[field.original.source];
    setText(original, visibleText(unanswered ? 'No answer was collected for this field.' : `${originLabel}: ${display(field.original.value)} (${field.original.state}).`));
    const supplied = make('p');
    setText(supplied, visibleText(field.supplied
      ? `Supplied ${field.supplied.system} CSV claim: ${display(field.supplied.value)}. Row ${field.supplied.rowId}; columns ${field.supplied.columns.join(', ')}; raw cells ${field.supplied.raw.map(visibleText).map(value => `“${value}”`).join(', ')}. Unauthenticated.`
      : 'No supplied source record for this field.'));
    const choice = make('p');
    setText(choice, visibleText(`Review choice: ${{ none: 'No conflict choice made', unresolved: 'Unresolved', 'accept-file': 'Use supplied value', 'keep-answer': 'Keep response and obtain corrected evidence' }[field.reviewChoice]}.`));
    const effective = make('p', { class: 'claim-effective' });
    const reason = uncollected
      ? field.effective.origin.kind === 'supplied-csv' ? 'This value comes from the supplied records. No earlier answer was collected; the supplied claim remains unauthenticated.' : 'No answer was collected. An unestablished input cannot verify this fact.'
      : field.original.state === 'not-asked' ? 'No answer was collected. This fact remains unestablished.' : field.effective.reason;
    setText(effective, visibleText(`Value considered: ${field.included ? field.effective.state === 'unknown' ? 'Unknown' : display(field.effective.value) : 'Not assessed'}. State: ${field.effective.state}. ${reason}`));
    section.append(label, original, supplied, choice, effective);
    if (field.supplied) appendTrace(section, field.supplied.trace, field.supplied.system);
    trail.append(section);
  }
  if (review.contributors) {
    const { identity, economicIssues, economicContext } = review.contributors;
    const context = make('p');
    setText(context, visibleText(`Selected pair: subscription ${identity.subscriptionId}, recurring line ${identity.haloLineId}; customer references ${identity.paxCustomerRef} / ${identity.haloCustomerRef}. Link state: ${identity.linkState}. Confirmation is self-attestation, not authentication.`));
    trail.append(context);
    if (economicContext.columns.length) {
      const contextSource = make('p');
      setText(contextSource, visibleText(`Economic context supplied by ${economicContext.system} CSV, row ${economicContext.rowId}; columns ${economicContext.columns.join(', ')}; raw cells ${economicContext.raw.map(visibleText).map(value => `“${value}”`).join(', ')}. Unauthenticated.`));
      trail.append(contextSource);
      appendTrace(trail, economicContext.trace, economicContext.system);
    }
    if (economicIssues.length) {
      const contextWarning = make('p');
      setText(contextWarning, 'Economic context requires verification. Review the source-specific conflicts in Items to verify above; these supplied cells cannot clear them.');
      trail.append(contextWarning);
    }
  }
  append(trail);
}

function appendSourceHelp(container, action, append = (...nodes) => container.append(...nodes), setText = (node, text) => { node.textContent = text; }, make = presentationNode) {
  const help = make('details');
  const summary = make('summary');
  setText(summary, 'If I cannot obtain or verify the evidence');
  const text = make('p');
  setText(text, action.kind === 'policy-review'
    ? 'Stop here. The product owner must review the policy and release an updated check. An earlier result cannot be reused; return only after that update.'
    : `Keep this case unresolved. Ask the person authorized to access ${action.source} for the exact subscription, recurring line, or signed order named in this result. If access, current evidence, or the mapping cannot be established, this prototype stops here. It does not authorize renewal, cancellation, or payment.`);
  help.append(summary, text); append(help);
}

function focusRepair(target) {
  if (expireOldResult()) return;
  if (target.endsWith('-answer')) {
    const trail = recordInfo.querySelector('.claim-trail');
    if (!trail) throw new TypeError('Scope evidence review is unavailable');
    openEvidenceView();
    trail.open = true; trail.querySelector('summary').focus(); return;
  }
  const selectors = { 'subscription-id': '#subscription-id', 'pax-file': '#pax-file', 'halo-file': '#halo-file',
    agreement: '#agreement', 'renewal-term': '#renewal-term' };
  const control = document.querySelector(selectors[target] ?? '#missing-repair-target');
  if (!control || control.disabled || !control.getClientRects().length) throw new TypeError('Repair control is unavailable');
  control.focus();
}

function safeRecordRender(callback) {
  try { showRecordResult(callback()); }
  catch (error) {
    // A failed comparison loses authority, while intact source evidence remains
    // inspectable as an unconfirmed candidate (for example, an unreadable Halo CSV).
    revokeCaseSelectionConfirmation(selectionContext?.receipt);
    if (selectionContext) {
      selectionContext.receipt = null;
      try {
        if (expireOldResult() || !selectionContext || !sameControls(subjectControls)) invalidateRecordReview();
        else renderCaseSubject(selectionReview(), selectionContext.file);
      }
      catch { invalidateRecordReview(); }
    }
    currentCase = null;
    // Input invalidation can intentionally hide preflight during a failed
    // comparison. Its cleared result must not receive a new hidden error card.
    if (preflight.hidden || supportHalted) return;
    showRecordResult(inputFailure(error));
  }
}

function repairButton(label, target, setText = (node, text) => { node.textContent = text; }, make = presentationNode) {
  const button = make('button', { type: 'button' }); setText(button, label);
  const serial = recordRenderSerial;
  button.addEventListener('click', guarded(() => {
    if (!usableInteraction(serial)) return;
    try { focusRepair(target); }
    catch (error) { safeRecordRender(() => inputFailure(error)); }
  }));
  return button;
}

function showRecordResult(decision) {
  currentResultValidation = null;
  const owner = { case: currentCase, context: selectionContext, receipt: selectionContext?.receipt,
    controls: controlSnapshot(), currentControls, subjectControls, date: localToday(), node: recordResult };
  decision = captureRecordDecision(decision, currentCase);
  // Expectations come from canonical data before any presentation write.
  const projection = new Map(), elements = new Map(), resultNodes = [], infoNodes = [], structures = [];
  const make = (tag, attributes = {}) => {
    const expected = { tag: tag.toUpperCase(), attributes: { ...attributes } };
    const node = presentationNode(tag, attributes);
    elements.set(node, expected);
    return node;
  };
  const expectStructure = node => {
    const children = [...node.childNodes];
    structures.push({ node, children });
    for (const child of children) expectStructure(child);
  };
  const appendResult = (...nodes) => {
    for (const node of nodes) { resultNodes.push(node); expectStructure(node); }
    recordResult.append(...nodes);
  };
  const present = (node, text, role, parent = recordResult) => {
    if (projection.has(role) || typeof text !== 'string') throw new TypeError('Invalid result projection.');
    projection.set(role, { node, text, tag: node.tagName, parent });
    if (!elements.has(node)) throw new TypeError('Unowned presentation node.');
    elements.get(node).attributes['data-record-projection'] = role;
    node.dataset.recordProjection = role;
    node.textContent = text;
    return node;
  };
  const setText = (node, text) => present(node, text, 'text-' + projection.size, null);
  const repair = (label, target) => repairButton(label, target, setText, make);
  const list = messages => renderList(messages, setText, make);
  const checkProjection = () => {
    // Cap traversal before inventory/style work, including deferred information.
    assertPresentationBudget(recordResult); assertPresentationBudget(recordInfo);
    if (!recordResult.isConnected || recordResult.tagName !== 'SECTION' || recordResult.parentElement !== preflight ||
        document.querySelectorAll('#record-result').length !== 1 || document.querySelector('#record-result') !== recordResult) throw new TypeError('Comparison region ownership changed.');
    const rootAttributes = { id: 'record-result', tabindex: '-1', 'aria-live': 'polite', ...(recordResult.hidden ? { hidden: '' } : {}) };
    if (recordResult.attributes.length !== Object.keys(rootAttributes).length || Object.entries(rootAttributes).some(([name, value]) => recordResult.getAttribute(name) !== value)) throw new TypeError('Comparison region attributes changed before commit.');
    // Keep exact inventories and budgets active when the viewport is minimized;
    // defer geometry until the screen is observable again.
    if (!recordResult.hidden && !preflight.hidden) requireVisibleSubject(recordResult);
    if (!evidencePanels.hidden) requireVisibleSubject(recordInfo);
    if (recordInfo.attributes.length !== 1 || recordInfo.id !== 'record-info' || recordInfo.parentElement !== evidencePanels) throw new TypeError('Comparison information ownership changed.');
    const actualElements = [...recordResult.querySelectorAll('*'), ...recordInfo.querySelectorAll('*')];
    if (actualElements.length !== elements.size || actualElements.some(node => !elements.has(node))) throw new TypeError('Comparison contains unowned elements.');
    for (const [node, expected] of elements) {
      const attributes = { ...expected.attributes, ...(expected.tag === 'DETAILS' && node.open ? { open: '' } : {}) };
      if (node.tagName !== expected.tag || node.attributes.length !== Object.keys(attributes).length ||
          Object.entries(attributes).some(([name, value]) => node.getAttribute(name) !== value)) throw new TypeError('Comparison attributes changed before commit.');
    }
    const expectedTextParents = new Set([...projection.values()].filter(value => value.text.length).map(value => value.node));
    let textCount = 0;
    for (const root of [recordResult, recordInfo]) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!expectedTextParents.has(walker.currentNode.parentElement)) throw new TypeError('Comparison contains unowned text.');
        textCount++;
      }
    }
    if (textCount !== expectedTextParents.size) throw new TypeError('Comparison text inventory changed.');
    if (recordResult.childNodes.length !== resultNodes.length || resultNodes.some((node, i) => recordResult.childNodes[i] !== node) ||
        recordInfo.childNodes.length !== infoNodes.length || infoNodes.some((node, i) => recordInfo.childNodes[i] !== node) ||
        structures.some(({ node, children }) => node.childNodes.length !== children.length || children.some((child, i) => node.childNodes[i] !== child))) throw new TypeError('Comparison structure changed before commit.');
    if (!projection.has('heading') || actualElements.filter(node => node.hasAttribute('data-record-projection')).length !== projection.size ||
        recordInfo.querySelectorAll('h3').length !== 1) throw new TypeError('Comparison projection is incomplete.');
    for (const [role, expected] of projection) {
      const { node, text, tag, parent } = expected;
      const inInfo = recordInfo.contains(node);
      if (!node.isConnected || (parent !== null && node.parentElement !== parent) || (!recordResult.contains(node) && !inInfo) ||
          node.dataset.recordProjection !== role || node.tagName !== tag ||
          actualElements.filter(element => element.dataset.recordProjection === role).length !== 1 ||
          node.textContent !== text || node.childNodes.length !== (text.length ? 1 : 0) || (text.length && node.firstChild.nodeType !== Node.TEXT_NODE) ||
          node.hidden || node.getAttribute('aria-hidden') === 'true' || node.inert ||
          (parent !== null && !(inInfo ? evidencePanels.hidden : recordResult.hidden || preflight.hidden) && !(expected.disclosure && !expected.disclosure.open) && !node.getClientRects().length)) throw new TypeError('Displayed comparison changed before commit.');
    }
  };
  assertNextAction(decision.nextAction);
  const selected = captureSelectedRecord(decision);
  const canonicalReview = ['needs-input-repair', 'technical-error'].includes(decision.status) ? null : assertClaimReview(decision.claimReview, { type: 'record', policyVersion: POLICY_VERSION, today: localToday(), status: decision.status });
  if (canonicalReview && ['record-comparison', 'record-preflight'].includes(canonicalReview.stage)) {
    if (!currentCase || !selected) throw new TypeError('Comparison requires a current selected case.');
    const identity = assertCaseIdentity(decision.caseIdentity, currentCase.pax8Text, currentCase.subscriptionId);
    const traceIdentity = canonicalReview.contributors.identity;
    if (selected.subscriptionId !== identity.subscriptionId ||
        (identity.customerRef !== null && selected.customerRef !== identity.customerRef) ||
        selected.subscriptionId !== traceIdentity.subscriptionId ||
        selected.customerRef !== traceIdentity.paxCustomerRef || selected.haloLineId !== traceIdentity.haloLineId) {
      throw new TypeError('Displayed comparison identity does not match the selected case and claim trail.');
    }
  } else if (selected !== null) {
    throw new TypeError('A blocked comparison cannot display selected record identity.');
  }
  const serial = ++recordRenderSerial;
  const checkCommit = (visible = false) => {
    assertSupportBoundary();
    if (serial !== recordRenderSerial || currentCase !== owner.case || selectionContext !== owner.context ||
        currentControls !== owner.currentControls || subjectControls !== owner.subjectControls ||
        selectionContext?.receipt !== owner.receipt || localToday() !== owner.date || !sameControls(owner.controls) ||
        !owner.node.isConnected || document.querySelectorAll('#record-result').length !== 1 ||
        document.querySelector('#record-result') !== owner.node) throw new TypeError('Comparison changed before its visible commit.');
    checkProjection();
    if (owner.context) selectionReview();
    if (owner.case) captureCaseHandoff(decision, owner.case.pax8Text, owner.case.subscriptionId, owner.receipt);
  };
  const commit = () => {
    // Workflow inputs/actions and informational projections have separate owners.
    // Move existing owned nodes; never clone controls, claims or native evidence.
    const actions = [...recordResult.querySelectorAll('button')];
    actions.forEach(button => button.remove());
    infoNodes.push(...recordResult.childNodes);
    recordInfo.replaceChildren(...infoNodes);
    resultNodes.length = 0; resultNodes.push(...actions); recordResult.replaceChildren(...actions);
    for (const expected of projection.values()) if (expected.parent === recordResult) expected.parent = recordInfo;
    structures.length = 0;
    for (const node of [...resultNodes, ...infoNodes]) expectStructure(node);
    recordResult.hidden = actions.length === 0;
    recordSubmit.hidden = actions.length > 0;
    checkCommit();
    if (actions.length) actions[0].focus();
    checkCommit(true);
    currentResultValidation = checkProjection;
  };
  const selection = currentCase ? selectionReview() : null;
  if (currentCase) {
    captureCaseHandoff(decision, currentCase.pax8Text, currentCase.subscriptionId, selectionContext.receipt);
    selectionReview();
    if (!sameControls(currentControls)) throw new TypeError('Comparison handoff controls changed during validation.');
  }
  if (selection && !selection.canConfirm && !['needs-input-repair', 'technical-error', 'policy-review-required', 'needs-record-identity', 'needs-record-link-review'].includes(decision.status)) {
    recordResult.replaceChildren();
    const heading = make('h3'); present(heading, 'Resolve case selection uncertainty', 'heading');
    const message = make('p'); present(message, 'Case progression is blocked. Correct the source identity or renewal occurrence described in Current case using the original Pax8 record, then rerun. Comparison claims cannot resolve selection uncertainty.', 'uncertainty');
    appendResult(heading, message, repair('Review or replace Pax8 CSV', 'pax-file'), repair('Correct subscription ID', 'subscription-id')); commit(); return;
  }
  if (selection && selection.status !== 'confirmed' && !['needs-input-repair', 'technical-error', 'policy-review-required', 'needs-record-identity', 'needs-record-link-review', 'needs-record-link-confirmation'].includes(decision.status)) throw new TypeError('Case confirmation is required before progression.');
  const headings = {
    'supplied-claims-look-in-scope': 'Supplied records look in scope provisionally',
    'needs-verification': 'More evidence is needed',
    'needs-conflict-review': 'Resolve conflicting claims',
    'policy-review-required': 'Scope rules need review',
    'outside-this-release': 'Supplied information indicates outside this release',
    'needs-record-link-review': 'Confirm the record link',
    'needs-record-link-confirmation': 'Confirm these records describe the same case',
    'needs-record-identity': 'Select one subscription',
    'needs-input-repair': 'Repair the supplied input',
    'technical-error': 'The check could not finish',
  };
  if (!headings[decision.status]) throw new TypeError('Unknown record result');
  recordResult.replaceChildren();
  const heading = make('h3');
  present(heading, headings[decision.status], 'heading');
  appendResult(heading);
  if (currentCase) {
    const carried = make('p');
    elements.get(carried).attributes['data-case-handoff'] = '';
    carried.dataset.caseHandoff = '';
    const subject = selection.subject;
    present(carried, visibleText(`Selection carried forward: ${selection.status}. ${subject ? `Supplied Pax8 record ${subject.recordNumber}, subscription ${subject.subscriptionId}, customer ${subject.customerRef ?? 'unresolved'}, renewal ${subject.renewalDate ?? 'unresolved'}.` : 'Source identity is unresolved.'} Selection does not establish eligibility, the HaloPSA link, or financial coverage.`), 'selection');
    appendResult(carried);
  }

  if (decision.checkedToday) {
    const checked = make('p');
    present(checked, visibleText(`Checked using this device’s local calendar date: ${decision.checkedToday}.`), 'date');
    appendResult(checked);
  }
  if (decision.renewalTerm) {
    const reportedTerm = make('p');
    const label = { annual: 'annual', monthly: 'monthly', other: 'another term or product', unknown: 'not confirmed', 'not-asked': 'not answered' }[decision.renewalTerm];
    present(reportedTerm, visibleText(decision.renewalTerm === 'not-asked'
      ? 'No next commitment term answer was collected. The next term remains unestablished.'
      : `Next commitment term response for Pax8 Manage renewal: ${label}. This answer is self-reported, not verified by the uploaded files.`), 'term');
    appendResult(reportedTerm);
  }
  for (const [title, items] of [
    ['Record link to fix', decision.linkIssues ?? []], ['Outside-scope conditions', decision.errors], ['Items to verify', decision.verify],
  ]) {
    if (!items.length) continue;
    const label = make('h4');
    setText(label, title);
    appendResult(label, list(items));
  }
  appendClaimReview(recordResult, canonicalReview, appendResult, setText, make);
  if (decision.informedUnknowns?.length) {
    const label = make('h4');
    setText(label, 'Facts supplied by records');
    appendResult(label, list(decision.informedUnknowns.map((item) =>
      `${item.key}: no opening answer was collected; supplied ${item.system} row ${item.rowId} says “${item.fileValue}”. This remains an unauthenticated file claim.`)));
  }
  if (decision.conflicts?.length) {
    const label = make('h4');
    setText(label, 'Conflicting claims');
    appendResult(label);
    for (const conflict of decision.conflicts) {
      const section = make('div', { class: 'conflict', 'data-resolution': conflict.resolution });
      const description = make('p');
      setText(description, visibleText(`${conflict.key}: you answered “${conflict.questionnaire}”; supplied ${conflict.system} row ${conflict.rowId} (${conflict.columns.join(', ')}) says “${conflict.fileValue}”.`));
      section.append(description);
      const state = make('p');
      setText(state, conflict.resolution === 'accept-file' ? 'You accepted the supplied file value for this check. It remains unauthenticated.' :
        conflict.resolution === 'keep-answer' ? 'You kept your answer. Updated source evidence is required.' : 'Unresolved: no positive result is available.');
      section.append(state);
      if (currentCase && !['needs-record-link-review', 'needs-record-link-confirmation', 'policy-review-required'].includes(decision.status)) {
        for (const [value, text] of [
          ['accept-file', `Use supplied ${conflict.system} value for ${conflict.key}`],
          ['keep-answer', `Keep my answer for ${conflict.key}; obtain corrected evidence`],
        ]) {
          const button = make('button', { type: 'button', 'aria-pressed': String(conflict.resolution === value) });
          setText(button, text);
          button.addEventListener('click', guarded(() => {
            if (!usableInteraction(serial) || !currentCase) return;
            currentCase.resolutions[conflict.key] = { choice: value, questionnaire: conflict.questionnaire, fileValue: conflict.fileValue, basis: decision.reviewBasis };
            safeRecordRender(() => inspectCurrentCase({ ...currentCase, resolutions: currentCase.resolutions }));
          }));
          section.append(button);
        }
      }
      appendResult(section);
    }
  }
  if (selected) {
    const match = make('p');
    present(match, visibleText(`Selected Pax8 subscription ${selected.subscriptionId}; HaloPSA line ${selected.haloLineId}; customer reference ${selected.customerRef}.`), 'selected');
    appendResult(match);
  }
  if (decision.status === 'needs-record-link-confirmation' && currentCase) {
    const explanation = make('p');
    present(explanation, 'This attestation confirms both the intended source case (supplied account, customer, subscription and renewal occurrence shown above) and the HaloPSA link. It does not authenticate sources or authorize a financial action.', 'link');
    appendResult(explanation);
    const confirm = make('button', { type: 'button' });
    setText(confirm, 'I checked this subscription, line, and customer in the original systems');
    confirm.addEventListener('click', guarded(() => {
      if (!usableInteraction(serial) || !currentCase) return;
      if (!selectionReview().canConfirm) return;
      confirmCurrentSelection();
      currentCase.linkConfirmation = { confirmed: true, basis: decision.reviewBasis };
      safeRecordRender(() => inspectCurrentCase());
    }));
    appendResult(confirm);
  }
  if (decision.caveat) {
    const caveat = make('p');
    const legacyPrefix = 'Questionnaire answers and the next-term selection are self-reported.';
    if (!decision.caveat.startsWith(legacyPrefix)) throw new TypeError('Record evidence caveat has changed.');
    const adapterCaveat = 'No opening questionnaire answers were collected. Optional record-stage answers, when supplied, are self-reported.' + decision.caveat.slice(legacyPrefix.length);
    present(caveat, adapterCaveat, 'caveat');
    appendResult(caveat);
  }
  const action = decision.nextAction;
  const actionRegion = make('div', { id: 'record-next-action' });
  const actionDetails = make('details'), actionSummary = make('summary'); setText(actionSummary, 'Action details');
  const actionText = make('p'); present(actionText, visibleText(`Next action — ${action.instruction}`), 'action', actionDetails);
  projection.get('action').disclosure = actionDetails;
  actionDetails.append(actionSummary, actionText); expectStructure(actionDetails);
  actionRegion.append(actionDetails);
  const labels = { 'edit-subscription-id': 'Correct subscription ID', 'repair-record-link': 'Replace or correct supplied records',
    'verify-source': 'Update the item to verify', 'repair-input': 'Correct the supplied input', 'correct-or-stop': 'Correct the outside-scope item' };
  if (action.target === 'both-files') {
    actionRegion.append(repair('Review or replace Pax8 CSV', 'pax-file'), repair('Review or replace HaloPSA CSV', 'halo-file'));
  } else if (action.target) {
    actionRegion.append(repair(labels[action.kind], action.target));
    if (decision.status === 'needs-record-identity' && action.target === 'pax-file') actionRegion.append(repair('Correct subscription ID', 'subscription-id'));
  } else if (action.kind === 'resolve-conflict') {
    const review = make('button', { type: 'button' }); setText(review, 'Review first unresolved conflict');
    review.addEventListener('click', guarded(() => {
      if (!usableInteraction(serial)) return;
      const control = recordResult.querySelector('button[aria-pressed="false"]');
      if (control) control.focus(); else safeRecordRender(() => { throw new TypeError('Conflict repair is unavailable'); });
    })); actionRegion.append(review);
  }
  // Put the primary instruction before lengthy provenance, while keeping all issues visible.
  resultNodes.splice(1, 0, actionRegion); expectStructure(actionRegion);
  heading.after(actionRegion);
  appendSourceHelp(recordResult, action, appendResult, setText, make);
  commit();
}

clearRecords.addEventListener('click', () => {
  try { clearRecordData(); if (!supportHalted) guarded(() => selectedInputs.get('pax-file').focus())(); }
  catch { stopUnexpected(); }
});
// Revoke the old native occurrence before presentation guards inspect the
// changed page. The unchanged role keeps its current original.
for (const [role, input] of selectedInputs) {
input.addEventListener('cancel', () => {
  if (supportHalted) { try { clearRecordData(); } catch { /* Already halted. */ } return; }
  try {
    if (!fileHandling.observeDismissal(role)) {
      currentResultValidation = null;
      originalEvidenceView?.removeRole(role);
      invalidateRecordReview(role !== 'pax-file' && Boolean(finderContext));
    }
  } catch { stopUnexpected(); }
});
input.addEventListener('change', () => {
  if (supportHalted) { try { clearRecordData(); } catch { /* Already halted. */ } return; }
  try {
    fileHandling.select(role);
    currentResultValidation = null;
    originalEvidenceView?.removeRole(role);
    invalidateRecordReview(role !== 'pax-file' && Boolean(finderContext));
  } catch { stopUnexpected(); }
});
}
recordForm.addEventListener('change', guarded((event) => {
  if (preflight.hidden) return;
  if (event.target.closest('[data-case-finder]')) return;
  const paxChanged = event.target.id === 'pax-file';
  const assertionEdit = ['renewalTerm', 'agreement'].includes(event.target.name);
  const editedValue = event.target.value;
  const retainedFinder = !paxChanged && finderContext;
  const interruptedDiscovery = Boolean(finderBasis && !finderContext);
  invalidateRecordReview(Boolean(retainedFinder));
  if (assertionEdit && hasCaseHistory) {
    event.target.value = editedValue;
    recordAssertionBasis = { id: document.querySelector('#subscription-id').value, file: document.querySelector('#pax-file').files[0] };
  }
  clearRecords.hidden = !document.querySelector('#pax-file').files.length && !document.querySelector('#halo-file').files.length;
  if (retainedFinder) { finderBasis = controlSnapshot(); renderFinder(); }
  else if (document.querySelector('#pax-file').files[0] && (interruptedDiscovery || ['pax-file', 'halo-file'].includes(event.target.id))) findCases();
}));
recordForm.addEventListener('reset', () => { try { clearRecordData(); } catch { stopUnexpected(); } });
// Stopping cannot grant source/result authority. Terminate first; the existing
// focus and mutation guards still validate any retained view after invalidation.
// A large disclosure must not delay cancellation through a pre-publication guard.
document.querySelector('#cancel-read').addEventListener('click', () => {
  if (supportHalted) return;
  try { invalidateRecordReview(); recordSubmit.focus(); }
  catch { stopUnexpected(); }
});
document.querySelector('#subscription-id').addEventListener('input', guarded(() => {
  if (preflight.hidden) return;
  const interruptedDiscovery = Boolean(finderBasis && !finderContext);
  invalidateRecordReview(Boolean(finderContext));
  if (finderContext) { finderBasis = controlSnapshot(); renderFinder(); }
  else if (interruptedDiscovery && document.querySelector('#pax-file').files[0]) findCases();
}));
for (const event of ['change', 'keyup', 'blur']) document.querySelector('#subscription-id').addEventListener(event, guarded(() => {
  if ((selectionContext && document.querySelector('#subscription-id').value !== selectionContext.id) ||
      (recordAssertionBasis && document.querySelector('#subscription-id').value !== recordAssertionBasis.id)) invalidateRecordReview();
}));
recordForm.addEventListener('submit', guarded(async (event) => {
  event.preventDefault();
  if (preflight.hidden) return;
  if (expireOldResult()) return;
  timeWarning.hidden = true;
  if (finderDiscovery?.badDates) {
    invalidateRecordReview(true);
    document.querySelector('#finder-status').focus();
    return;
  }
  invalidateRecordReview();
  const run = preflightRun;
  const capturedControls = controlSnapshot();
  const capturedAnswers = answers();
  const capturedId = document.querySelector('#subscription-id').value;
  const capturedTerm = new FormData(recordForm).get('renewalTerm') || 'not-asked';
  recordSubmit.disabled = true;
  recordResult.hidden = true;
  document.querySelector('#read-status').hidden = false;
  let unpublishedEvidence = null;
  try {
    const [paxFile, haloFile] = capturedControls.files;
    const paxEvidence = await readLocalEvidence(paxFile, 'pax-file', SOURCES.pax); unpublishedEvidence = paxEvidence;
    assertSupportBoundary();
    if (run !== preflightRun) return;
    if (expireOldResult()) return;
    if (!sameControls(capturedControls)) { changedControlsStop(); return; }
    originalEvidenceView.commit(paxEvidence, 'pax-file', paxFile); unpublishedEvidence = null;
    if (paxEvidence.problem) throw paxEvidence.problem;
    const pax8Text = paxEvidence.text;
    const subject = assertCaseSubject(selectCaseSubject(pax8Text, capturedId), pax8Text, capturedId);
    if (subject.subject) bindRecordAssertions(capturedId, paxFile);
    renderCaseSubject(subject, paxFile, pax8Text);
    subjectControls = capturedControls;
    selectionContext = { text: pax8Text, id: capturedId, file: paxFile, receipt: null };
    const haloEvidence = await readLocalEvidence(haloFile, 'halo-file', SOURCES.halo); unpublishedEvidence = haloEvidence;
    assertSupportBoundary();
    if (run !== preflightRun) return;
    if (expireOldResult()) return;
    if (!sameControls(capturedControls)) { changedControlsStop(); return; }
    originalEvidenceView.commit(haloEvidence, 'halo-file', haloFile); unpublishedEvidence = null;
    if (haloEvidence.problem) throw haloEvidence.problem;
    const haloText = haloEvidence.text;
    currentControls = capturedControls;
    currentCase = {
      pax8Text, haloText,
      subscriptionId: capturedId,
      today: localToday(), answers: capturedAnswers,
      renewalTerm: capturedTerm,
      resolutions: {}, linkConfirmation: null,
    };
    safeRecordRender(() => inspectCurrentCase());
  } catch (error) {
    if (run === preflightRun) {
      if (expireOldResult()) return;
      if (!sameControls(capturedControls)) { changedControlsStop(); return; }
      if (error instanceof FileEvidenceRuntimeError) throw error;
      if (!subjectControls) {
        const regions = document.querySelectorAll('#case-subject');
        regions.forEach(region => region.replaceChildren());
        if (regions.length === 1) renderCaseSubject();
      }
      currentCase = null; currentControls = capturedControls; showRecordResult(inputFailure(error));
    }

  } finally {
    releaseFileEvidence(unpublishedEvidence?.handle);
    if (run === preflightRun) { recordSubmit.disabled = false; document.querySelector('#read-status').hidden = true; updatePolicyAccess(); }
  }
}));

document.querySelector('#open-file-guide').addEventListener('click', guarded((event) => {
  event.preventDefault();
  if (preflight.hidden) return;
  invalidateRecordReview(); preflight.hidden = true; fileGuide.hidden = false;
  document.querySelector('#close-file-guide').focus();
}));
document.querySelector('#close-file-guide').addEventListener('click', guarded((event) => {
  event.preventDefault();
  if (fileGuide.hidden) return;
  fileGuide.hidden = true; preflight.hidden = false;
  document.querySelector('#open-file-guide').focus(); updatePolicyAccess();
}));

function openEvidenceView() {
  expireOldResult();
  const state = processingState();
  if (state.activeJobs || state.reservedBytes) invalidateRecordReview();
  document.querySelector('#read-status').hidden = true;
  document.querySelector('#cancel-case-finder').hidden = true;
  preflight.hidden = true; evidencePanels.hidden = false;
  document.querySelector('#close-evidence').focus();
}
evidenceOpener.addEventListener('click', guarded((event) => {
  event.preventDefault();
  if (preflight.hidden) return;
  openEvidenceView();
}));
document.querySelector('#close-evidence').addEventListener('click', guarded((event) => {
  event.preventDefault();
  if (evidencePanels.hidden) return;
  expireOldResult();
  evidencePanels.hidden = true; preflight.hidden = false; evidenceOpener.focus();
}));

recordForm.noValidate = true;
guarded(() => {
  assertFileRuntime();
  const support = document.querySelector('#file-support-contract');
  const projection = supportProjection();
  document.querySelector('#read-status [role="status"]').textContent = projection.controlReadStatus;
  support.replaceChildren();
  for (const item of glossaryProjection()) {
    const row = document.createElement('div'), term = document.createElement('dt'), definition = document.createElement('dd');
    term.textContent = item.term; definition.textContent = item.definition;
    row.append(term, definition); support.append(row);
  }
  for (const profile of FILE_SUPPORT.profiles) {
    document.getElementById(profile.target).accept = FILE_SUPPORT.pickerAccept;
  }
  supportNodes = Object.fromEntries(['file-support-contract', 'file-support-title', 'pax-file', 'halo-file', 'read-status', 'read-status-message', 'cancel-read'].map(id => [id, document.getElementById(id)]));
  originalEvidenceView = createOriginalEvidenceView(document.getElementById('original-evidence'), {
    guarded, getFile: role => document.getElementById(role).files[0], active: () => !evidencePanels.hidden,
  });
  clearRecordData(); // Never inherit browser-restored native selections.
  assertSupportBoundary();
  new MutationObserver(() => {
    if (supportHalted) return;
    try { assertSupportBoundary(); } catch { stopUnexpected(); }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  document.querySelector('#runtime-warning').hidden = true;
  resultCheckedDate = localToday();
  updatePolicyAccess();
})();
