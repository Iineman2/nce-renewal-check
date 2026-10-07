import { padCsvBytes } from './qc-resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { readLocalFile } from './runtime.mjs';
import { parseCsv, PAX8_COLUMNS, HALO_COLUMNS, createCaseFinder, searchCaseFinder } from './preflight.mjs';
import { InputProblem, inputFailure, SOURCES } from './actions.mjs';

const pax = [...PAX8_COLUMNS, 'customer_name'].join(',') + '\ns,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew,Café\n';
const halo = HALO_COLUMNS.join(',') + '\nl,s,c,HaloPSA\n';
const file = (text = pax, name = 'input.csv', type = 'text/csv') => new File([text], name, { type });
const read = (input, target = 'pax-file', op = 'compare-records', ms = 30_000) => readLocalFile(input, target, target === 'pax-file' ? SOURCES.pax : SOURCES.halo, ms, op);
const repair = target => error => {
  assert.ok(error instanceof InputProblem); assert.equal(error.target, target);
  const decision = inputFailure(error); assert.equal(decision.status, 'needs-input-repair');
  assert.equal(decision.actionAuthorized, false); assert.equal(decision.financialVerdict, null);
  assert.equal(decision.nextAction.target, target); return true;
};

test('F13P1-M01 one deeply frozen declaration owns exact current profiles operations versions and limits', () => {
  assert.equal(FILE_SUPPORT.policyVersion, 'file-support-v4'); assert.equal(FILE_SUPPORT.readerVersion, 'normalized-csv-v4');
  assert.equal(FILE_SUPPORT.qualification, 'local-synthetic-normalized-csv');
  assert.deepEqual(FILE_SUPPORT.limits, { inputBytes: 2000000, decodedUtf8Bytes: 2000000, decodedCodeUnits: 2000000, dataRows: 5000, sourceRecords: 10000, totalCells: 65536, columns: 64, headerCodeUnits: 64, cellCodeUnits: 1024, lexemeCodeUnits: 4096, readTimeoutMs: 30000, filenameCodeUnits: 16384, mediaTypeCodeUnits: 1024, activeJobs: 2, inFlightBytes: 4000000, cachedSources: 2, packetValues: 1000000, packetKeyCodeUnits: 64, packetDepth: 12, packetStringCodeUnits: 16000000, previewCells: 64, evidenceElements: 1500, evidenceNodes: 3000, evidenceCodeUnits: 4000000, bodyElements: 10000, bodyNodes: 20000, domDepth: 64, opaqueCovers: 64, cancelAckMs: 250, selectionAckMs: 100 });
  assert.strictEqual(PAX8_COLUMNS, FILE_SUPPORT.profiles[0].requiredColumns); assert.strictEqual(HALO_COLUMNS, FILE_SUPPORT.profiles[1].requiredColumns);
  for (const value of [FILE_SUPPORT, FILE_SUPPORT.limits, FILE_SUPPORT.profiles, ...FILE_SUPPORT.profiles, PAX8_COLUMNS, HALO_COLUMNS, FILE_SUPPORT.operations, FILE_SUPPORT.unavailable]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { FILE_SUPPORT.policyVersion = 'forged'; }); assert.throws(() => { PAX8_COLUMNS.push('fake'); });
  assert.throws(() => { FILE_SUPPORT.profiles[1].operations.push('find-case'); });
  assert.deepEqual(FILE_SUPPORT.unavailable, ['Native Pax8/HaloPSA export profiles', 'Generic CSV field mapping', 'XLSX workbooks', 'PDF agreements', 'DOCX agreements', 'OCR']);
});

test('F13P1-M02 undeclared roles operations and object coercion fail before file IO', async () => {
  let calls = 0; const input = { get size() { calls++; return 0; } };
  for (const [target, op] of [['halo-file', 'find-case'], ['agreement', 'compare-records'], ['pax-file', 'map-fields'], ['pax-file', 'ocr'], ['pax-file', 'toString'], ['pax-file', '__proto__'], ['pax-file', undefined]]) {
    assert.throws(() => qualifiedCsvProfile(target, op));
    if (op !== undefined) await assert.rejects(read(input, target, op), TypeError);
  }
  const exotic = { toString() { calls++; return 'pax-file'; } };
  assert.throws(() => qualifiedCsvProfile(exotic, 'compare-records')); assert.equal(calls, 0);
});

test('F13P1-M03 valid content qualifies independently of filename extension and MIME metadata', async () => {
  for (const [name, type] of [['native-pax8.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], ['agreement.pdf', 'application/pdf'], ['', ''], ['halo.csv', 'text/plain']]) {
    assert.equal(await read(file(pax, name, type)), pax); assert.equal(await read(file(halo, name, type), 'halo-file'), halo);
  }
});

test('F13P1-M04 fatal byte decoding accepts legitimate replacement Unicode and optional UTF8 BOM', async () => {
  for (const text of [pax, '\uFEFF' + pax, pax.replace('Café', 'Café\uFFFD😀漢e\u0301')]) {
    const decoded = await read(file(text)); assert.equal(decoded, text.replace(/^\uFEFF/, ''));
    assert.equal(parseCsv(decoded, PAX8_COLUMNS)[0].customer_name, text.split(',').at(-1).trim());
  }
});

test('F13P1-M05 malformed UTF8 sequences UTF16 and legacy nonASCII bytes cannot silently decode', async () => {
  for (const bytes of [[0xff], [0xc0, 0xaf], [0xe2, 0x82], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xff, 0xfe, 0x41, 0], [0xfe, 0xff, 0, 0x41], [0xe9]]) {
    await assert.rejects(read(new File([Uint8Array.from(bytes)], 'pax8.csv', { type: 'text/csv' })), error => repair('pax-file')(error) && /UTF-8/.test(error.message));
  }
});

test('F13P1-M06 text byte mismatch missing APIs false buffers and actual byte size fail closed', async () => {
  const native = file();
  for (const input of [
    { size: native.size, text: async () => pax.replace('Café', 'Fake'), arrayBuffer: () => native.arrayBuffer() },
    { size: 1, text: async () => pax, arrayBuffer: () => native.arrayBuffer() },
    { size: 1, text: async () => pax, arrayBuffer: async () => new ArrayBuffer(2000001) },
  ]) await assert.rejects(read(input), repair('pax-file'));
  for (const input of [{ size: native.size, text: async () => pax.replace('Café', 'forged'), arrayBuffer: () => native.arrayBuffer() },
    { size: native.size, text: async () => pax }, { size: native.size, arrayBuffer: () => native.arrayBuffer() },
    { size: native.size, text: async () => pax, arrayBuffer: async () => Uint8Array.of(1) }]) {
    await assert.rejects(read(input), error => inputFailure(error).status === 'technical-error' && !(error instanceof InputProblem));
  }
});

test('F13P1-M07 readable unfamiliar tables and wrong role profiles require normalized copy without eligibility', async () => {
  for (const [text, target] of [['id,name\ns,Acme\n', 'pax-file'], [halo, 'pax-file'], [pax, 'halo-file'], [pax.replace('subscription_id', 'subscriptionId'), 'pax-file']]) {
    await assert.rejects(read(file(text), target), error => repair(target)(error) && /Missing columns/.test(error.message) && /Keep the original/.test(error.message));
  }
});

test('F13P1-M08 renamed PDF ZIP XML JSON and semicolon tab dialects never acquire reader support', async () => {
  for (const text of ['%PDF-1.7\n1 0 obj', 'PK\u0003\u0004[Content_Types].xml', '<w:document>contract</w:document>', '{"subscription_id":"s"}', pax.replaceAll(',', ';'), pax.replaceAll(',', '\t')]) {
    await assert.rejects(read(file(text, 'native-export.csv', 'text/csv')), repair('pax-file'));
  }
});

test('F13P1-M09 declared quote newline header normalization and empty-record dialect fully parses', async () => {
  for (const eol of ['\n', '\r\n', '\r']) {
    const text = [...PAX8_COLUMNS, 'customer_name'].map(value => '" ' + value.toUpperCase() + ' "').join(',') + eol + 's,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew,"A,""B""' + eol + 'C" \t' + eol + eol;
    assert.equal(await read(file(text)), text); assert.equal(parseCsv(text, PAX8_COLUMNS)[0].customer_name, 'A,"B"' + eol + 'C');
  }
});

test('F13P1-M10 empty header-only duplicate blank and malformed final rows cannot partially qualify', async () => {
  for (const text of ['', PAX8_COLUMNS.join(','), pax.replace('customer_name', 'CUSTOMER_REF'), pax.replace('customer_name', ''), pax + 'last,wrong\n', pax + '"unclosed', pax + '"closed"junk']) {
    await assert.rejects(read(file(text)), repair('pax-file'));
  }
});

test('F13P1-M11 exact original byte admission and multibyte accounting use declared limits', async () => {
  const edge = padCsvBytes(pax, FILE_SUPPORT.limits.inputBytes);
  assert.equal(Buffer.byteLength(edge), 2000000); assert.equal(await read(file(edge)), edge);
  let reads = 0;
  await assert.rejects(read({ size: 2000001, text() { reads++; }, arrayBuffer() { reads++; } }), repair('pax-file')); assert.equal(reads, 0);
  await assert.rejects(read(file(edge + '\n')), repair('pax-file'));
});

test('F13P1-M12 reader enforces published rows columns header and UTF16 cell bounds through sole parser', async () => {
  const header = PAX8_COLUMNS.join(','); const row = 's,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew';
  assert.equal((await read(file(header + '\n' + Array(5000).fill(row).join('\n')))).split('\n').length, 5001);
  for (const text of [header + '\n' + Array(5001).fill(row).join('\n'), pax.replace('Café', '😀'.repeat(513)), pax.replace('customer_name', 'x'.repeat(65)), header + ',' + Array.from({ length: 56 }, (_, i) => 'x' + i).join(',') + '\n' + row + ',' + Array(56).fill('v').join(',')]) await assert.rejects(read(file(text)), repair('pax-file'));
  assert.equal(await read(file(pax.replace('Café', '😀'.repeat(512)))), pax.replace('Café', '😀'.repeat(512)));
});

test('F13P1-M13 text and byte read failures share one deadline and safe recoverable routing', async () => {
  for (const phase of ['text', 'arrayBuffer']) for (const mode of ['reject', 'stall']) {
    const input = file(); input[phase] = () => mode === 'reject' ? Promise.reject(Error('IO')) : new Promise(() => {});
    await assert.rejects(read(input, 'pax-file', 'compare-records', 10), error => repair('pax-file')(error) && new RegExp(mode === 'stall' ? 'timed out' : 'UTF-8').test(error.message));
  }
  for (const timeout of [0, -1, NaN, Infinity, 30001, '10']) await assert.rejects(read(file(), 'pax-file', 'compare-records', timeout), TypeError);
  assert.equal(await read(file()), pax);
});

test('F13P1-M14 missing unusable sizes route to exact source without file content reads', async () => {
  for (const target of ['pax-file', 'halo-file']) {
    await assert.rejects(read(undefined, target), repair(target));
    for (const size of [undefined, NaN, Infinity, -1, 1.5, '10']) await assert.rejects(read({ size }, target), repair(target));
  }
});

test('F13P1-M15 structural profile recognition does not assert source facts native origin or case authority', async () => {
  const supplied = pax.replace(',pax8,', ',other,'); assert.equal(await read(file(supplied, 'verified-native-pax8.csv')), supplied);
  const finder = createCaseFinder(supplied); const result = searchCaseFinder(finder, {});
  assert.equal(result.rows[0].subscriptionId, 's'); assert.notEqual(result.authenticated, true);
  assert.equal(Object.hasOwn(result, 'financialVerdict'), false);
});

test('F13P1-M16 supported operation success remains decoded evidence without a new grant or fallback', async () => {
  assert.equal(await read(file(), 'pax-file', 'find-case'), pax);
  assert.equal(await read(file(halo), 'halo-file', 'compare-records'), halo);
  await assert.rejects(read(file(halo), 'halo-file', 'find-case'), /unavailable/);
  assert.equal(typeof await read(file()), 'string');
});
