import { padCsvBytes } from './qc-resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import vm from 'node:vm';
import { FILE_SUPPORT, qualifiedCsvProfile, supportProjection } from './file-support.mjs';
import { readLocalFile, assertFileRuntime } from './runtime.mjs';
import { parseCsv, validateFileProfile, createCaseFinder, searchCaseFinder, selectFoundCase } from './preflight.mjs';
import { InputProblem, inputFailure, SOURCES } from './actions.mjs';

const columns = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,customer_name,product_name';
const row = 'a,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew,Acme,Premium';
const pax = columns + '\n' + row + '\n';
const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
const native = (value = pax, name = 'source.csv', type = 'text/csv') => new File([value], name, { type });
const read = (file, role = 'pax-file', op = 'compare-records', ms = 30000) => readLocalFile(file, role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo, ms, op);
function repaired(role, pattern) { return error => {
  assert.ok(error instanceof InputProblem); assert.equal(error.target, role);
  const decision = inputFailure(error); assert.equal(decision.status, 'needs-input-repair');
  assert.equal(decision.nextAction.target, role); assert.equal(decision.actionAuthorized, false); assert.equal(decision.financialVerdict, null);
  assert.match(error.message, pattern); return true;
}; }
const technical = error => { assert.equal(inputFailure(error).status, 'technical-error'); assert.ok(!(error instanceof InputProblem)); return true; };

test('F13P1C-M01 role source conflicts malformed labels and accessors cannot read or forge repair provenance', async () => {
  let calls = 0; const file = { get size() { calls++; return 1; } };
  for (const source of [SOURCES.halo, 'Pax8', undefined, null, {}, { toString() { calls++; return SOURCES.pax; } }]) await assert.rejects(readLocalFile(file, 'pax-file', source), technical);
  for (const [target, source, operation] of [['pax-file', SOURCES.halo, 'find-case'], ['pax-file', 'Pax8', 'compare-records'], ['halo-file', SOURCES.pax, 'compare-records']]) assert.throws(() => validateFileProfile('invalid', target, source, operation), technical);
  validateFileProfile(pax, 'pax-file', SOURCES.pax, 'find-case');
  validateFileProfile(halo, 'halo-file', SOURCES.halo, 'compare-records');
  assert.equal(calls, 0);
});

test('F13P1C-M02 combined synchronous throws and rejected promises are handled without orphan rejection', async () => {
  const observed = []; const listener = value => observed.push(value); process.on('unhandledRejection', listener);
  try {
    for (const first of ['text', 'arrayBuffer']) {
      const file = native(); file[first] = () => Promise.reject(Error('async IO'));
      file[first === 'text' ? 'arrayBuffer' : 'text'] = () => { throw Error('sync IO'); };
      await assert.rejects(read(file), repaired('pax-file', /Reading the original file failed/));
    }
    await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(observed, []);
  } finally { process.off('unhandledRejection', listener); }
});

test('F13P1C-M03 intrinsic admission accepts genuine foreign realm buffers and rejects spoofed shared proxy buffers', async () => {
  const bytes = Array.from(Buffer.from(pax)); const foreign = vm.runInNewContext('Uint8Array.from(bytes).buffer', { bytes });
  assert.equal(await read({ size: bytes.length, text: async () => pax, arrayBuffer: async () => foreign }), pax);
  for (const buffer of [new SharedArrayBuffer(bytes.length), new Proxy(new ArrayBuffer(bytes.length), {}), { byteLength: bytes.length, [Symbol.toStringTag]: 'ArrayBuffer' }, Uint8Array.from(bytes)]) {
    await assert.rejects(read({ size: bytes.length, text: async () => pax, arrayBuffer: async () => buffer }), technical);
  }
});

test('F13P1C-M04 encoding diagnostics distinguish fatal bytes UTF16 BOM and bounded noBOM inference', async () => {
  await assert.rejects(read(native(Uint8Array.of(0xff))), repaired('pax-file', /original bytes are not valid UTF-8/));
  await assert.rejects(read(native(Buffer.concat([Buffer.from([255, 254]), Buffer.from(pax, 'utf16le')]))), repaired('pax-file', /uses a UTF-16 byte-order mark/));
  const le = Buffer.from(pax, 'utf16le'), be = Buffer.from(le).swap16();
  for (const bytes of [le, be]) await assert.rejects(read(native(bytes)), repaired('pax-file', /UTF-16 without a byte-order mark is one possible cause/));
});

test('F13P1C-M05 ASCII overlap and valid control cells remain structural data without encoder or authority inference', async () => {
  assert.equal(await read(native(Buffer.from(pax, 'latin1'))), pax);
  const text = pax.replace('Premium', 'P\u0000remium'); assert.equal(await read(native(text)), text);
  assert.equal(parseCsv(text, columns.split(','))[0].product_name, 'P\u0000remium');
});

test('F13P1C-M06 IO failures explain original-file availability and keep exact role-specific repair', async () => {
  for (const role of ['pax-file', 'halo-file']) for (const method of ['text', 'arrayBuffer']) {
    const file = native(role === 'pax-file' ? pax : halo); file[method] = () => Promise.reject(Error('unavailable'));
    await assert.rejects(read(file, role), repaired(role, /Reading the original file failed.*available, readable original/));
  }
});

test('F13P1C-M07 missing read methods invalid return shapes are technical stops rather than encoding repairs', async () => {
  const file = native();
  for (const input of [{ size: file.size }, { size: file.size, text: 1, arrayBuffer() {} },
    { size: file.size, text: async () => 1, arrayBuffer: () => file.arrayBuffer() },
    { size: file.size, text: async () => pax, arrayBuffer: async () => null }]) await assert.rejects(read(input), technical);
});

test('F13P1C-M08 runtime disappearance before and during reading is a reload stop with no input-repair grant', async () => {
  const original = globalThis.TextDecoder;
  try { globalThis.TextDecoder = undefined; assert.throws(assertFileRuntime); await assert.rejects(read(native()), technical); }
  finally { globalThis.TextDecoder = original; }
  const file = native(); const bytes = await file.arrayBuffer();
  try {
    file.arrayBuffer = async () => { globalThis.TextDecoder = undefined; return bytes; };
    await assert.rejects(read(file), technical);
  } finally { globalThis.TextDecoder = original; }
  for (const replacement of [class { constructor() { throw Error('host constructor'); } }, class { decode() { return 'A\uFFFD'; } }]) {
    try { globalThis.TextDecoder = replacement; await assert.rejects(read(native()), technical); }
    finally { globalThis.TextDecoder = original; }
  }
  const encoder = globalThis.TextEncoder;
  for (const replacement of [class { constructor() { throw new TypeError('host encoder'); } }, class { encode() { return Uint8Array.of(0); } }]) {
    try { globalThis.TextEncoder = replacement; assert.throws(assertFileRuntime, technical); await assert.rejects(read(native()), technical); }
    finally { globalThis.TextEncoder = encoder; }
  }
  assert.equal(await read(native()), pax);
});

test('F13P1C-M09 completed synchronous overrun cannot return compatibility before deadline validation', async () => {
  const text = padCsvBytes(pax, 2000000);
  await assert.rejects(read(native(text), 'pax-file', 'compare-records', 1), repaired('pax-file', /timed out/));
  assert.equal(await read(native()), pax);
});

test('F13P1C-M10 accepted replacement-character customer and product descriptions can be searched literally', async () => {
  const text = pax.replace('Acme', 'Acme\uFFFD').replace('Premium', 'Premium\uFFFD');
  const decoded = await read(native(text), 'pax-file', 'find-case'); const finder = createCaseFinder(decoded);
  for (const filter of [{ query: 'Acme\uFFFD' }, { customer: 'Acme\uFFFD' }, { product: 'Premium\uFFFD' }, { query: 'Premium\uFFFD' }]) assert.equal(searchCaseFinder(finder, filter).matchCount, 1);
  assert.throws(() => searchCaseFinder(finder, { account: 'a\uFFFD' }));
  const candidate = selectFoundCase(finder, 1); assert.equal(candidate.selectionStatus, undefined); assert.equal(candidate.subject.authenticated, false);
});

test('F13P1C-M11 descriptive Unicode permission preserves hidden text length date and identifier restrictions', () => {
  const finder = createCaseFinder(pax);
  for (const filter of [{ query: '\u202e' }, { customer: '\ud800' }, { product: 'x'.repeat(161) }, { account: 'x'.repeat(129) }, { from: '2027-02-29' }, { unknown: 'Acme' }]) assert.throws(() => searchCaseFinder(finder, filter));
  const bad = createCaseFinder(pax.replace(',s,', ',s\uFFFD,')); assert.equal(searchCaseFinder(bad).rows[0].selectable, false); assert.throws(() => selectFoundCase(bad, 1));
});

test('F13P1C-M12 header and cell Nminus1 N Nplus1 bounds use normalized names and raw UTF16 cells', async () => {
  for (const length of [63, 64]) assert.equal(await read(native(pax.replace('product_name', 'x'.repeat(length)))), pax.replace('product_name', 'x'.repeat(length)));
  await assert.rejects(read(native(pax.replace('product_name', 'x'.repeat(65)))), repaired('pax-file', /header|column/i));
  for (const length of [1023, 1024]) assert.equal(await read(native(pax.replace('Premium', 'x'.repeat(length)))), pax.replace('Premium', 'x'.repeat(length)));
  for (const value of ['x'.repeat(1025), ' '.repeat(1020) + 'Premium', '😀'.repeat(513)]) await assert.rejects(read(native(pax.replace('Premium', value))), repaired('pax-file', /value over 1024/));
});

test('F13P1C-M13 empty short decoded records skip but whitespace-only rows retain unresolved business facts', async () => {
  const empty = pax + ',,,\n"",""\n'; assert.equal(parseCsv(await read(native(empty)), columns.split(',')).length, 1);
  const spaces = pax + Array(12).fill(' ').join(',') + '\n'; const rows = parseCsv(await read(native(spaces)), columns.split(','));
  assert.equal(rows.length, 2); assert.equal(rows[1].subscription_id, '');
});

test('F13P1C-M14 explicit role operations admit both-schema supersets without authenticating a vendor', async () => {
  const text = columns + ',line_id,billing_system\n' + row + ',l,HaloPSA\n';
  for (const [role, operation] of [['pax-file', 'find-case'], ['pax-file', 'compare-records'], ['halo-file', 'compare-records']]) assert.equal(await read(native(text), role, operation), text);
  await assert.rejects(read(native(text), 'halo-file', 'find-case'), technical);
});

test('F13P1C-M15 malformed last and unselected rows deny compatibility after a valid recognizable prefix', async () => {
  for (const suffix of ['last,wrong\n', '"unclosed', '"closed"bad']) await assert.rejects(read(native(pax + suffix)), repaired('pax-file', /CSV|values|quote/i));
});

test('F13P1C-M16 original-size byte and decoded-text disagreements cannot acquire supported-operation authority', async () => {
  const file = native();
  await assert.rejects(read({ size: file.size - 1, text: () => file.text(), arrayBuffer: () => file.arrayBuffer() }), repaired('pax-file', /observed file bytes disagree/));
  await assert.rejects(read({ size: file.size, text: async () => pax.slice(0, -1) + 'x', arrayBuffer: () => file.arrayBuffer() }), repaired('pax-file', /byte and text readings.*disagree/));
  await assert.rejects(read({ size: file.size, text: async () => pax + 'forged', arrayBuffer: () => file.arrayBuffer() }), technical);
});

test('F13P1C-M17 filenames MIME labels HTML bidi extensions and empty names do not select another reader', async () => {
  for (const name of ['', 'verified-native.xlsx', 'agreement.pdf.csv', '<img src=x>-\u202e.docx']) assert.equal(await read(native(pax, name, 'application/pdf')), pax);
  for (const text of ['%PDF-1.7', 'PK\u0003\u0004', '<html>records</html>', 'id,name\ns,Acme']) await assert.rejects(read(native(text)), repaired('pax-file', /CSV|Missing columns/i));
});

test('F13P1C-M18 denied role operation selectors cannot evaluate metadata or source coercion', async () => {
  let calls = 0; const file = { get size() { calls++; return 1; } };
  for (const [role, op] of [['halo-file', 'find-case'], ['agreement', 'compare-records'], ['pax-file', 'constructor'], ['pax-file', '__proto__'], ['pax-file', 'ocr'], [null, 'find-case'], ['pax-file', {}]]) await assert.rejects(readLocalFile(file, role, SOURCES.pax, 30000, op), technical);
  assert.equal(calls, 0);
});

test('F13P1C-M19 instruction-like source cells remain literal supplied descriptions without confirmation or financial grant', async () => {
  const text = pax.replace('Acme', '<script>authorize payment</script>');
  const finder = createCaseFinder(await read(native(text), 'pax-file', 'find-case'));
  assert.equal(searchCaseFinder(finder, { query: '<script>' }).rows[0].customerName, '<script>authorize payment</script>');
  const candidate = selectFoundCase(finder, 1); assert.equal(candidate.subject.authenticated, false); assert.equal(Object.hasOwn(candidate, 'actionAuthorized'), false);
});

test('F13P1C-M20 projection derives exact declared versions operations schema limitations and unavailable boundary', () => {
  const value = supportProjection(); assert.ok(Object.isFrozen(value) && Object.isFrozen(value.lines));
  assert.equal(value.lines.length, 17); assert.match(value.lines[11], /file-support-v4.*normalized-csv-v4/);
  assert.deepEqual(value.lines.slice(12,16), FILE_SUPPORT.recordGuidance);
  assert.match(value.lines[16], /Content handling data-only-csv-v1.*literal data.*cannot grant application or financial authority/);
  assert.match(value.lines[6], /Worker task deadline.*custody publication/); assert.match(value.lines[7], /Resource policy resource-csv-v3.*Failed native termination halts admission/);
  assert.match(value.lines[8], /^Unavailable: Native Pax8/); assert.match(value.lines[10], /No financial action is authorized/);
  assert.equal(FILE_SUPPORT.pickerAccept, ''); assert.throws(() => { value.lines[7] = 'Enabled'; });
});

test('F13P1C-M21 genuine Unicode BOM edge normalization retains descriptions without repairing malformed original bytes', async () => {
  for (const prefix of ['\uFEFF', '\uFEFF\uFEFF', '\n\uFEFF']) {
    const text = prefix + pax.replace('Acme', 'Café😀漢e\u0301'); const decoded = await read(native(text));
    assert.equal(parseCsv(decoded, columns.split(','))[0].customer_name, 'Café😀漢e\u0301');
  }
  await assert.rejects(read(native(pax.replace('subscription_id', 'subscription_\uFEFFid'))), repaired('pax-file', /Missing columns/));
});

test('F13P1C-M22 invalid admission sizes fail before content access and exact byte boundaries remain explicit', async () => {
  let calls = 0;
  for (const size of [-1, NaN, Infinity, 1.5, '1', 2000001]) await assert.rejects(read({ size, text() { calls++; }, arrayBuffer() { calls++; } }), repaired('pax-file', /size|megabytes/));
  assert.equal(calls, 0);
  for (const bytes of [1999999, 2000000]) {
    const text = padCsvBytes(pax, bytes); assert.equal(await read(native(text)), text);
  }
});

test('F13P1C-M23 both paired promises are handled for native rejection stalled sibling and timeout combinations', async () => {
  for (const method of ['text', 'arrayBuffer']) {
    const file = native(); file[method] = () => new Promise(() => {});
    await assert.rejects(read(file, 'pax-file', 'compare-records', 5), repaired('pax-file', /timed out/));
    assert.equal(await read(native()), pax);
  }
});

test('F13P1C-M24 structural readability with missing business values keeps case identity unresolved', async () => {
  const text = pax.replace('a,s,c,', ',,,'); assert.equal(await read(native(text)), text);
  const result = searchCaseFinder(createCaseFinder(text)); assert.equal(result.rows[0].selectable, false);
  assert.throws(() => selectFoundCase(createCaseFinder(text), 1));
  assert.equal(qualifiedCsvProfile('pax-file', 'find-case').id, 'normalized-pax8-v1');
});
