import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPresentationBudget } from './resource-packet.mjs';
import { createOriginalEvidenceView } from './file-evidence-view.mjs';
import { FILE_SUPPORT } from './file-support.mjs';

// A stable preorder DOM model exercises count/ownership and rendering contracts.
// Native DOM and responsiveness remain separately measured browser gates.
class ModelNode {
  constructor(document, nodeType, name = '', data = '') {
    this.ownerDocument = document; this.nodeType = nodeType; this.tagName = name.toUpperCase();
    this.data = data; this.parentNode = null; this.nextSibling = null; this.childNodes = [];
    this.attributeValues = new Map(); this.hidden = false; this.inert = false; this.onclick = null;
  }
  get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes.at(-1) ?? null; }
  get children() { return this.childNodes.filter(node => node.nodeType === 1); }
  get firstElementChild() { return this.children[0] ?? null; }
  get id() { return this.getAttribute('id') ?? ''; }
  get attributes() { return [...this.attributeValues].map(([name, value]) => ({ name, value })); }
  get isConnected() { for (let node = this; node; node = node.parentNode) if (node === this.ownerDocument) return true; return false; }
  get open() { return this.attributeValues.has('open'); }
  set open(value) { if (value) this.setAttribute('open', ''); else this.removeAttribute('open'); }
  setAttribute(name, value) { this.attributeValues.set(name, String(value)); }
  getAttribute(name) { return this.attributeValues.get(name) ?? null; }
  removeAttribute(name) { this.attributeValues.delete(name); }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parentNode) node.parentNode.remove(node);
      if (this.lastChild) this.lastChild.nextSibling = node;
      node.parentNode = this; node.nextSibling = null; this.childNodes.push(node);
    }
  }
  remove(node) {
    const index = this.childNodes.indexOf(node);
    if (index < 0) return;
    if (index) this.childNodes[index - 1].nextSibling = node.nextSibling;
    this.childNodes.splice(index, 1); node.parentNode = null; node.nextSibling = null;
  }
  replaceChildren(...nodes) { for (const node of [...this.childNodes]) this.remove(node); this.append(...nodes); }
  contains(node) { for (let current = node; current; current = current.parentNode) if (current === this) return true; return false; }
  get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map(node => node.textContent).join(''); }
  set textContent(value) { this.replaceChildren(...(value ? [this.ownerDocument.createTextNode(value)] : [])); }
  querySelectorAll(selector) {
    const result = [], tree = this.ownerDocument.createTreeWalker(this);
    for (let node = tree.nextNode(); node; node = tree.nextNode()) if (node.nodeType === 1 &&
        (selector === '*' || selector.startsWith('#') && node.id === selector.slice(1) || node.tagName.toLowerCase() === selector)) result.push(node);
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  cloneNode(deep) {
    if (this.id === 'original-evidence') this.ownerDocument.sourceClones++;
    const clone = new ModelNode(this.ownerDocument, this.nodeType, this.tagName, this.data);
    clone.attributeValues = new Map(this.attributeValues);
    if (deep) clone.append(...this.childNodes.map(node => node.cloneNode(true)));
    return clone;
  }
  get innerHTML() {
    const serialize = node => node.nodeType === 3 ? JSON.stringify(node.data) : node.nodeType === 8 ? '<!--' + node.data + '-->' :
      '<' + node.tagName + JSON.stringify([...node.attributeValues]) + '>' + node.childNodes.map(serialize).join('') + '</' + node.tagName + '>';
    return this.childNodes.map(serialize).join('');
  }
}
function modelDocument() {
  const document = new ModelNode(null, 9); document.ownerDocument = document;
  document.budgetWalks = 0; document.sourceClones = 0;
  document.createElement = tag => new ModelNode(document, 1, tag);
  document.createTextNode = value => new ModelNode(document, 3, '', value);
  document.createComment = value => new ModelNode(document, 8, '', value);
  document.documentElement = document.createElement('html'); document.append(document.documentElement);
  document.body = document.createElement('body'); document.documentElement.append(document.body);
  document.createTreeWalker = (root, show) => {
    if (root === document.documentElement && show === 0xffffffff) document.budgetWalks++;
    return { currentNode: root, nextNode() {
      let node = this.currentNode;
      if (node.firstChild) return (this.currentNode = node.firstChild);
      while (node !== root) {
        if (node.nextSibling) return (this.currentNode = node.nextSibling);
        node = node.parentNode;
      }
      return null;
    } };
  };
  document.querySelectorAll = selector => document.documentElement.querySelectorAll(selector);
  document.getElementById = id => document.querySelectorAll('#' + id)[0] ?? null;
  return document;
}
function fixture() {
  const document = modelDocument(), root = document.createElement('section'); document.body.append(root);
  return { document, root };
}

// Frozen prior algorithm, retained only as a differential oracle. This does not
// share the new ancestor-stack implementation or its mutable per-call state.
function previousBudget(root) {
  const limits = FILE_SUPPORT.limits, document = root.ownerDocument;
  const tree = document.createTreeWalker(document.documentElement, 0xffffffff);
  const depths = new WeakMap(), inside = new WeakMap();
  let globalNodes = 0, globalElements = 0, ownedNodes = 0, ownedElements = 0, units = 0;
  for (let node = tree.currentNode; node; node = tree.nextNode()) {
    if (++globalNodes > limits.bodyNodes) throw new TypeError('Presentation exceeds the global node budget.');
    const depth = (depths.get(node.parentNode) ?? 0) + 1; depths.set(node, depth);
    if (depth > limits.domDepth) throw new TypeError('Presentation exceeds the DOM depth budget.');
    if (node.nodeType === 1 && ++globalElements > limits.bodyElements) throw new TypeError('Presentation exceeds the global element budget.');
    const owned = node === root || inside.get(node.parentNode); inside.set(node, Boolean(owned));
    if (owned) {
      if (++ownedNodes > limits.evidenceNodes) throw new TypeError('Original evidence exceeds its node budget.');
      if (node.nodeType === 1 && ++ownedElements > limits.evidenceElements) throw new TypeError('Original evidence exceeds its element budget.');
      if (node.nodeType === 3 && (units += node.data.length) > limits.evidenceCodeUnits) throw new TypeError('Original evidence exceeds its text budget.');
    }
  }
  return Object.freeze({ globalNodes, globalElements, ownedNodes, ownedElements, units });
}
const result = callback => { try { return { counts: callback() }; } catch (error) { return { name: error.name, message: error.message }; } };
const parity = root => assert.deepEqual(result(() => assertPresentationBudget(root)), result(() => previousBudget(root)));

test('F13P3T-DOM01 mixed sibling/depth ownership and UTF-16 text match the prior contract', () => {
  const { document, root } = fixture(), outside = document.createElement('aside'), branch = document.createElement('div');
  document.body.append(outside); root.append(branch, document.createComment('owned'), document.createTextNode('A😀'));
  branch.append(document.createTextNode('é'), document.createElement('i')); outside.append(document.createTextNode('ignored'));
  assert.deepEqual(assertPresentationBudget(root), { globalNodes: 10, globalElements: 6, ownedNodes: 6, ownedElements: 3, units: 4 });
  parity(root); assert.equal(Object.isFrozen(assertPresentationBudget(root)), true);
  document.body.remove(root); parity(root);
  assert.deepEqual(assertPresentationBudget(root), { globalNodes: 4, globalElements: 3, ownedNodes: 0, ownedElements: 0, units: 0 });
});

for (const [kind, limit] of [['globalNodes', 20000], ['globalElements', 10000], ['ownedNodes', 3000], ['ownedElements', 1500], ['units', 4000000], ['depth', 64]]) {
  test('F13P3T-DOM02-' + kind + ' exact N-1/N/N+1 acceptance and rejection cause', () => {
    for (const count of [limit - 1, limit, limit + 1]) {
      const { document, root } = fixture();
      if (kind === 'units') root.append(document.createTextNode('x'.repeat(count)));
      else if (kind === 'depth') { let parent = root; for (let depth = 3; depth < count; depth++) { const child = document.createElement('i'); parent.append(child); parent = child; } }
      else {
        const baseline = assertPresentationBudget(root)[kind], target = kind.startsWith('owned') ? root : document.body;
        for (let index = baseline; index < count; index++) target.append(kind.endsWith('Elements') ? document.createElement('i') : document.createComment(''));
      }
      parity(root); const observed = result(() => assertPresentationBudget(root));
      if (count > limit) assert.match(observed.message, /exceeds/);
      else { assert.equal(observed.message, undefined); if (kind !== 'depth') assert.equal(observed.counts[kind], count); }
    }
  });
}

test('F13P3T-DOM03 intersecting limits preserve first rejection and changing root ownership', () => {
  const { document, root } = fixture();
  for (let index = 1; index < 1500; index++) root.append(document.createElement('i'));
  root.append(document.createTextNode('x'.repeat(4000000)));
  while (assertPresentationBudget(root).globalNodes < 19999) {
    // Append in one bounded batch; calculating the target independently avoids
    // making the fixture itself quadratic at the global node frontier.
    const remaining = 19999 - assertPresentationBudget(root).globalNodes;
    for (let index = 0; index < remaining; index++) document.body.append(document.createComment(''));
  }
  parity(root); root.append(document.createElement('i')); parity(root);
  assert.match(result(() => assertPresentationBudget(root)).message, /element budget/);
  document.body.remove(root); parity(root);
  assert.equal(assertPresentationBudget(root).ownedNodes, 0);
});

test('F13P3T-DOM04 deterministic varied preorder branches agree without retaining earlier siblings', () => {
  let seed = 12345; const random = maximum => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % maximum; };
  for (let trial = 0; trial < 32; trial++) {
    const { document, root } = fixture(), parents = [document.body, root];
    for (let index = 0; index < 200; index++) {
      const parent = parents[random(parents.length)], type = random(3);
      const node = type === 0 ? document.createElement('i') : type === 1 ? document.createComment('') : document.createTextNode('é😀'.repeat(random(4)));
      parent.append(node); if (type === 0) parents.push(node);
    }
    parity(root); parity(document.body); parity(document.documentElement);
  }
});

test('F13P3T-DOM05 a 20,000-node check performs no per-node WeakMap allocation or insertion', () => {
  const { document, root } = fixture();
  for (let index = 3; index < 20000; index++) document.body.append(document.createComment(''));
  const NativeWeakMap = globalThis.WeakMap;
  try {
    globalThis.WeakMap = class { constructor() { throw Error('Per-node map allocated'); } };
    assert.equal(assertPresentationBudget(root).globalNodes, 20000);
  } finally { globalThis.WeakMap = NativeWeakMap; }
});

test('F13P3T-DOM06 retained view checks once per call and rejects fresh mutation before cloning', () => {
  const { document, root } = fixture(), panel = document.createElement('section'), heading = document.createElement('h3'), target = document.createElement('div');
  panel.setAttribute('id', 'evidence-panels'); document.body.append(panel); panel.append(root);
  root.setAttribute('id', 'original-evidence'); root.setAttribute('aria-labelledby', 'original-evidence-title');
  heading.setAttribute('id', 'original-evidence-title'); heading.textContent = 'Supplied original files';
  target.setAttribute('id', 'original-evidence-sources'); root.append(heading, target);
  const previous = Object.fromEntries(['document', 'window', 'Node', 'innerWidth', 'innerHeight'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    Object.assign(globalThis, { document, window: { addEventListener() {} }, Node: { TEXT_NODE: 3 }, innerWidth: 800, innerHeight: 600 });
    const view = createOriginalEvidenceView(root, { guarded: callback => callback, getFile: () => undefined, active: () => false });
    document.budgetWalks = 0; document.sourceClones = 0; view.assertRetained();
    assert.equal(document.budgetWalks, 1); assert.equal(document.sourceClones, 1);
    target.firstElementChild.open = true;
    document.budgetWalks = 0; view.assertRetained(); assert.equal(document.budgetWalks, 1);
    document.body.append(document.createComment('fresh unrelated node')); view.assertRetained();
    const counts = assertPresentationBudget(root);
    for (let index = counts.globalNodes; index < 20001; index++) document.body.append(document.createComment(''));
    document.budgetWalks = 0; document.sourceClones = 0;
    assert.throws(() => view.assertRetained(), /global node budget/);
    assert.equal(document.budgetWalks, 1); assert.equal(document.sourceClones, 0);
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});
