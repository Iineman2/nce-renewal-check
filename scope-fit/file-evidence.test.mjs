import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readLocalEvidence, readLocalFile, assertLocalEvidence, FileEvidenceRuntimeError } from './runtime.mjs';
import { assertClaimReview } from './claims.mjs';
import { POLICY_VERSION } from './fit.mjs';
import { captureFileEvidence, sourceProjection, assertSourceProjection, sourceText, sourceMatches, originalBytes, releaseFileEvidence } from './file-evidence.mjs';
import { scanCsvEvidence } from './csv-evidence.mjs';
import { parseCsv, PAX8_COLUMNS, HALO_COLUMNS, selectCaseSubject, assertCaseSubject, inspectRecords, captureRecordDecision, createCaseFinder, searchCaseFinder } from './preflight.mjs';
import { SOURCES, InputProblem } from './actions.mjs';

const pax = [...PAX8_COLUMNS,'source_account_id','customer_name','notes'].join(',') + '\r\ns,c,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew,a," Café😀 ","a""b\nc" \t\r\n';
const halo = HALO_COLUMNS.join(',') + '\nl,s,c," HaloPSA "\n';
const native = (text = pax, name = 'same.csv') => new File([text], name);
const read = (file = native(), role = 'pax-file', timeout = 30000) => readLocalEvidence(file, role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo, timeout);
const hash = value => createHash('sha256').update(value).digest('hex');
const nativeDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
const clone = value => JSON.parse(JSON.stringify(value));
const input = () => ({ pax8Text: pax, haloText: halo, subscriptionId: 's', today: '2026-10-03', renewalTerm: 'annual', answers: { reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2026-10-15',agreement:'yes' } });

test('F13P2-M01 original recovery hashes exact BOM quoting whitespace and mixed terminator bytes', async () => {
  for (const text of [pax, '\uFEFF'+pax, '\uFEFF\uFEFF'+pax, pax.replaceAll('\r\n','\r')]) {
    const file = native(text), evidence = await read(file); assert.equal(evidence.problem,null);
    assert.equal(evidence.text,text); const bytes = Buffer.from(originalBytes(evidence.handle,'pax-file'));
    assert.deepEqual(bytes,Buffer.from(text)); assert.equal(sourceProjection(evidence.handle,'pax-file').sha256,hash(bytes));
    assert.equal(sourceProjection(evidence.handle,'pax-file').byteLength,bytes.length); releaseFileEvidence(evidence.handle);
  }
});
test('F13P2-M02 custody copies before asynchronous hashing can observe mutated caller bytes', async () => {
  const bytes = Buffer.from(pax), buffer = Uint8Array.from(bytes).buffer;
  const promise = captureFileEvidence(buffer,'pax-file',native()); new Uint8Array(buffer).fill(0);
  const handle = await promise; assert.deepEqual(Buffer.from(originalBytes(handle,'pax-file')),bytes); assert.equal(sourceText(handle,'pax-file'),pax); releaseFileEvidence(handle);
});
test('F13P2-M03 byte fulfillment captures before a pending sibling native text read', async () => {
  const original = Buffer.from(pax), buffer = Uint8Array.from(original).buffer; let finish;
  const file = { size: original.length, name:'source', text: () => new Promise(resolve=>{finish=resolve;}), arrayBuffer: async()=>buffer };
  const promise = read(file); await new Promise(resolve=>setTimeout(resolve,25)); new Uint8Array(buffer).fill(0); finish(pax);
  const evidence = await promise; assert.equal(evidence.problem,null); assert.deepEqual(Buffer.from(originalBytes(evidence.handle,'pax-file')),original); releaseFileEvidence(evidence.handle);
});
test('F13P2-M04 recovery buffers are defensive and immutable projections cannot mutate custody', async () => {
  const e = await read(); const before=sourceProjection(e.handle,'pax-file'); const copy=originalBytes(e.handle,'pax-file'); copy.fill(0);
  assert.equal(hash(originalBytes(e.handle,'pax-file')),before.sha256); assert.ok(Object.isFrozen(before.records[0].cells[0]));
  assert.throws(()=>{before.records[0].cells[0].lexeme='forged';}); releaseFileEvidence(e.handle);
});
test('F13P2-M05 equal bytes retain distinct occurrence handles and cannot revive revoked evidence', async () => {
  const first=native(),second=native(); const a=await read(first),b=await read(second);
  assert.notStrictEqual(a.handle,b.handle); assert.equal(sourceProjection(a.handle,'pax-file').sha256,sourceProjection(b.handle,'pax-file').sha256);
  assert.equal(sourceMatches(a.handle,'pax-file',first),true); assert.equal(sourceMatches(a.handle,'pax-file',second),false);
  releaseFileEvidence(a.handle); assert.throws(()=>originalBytes(a.handle,'pax-file')); assert.ok(originalBytes(b.handle,'pax-file').length); releaseFileEvidence(b.handle);
});
test('F13P2-M06 identical filename MIME and size never establish original content identity', async () => {
  const first=native(pax,'same.csv'),second=native(pax.replace('Café','Cafè'),'same.csv');
  assert.equal(first.size,second.size);assert.equal(first.name,second.name);assert.equal(first.type,second.type);
  const a=await read(first),b=await read(second);
  assert.equal(sourceProjection(a.handle,'pax-file').byteLength,sourceProjection(b.handle,'pax-file').byteLength);
  assert.notEqual(sourceProjection(a.handle,'pax-file').sha256,sourceProjection(b.handle,'pax-file').sha256); releaseFileEvidence(a.handle); releaseFileEvidence(b.handle);
});
test('F13P2-M07 wrong role cloned serialized forged and revoked handles cannot expose bytes', async () => {
  const e=await read(); for(const h of [{},clone(e.handle),Object.create(e.handle),null]) assert.throws(()=>originalBytes(h,'pax-file'));
  assert.throws(()=>sourceProjection(e.handle,'halo-file')); releaseFileEvidence(e.handle); releaseFileEvidence(e.handle); assert.throws(()=>sourceText(e.handle,'pax-file'));
});
test('F13P2-M08 projection verification rejects changed identity locators values order and authority', async () => {
  const e=await read();const p=sourceProjection(e.handle,'pax-file'); assert.deepEqual(assertSourceProjection(clone(p),e.handle,'pax-file'),p);
  for(const mutate of [x=>x.sha256='0'.repeat(64),x=>x.byteLength++,x=>x.role='halo-file',x=>x.authenticated=true,x=>x.actionAuthorized=true,x=>x.records.reverse(),x=>x.records[1].cells[0].startByte++,x=>x.records[1].cells[0].lexeme='other',x=>delete x.headers]) { const x=clone(p);mutate(x);assert.throws(()=>assertSourceProjection(x,e.handle,'pax-file')); }
  releaseFileEvidence(e.handle);
});
test('F13P2-M09 accessor and exotic projections reject without invoking evidence getters', async () => {
  const e=await read();const p=clone(sourceProjection(e.handle,'pax-file'));let calls=0;
  Object.defineProperty(p,'sha256',{get(){calls++;return 'bad';},enumerable:true});assert.throws(()=>assertSourceProjection(p,e.handle,'pax-file'));assert.equal(calls,0);releaseFileEvidence(e.handle);
});
test('F13P2-M10 invalid UTF8 and UTF16 retain exact originals without invented decoded text', async () => {
  for(const bytes of [[255],[192,175],[255,254,65,0],[254,255,0,65]]) {const e=await read(native(Uint8Array.from(bytes)));assert.ok(e.problem instanceof InputProblem);assert.equal(e.text,null);const p=sourceProjection(e.handle,'pax-file');assert.equal(p.decoding,'unavailable');assert.equal(p.records.length,0);assert.deepEqual([...originalBytes(e.handle,'pax-file')],bytes);releaseFileEvidence(e.handle);}
});
test('F13P2-M11 byte text disagreement retains original while normalized operation fails', async () => {
  const file=native();file.text=async()=>pax.replace('Café','Fake');const e=await read(file);assert.match(e.problem.message,/disagree/);assert.equal(e.text,pax);assert.equal(hash(originalBytes(e.handle,'pax-file')),hash(Buffer.from(pax)));releaseFileEvidence(e.handle);
});
test('F13P2-M12 rejected and malformed profiles retain original prefix without granting case authority', async () => {
  for(const text of ['a,a\nx,y\n','a,\nx,y\n',pax+'"unclosed',pax+'wrong,width\n']) {const e=await read(native(text));assert.ok(e.problem instanceof InputProblem);assert.equal(sourceProjection(e.handle,'pax-file').actionAuthorized,false);assert.deepEqual(Buffer.from(originalBytes(e.handle,'pax-file')),Buffer.from(text));assert.throws(()=>selectCaseSubject(text,'s'));releaseFileEvidence(e.handle);}
});
test('F13P2-M13 acquisition text rejection size mismatch and invalid buffers expose no successful receipt', async () => {
  const file=native();file.text=async()=>{throw Error('unavailable');};await assert.rejects(read(file),InputProblem);
  const failedBytes=native();failedBytes.arrayBuffer=async()=>{throw Error('unavailable');};await assert.rejects(read(failedBytes),InputProblem);
  const forgedSize=native();Object.defineProperty(forgedSize,'size',{get(){throw new InputProblem('external size failure','pax-file',SOURCES.pax);}});await assert.rejects(read(forgedSize),FileEvidenceRuntimeError);
  const forgedReader=native();Object.defineProperty(forgedReader,'arrayBuffer',{get(){throw new InputProblem('external method failure','pax-file',SOURCES.pax);}});await assert.rejects(read(forgedReader),FileEvidenceRuntimeError);
  for(const role of ['pax-file','halo-file']) {let oldRepair;try{await read(null,role);}catch(error){oldRepair=error;}assert.ok(oldRepair instanceof InputProblem);const replay=native();Object.defineProperty(replay,'size',{get(){throw oldRepair;}});await assert.rejects(read(replay),error=>error instanceof FileEvidenceRuntimeError&&error!==oldRepair);}
  for(const value of [{size:1,text:async()=>pax,arrayBuffer:()=>native().arrayBuffer()},{size:1,text:async()=>pax,arrayBuffer:async()=>Uint8Array.of(65)}]) await assert.rejects(read(value));
});
test('F13P2-M14 missing rejecting nonconforming and malformed digest runtimes fail technically', async () => {
  const old=globalThis.crypto.subtle.digest;
  try {
    for(const digest of [undefined,async()=>{throw Error('hash failed');},async()=>{throw new InputProblem('external hash failure','pax-file',SOURCES.pax);},async()=>{throw 0;},async()=>new ArrayBuffer(32),async()=>Uint8Array.from(Buffer.from('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad','hex')),async()=>new ArrayBuffer(31)]) {
      globalThis.crypto.subtle.digest=digest;await assert.rejects(read(),FileEvidenceRuntimeError);
    }
  } finally {globalThis.crypto.subtle.digest=old;}
});
test('F13P2-M15 an invalid actual digest cannot pass a conforming known vector', async () => {
  const old=globalThis.crypto.subtle.digest;let calls=0;
  try {globalThis.crypto.subtle.digest=async(...args)=>++calls===1?nativeDigest(...args):Uint8Array.of(0);await assert.rejects(read(),TypeError);}finally{globalThis.crypto.subtle.digest=old;}
});
test('F13P2-M16 hashing shares the acquisition deadline and late completion cannot return evidence', async () => {
  const old=globalThis.crypto.subtle.digest;let finish,settled=false;
  try {globalThis.crypto.subtle.digest=(...args)=>args[1].byteLength===3?Promise.resolve(Uint8Array.from(Buffer.from('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad','hex')).buffer):new Promise(resolve=>{finish=async()=>{resolve(await nativeDigest(...args));settled=true;};});await assert.rejects(read(native(),'pax-file',50),error=>error instanceof InputProblem&&/timed out/.test(error.message));assert.equal(typeof finish,'function');await finish();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(settled,true);}finally{globalThis.crypto.subtle.digest=old;}
});
test('F13P2-M17 decoder faults cannot invent BOM preserving or fatal decoding success', async () => {
  const old=globalThis.TextDecoder;
  try {globalThis.TextDecoder=class {decode(bytes){return bytes.length===1?'A\uFFFD':'forged';}};await assert.rejects(read(),TypeError);}finally{globalThis.TextDecoder=old;}
});
test('F13P2-M18 legacy wrapper strips exactly one BOM and evidence coordinates retain all bytes', async () => {
  for(const prefix of ['','\uFEFF','\uFEFF\uFEFF']) {const file=native(prefix+pax);assert.equal(await readLocalFile(file,'pax-file',SOURCES.pax),(prefix+pax).replace(/^\uFEFF/,''));const e=await read(file);assert.equal(e.text,prefix+pax);assert.equal(sourceProjection(e.handle,'pax-file').records[0].startByte,prefix?3:0);releaseFileEvidence(e.handle);}
});
test('F13P2-M19 independent positional lexemes include postquote whitespace and exact byte boundaries', () => {
  const text='\uFEFFH,I\r\n" Café😀 " \t,"a""b\nc"\r';const scan=scanCsvEvidence(text);assert.equal(scan.complete,true);
  const data=scan.records[1];const a=data.cells[0],b=data.cells[1];
  assert.equal(text.slice(0,6),'\uFEFFH,I\r\n');
  assert.deepEqual([a.startOffset,a.endOffset,a.startByte,a.endByte],[6,18,8,23]);
  assert.deepEqual([b.startOffset,b.endOffset,b.startByte,b.endByte],[19,27,24,32]);
  assert.equal(a.lexeme,'" Café😀 " \t');assert.equal(a.rawValue,' Café😀 ');assert.equal(a.normalizedValue,'Café😀');assert.equal(b.rawValue,'a"b\nc');assert.equal(data.terminator,'\r');
});
test('F13P2-M20 repeated values retain distinct column and record locations', () => {
  const text='A,B,C\nx,"x" \t,x\nx,x,x';const records=scanCsvEvidence(text).records;
  assert.deepEqual(records[1].cells.map(c=>[c.startOffset,c.endOffset]),[[6,7],[8,13],[14,15]]);
  assert.deepEqual(records[2].cells.map(c=>[c.startOffset,c.endOffset]),[[16,17],[18,19],[20,21]]);assert.equal(records[1].cells[1].columnIndex,2);
});
test('F13P2-M21 mixed empty runs retain ordinals ranges counts and avoid phantom EOF records', () => {
  const text='\n,\r\n""\rH,I\n, \nA,B\r\n\n';const scan=scanCsvEvidence(text);assert.equal(scan.sourceRecordCount,7);assert.equal(scan.records.length,3);
  assert.deepEqual(scan.emptyRuns.map(r=>r.count),[3,1]);assert.deepEqual(scan.records.map(r=>[r.sourceRecordOrdinal,r.dataRecordNumber]),[[4,null],[5,1],[6,2]]);
  assert.equal(text.slice(scan.emptyRuns[0].startOffset,scan.emptyRuns[0].endOffset),'\n,\r\n""\r');assert.equal(scan.records[1].cells[1].rawValue,' ');
});
test('F13P2-M22 two megabytes of blank records stop at the lexical record budget with exact original custody', () => {
  const prefix='a,b\nx,y\n',count=2000000-prefix.length;const scan=scanCsvEvidence(prefix+'\n'.repeat(count));assert.equal(scan.complete,false);assert.match(scan.failure.message,/10000 lexical source records/);assert.equal(scan.records.length,2);assert.equal(scan.emptyRuns.length,1);assert.equal(scan.emptyRuns[0].count,9998);assert.equal(scan.sourceRecordCount,10000);
});
test('F13P2-M23 blank duplicate normalized and prototype headers remain positional rejected evidence', () => {
  for(const text of ['A,a,__proto__\nx,y,z','A,,__proto__\nx,y,z']) {const scan=scanCsvEvidence(text);assert.equal(scan.complete,true);assert.equal(scan.records[0].cells.length,3);assert.equal(scan.records[0].cells[2].rawValue,'__proto__');assert.throws(()=>parseCsv(text,[]));}
});
test('F13P2-M24 malformed final unselected records expose a precise partial lexical failure', () => {
  for(const tail of ['"unclosed','bad"quote','"x"wrong']) {const text='A,B\nx,y\n'+tail;const scan=scanCsvEvidence(text);assert.equal(scan.complete,false);assert.equal(scan.records.length,2);assert.equal(scan.failure.sourceRecordOrdinal,3);assert.ok(scan.failure.startOffset>=8);assert.equal(scan.failure.startByte,scan.failure.startOffset);assert.throws(()=>parseCsv(text,[]));}
});
test('F13P2-M25 invalid Unicode has no invented original byte coordinate', () => {
  const scan=scanCsvEvidence('A\n\ud800');assert.equal(scan.complete,false);assert.equal(scan.failure.startByte,null);assert.equal(scan.failure.startOffset,null);assert.equal(scan.records.length,0);
});
test('F13P2-M26 supplementary characters never yield a locator inside a surrogate pair', () => {
  const text='\uFEFF漢,😀\n😀,漢\n';const scan=scanCsvEvidence(text);for(const record of scan.records)for(const cell of record.cells) {assert.equal(cell.startByte,Buffer.byteLength(text.slice(0,cell.startOffset)));assert.equal(cell.endByte,Buffer.byteLength(text.slice(0,cell.endOffset)));assert.equal(text.slice(cell.startOffset,cell.endOffset),cell.lexeme);assert.notEqual(cell.startByte,0xffffffff);assert.notEqual(cell.endByte,0xffffffff);}
});
test('F13P2-M27 projected Pax8 and Halo comparison claims retain their own exact source locators', () => {
  const result=inspectRecords(input());for(const [key,text] of [['distributor',pax],['billing',halo],['commitment',pax],['renewalDate',pax]]) {const fact=result.provenance[key];assert.equal(fact.trace.origin,'decoded-text-only');assert.deepEqual(fact.trace.fields.map(f=>f.column),fact.columns);for(const field of fact.trace.fields) {assert.equal(text.slice(field.startOffset,field.endOffset),field.lexeme);assert.equal(field.startByte,Buffer.byteLength(text.slice(0,field.startOffset)));}}
  assert.equal(result.claimReview.fields.find(f=>f.key==='billing').supplied.trace.fields[0].rawValue,' HaloPSA ');assert.equal(result.claimReview.fields.at(-1).supplied.trace.fields[0].column,'end_of_term_state');assert.equal(result.financialVerdict,null);
});
test('F13P2-M28 selected row locators preserve exact header record terminator and canonical corruption rejection', () => {
  const selected=selectCaseSubject('\uFEFF'+pax,'s'),e=selected.subject.evidence;assert.equal(e.version,'selected-source-evidence-v2');assert.equal(e.origin,'decoded-text-only');assert.equal(e.terminator,'\r\n');assert.equal(e.fields[0].header.lexeme,'subscription_id');
  for(const mutate of [x=>x.subject.evidence.fields[0].startByte++,x=>x.subject.evidence.fields[0].header.endByte++,x=>x.subject.evidence.sourceRecordOrdinal++,x=>x.subject.evidence.terminator='\n']) {const x=clone(selected);mutate(x);assert.throws(()=>assertCaseSubject(x,'\uFEFF'+pax,'s'));}
});
test('F13P2-M29 finder previews retain compact source coordinates without transferring confirmation', () => {
  const row=searchCaseFinder(createCaseFinder('\uFEFF'+pax)).rows[0];assert.equal(row.sourceLocator.sourceRecordOrdinal,2);assert.equal(row.sourceLocator.startByte,Buffer.byteLength(('\uFEFF'+pax).slice(0,row.sourceLocator.startOffset)));assert.equal(row.selectionStatus,undefined);assert.ok(Object.isFrozen(row.sourceLocator));
});
test('F13P2-M30 all retained records are reachable through fixed five record source pages', async () => {
  const text='a,b\n'+Array.from({length:11},(_,i)=>`${i},value\n`).join('');const e=await read(native(text));assert.ok(e.problem);const seen=[];
  for(let offset=0;offset<12;offset+=5) {const p=sourceProjection(e.handle,'pax-file',offset);assert.ok(p.records.length<=5);seen.push(...p.records.map(r=>r.sourceRecordOrdinal));assert.deepEqual(assertSourceProjection(clone(p),e.handle,'pax-file',offset),p);}
  assert.deepEqual(seen,Array.from({length:12},(_,i)=>i+1));for(const offset of [-1,0.5,12,'0'])assert.throws(()=>sourceProjection(e.handle,'pax-file',offset));releaseFileEvidence(e.handle);
});
test('F13P2-M31 whole decision capture rejects forged source claim and selected cell byte locations', () => {
  const original=inspectRecords(input());for(const mutate of [x=>x.provenance.billing.trace.fields[0].startByte++,x=>x.claimReview.fields.find(f=>f.key==='billing').supplied.trace.fields[0].endOffset++]) {const x=clone(original);mutate(x);assert.throws(()=>captureRecordDecision(x,input()));}
});
test('F13P2-M32 combined wide row work stops at total cell budget and keeps partial previews bounded', async () => {
  const headers=Array.from({length:64},(_,i)=>'h'+i).join(',');const row=Array.from({length:64},()=> 'x').join(',');const text=headers+'\n'+(row+'\n').repeat(5000);const e=await read(native(text));assert.ok(e.problem);const p=sourceProjection(e.handle,'pax-file');assert.equal(p.lexicalComplete,false);assert.match(p.failure.message,/65536 total cells/);assert.equal(p.recordCount,1024);assert.equal(p.records.length,1);assert.equal(p.records[0].cells.length,64);assert.equal(sourceProjection(e.handle,'pax-file',1023).records.length,1);releaseFileEvidence(e.handle);
});
test('F13P2-M33 mutating digest dependencies receive copies and cannot rewrite originals', async () => {
  const old=globalThis.crypto.subtle.digest,buffer=Uint8Array.from(Buffer.from(pax)).buffer;let calls=0;
  try {globalThis.crypto.subtle.digest=async(algorithm,bytes)=>{if(++calls===2)bytes.fill(0);return nativeDigest(algorithm,bytes);};await assert.rejects(captureFileEvidence(buffer,'pax-file',native()),TypeError);assert.deepEqual(Buffer.from(buffer),Buffer.from(pax));}finally{globalThis.crypto.subtle.digest=old;}
});
test('F13P2-M34 mutating or false decoder dependencies cannot rewrite custody or invent derivatives', async () => {
  const old=globalThis.TextDecoder,buffer=Uint8Array.from(Buffer.from(pax)).buffer;
  try {globalThis.TextDecoder=class extends old {decode(bytes){if(bytes.length>20)bytes[0]=0;return super.decode(bytes);}};await assert.rejects(captureFileEvidence(buffer,'pax-file',native()),TypeError);assert.deepEqual(Buffer.from(buffer),Buffer.from(pax));}finally{globalThis.TextDecoder=old;}
});
test('F13P2-M35 only issued immutable acquisition outcomes can declare reading success or failure', async () => {
  const file=native('a,a\nx,y'),e=await read(file);assert.strictEqual(assertLocalEvidence(e,'pax-file',file),e);
  for(const fake of [{...e,problem:null},{...e},clone(e)])assert.throws(()=>assertLocalEvidence(fake,'pax-file',file));assert.throws(()=>assertLocalEvidence(e,'halo-file',file));assert.throws(()=>{e.problem.message='success';});releaseFileEvidence(e.handle);assert.throws(()=>assertLocalEvidence(e,'pax-file',file));
});
test('F13P2-M36 extra undefined keys and array object aliases never equal canonical projections', async () => {
  const e=await read(),p=clone(sourceProjection(e.handle,'pax-file'));p.extra=undefined;assert.throws(()=>assertSourceProjection(p,e.handle,'pax-file'));delete p.extra;p.records=Object.fromEntries(p.records.map((r,i)=>[i,r]));assert.throws(()=>assertSourceProjection(p,e.handle,'pax-file'));releaseFileEvidence(e.handle);
});
test('F13P2-M37 row limit failures name the offending ordinal and skipped records have no data number', () => {
  const scan=scanCsvEvidence('a\n'+'x\n'.repeat(5001));assert.equal(scan.complete,false);assert.equal(scan.failure.sourceRecordOrdinal,5002);assert.equal(scan.failure.startOffset,10002);
  const blank=scanCsvEvidence('a\nx\n\n');assert.equal(blank.emptyRuns[0].firstRecord.dataRecordNumber,null);assert.equal(blank.emptyRuns[0].firstRecord.sourceRecordOrdinal,3);
});
test('F13P2-M38 mandatory source traces reject missing foreign and consistently shifted locations', () => {
  const original=inspectRecords(input());for(const mutate of [x=>delete x.claimReview.fields.find(f=>f.key==='billing').supplied.trace,x=>x.provenance.billing.trace.fields[0].column='alien',x=>{const t=x.provenance.billing.trace;t.recordLocation.startOffset++;t.recordLocation.endOffset++;t.recordLocation.startByte++;t.recordLocation.endByte++;for(const f of t.fields){f.startOffset++;f.endOffset++;f.startByte++;f.endByte++;}}]) {const x=clone(original);mutate(x);assert.throws(()=>captureRecordDecision(x,input()));}
});
test('F13P2-M39 claim schema rejects absent traces and raw header column or out of record inconsistencies', () => {
  const original=inspectRecords(input()).claimReview;
  const validate=x=>assertClaimReview(x,{type:'record',policyVersion:POLICY_VERSION,today:'2026-10-03',status:'needs-record-link-confirmation'});validate(original);
  for(const mutate of [x=>delete x.fields[1].supplied.trace,x=>x.fields[1].supplied.trace.fields[0].startByte=999999,x=>x.fields[1].supplied.trace.fields[0].column='alien',x=>x.fields[1].supplied.trace.fields[0].header.rawValue='other']) {const x=clone(original);mutate(x);assert.throws(()=>validate(x));}
});
test('F13P2-M40 optional scheduled and economic claim passages resolve through the same source parser', () => {
  const rows=pax.split('\r\n');const text=rows[0]+',billing_frequency,scheduled_commitment_term\r\n'+rows[1]+',monthly,annual\r\n';const i={...input(),pax8Text:text};const result=inspectRecords(i);assert.doesNotThrow(()=>captureRecordDecision(result,i));
  const economic=result.claimReview.contributors.economicContext.trace;assert.deepEqual(economic.fields.map(f=>f.column),['billing_frequency','scheduled_commitment_term']);
  for(const field of economic.fields)assert.equal(text.slice(field.startOffset,field.endOffset),field.lexeme);assert.equal(result.claimReview.fields.find(f=>f.key==='renewalTerm').supplied.trace.fields[0].column,'scheduled_commitment_term');
});
