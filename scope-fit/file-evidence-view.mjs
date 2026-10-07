// A view binding only. File custody, lexical fidelity and case authority have separate owners.
import { sourceProjection, assertSourceProjection, sourceMatches, sourceText, originalBytes, releaseFileEvidence } from './file-evidence.mjs';
import { visibleText, exactTextJson } from './input.mjs';
import { assertLocalEvidence } from './runtime.mjs';
import { FILE_SUPPORT } from './file-support.mjs';
import { assertPresentationBudget } from './resource-packet.mjs';

const roles = ['pax-file', 'halo-file'];
const label = role => role === 'pax-file' ? 'Pax8' : 'HaloPSA';
export const observableViewport = () => innerWidth > 1 && innerHeight > 1;
function snapshotPresentation(root) {
  const clone = root.cloneNode(true);
  for (const node of clone.querySelectorAll('details')) node.removeAttribute('open');
  return clone.innerHTML;
}
function presentation(root, isActive = false) {
  assertPresentationBudget(root);
  qualifiedCovers(root, isActive, node => getComputedStyle(node));
  return snapshotPresentation(root);
}
function excerpt(text, limit = 1024) {
  let end = Math.min(text.length, limit);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
  return exactTextJson(text.slice(0, end)) + (end < text.length ? ` (first ${end} of ${text.length} UTF-16 code units; recover the original for the remainder)` : '');
}
const rangeText = field => `UTF-16 ${field.startOffset}–${field.endOffset}; original UTF-8 bytes ${field.startByte}–${field.endByte} (ends exclusive)`;
const color = value => {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value);
  if (!match) throw new TypeError('Original evidence uses an unsupported screen color.');
  const result = match.slice(1, 4).map(Number); result.push(match[4] === undefined ? 1 : Number(match[4]));
  if (result.some((n, i) => !Number.isFinite(n) || n < 0 || n > (i === 3 ? 1 : 255))) throw new TypeError('Original evidence has an invalid screen color.');
  return result;
};
const blend = (front, back, alpha = front[3]) => front.slice(0, 3).map((n, i) => n * alpha + back[i] * (1 - alpha));
const luminance = rgb => rgb.map(n => { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
// A closed native disclosure may defer its contents, never its recovery opener.
export function assertReadableInspectionOpener(node) {
  const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0 || bounds.right <= 0 || bounds.left >= innerWidth) throw new TypeError('Evidence inspection is unreachable.');
  const range = document.createRange(); range.selectNodeContents(node);
  const chain = []; let opacity = 1;
  for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
    const css = getComputedStyle(ancestor), outer = ancestor.getBoundingClientRect(); chain.push(css); opacity *= Number(css.opacity);
    if (ancestor.hidden || ancestor.inert || ancestor.getAttribute('aria-hidden') === 'true' || css.display === 'none' || css.visibility !== 'visible' ||
        css.contentVisibility === 'hidden' || css.clipPath !== 'none' || css.clip !== 'auto' || css.maskImage && css.maskImage !== 'none' ||
        css.transform !== 'none' || css.filter !== 'none' || css.textIndent !== '0px' || css.pointerEvents === 'none' || css.backgroundImage !== 'none') throw new TypeError('Evidence inspection is hidden or unavailable.');
    for (const box of range.getClientRects()) if (['hidden','clip'].includes(css.overflowX) && (box.left < outer.left - 1 || box.right > outer.right + 1) ||
        ['hidden','clip'].includes(css.overflowY) && (box.top < outer.top - 1 || box.bottom > outer.bottom + 1)) throw new TypeError('Evidence inspection is clipped.');
  }
  const size = parseFloat(style.fontSize), line = parseFloat(style.lineHeight);
  if (!Number.isFinite(opacity) || opacity < 0.9 || size < 12 || Number.isFinite(line) && line < size * 0.8 ||
      style.webkitTextFillColor && style.webkitTextFillColor !== style.color) throw new TypeError('Evidence inspection is unreadable.');
  let background = [255,255,255];
  for (const css of chain.reverse()) background = blend(color(css.backgroundColor), background);
  const foreground = color(style.color), effective = blend(foreground, background, foreground[3] * opacity);
  const first = luminance(effective), second = luminance(background);
  if ((Math.max(first,second) + 0.05) / (Math.min(first,second) + 0.05) + 0.001 < (size >= 24 || size >= 18.67 && Number(style.fontWeight) >= 700 ? 3 : 4.5)) throw new TypeError('Evidence inspection contrast is insufficient.');
  const covers = qualifiedCovers(node, true, item => getComputedStyle(item));
  for (const box of range.getClientRects()) {
    const left = Math.max(0,box.left), right = Math.min(innerWidth,box.right), top = Math.max(0,box.top), bottom = Math.min(innerHeight,box.bottom);
    if (right - left < 1 || bottom - top < 1) continue;
    if (covers.some(cover => { const outer = cover.getBoundingClientRect(); return outer.left < right && outer.right > left && outer.top < bottom && outer.bottom > top && paintsAbove(cover,node,item=>getComputedStyle(item)); })) throw new TypeError('Evidence inspection is covered.');
    for (const fraction of [0.2,0.5,0.8]) {
      const hit = document.elementFromPoint(left + (right-left)*fraction,(top+bottom)/2);
      if (!hit || !node.contains(hit) && !hit.contains(node)) throw new TypeError('Evidence inspection is obscured.');
    }
  }
}
function paintsAbove(cover, text, css) {
  const contexts = node => {
    const chain = []; for (let n = node; n; n = n.parentElement) chain.unshift(n);
    return chain.filter(n => {
      const s = css(n), parent = n.parentElement && css(n.parentElement);
      return n === document.documentElement || ['fixed','sticky'].includes(s.position) ||
        s.zIndex !== 'auto' && (s.position !== 'static' || parent && /flex|grid/.test(parent.display)) ||
        Number(s.opacity) !== 1 || s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none' ||
        s.isolation === 'isolate' || /paint|layout|strict|content/.test(s.contain) || /transform|opacity|filter/.test(s.willChange);
    });
  };
  const a = contexts(cover), b = contexts(text); let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const first = a[i], second = b[i], az = first ? Number(css(first).zIndex) || 0 : 0, bz = second ? Number(css(second).zIndex) || 0 : 0;
  if (az !== bz) return az > bz;
  // A positioned zero-level context paints after its normal-flow parent content.
  if (!second && first) return az >= 0;
  if (!first && second) return bz < 0;
  return Boolean(first && second && (second.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING));
}

function qualifiedCovers(root, isActive, css) {
  let coverCount = 0;
  const covers = isActive ? [...document.documentElement.querySelectorAll('*')].filter(node => {
      if (root.contains(node) || node.contains(root)) return false;
      const style = css(node);
      if (!['fixed','absolute','sticky'].includes(style.position) || !(Number(style.zIndex) > 0) || style.visibility !== 'visible') return false;
      let opacity = 1;
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const s = css(ancestor); opacity *= Number(s.opacity);
        // visibility can be restored by a child; display suppression cannot.
        if (s.display === 'none') return false;
      }
      const candidate = opacity >= 0.9 && (opacity * color(style.backgroundColor)[3] >= 0.9 || style.backgroundImage !== 'none');
      if (candidate && ++coverCount > FILE_SUPPORT.limits.opaqueCovers) throw new TypeError('Presentation exceeds its opaque cover budget.');
      return candidate;
    }) : [];
  return covers;

}

export function createOriginalEvidenceView(root, { guarded, getFile, active }) {
  const sources = new Map(), urls = new Set();
  let recoveryHalted = false;
  function retireURL(url) {
    try { URL.revokeObjectURL(url); urls.delete(url); }
    catch (error) { recoveryHalted = true; throw error; }
    if (!urls.size) recoveryHalted = false;
  }
  const contracts = new WeakMap(), actions = new WeakMap(), attempts = new WeakMap();
  let displayedFiles = new Map();
  const element = (tag, text) => {
    const contract = { tag: tag.toUpperCase(), attributes: {}, text: text ?? null, children: [], onclick: null };
    const node = document.createElement(tag); contracts.set(node, contract);
    if (text !== undefined) node.textContent = text;
    const nativeAppend = node.append;
    node.append = (...children) => { contract.children.push(...children); nativeAppend.call(node, ...children); };
    return node;
  };
  const attributes = (node, values) => {
    const contract = contracts.get(node);
    for (const [key,value] of Object.entries(values)) { contract.attributes[key] = String(value); node.setAttribute(key,value); }
  };
  function validateNode(node) {
    const contract = contracts.get(node);
    if (!contract || node.onclick !== contract.onclick || node.tagName !== contract.tag || Object.entries(contract.attributes).some(([key,value])=>node.getAttribute(key)!==value) ||
        [...node.attributes].some(attribute=>!Object.hasOwn(contract.attributes,attribute.name) && !(node.tagName==='DETAILS'&&attribute.name==='open'))) throw new TypeError('Original evidence element differs from its independent rendering contract.');
    if (contract.text !== null) {
      if (node.textContent !== contract.text || node.childNodes.length !== (contract.text.length ? 1 : 0) || contract.text.length && node.firstChild.nodeType !== Node.TEXT_NODE) throw new TypeError('Original evidence text differs from its independent rendering contract.');
    } else if (node.childNodes.length !== contract.children.length || contract.children.some((child,index)=>node.childNodes[index]!==child)) throw new TypeError('Original evidence structure differs from its independent rendering contract.');
    for (const child of contract.children) validateNode(child);
  }
  const target = root.querySelector('#original-evidence-sources');
  const heading = root.querySelector('#original-evidence-title');
  let expected, nodes, expectedChildren = [];
  function remember() { expected = presentation(root, active()); nodes = [root, ...root.querySelectorAll('*')]; }
  function discard(role) {
    const binding = sources.get(role); sources.delete(role); displayedFiles.delete(role); releaseFileEvidence(binding?.handle);
  }
  function action(node, callback) {
    const handler = guarded(event => {
      if (!active()) throw new TypeError('Open the current evidence inspection before using its controls.');
      const attempt = attempts.get(event); if (attempt) attempt.completed = true;
      if (!node.isConnected || !root.contains(node)) throw new TypeError('Original evidence action is no longer connected.');
      assertCurrent(); callback(); assertCurrent();
    });
    contracts.get(node).onclick = handler; actions.set(node, handler); node.onclick = handler;
  }
  // This independent observer detects delivery loss after it receives an event.
  // It cannot certify earlier suppression, a compromised runtime or native writes.
  const observeOwnedAction = guarded(event => {
    if (!active()) throw new TypeError('Open the current evidence inspection before using its controls.');
    assertCurrent();
    const attempt = { completed: false }; attempts.set(event, attempt);
    // Native event delivery may checkpoint microtasks between callbacks. A new
    // task observes completed dispatch without falsely stopping a genuine click.
    setTimeout(guarded(() => { if (!attempt.completed) throw new TypeError('Original evidence action was not delivered.'); }), 0);
  });
  // Unrelated controls, especially Cancel, must not wait for view validation.
  window.addEventListener('click', event => {
    const node = event.composedPath().find(item => actions.has(item));
    if (node && root.contains(node)) observeOwnedAction(event);
  }, true);
  function build(role, binding) {
    const details = element('details'); attributes(details, { id: 'original-' + role });
    const summary = element('summary', `Inspect supplied ${label(role)} original`); details.append(summary);
    if (!binding) { details.append(element('p', 'A verified local original copy is unavailable. Read this selected file to capture its evidence.')); return details; }
    const p = assertSourceProjection(sourceProjection(binding.handle, role, binding.offset), binding.handle, role, binding.offset);
    binding.projection = p;
    const paragraph = text => { const node = element('p', text); attributes(node, { style: 'overflow-wrap: anywhere;' }); details.append(node); return node; };
    paragraph(`Supplied filename (display metadata): ${p.metadata.name.length > 1024 ? excerpt(visibleText(p.metadata.name), 1024) : visibleText(p.metadata.name || '(empty)')}. Role: ${label(role)}. Original bytes: ${p.byteLength}.`);
    const identity = paragraph(`SHA-256 of exact original bytes: ${p.sha256}`); attributes(identity, { class: 'original-content-identity' });
    paragraph('This identity establishes local byte fidelity only. Source authenticity, freshness, profile support, case confirmation and financial permission are not established. No upload or browser storage occurs.');
    paragraph(binding.problem ? `Input problem: ${visibleText(binding.problem)}. This original copy does not make the file compatible.` : 'Normalized-profile reading completed. Original-byte preservation does not approve a case or action.');
    paragraph(`Decoded derivative: ${p.decoding}. ${p.encodingProblem ? visibleText(p.encodingProblem) : `CSV lexical scan ${p.lexicalComplete ? 'complete' : 'partial; no selectable success'}. ${p.recordCount} retained records; ${p.sourceRecordCount} completed lexical records, including ${p.emptyRecordCount} completely empty records in ${p.emptyRunCount} runs.`}`);
    if (p.failure) paragraph(`Known lexical failure: ${visibleText(p.failure.message)}. ${p.failure.startOffset === null ? 'No valid text coordinate is available.' : rangeText(p.failure)}. Only completed prefix records can be previewed.`);
    paragraph('Save requests an exact original copy. Confirm the completed download in your browser; this page cannot confirm that the operating system saved the file.');
    const save = element('button', `Save original ${label(role)} copy`); attributes(save, { type: 'button', class: 'save-original' });
    action(save, () => {
      if (recoveryHalted || urls.size) throw new TypeError('Original recovery cleanup is incomplete. Reload before saving again.');
      const assertRecovery = () => {
        assertCurrent();
        if (sources.get(role) !== binding || !sourceMatches(binding.handle, role, getFile(role))) throw new TypeError('Original recovery is no longer current.');
        assertSourceProjection(binding.projection, binding.handle, role, binding.offset);
      };
      assertRecovery();
      let url;
      try {
        const blob = new Blob([originalBytes(binding.handle, role)], { type: 'application/octet-stream' });
        url = URL.createObjectURL(blob); urls.add(url);
        if (typeof url !== 'string' || !url.startsWith('blob:' + location.origin + '/')) throw new TypeError('Original recovery did not produce a local blob URL.');
        const link = element('a'); attributes(link, { href: url, download: `original-${role === 'pax-file' ? 'pax8' : 'halopsa'}-${p.sha256.slice(0, 12)}.bin` });
        assertRecovery(); validateNode(link); link.click(); assertRecovery();
      } finally {
        if (url) retireURL(url);
      }
    });
    details.append(save);
    if (p.recordCount) {
      paragraph(`Positional preview: retained records ${p.offset + 1}–${Math.min(p.offset + p.pageSize, p.recordCount)} of ${p.recordCount}; at most ${p.pageSize} per page. Header and blank/duplicate column positions are evidence, not a valid profile. Text previews are bounded; Save original copy recovers every byte.`);
      for (const record of p.records) {
        const section = element('details'); attributes(section, { class: 'original-record' });
        section.append(element('summary', `Lexical source record ${record.sourceRecordOrdinal}; ${record.dataRecordNumber === null ? 'first retained record / prospective header' : `data record ${record.dataRecordNumber}`}`));
        section.append(element('p', rangeText(record) + `. Terminator ${exactTextJson(record.terminator)} at ${rangeText(record.terminatorLocation)}.`));
        const original = element('pre', 'Exact record JSON: ' + excerpt(record.originalRecord, 4096)); attributes(original, { style: 'white-space: pre-wrap; overflow-wrap: anywhere;' }); section.append(original);
        for (const cell of record.cells) {
          const field = element('section'); attributes(field, { class: 'original-cell', 'data-column': String(cell.columnIndex) });
          field.append(element('h4', `Column ${cell.columnIndex}; positional header ${excerpt(p.headers[cell.columnIndex - 1]?.rawValue ?? '(not supplied)')}`));
          field.append(element('p', rangeText(cell)));
          const header = p.headers[cell.columnIndex - 1];
          if (header) field.append(element('p', 'Header lexeme location: ' + rangeText(header)));
          const text = element('pre', `Lexeme JSON: ${excerpt(cell.lexeme)}\nRaw decoded JSON: ${excerpt(cell.rawValue)}\nTrimmed JSON: ${excerpt(cell.normalizedValue)}`);
          attributes(text, { style: 'white-space: pre-wrap; overflow-wrap: anywhere;' }); field.append(text); section.append(field);
        }
        details.append(section);
      }
      const move = (title, offset) => {
        const button = element('button', `${title} ${label(role)} evidence page`); attributes(button, { type: 'button', 'data-page-direction': title });
        action(button, () => {
          assertCurrent(); if (sources.get(role) !== binding) throw new TypeError('Evidence page is stale.');
          binding.offset = offset; render();
          const current = target.querySelector('#original-' + role); current.open = true;
          (current.querySelector(`[data-page-direction="${title}"]`) ?? current.querySelector('summary')).focus(); assertCurrent();
        });
        details.append(button);
      };
      if (p.offset > 0) move('Previous', Math.max(0, p.offset - p.pageSize));
      if (p.offset + p.pageSize < p.recordCount) move('Next', p.offset + p.pageSize);
    }
    if (p.emptyRunCount) {
      paragraph(`Empty-run preview: first ${p.emptyRuns.length} of ${p.emptyRunCount} counted runs. Omitted runs remain in the original; this display does not show every run.`);
      for (const run of p.emptyRuns) paragraph(`Empty lexical records ${run.firstSourceRecordOrdinal}–${run.lastSourceRecordOrdinal}: ${run.count} records; ${rangeText(run)}. Exact run is recoverable from the original bytes.`);
    }
    return details;
  }
  function render() {
    assertPresentationBudget(root);
    const states = new Map();
    for (const role of roles) {
      if (displayedFiles.get(role) !== sources.get(role)?.file) continue;
      const panel = target.querySelector('#original-' + role);
      if (panel) states.set(role, [panel.open, new Map([...panel.querySelectorAll('details')].map(node => [node.firstElementChild.textContent, node.open]))]);
    }
    const children = roles.map(role => build(role, sources.get(role)));
    expectedChildren = children; target.replaceChildren(...children);
    if (target.childNodes.length !== children.length || children.some((node,index)=>target.childNodes[index]!==node)) throw new TypeError('Original evidence changed during commit.');
    for (const node of children) validateNode(node);
    for (let i = 0; i < roles.length; i++) {
      const state = states.get(roles[i]); if (!state) continue;
      children[i].open = state[0];
      for (const node of children[i].querySelectorAll('details')) if (state[1].has(node.firstElementChild.textContent)) node.open = state[1].get(node.firstElementChild.textContent);
    }
    displayedFiles = new Map(roles.map(role => [role, sources.get(role)?.file]));
    remember();
  }
  function sync() {
    let changed = false;
    for (const [role, binding] of sources) if (!sourceMatches(binding.handle, role, getFile(role))) { discard(role); changed = true; }
    if (changed) render();
  }
  function validateCurrent(requireObservable) {
    // Refresh can render a changed source. Check that resulting DOM once,
    // before layout inspection and cloning; never reuse a prior-call budget.
    sync();
    assertPresentationBudget(root);
    const styles = new Map(), rectangles = new Map();
    const css = node => { if (!styles.has(node)) styles.set(node, getComputedStyle(node)); return styles.get(node); };
    const rect = node => { if (!rectangles.has(node)) rectangles.set(node, node.getBoundingClientRect()); return rectangles.get(node); };
    const covers = qualifiedCovers(root, active(), css);
    if (!root.isConnected || document.querySelectorAll('#original-evidence').length !== 1 || document.getElementById('original-evidence') !== root ||
        document.querySelectorAll('#original-evidence-sources').length !== 1 || target.parentElement !== root || root.children.length !== 2 ||
        root.getAttribute('aria-labelledby') !== 'original-evidence-title' || root.hidden || root.inert || root.getAttribute('aria-hidden') === 'true' ||
        snapshotPresentation(root) !== expected || ![root, ...root.querySelectorAll('*')].every((node, index) => node === nodes[index]) || nodes.length !== root.querySelectorAll('*').length + 1) throw new TypeError('Original evidence projection has changed.');
    if (root.tagName !== 'SECTION' || root.parentElement !== document.getElementById('evidence-panels') || target.tagName !== 'DIV' || target.attributes.length !== 1 || target.id !== 'original-evidence-sources' ||
        root.childNodes.length !== 2 || root.firstChild !== heading || root.lastChild !== target || heading.tagName !== 'H3' || heading.textContent !== 'Supplied original files' || heading.childNodes.length !== 1 || heading.firstChild.nodeType !== Node.TEXT_NODE || heading.attributes.length !== 1 || heading.id !== 'original-evidence-title' ||
        [...root.attributes].some(attribute => !['id','aria-labelledby','style','class'].includes(attribute.name))) throw new TypeError('Original evidence has unowned labels.');
    if (target.childNodes.length !== expectedChildren.length || expectedChildren.some((child,index)=>target.childNodes[index]!==child)) throw new TypeError('Original evidence has unowned source panels.');
    for (const node of expectedChildren) validateNode(node);
    for (const [role, binding] of sources) {
      if (!sourceMatches(binding.handle, role, getFile(role))) throw new TypeError('Original evidence file occurrence has changed.');
      assertSourceProjection(binding.projection, binding.handle, role, binding.offset);
    }
    if (active() && !observableViewport()) {
      if (requireObservable) throw new TypeError('Original evidence screen is currently unobservable.');
      return; // Retention checks completed; direct actions/publication remain strict.
    }
    if (active()) for (const node of nodes) {
      if (node === target && expectedChildren.length === 0) continue;
      let disclosed = true;
      for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open && !parent.firstElementChild.contains(node)) { disclosed = false; break; }
      }
      if (!disclosed) continue;
      const style = css(node);
      const bounds = rect(node);
      if (bounds.width <= 0 || bounds.height <= 0) throw new TypeError('Original evidence has no visible area.');
      if (bounds.right <= 0 || bounds.left >= innerWidth) throw new TypeError('Original evidence is horizontally unreachable.');
      const textRange = document.createRange(); textRange.selectNodeContents(node);
      const chain = []; let opacity = 1;
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const style = css(ancestor), outer = rect(ancestor); chain.push(style); opacity *= Number(style.opacity);
        if (ancestor.hidden || ancestor.inert || ancestor.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || style.fontSize === '0px' || style.lineHeight === '0px' || style.clipPath !== 'none' || style.clip !== 'auto' || style.maskImage && style.maskImage !== 'none' || style.contentVisibility === 'hidden' || style.transform !== 'none' || style.filter !== 'none' || style.textIndent !== '0px' || /rgba\([^)]*,\s*0\)$/.test(style.color)) throw new TypeError('Original evidence is hidden or displaced.');
        for (const rect of textRange.getClientRects()) if (['hidden','clip'].includes(style.overflowX) && (rect.left < outer.left - 1 || rect.right > outer.right + 1) || ['hidden','clip'].includes(style.overflowY) && (rect.top < outer.top - 1 || rect.bottom > outer.bottom + 1)) throw new TypeError('Original evidence is partially clipped.');
      }
      if (!Number.isFinite(opacity) || opacity < 0.9) throw new TypeError('Original evidence is insufficiently opaque.');
      if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
        const size = parseFloat(style.fontSize), line = parseFloat(style.lineHeight);
        if (size < 12 || Number.isFinite(line) && line < size * 0.8 || chain.some(s => s.backgroundImage !== 'none' || s.pointerEvents === 'none') || style.webkitTextFillColor && style.webkitTextFillColor !== style.color) throw new TypeError('Original evidence text is unreadable or unavailable.');
        let background = [255,255,255];
        for (const s of chain.reverse()) background = blend(color(s.backgroundColor), background);
        const foreground = color(style.color), effective = blend(foreground, background, foreground[3] * opacity);
        const first = luminance(effective), second = luminance(background);
        const contrast = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
        if (contrast + 0.001 < (size >= 24 || size >= 18.67 && Number(style.fontWeight) >= 700 ? 3 : 4.5)) throw new TypeError('Original evidence contrast is insufficient.');
        for (const box of textRange.getClientRects()) {
          const left = Math.max(0, box.left), right = Math.min(innerWidth, box.right), top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
          // Edge slivers can round outside Chromium's hit-test viewport. They
          // remain reachable by scrolling; sample only a complete CSS pixel.
          if (right - left < 1 || bottom - top < 1) continue;
          if (covers.some(cover => { const b = rect(cover); return b.left < right && b.right > left && b.top < bottom && b.bottom > top && paintsAbove(cover, node, css); })) throw new TypeError('Original evidence is covered by another surface.');
          for (const fraction of [0.2,0.5,0.8]) {
            const hit = document.elementFromPoint(left + (right-left)*fraction, (top+bottom)/2);
            if (!hit || !node.contains(hit) && !hit.contains(node)) throw new TypeError('Original evidence text is obscured.');
          }
        }
      }
      for (const pseudo of ['::before', '::after']) if (!['none','normal','""'].includes(getComputedStyle(node,pseudo).content)) throw new TypeError('Original evidence has unowned generated text.');
    }
  }
  function assertCurrent() { validateCurrent(true); }
  function assertRetained() { validateCurrent(observableViewport()); }
  const checkedViewport = guarded(() => assertCurrent());
  const checkViewport = () => {
    // A minimized/capture viewport has no observable text. Keep custody until
    // real metrics return; direct publication and actions still fail closed.
    if (active() && observableViewport()) checkedViewport();
  };
  for (const event of ['scroll','focusin']) window.addEventListener(event, checkViewport, true);
  // Returning native metrics are checked synchronously; no scheduler owns
  // restoration and publication/actions retain their immediate validation.
  window.addEventListener('resize', checkViewport, true);
  render();
  return Object.freeze({ assertCurrent, assertRetained,
    commit(evidence, role, file) {
      assertLocalEvidence(evidence, role, file);
      if (!sourceMatches(evidence.handle, role, file) || getFile(role) !== file || sourceText(evidence.handle, role) !== evidence.text) { releaseFileEvidence(evidence.handle); throw new TypeError('Original publication does not match its acquisition.'); }
      discard(role); sources.set(role, { handle: evidence.handle, file, offset: 0, problem: evidence.problem?.message ?? null });
      try { render(); assertCurrent(); } catch (error) { discard(role); releaseFileEvidence(evidence.handle); throw error; }
    },
    assertText(role, text, file) {
      assertCurrent(); const binding = sources.get(role);
      if (!binding || !sourceMatches(binding.handle, role, file) || sourceText(binding.handle, role) !== text || binding.problem) throw new TypeError('CSV derivative is not bound to its current original.');
      return binding.projection.sha256;
    },
    fileName(role, file) {
      assertCurrent(); const binding = sources.get(role);
      if (!binding || !sourceMatches(binding.handle, role, file)) throw new TypeError('Filename has no current original source.');
      return binding.projection.metadata.name;
    },
    clear() {
      let failure;
      const clean = action => { try { action(); } catch (error) { failure ??= error; } };
      for (const role of roles) clean(() => discard(role));
      // A failed release remains tracked. Retry only those existing URLs;
      // never mint another URL while recovery is quarantined.
      for (const url of [...urls]) clean(() => retireURL(url));
      displayedFiles.clear(); expectedChildren = []; expected = null; nodes = [];
      clean(() => target.replaceChildren());
      if (!failure) clean(remember);
      if (failure) throw failure;
    },
    removeRole(role) { if (!roles.includes(role)) throw new TypeError('Unknown original role.'); discard(role); render(); },
    refresh() { sync(); },
  });
}
