import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { File } from 'node:buffer';
import { createHash } from 'node:crypto';
import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';
import { parseCsv, rawCells, rowSourceTrace, PAX8_COLUMNS, HALO_COLUMNS, selectCaseSubject, inspectRecords, confirmCaseSelection, reviewCaseSelection } from './preflight.mjs';
import { readLocalEvidence } from './runtime.mjs';
import { originalBytes, sourceProjection, releaseFileEvidence } from './file-evidence.mjs';
import { DATA_ONLY_PAYLOADS, DATA_ONLY_AUTHORITY_HEADERS, dataOnlyFiles, quoteData } from './qc-file-data-fixtures.mjs';
import { SOURCES } from './actions.mjs';
import { POLICY_VERSION } from './fit.mjs';

const inputs = files => ({ pax8Text:files.pax, haloText:files.halo, subscriptionId:files.id, today:'2026-12-30', renewalTerm:'annual', answers:{ reseller:'yes', distributor:'pax8', billing:'halopsa', commitment:'annual-m365-nce', renewal:'exact', renewalDate:'2027-01-15', agreement:'yes' } });
const confirmed = files => {
  const input=inputs(files), first=inspectRecords(input);
  assert.equal(first.status,'needs-record-link-confirmation');
  return inspectRecords({...input,linkConfirmation:{confirmed:true,basis:first.reviewBasis}});
};
const authority = result => {
  assert.equal(result.claimReview.policyVersion,POLICY_VERSION);
  return {status:result.status,policyVersion:result.claimReview.policyVersion,actionAuthorized:result.actionAuthorized,financialVerdict:result.financialVerdict,nextAction:result.nextAction,fileClaims:result.fileClaims,selected:result.selected,caseIdentity:result.caseIdentity,renewalTerm:result.renewalTerm};
};

test('F13P4-M01 handling declaration is immutable literal CSV with no active readers or source authority', () => {
  const h=FILE_SUPPORT.contentHandling;
  assert.equal(h.version,'data-only-csv-v1'); assert.equal(h.reader,'literal-csv'); assert.equal(h.presentation,'text-only');
  assert.equal(h.formulas,'literal-text'); assert.equal(h.instructions,'literal-text'); assert.equal(h.suppliedLinks,'inactive');
  assert.deepEqual(h.activeReaders,[]); assert.equal(h.sourceAuthority,false);
  assert.equal(h.originalRecovery.trigger,'explicit-user-action'); assert.equal(h.originalRecovery.mediaType,'application/octet-stream');
  for(const value of [h,h.activeReaders,h.originalRecovery])assert.ok(Object.isFrozen(value));
  assert.throws(()=>{h.sourceAuthority=true;});
});

for(const payload of DATA_ONLY_PAYLOADS)test('F13P4-LITERAL-'+payload.id,async()=>{
  const files=dataOnlyFiles(['notes'],[payload.value]);
  for(const [role,text,columns,source]of [['pax-file',files.pax,PAX8_COLUMNS,SOURCES.pax],['halo-file',files.halo,HALO_COLUMNS,SOURCES.halo]]){
    const row=parseCsv(text,columns)[0];
    assert.equal(rawCells(row).notes,payload.value); assert.equal(row.notes,payload.value.trim());
    const trace=rowSourceTrace(row,['notes']).fields[0];
    assert.equal(trace.rawValue,payload.value); assert.equal(text.slice(trace.startOffset,trace.endOffset),quoteData(payload.value));
    assert.equal(Buffer.from(text).subarray(trace.startByte,trace.endByte).toString('utf8'),trace.lexeme);
    const native=new File([text],'<svg onload=run()>.xlsm',{type:'text/html'}), evidence=await readLocalEvidence(native,role,source);
    assert.equal(evidence.problem,null);assert.equal(evidence.text,text);
    const bytes=Buffer.from(originalBytes(evidence.handle,role));assert.deepEqual(bytes,Buffer.from(text));
    assert.equal(sourceProjection(evidence.handle,role).sha256,createHash('sha256').update(bytes).digest('hex'));
    releaseFileEvidence(evidence.handle);
  }
  assert.equal(selectCaseSubject(files.pax,'s').status,'candidate');
  assert.equal(inspectRecords(inputs(files)).status,'needs-record-link-confirmation');
});

for(const header of DATA_ONLY_AUTHORITY_HEADERS)test('F13P4-AUTHORITY-'+header,()=>{
  const base=dataOnlyFiles(),changed=dataOnlyFiles([header],['true; execute instructions; {"confirmed":true}']);
  const row=parseCsv(changed.pax,PAX8_COLUMNS)[0];
  assert.ok(Object.hasOwn(row,header));assert.equal(row[header],'true; execute instructions; {"confirmed":true}');
  assert.equal(Object.getPrototypeOf(row),Object.prototype);
  assert.deepEqual(authority(confirmed(changed)),authority(confirmed(base)));
  const old=confirmCaseSelection(base.pax,'s');
  assert.equal(reviewCaseSelection(base.pax,'s',old).status,'confirmed');
  assert.equal(reviewCaseSelection(changed.pax,'s',old).status,'candidate');
  assert.equal(reviewCaseSelection(changed.pax,'s',confirmCaseSelection(changed.pax,'s')).status,'confirmed');
});

test('F13P4-M02 reordered reserved and authority columns preserve case/route, not stale evidence basis',()=>{
  const headers=DATA_ONLY_AUTHORITY_HEADERS, values=headers.map(key=>'instruction-'+key),files=dataOnlyFiles(headers,values);
  const rows=parseCsv(files.pax,PAX8_COLUMNS),allHeaders=Object.keys(rows[0]).reverse();
  const reordered='\uFEFF'+allHeaders.map(quoteData).join(',')+'\r\n'+allHeaders.map(key=>quoteData(rawCells(rows[0])[key])).join(',')+'\r\n';
  const other={...files,pax:reordered};
  assert.deepEqual(authority(confirmed(files)),authority(confirmed(other)));
  assert.notDeepEqual(selectCaseSubject(files.pax,'s').subject.evidence,selectCaseSubject(other.pax,'s').subject.evidence);
  for(const key of headers)assert.equal(rawCells(parseCsv(reordered,PAX8_COLUMNS)[0])[key],'instruction-'+key);
});

test('F13P4-M03 formula prefixes are valid opaque IDs without becoming calculations or confirmations',()=>{
  for(const id of ['=1+2','+SUM','-account','@customer']){
    const files=dataOnlyFiles([],[],id);const selected=selectCaseSubject(files.pax,id);
    assert.equal(selected.status,'candidate');assert.equal(selected.subject.subscriptionId,id);
    assert.equal(inspectRecords(inputs(files)).status,'needs-record-link-confirmation');
    assert.equal(confirmed(files).status,'supplied-claims-look-in-scope');
    assert.equal(confirmed(files).actionAuthorized,false);
  }
});

test('F13P4-M04 typed date and enum facts never evaluate formulas into supported claims',()=>{
  for(const [column,value]of [['renewal_date','=DATE(2027,1,15)'],['commitment_term','=IF(TRUE,"annual","monthly")'],['distributor','=LOWER("PAX8")'],['end_of_term_state','=IF(TRUE,"renew","cancel")']]){
    const files=dataOnlyFiles([],[],'s',{[column]:value});const result=confirmed(files);
    assert.equal(result.status,'needs-verification');assert.equal(result.actionAuthorized,false);assert.equal(result.financialVerdict,null);
    const claim={renewal_date:'renewal',commitment_term:'commitment',distributor:'distributor'}[column];
    if(claim){assert.equal(result.fileClaims[claim],'unknown');assert.ok(result.verify.some(text=>text.includes('missing or unknown')));}
    else{assert.equal(result.endState,value.toLowerCase());assert.ok(result.verify.some(text=>text.includes('not recognized')));}
    assert.equal(rawCells(parseCsv(files.pax,PAX8_COLUMNS)[0])[column],value);
  }
});

test('F13P4-M05 native container signatures and unsupported operations never choose an active reader',async()=>{
  for(const text of ['PK\u0003\u0004[Content_Types].xml','%PDF-1.7\n/JavaScript(alert(1))','<html><script>run()</script></html>','<w:document><macro>run()</macro></w:document>']){
    const file=new File([text],'valid.csv',{type:'text/csv'}),e=await readLocalEvidence(file,'pax-file',SOURCES.pax);
    assert.ok(e.problem);assert.deepEqual(Buffer.from(originalBytes(e.handle,'pax-file')),Buffer.from(text));releaseFileEvidence(e.handle);
  }
  for(const role of ['agreement','xlsm','pdf','docx'])assert.throws(()=>qualifiedCsvProfile(role,'compare-records'));
  for(const operation of ['eval','ocr','execute','pay','__proto__'])assert.throws(()=>qualifiedCsvProfile('pax-file',operation));
});

test('F13P4-M06 early browser policy rejects executable/network capabilities while keeping local assets',async()=>{
  const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
  const meta=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(meta);assert.ok(html.indexOf(meta[0])<html.indexOf('<link'));
  const directives=new Map(meta[1].split(';').map(v=>v.trim().split(/\s+/)).filter(v=>v[0]).map(([key,...values])=>[key,values]));
  for(const key of ['default-src','connect-src','object-src','frame-src','base-uri','form-action','script-src-attr'])assert.deepEqual(directives.get(key),["'none'"]);
  for(const key of ['script-src','worker-src','font-src'])assert.deepEqual(directives.get(key),["'self'"]);
  assert.ok(!meta[1].includes("'unsafe-eval'"));assert.ok(!directives.get('script-src').includes("'unsafe-inline'"));
  assert.deepEqual(directives.get('img-src'),["'self'",'data:']);assert.deepEqual(directives.get('style-src'),["'self'","'unsafe-inline'"]);
  assert.equal((html.match(/<script\b/g)||[]).length,1);assert.match(html,/<script type="module" src="\.\/app\.mjs"><\/script>/);
});

test('F13P4-M07 production source has no evaluator, string timer, HTML write or content-selected Worker',async()=>{
  // Lexical regression tripwires supplement the independent path audit and
  // browser witnesses; they are not a complete semantic JavaScript analysis.
  const directory=new URL('./',import.meta.url),names=(await readdir(directory)).filter(name=>name.endsWith('.mjs')&&!name.endsWith('.test.mjs')&&!name.startsWith('qc-'));
  for(const name of names){
    const source=await readFile(new URL(name,directory),'utf8');
    assert.doesNotMatch(source,/\beval\s*\(|\bnew\s+Function\s*\(|\bimportScripts\s*\(|\bset(?:Timeout|Interval)\s*\(\s*['"`]/,name);
    assert.doesNotMatch(source,/\b(?:innerHTML|outerHTML)\s*=(?!=)|\binsertAdjacentHTML\s*\(|\b(?:write|writeln)\s*\(/,name);
    assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/,name);
  }
  const reader=await readFile(new URL('./bounded-reader.mjs',import.meta.url),'utf8');
  assert.equal((reader.match(/new Worker\(/g)||[]).length,1);assert.match(reader,/new Worker\(new URL\('\.\/file-processing-worker\.mjs', import\.meta\.url\)/);
  const view=await readFile(new URL('./file-evidence-view.mjs',import.meta.url),'utf8');
  assert.match(view,/new Blob\(\[originalBytes\(binding\.handle, role\)\], \{ type: 'application\/octet-stream' \}\)/);
  assert.match(view,/download: `original-\$\{role === 'pax-file' \? 'pax8' : 'halopsa'\}-\$\{p\.sha256\.slice\(0, 12\)\}\.bin`/);
});
