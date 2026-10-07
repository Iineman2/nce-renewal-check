import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCaseSubject, assertCaseSubject, PAX8_COLUMNS } from './preflight.mjs';

const base = ['s', 'c', 'pax8', 'Microsoft 365', 'NCE', 'yes', 'annual', '2027-01-15', 'renew'];
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const file = (extras = [], values = [], record = base) => [...PAX8_COLUMNS, ...extras].join(',') + '\n' + [...record, ...values].map(quote).join(',');
const field = (subject, name) => subject.evidence.fields.find(value => value.column === name);

test('evidence retains all ordered supplied columns and original headers including numeric and prototype keys', () => {
  const text = file([' 1 ', '__proto__', ' Notes ', 'seat_count'], ['a', 'b', '  spaced  ', '']);
  const result = selectCaseSubject(text, 's'); const e = result.subject.evidence;
  assert.equal(e.version, 'selected-source-evidence-v2'); assert.equal(e.authenticated, false);
  assert.deepEqual(e.fields.map(f => f.column), [...PAX8_COLUMNS, '1', '__proto__', 'notes', 'seat_count']);
  const note = field(result.subject, 'notes');
  assert.deepEqual(Object.fromEntries(['column','originalHeader','rawValue','normalizedValue'].map(key => [key,note[key]])), {column:'notes', originalHeader:' Notes ', rawValue:'  spaced  ', normalizedValue:'spaced'});
  assert.equal(note.columnIndex,12); assert.equal(text.slice(note.startOffset,note.endOffset),note.lexeme); assert.equal(note.header.rawValue,' Notes ');
  assert.equal(field(result.subject, 'seat_count').rawValue, '');
  assert.equal(field(result.subject, '__proto__').normalizedValue, 'b');
});

test('lexical evidence and exact UTF16 offsets preserve BOM, blank records, CRLF, quotes and multiline cells', () => {
  for (const delimiter of ['\n', '\r\n', '\r']) for (const bom of ['', '\uFEFF']) for (const terminator of ['', delimiter]) {
    const original = [...base, '  comma, quote " and\r\nline\nnext\rtail 😀  ', ''].map(quote).join(',');
    const text = bom + delimiter + [...PAX8_COLUMNS, 'notes', 'empty'].join(',') + delimiter + delimiter + base.map(quote).join(',') + ',other,x' + delimiter + delimiter + original + terminator;
    // The preceding row has the same ID: distinguish it explicitly before selecting.
    const source = text.replace(base.map(quote).join(',') + ',other,x', ['other', ...base.slice(1)].map(quote).join(',') + ',other,x');
    const result = selectCaseSubject(source, 's'); const e = result.subject.evidence;
    assert.equal(result.subject.recordNumber, 2);
    assert.equal(e.originalRecord, original);
    assert.equal(e.startOffset, source.indexOf(original));
    assert.equal(e.endOffset, e.startOffset + original.length);
    assert.equal(source.slice(e.startOffset, e.endOffset), original);
    assert.equal(field(result.subject,'notes').rawValue, '  comma, quote " and\r\nline\nnext\rtail 😀  ');
    assert.equal(field(result.subject,'notes').normalizedValue, 'comma, quote " and\r\nline\nnext\rtail 😀');
  }
});

test('literal hostile/control data and unknown identity remain inspectable without invented values', () => {
  const raw = '<script>alert(1)</script> =SUM(A1)\u202e\u200b\t';
  const result = selectCaseSubject(file(['notes'],[raw], ['s','','pax8','Microsoft 365','NCE','yes','annual','unknown','renew']), 's');
  assert.equal(result.status, 'unresolved'); assert.equal(result.subject.customerRef,null);
  assert.equal(result.subject.renewalDate,null);
  assert.equal(field(result.subject,'notes').rawValue,raw);
  assert.equal(field(result.subject,'customer_ref').rawValue,'');
  assert.equal(field(result.subject,'renewal_date').normalizedValue,'unknown');
  assert.ok(result.subject.evidence.originalRecord.includes('<script>'));
});

test('no absent/duplicate/invalid or partially malformed source produces evidence for a fabricated subject', () => {
  const text = file();
  for (const id of ['absent', '', 's\u200b']) assert.equal(selectCaseSubject(text,id).subject,null);
  assert.equal(selectCaseSubject(text+'\n'+base.map(quote).join(','),'s').subject,null);
  for (const tail of ['\nwrong,shape', '\n"unclosed']) assert.throws(()=>selectCaseSubject(text+tail,'s'));
});

test('canonical assertion rejects evidence corruption, serialization loss, extra authority and source substitution', () => {
  const source = file(['notes'], ['  note  ']); const original = selectCaseSubject(source,'s');
  assert.deepEqual(assertCaseSubject(JSON.parse(JSON.stringify(original)), source, 's'),original);
  const mutations = [s=>s.subject.evidence.originalRecord+='x',s=>s.subject.evidence.startOffset++,s=>s.subject.evidence.endOffset++,s=>s.subject.evidence.version='v0',s=>s.subject.evidence.authenticated=true,s=>s.subject.evidence.fields.reverse(),s=>s.subject.evidence.fields[0].rawValue='other',s=>s.subject.evidence.fields[0].normalizedValue='other',s=>s.subject.evidence.fields[0].originalHeader='other',s=>delete s.subject.evidence,s=>s.subject.evidence.fields.pop(),s=>s.subject.evidence.actionAuthorized=true];
  for (const mutate of mutations) {const copy=JSON.parse(JSON.stringify(original));mutate(copy);assert.throws(()=>assertCaseSubject(copy,source,'s'));}
  assert.throws(()=>assertCaseSubject(original,source.replace('  note  ','replacement'),'s'));
  assert.throws(()=>assertCaseSubject(original,source.replace('notes',' Notes '),'s'));
  assert.throws(()=>assertCaseSubject(original,'\n'+source,'s'));
});

test('evidence assertion rejects accessors without invocation and returns deeply immutable private canonical data', () => {
  const source=file(); const projection=JSON.parse(JSON.stringify(selectCaseSubject(source,'s')));let reads=0;
  Object.defineProperty(projection.subject.evidence,'originalRecord',{get(){reads++;return 'wrong';},enumerable:true});
  assert.throws(()=>assertCaseSubject(projection,source,'s'));assert.equal(reads,0);
  const subject=assertCaseSubject(selectCaseSubject(source,'s'),source,'s').subject;
  for (const value of [subject,subject.evidence,subject.evidence.fields,...subject.evidence.fields]) assert.ok(Object.isFrozen(value));
  assert.throws(()=>{subject.evidence.fields[0].rawValue='wrong';});
});

test('maximal row and column evidence is complete without truncation at supported parser limits', () => {
  const extras=Array.from({length:64-PAX8_COLUMNS.length},(_,i)=>'extra_'+i);
  const values=extras.map(()=> 'x'.repeat(1024)); const selected=file(extras,values);
  const header=selected.slice(0,selected.indexOf('\n'));
  const ordinary=[...base,...extras.map(()=> '')];
  const rows=Array.from({length:1022},(_,i)=>[String(i),...ordinary.slice(1)].join(','));
  const original=selected.slice(selected.indexOf('\n')+1);
  const source=header+'\n'+rows.join('\n')+'\n'+original;
  const result=assertCaseSubject(selectCaseSubject(source,'s'),source,'s');
  assert.equal(result.subject.recordNumber,1023); assert.equal(result.subject.evidence.fields.length,64);
  assert.equal(result.subject.evidence.originalRecord,original);
  assert.equal(result.subject.evidence.fields.at(-1).rawValue.length,1024);
  assert.throws(()=>selectCaseSubject(file(['notes'],['x'.repeat(1025)]),'s'));
});
