import test from 'node:test';
import assert from 'node:assert/strict';
import { File, isUtf8 } from 'node:buffer';
import { createHash } from 'node:crypto';
import { captureRecordDecision, inspectRecords, PAX8_COLUMNS, HALO_COLUMNS, createCaseHandoff, confirmCaseSelection,
  parseCsv, createCaseFinder, searchCaseFinder, assertCaseFinder, rowSourceTrace } from './preflight.mjs';
import { readLocalEvidence, FileEvidenceRuntimeError, assertLocalEvidence } from './runtime.mjs';
import { captureFileEvidence, sourceProjection, originalBytes, sourceText, releaseFileEvidence, assertSourceProjection } from './file-evidence.mjs';
import { SOURCES, InputProblem, inputFailure } from './actions.mjs';
import { scanCsvEvidence } from './csv-evidence.mjs';
import { frozenData } from './input.mjs';

const quote = value => '"' + value.replaceAll('"', '""') + '"';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseline = (state = 'renew') => ({
  pax8Text: [...PAX8_COLUMNS, 'source_account_id', 'scheduled_commitment_term'].join(',') + '\ns,c,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,'+state+',a,annual\n',
  haloText: HALO_COLUMNS.join(',')+'\nl,s,c,HaloPSA\n', subscriptionId:'s', today:'2026-10-03', renewalTerm:'annual',
  answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2026-10-15',agreement:'yes'},
});
const issued = (input = baseline()) => {
  const receipt = confirmCaseSelection(input.pax8Text, input.subscriptionId);
  input.linkConfirmation = {confirmed:true,basis:inspectRecords(input).reviewBasis};
  return {input, receipt, decision:inspectRecords(input, createCaseHandoff(input.pax8Text,input.subscriptionId,receipt),receipt)};
};
const copyDecision = d => {const copy = structuredClone(d); if(d.caseHandoff)copy.caseHandoff=d.caseHandoff;return copy;};
const native = (text, name='same.csv', options={}) => new File([text],name,options);
const read = (file, role='pax-file', ms=30000) => readLocalEvidence(file,role,role==='pax-file'?SOURCES.pax:SOURCES.halo,ms);
const bytesFile = (bytes, text = new TextDecoder().decode(bytes)) => ({name:'source.csv',type:'text/csv',lastModified:0,size:bytes.length,
  text:async()=>text, arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
const assertOriginal = (e, role, expected) => {assert.deepEqual(Buffer.from(originalBytes(e.handle,role)),Buffer.from(expected));assert.equal(sourceProjection(e.handle,role).sha256,hash(expected));};
const mutateFact = (d, key, value) => {
  const field = d.claimReview.fields.find(f=>f.key===key);field.supplied.value=value;
  if(key==='renewalTerm')d.claimReview.contributors.nextTerm.scheduledClaim=value;
  else if(key==='endState'){field.effective.value=value;d.claimReview.contributors.endState.value=value;d.endState=value;}
  else {field.effective.value=value;d.claimReview.scopeInputs[key]=value;d.provenance[key].file=value;d.fileClaims[key]=value;}
};

test('F13P2C-M01 eight coherent source interpretation corruptions reject with genuine traces',()=>{
  for(const [state,key,value,promote] of [['renew','endState','cancel'],['cancel','endState','renew'],['cancel','endState','renew',true],['renew','renewalTerm','monthly'],['renew','distributor','other'],['renew','billing','other'],['renew','commitment','monthly'],['renew','renewalDate','2026-10-16']]){
    const {input,decision}=issued(baseline(state)),d=copyDecision(decision);mutateFact(d,key,value);
    if(promote){const good=issued().decision;d.status=good.status;d.errors=[];d.issues.errors=[];d.claimReview.contributors.recordResultStatus=good.status;d.nextAction=structuredClone(good.nextAction);d.nextStep=good.nextStep;}
    assert.deepEqual(d.claimReview.fields.find(f=>f.key===key).supplied.trace,decision.claimReview.fields.find(f=>f.key===key).supplied.trace);
    assert.throws(()=>captureRecordDecision(d,input),TypeError);assert.equal(d.actionAuthorized,false);assert.equal(d.financialVerdict,null);
  }
});
test('F13P2C-M02 coherent classification action caveat and issue changes cannot survive canonical capture',()=>{
  const {input,decision}=issued();
  for(const mutate of [d=>{d.status='outside-this-release';d.claimReview.contributors.recordResultStatus=d.status;},d=>d.nextAction.instruction='Altered advice',d=>d.nextStep='Altered advice',d=>d.verify.push('Invented uncertainty'),d=>d.caveat='Invented source authentication',d=>d.reviewBasis+='stale']){const d=copyDecision(decision);mutate(d);assert.throws(()=>captureRecordDecision(d,input));}
});
test('F13P2C-M03 legitimate whitespace case folding unknowns and compound classification remain accepted',()=>{
  for(const value of [' pax8 ','PAX8','other','unknown','unrecognized']){
    const i=baseline();i.pax8Text=i.pax8Text.replace(',pax8,',','+value+',');i.haloText=i.haloText.replace('HaloPSA',' HaloPSA ');
    const d=inspectRecords(i);assert.deepEqual(captureRecordDecision(d,i),d);assert.equal(d.provenance.billing.file,'halopsa');
  }
});
test('F13P2C-M04 legitimate explicit conflict choices survive while altered choices and source values reject',()=>{
  for(const choice of ['accept-file','keep-answer']){
    const i=baseline();i.answers.distributor='other';const first=inspectRecords(i),fact=first.conflicts.find(f=>f.key==='distributor');
    i.resolutions={distributor:{choice,questionnaire:fact.questionnaire,fileValue:fact.fileValue,basis:first.reviewBasis}};
    const d=inspectRecords(i);assert.deepEqual(captureRecordDecision(d,i),d);
    const forged=copyDecision(d);forged.claimReview.fields.find(f=>f.key==='distributor').reviewChoice=choice==='accept-file'?'keep-answer':'accept-file';assert.throws(()=>captureRecordDecision(forged,i));
  }
});
test('F13P2C-M05 comparison without current input and input accessors cannot gain source binding',()=>{
  const {input,decision}=issued();assert.throws(()=>captureRecordDecision(decision));assert.throws(()=>captureRecordDecision(decision,null));
  let reads=0;const bad={...input};Object.defineProperty(bad,'pax8Text',{get(){reads++;return input.pax8Text;},enumerable:true});assert.throws(()=>captureRecordDecision(decision,bad));assert.equal(reads,0);
});
test('F13P2C-M06 genuine source free repairs remain recoverable but clones changes and added claims reject',()=>{
  for(const error of [new InputProblem('Reselect the file','pax-file',SOURCES.pax),new Error('SECRET original text')]){
    const result=inputFailure(error);assert.deepEqual(captureRecordDecision(result),result);assert.throws(()=>captureRecordDecision(structuredClone(result)));
    result.provenance={};assert.throws(()=>captureRecordDecision(result));
    const withHandoff=inputFailure(error);withHandoff.caseHandoff=null;assert.throws(()=>captureRecordDecision(withHandoff));
  }
});
test('F13P2C-M07 repair status names and getters cannot bypass failure issuance',()=>{
  const {decision}=issued();for(const status of ['technical-error','needs-input-repair']){const d=copyDecision(decision);d.status=status;assert.throws(()=>captureRecordDecision(d));}
  const d=inputFailure(new Error());let reads=0;Object.defineProperty(d,'verify',{get(){reads++;return [];},enumerable:true});assert.throws(()=>captureRecordDecision(d));assert.equal(reads,0);
});
test('F13P2C-M08 finder descriptive forgery and mutated parsed rows do not change canonical decisions',()=>{
  const i=baseline(),finder=createCaseFinder(i.pax8Text),good=searchCaseFinder(finder,{}),bad=structuredClone(good);bad.rows[0].customerRef='forged';assert.throws(()=>assertCaseFinder(bad,finder,{}));
  const rows=parseCsv(i.pax8Text,PAX8_COLUMNS);assert.throws(()=>{rows[0].distributor='other';},TypeError);assert.equal(inspectRecords(i).fileClaims.distributor,'pax8');
});
test('F13P2C-M09 valid actual input decoder Error TypeError and primitive failures are terminal in both roles',async()=>{
  const Original=globalThis.TextDecoder;
  for(const role of ['pax-file','halo-file'])for(const error of [new Error('SOURCE SECRET'),new TypeError('SOURCE SECRET'),0]){
    const text=role==='pax-file'?baseline().pax8Text:baseline().haloText,file=bytesFile(Buffer.from(text),text);
    try{globalThis.TextDecoder=class extends Original{decode(bytes){if(bytes.length>24)throw error;return super.decode(bytes);}};await assert.rejects(read(file,role),e=>e instanceof FileEvidenceRuntimeError&&!e.message.includes('SECRET'));}
    finally{globalThis.TextDecoder=Original;}
  }
});
test('F13P2C-M10 false nonstring and nonroundtrip actual decoder output is never an input encoding repair',async()=>{
  const Original=globalThis.TextDecoder,text=baseline().pax8Text;
  for(const output of [undefined,null,42,{},text.replace('renew','other')]){
    try{globalThis.TextDecoder=class extends Original{decode(bytes){return bytes.length>24?output:super.decode(bytes);}};await assert.rejects(read(bytesFile(Buffer.from(text),text)),FileEvidenceRuntimeError);}
    finally{globalThis.TextDecoder=Original;}
  }
  // Native TextEncoder maps each lone surrogate to genuine U+FFFD bytes.
  // Qualify the custody owner directly so a later File.text mismatch cannot
  // conceal false decoded-text issuance before the ordinary reader rejects.
  for(const role of ['pax-file','halo-file'])for(const scalar of ['\uD800','\uDBFF','\uDC00','\uDFFF']){
    const source='x\n'+'a'.repeat(25)+'\uFFFD\n',bytes=new TextEncoder().encode(source);
    const falseText=source.replace('\uFFFD',scalar);
    assert.deepEqual(new TextEncoder().encode(falseText),bytes);
    try{
      globalThis.TextDecoder=class extends Original{decode(input){const value=super.decode(input);return input.length>24?value.replace('\uFFFD',scalar):value;}};
      await assert.rejects(captureFileEvidence(bytes.buffer,role,{}),e=>e instanceof TypeError&&/malformed UTF-16/.test(e.message));
      await assert.rejects(read(bytesFile(bytes,source),role),FileEvidenceRuntimeError);
    }finally{globalThis.TextDecoder=Original;}
    const handle=await captureFileEvidence(bytes.buffer,role,{});assert.equal(sourceText(handle,role),source);assert.deepEqual(originalBytes(handle,role),bytes);releaseFileEvidence(handle);
  }
  for(const role of ['pax-file','halo-file']){
    const source='x\n'+'a'.repeat(25)+'\n',bytes=new TextEncoder().encode(source),oversized='a'.repeat(bytes.length+1);
    const Encoder=globalThis.TextEncoder,charCode=String.prototype.charCodeAt;let encoded=0,walked=0;
    try{
      globalThis.TextDecoder=class extends Original{decode(input){return input.length>24?oversized:super.decode(input);}};
      globalThis.TextEncoder=class extends Encoder{encode(value){if(value===oversized)encoded++;return super.encode(value);}};
      String.prototype.charCodeAt=function(...args){if(this.valueOf()===oversized)walked++;return charCode.apply(this,args);};
      await assert.rejects(captureFileEvidence(bytes.buffer,role,{}),e=>e instanceof TypeError&&/original byte bound/.test(e.message));
      await assert.rejects(read(bytesFile(bytes,source),role),FileEvidenceRuntimeError);
      assert.equal(walked,0);assert.equal(encoded,0);
    }finally{globalThis.TextDecoder=Original;globalThis.TextEncoder=Encoder;String.prototype.charCodeAt=charCode;}
  }
});
test('F13P2C-M11 all single bytes and multibyte scalar boundaries match independent native UTF8 oracle',async()=>{
  const values=Array.from({length:256},(_,n)=>Buffer.from([n]));values.push(...[[0xc0,0x80],[0xe0,0x80,0x80],[0xed,0xa0,0x80],[0xf4,0x90,0x80,0x80],[0xe2,0x82],[0xf0,0x9f,0x98],[0xc2,0x80],[0xe0,0xa0,0x80],[0xf0,0x90,0x80,0x80],[0xf4,0x8f,0xbf,0xbf],[0xef,0xbf,0xbd],[0xef,0xbb,0xbf]].map(v=>Buffer.from(v)));
  for(const bytes of values){const h=await captureFileEvidence(Uint8Array.from(bytes).buffer,'pax-file',{});assert.deepEqual(Buffer.from(originalBytes(h,'pax-file')),bytes);assert.equal(sourceText(h,'pax-file')!==null,isUtf8(bytes));releaseFileEvidence(h);}assert.equal(values.length,268);
});
test('F13P2C-M12 deterministic byte strings and valid scalars independently qualify byte validity',async()=>{
  let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;};
  const cases=Array.from({length:512},(_,i)=>Buffer.from(Array.from({length:i%9},random)));
  for(const cp of [0,0x7f,0x80,0x7ff,0x800,0xd7ff,0xe000,0xffff,0x10000,0x10ffff])cases.push(Buffer.from(String.fromCodePoint(cp)));
  for(const bytes of cases){const h=await captureFileEvidence(Uint8Array.from(bytes).buffer,'pax-file',{});assert.equal(sourceText(h,'pax-file')!==null,isUtf8(bytes));assert.deepEqual(Buffer.from(originalBytes(h,'pax-file')),bytes);releaseFileEvidence(h);}
});
test('F13P2C-M13 empty source is recoverable while detached shared and fake buffers cannot issue evidence',async()=>{
  const e=await read(native(''));assert.ok(e.problem instanceof InputProblem);assertOriginal(e,'pax-file',Buffer.alloc(0));releaseFileEvidence(e.handle);
  const detached=new ArrayBuffer(0);structuredClone(detached,{transfer:[detached]});
  for(const buffer of [detached,new SharedArrayBuffer(0),{},new Uint8Array(0)])await assert.rejects(read({size:0,text:async()=>'',arrayBuffer:async()=>buffer}),FileEvidenceRuntimeError);
});
test('F13P2C-M14 resizable and transferable caller buffers cannot rewrite captured bytes across await',async()=>{
  const expected=Buffer.from(baseline().pax8Text);
  for(const kind of ['resize','transfer']){const buffer=new ArrayBuffer(expected.length,{maxByteLength:expected.length+10});new Uint8Array(buffer).set(expected);const promise=captureFileEvidence(buffer,'pax-file',{});if(kind==='resize')buffer.resize(0);else buffer.transfer();const h=await promise;assert.deepEqual(Buffer.from(originalBytes(h,'pax-file')),expected);releaseFileEvidence(h);}
});
test('F13P2C-M15 paired late fault order cannot publish an outcome or orphan rejection',async()=>{
  const unhandled=[];const listener=e=>unhandled.push(e);process.on('unhandledRejection',listener);
  try{for(const first of ['text','bytes'])for(const delay of [0,5]){const expected=Buffer.from(baseline().pax8Text);const file={size:expected.length,text:()=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('IO')),first==='text'?0:delay+5)),arrayBuffer:()=>new Promise((resolve,reject)=>setTimeout(()=>first==='bytes'?reject(new Error('IO')):resolve({}),first==='bytes'?0:delay+5))};await assert.rejects(read(file));await new Promise(r=>setTimeout(r,20));}assert.deepEqual(unhandled,[]);}finally{process.removeListener('unhandledRejection',listener);}
});
test('F13P2C-M16 timestamps and hostile metadata snapshots never establish content authority',async()=>{
  const text=baseline().pax8Text,a=await read(native(text,'same',{lastModified:1})),b=await read(native(text,'same',{lastModified:2}));assert.equal(sourceProjection(a.handle,'pax-file').sha256,sourceProjection(b.handle,'pax-file').sha256);assert.notEqual(sourceProjection(a.handle,'pax-file').metadata.lastModified,sourceProjection(b.handle,'pax-file').metadata.lastModified);
  const file=bytesFile(Buffer.from(text),text);Object.defineProperty(file,'name',{get(){file.type='changed';return 'x'.repeat(8192);}});file.lastModified=Infinity;const e=await read(file);assertOriginal(e,'pax-file',Buffer.from(text));assert.equal(sourceProjection(e.handle,'pax-file').metadata.lastModified,null);for(const x of [a,b,e])releaseFileEvidence(x.handle);
});
test('F13P2C-M17 independently constructed Unicode BOM terminator and quote coordinates pass180 fixtures',()=>{
  const values=['','a',' spaced ','a,b','a"b','a\nb','a\rb','a\r\nb','😀','漢','e\u0301','\uFEFFx','\0x','a\t','\uFFFD'];let checked=0;
  for(const bom of ['', '\uFEFF'])for(const delimiter of ['\n','\r','\r\n'])for(let index=0;index<values.length;index++)for(const post of ['', ' \t']){
    let text=bom;const expected=[];
    for(const row of [['A','B','C'],[values[index],values[(index+4)%15],values[(index+8)%15]],['','',''],['repeat','repeat','repeat']]){
      const cells=[];for(let column=0;column<row.length;column++){if(column)text+=',';const from=text.length,lexeme=quote(row[column])+post;text+=lexeme;cells.push({from,to:text.length,lexeme,raw:row[column]});}text+=delimiter;if(row.some(v=>v!==''))expected.push(cells);
    }
    const scan=scanCsvEvidence(text);assert.equal(scan.complete,true);assert.equal(scan.records.length,3);
    expected.forEach((row,r)=>row.forEach((e,c)=>{const actual=scan.records[r].cells[c];assert.deepEqual([actual.lexeme,actual.rawValue,actual.startOffset,actual.endOffset,actual.startByte,actual.endByte],[e.lexeme,e.raw,e.from,e.to,Buffer.byteLength(text.slice(0,e.from)),Buffer.byteLength(text.slice(0,e.to))]);}));checked++;
  }assert.equal(checked,180);
});
test('F13P2C-M18 malformed quoted tails after Unicode empty runs and mixed terminators retain exact prefix',()=>{
  for(const bom of ['', '\uFEFF'])for(const delimiter of ['\n','\r','\r\n'])for(const tail of ['"open','bad"quote','"x"tail','"x"\u00a0']){const prefix=bom+'A,B'+delimiter+'😀,漢'+delimiter+delimiter,text=prefix+tail;const scan=scanCsvEvidence(text);assert.equal(scan.complete,false);assert.equal(scan.records.length,2);assert.ok(scan.failure.startByte>=Buffer.byteLength(prefix));assert.equal(scan.failure.startByte,Buffer.byteLength(text.slice(0,scan.failure.startOffset)));}
});
test('F13P2C-M19 reordered quoted prototype and Unicode headers preserve positional evidence',()=>{
  for(const extra of ['__proto__','constructor','toString','confusable漢','line\nbreak']){const keys=[...PAX8_COLUMNS].reverse().concat(extra),original=parseCsv(baseline().pax8Text,PAX8_COLUMNS)[0],text=keys.map(quote).join(',')+'\n'+keys.map(k=>quote(Object.hasOwn(original,k)?original[k]:'extra')).join(',')+'\n';const rows=parseCsv(text,PAX8_COLUMNS);assert.equal(rows[0].subscription_id,'s');const trace=rowSourceTrace(rows[0],['subscription_id']);assert.equal(trace.fields[0].columnIndex,keys.indexOf('subscription_id')+1);assert.equal(scanCsvEvidence(text).records[0].cells.at(-1).rawValue,extra);}
});
test('F13P2C-M20 byte row column and cell rejection retains actual complete prefix and original bytes',async()=>{
  for(const text of [baseline().pax8Text+'"broken',baseline().pax8Text+'x'.repeat(1025),baseline().pax8Text.split('\n')[0]+',extra\n'+baseline().pax8Text.split('\n')[1]+'\n']){const e=await read(native(text));assert.ok(e.problem);assertOriginal(e,'pax-file',Buffer.from(text));assert.ok(sourceProjection(e.handle,'pax-file').records.length>=1);releaseFileEvidence(e.handle);}
  const scan=scanCsvEvidence('A\n'+Array(5001).fill('x').join('\n'));assert.equal(scan.complete,false);assert.equal(scan.failure.sourceRecordOrdinal,5002);
});
test('F13P2C-M21 paired profile malformed and encoding failures keep independent original handles',async()=>{
  for(const p of ['','wrong\nvalue','A\n"open',Buffer.from([0xff])])for(const h of ['','wrong\nvalue',Buffer.from([0xff])]){const a=await read(native(p),'pax-file'),b=await read(native(h),'halo-file');assert.ok(a.problem);assert.ok(b.problem);assertOriginal(a,'pax-file',Buffer.from(p));assertOriginal(b,'halo-file',Buffer.from(h));releaseFileEvidence(a.handle);assertOriginal(b,'halo-file',Buffer.from(h));releaseFileEvidence(b.handle);}
});
test('F13P2C-M22 alternating empty runs have counted full coverage and exactly five displayed runs',async()=>{
  const text='A,B\n'+Array.from({length:20},(_,i)=>'\n'+i+',value\n').join(''),e=await read(native(text)),p=sourceProjection(e.handle,'pax-file');assert.equal(p.emptyRunCount,20);assert.equal(p.emptyRuns.length,5);assert.equal(p.emptyRecordCount,20);for(let offset=0;offset<p.recordCount;offset+=5)assert.ok(sourceProjection(e.handle,'pax-file',offset).records.length<=5);assertOriginal(e,'pax-file',Buffer.from(text));releaseFileEvidence(e.handle);
});
test('F13P2C-M23 huge postquote whitespace and escaped quotes retain lexemes separately from raw cells',()=>{
  for(const raw of ['😀','"'.repeat(1024)]){const lexeme=quote(raw)+' '.repeat(4096-quote(raw).length),text='A\n'+lexeme+'\n',scan=scanCsvEvidence(text);assert.equal(scan.complete,true);assert.equal(scan.records[1].cells[0].rawValue,raw);assert.equal(scan.records[1].cells[0].lexeme,lexeme);assert.equal(scan.records[1].cells[0].endByte,Buffer.byteLength('A\n'+lexeme));}
});
test('F13P2C-M24 supplementary values at1024-unit frontier remain exact source evidence',async()=>{
  for(const raw of ['x'.repeat(1022)+'😀','😀'.repeat(512)]){const text='A\n'+quote(raw)+'\n',e=await read(native(text));assertOriginal(e,'pax-file',Buffer.from(text));const cell=sourceProjection(e.handle,'pax-file').records[1].cells[0];assert.equal(cell.rawValue,raw);assert.equal(cell.endByte,Buffer.byteLength(text)-1);releaseFileEvidence(e.handle);}
});
test('F13P2C-M25 dense multibyte original byte Nminus1 N Nplus1 frontier preserves admitted bytes',async()=>{
  for(const size of [1999999,2000000,2000001]){const prefix='A\n',remaining=size-Buffer.byteLength(prefix),text=prefix+'😀'.repeat(Math.floor(remaining/4))+'x'.repeat(remaining%4);assert.equal(Buffer.byteLength(text),size);if(size>2000000)await assert.rejects(read(native(text)),InputProblem);else{const e=await read(native(text));assert.ok(e.problem);assertOriginal(e,'pax-file',Buffer.from(text));releaseFileEvidence(e.handle);}}
});
test('F13P2C-M26 feasible near limit inventory with multibyte max cells has bounded reachable projections',async()=>{
  const columns=Array.from({length:64},(_,i)=>'extra'+i),text=columns.join(',')+'\n'+Array.from({length:1023},(_,i)=>Array.from({length:64},(_,j)=>i<5?'é'.repeat(1024):j===0?String(i):'').map(quote).join(',')).join('\n');assert.ok(Buffer.byteLength(text)<2000000);const e=await read(native(text)),p=sourceProjection(e.handle,'pax-file',1023);assert.equal(p.records.length,1);assert.equal(p.records.at(-1).cells.length,64);assertOriginal(e,'pax-file',Buffer.from(text));releaseFileEvidence(e.handle);
});
test('F13P2C-M27 proxy changing reflection dense array aliases and shape bounds reject without getter execution',async()=>{
  const e=await read(native(baseline().pax8Text)),p=sourceProjection(e.handle,'pax-file');let traps=0;const proxy=new Proxy({...p},{getOwnPropertyDescriptor(target,key){traps++;return Reflect.getOwnPropertyDescriptor(target,key);},ownKeys(target){return Reflect.ownKeys(target).filter(k=>k!=='sha256');}});assert.throws(()=>assertSourceProjection(proxy,e.handle,'pax-file'));assert.ok(traps>0);
  assert.throws(()=>frozenData(Array(10001).fill(0)));let deep={};for(let n=0;n<14;n++)deep={deep};assert.throws(()=>frozenData(deep));releaseFileEvidence(e.handle);
});
test('F13P2C-M28 bounded metadata projections retain long Unicode filenames without altering original',async()=>{
  const text=baseline().pax8Text,e=await read(native(text,'漢😀'.repeat(2048)));assert.equal(sourceProjection(e.handle,'pax-file').metadata.name.length,6144);assertOriginal(e,'pax-file',Buffer.from(text));releaseFileEvidence(e.handle);
});
test('F13P2C-M29 defensive recovered copies and revoked outcomes remain independent for both roles',async()=>{
  for(const role of ['pax-file','halo-file']){const text=role==='pax-file'?baseline().pax8Text:baseline().haloText,file=native(text),e=await read(file,role);originalBytes(e.handle,role).fill(0);assertOriginal(e,role,Buffer.from(text));assertLocalEvidence(e,role,file);releaseFileEvidence(e.handle);assert.throws(()=>assertLocalEvidence(e,role,file));}
});
test('F13P2C-M30 equal bytes across metadata and occurrences never transfer local source ownership',async()=>{
  const text=baseline().pax8Text,items=[];for(let i=0;i<10;i++)items.push(await read(native(text,'name'+i,{type:i%2?'text/csv':'application/pdf',lastModified:i})));
  assert.equal(new Set(items.map(e=>sourceProjection(e.handle,'pax-file').sha256)).size,1);assert.equal(new Set(items.map(e=>e.handle)).size,10);for(const e of items)releaseFileEvidence(e.handle);
});
test('F13P2C-M31 deadline expiry fences late acquisition while retaining an independently committed source',async()=>{
  const held=await read(native(baseline().pax8Text));let finish;const file={size:0,text:async()=>'',arrayBuffer:()=>new Promise(r=>{finish=r;})};await assert.rejects(read(file,'halo-file',10),InputProblem);finish(new ArrayBuffer(0));await new Promise(r=>setTimeout(r,20));assertOriginal(held,'pax-file',Buffer.from(baseline().pax8Text));releaseFileEvidence(held.handle);
});
test('F13P2C-M32 context edits require newly canonical decisions without changing original custody',async()=>{
  const i=baseline(),e=await read(native(i.pax8Text));for(const value of ['yes','no','unknown']){const next={...i,answers:{...i.answers,agreement:value}};const d=inspectRecords(next);assert.deepEqual(captureRecordDecision(d,next),d);if(value!=='yes')assert.throws(()=>captureRecordDecision(inspectRecords(i),next));assertOriginal(e,'pax-file',Buffer.from(i.pax8Text));}releaseFileEvidence(e.handle);
});
test('F13P2C-M33 repeated BOM empty runs and both role contributors keep independent byte coordinates',()=>{
  const i=baseline();i.pax8Text='\uFEFF'+i.pax8Text.replace('\n','\n\n');i.haloText='\uFEFF'+i.haloText.replaceAll('\n','\r\n');const d=inspectRecords(i);assert.deepEqual(captureRecordDecision(d,i),d);for(const field of d.claimReview.fields.filter(f=>f.supplied)){const text=field.supplied.system==='Pax8'?i.pax8Text:i.haloText;for(const cell of field.supplied.trace.fields)assert.equal(cell.startByte,Buffer.byteLength(text.slice(0,cell.startOffset)));}
});
test('F13P2C-M34 optional economic context and recognized or unrecognized end states use canonical ownership',()=>{
  for(const state of ['renew','cancel','extended','unknown','unexpected']){const i=baseline(state),lines=i.pax8Text.split('\n');i.pax8Text=lines[0]+',billing_frequency,scheduled_billing_frequency,term_start_date,term_end_date\n'+lines[1]+',monthly,monthly,2025-10-15,2026-10-15\n';const d=inspectRecords(i);assert.deepEqual(captureRecordDecision(d,i),d);const bad=copyDecision(d);bad.claimReview.contributors.economicContext.raw[0]='annual';assert.throws(()=>captureRecordDecision(bad,i));}
});
test('F13P2C-M35 maximal selected source stays bounded through canonical decision and current handoff',()=>{
  const i=baseline(),keys=[...PAX8_COLUMNS,'source_account_id'];while(keys.length<64)keys.push('extra'+keys.length);i.pax8Text=keys.join(',')+'\n'+Array.from({length:1023},(_,n)=>['S'+n,'C'+n,'pax8','Microsoft 365','NCE','yes','annual','2026-10-15','renew','a',...Array(54).fill('')].join(',')).join('\n');i.subscriptionId='S1022';i.haloText=HALO_COLUMNS.join(',')+'\nl,S1022,C1022,HaloPSA\n';const {decision,input}=issued(i);const d=captureRecordDecision(decision,input);assert.equal(d.caseHandoff.selection.subject.recordNumber,1023);assert.equal(d.selected.customerRef,'C1022');
});
test('F13P2C-M36 releasing one role never revokes an independently issued other role',async()=>{
  for(const first of ['pax-file','halo-file']){const a=await read(native(baseline().pax8Text)),b=await read(native(baseline().haloText),'halo-file');const old=first==='pax-file'?a:b,other=first==='pax-file'?b:a;releaseFileEvidence(old.handle);assert.throws(()=>originalBytes(old.handle,first));assert.ok(originalBytes(other.handle,first==='pax-file'?'halo-file':'pax-file').length);releaseFileEvidence(other.handle);}
});
test('F13P2C-M37 foreign dependency exceptions cannot disclose source contents or execute message getters',async()=>{
  for(const error of [new Error('CONFIDENTIAL_SOURCE_123'),{get message(){throw Error('getter executed');}},0,null]){const file=bytesFile(Buffer.from(baseline().pax8Text));Object.defineProperty(file,'size',{get(){throw error;}});await assert.rejects(read(file),e=>e instanceof FileEvidenceRuntimeError&&!e.message.includes('CONFIDENTIAL'));}
});
test('F13P2C-M38 original answers informed unknowns and contributor metadata cannot coherently drift',()=>{
  const i=baseline();i.answers.distributor='unknown';const d=inspectRecords(i);for(const mutate of [x=>x.claimReview.originalInputs.distributor='pax8',x=>x.informedUnknowns[0].fileValue='other',x=>x.claimReview.fields.find(f=>f.key==='distributor').original.value='pax8',x=>x.claimReview.contributors.identity.paxCustomerRef='other']){const bad=copyDecision(d);mutate(bad);assert.throws(()=>captureRecordDecision(bad,i));}
});
test('F13P2C-M39 unavailable document readers cannot obtain profile success but retain admitted originals',async()=>{
  for(const text of ['%PDF-1.7\n','PK\u0003\u0004','{"subscription_id":"s"}','a;b\nx;y','A\tB\nx\ty']){const e=await read(native(text));assert.ok(e.problem instanceof InputProblem);assertOriginal(e,'pax-file',Buffer.from(text));assert.equal(sourceProjection(e.handle,'pax-file').actionAuthorized,false);releaseFileEvidence(e.handle);}
});
test('F13P2C-M40 input and decision descriptor capture never invokes changing source or resolution accessors',()=>{
  const {input,decision}=issued();for(const key of ['pax8Text','haloText','answers','resolutions','today']){let reads=0;const bad={...input};Object.defineProperty(bad,key,{get(){reads++;return input[key];},enumerable:true});assert.throws(()=>captureRecordDecision(decision,bad));assert.equal(reads,0);}let reads=0;const bad=copyDecision(decision);Object.defineProperty(bad.claimReview.fields[0].effective,'value',{get(){reads++;return 'yes';},enumerable:true});assert.throws(()=>captureRecordDecision(bad,input));assert.equal(reads,0);
});
