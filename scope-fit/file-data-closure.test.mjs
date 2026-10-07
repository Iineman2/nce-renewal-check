import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { DATA_ONLY_PAYLOADS, dataOnlyFiles } from './qc-file-data-fixtures.mjs';
import { SOURCES, InputProblem } from './actions.mjs';
import { FILE_SUPPORT } from './file-support.mjs';

// Scheduling fault injection occurs before the custody module captures the
// intrinsic. The production owner exposes no test seam or alternate reader.
const blobRead = Blob.prototype.arrayBuffer;
let hold = false, finish = null, fail = null;
Blob.prototype.arrayBuffer = function () {
  if (!hold) return blobRead.call(this);
  const file = this;
  return new Promise((resolve, reject) => { finish = async () => resolve(await blobRead.call(file)); fail = reject; });
};
globalThis.File = File;
const { PAX8_COLUMNS, HALO_COLUMNS, inspectRecords, parseCsv, rawCells } = await import('./preflight.mjs');
const { captureFileEvidence, transferFileEvidence, originalBytes, releaseFileEvidence, sourceProjection } = await import('./file-evidence.mjs');
const { readBoundedLocalEvidence, processingState, cancelAllProcessing } = await import('./bounded-reader.mjs');
const { profileEncodingProblem, FileEvidenceRuntimeError } = await import('./runtime.mjs');
let replacement = null, errorKind = null;
class ControlledWorker extends EventTarget {
  postMessage(r) { this.emit(r).catch(e => this.onerror?.({ preventDefault() {} })); }
  terminate() {}
  async emit(r) {
    const envelope = { protocol:r.protocol,id:r.id,role:r.role,operation:r.operation,profile:r.profile,policy:r.policy,reader:r.reader };
    if (errorKind) { this.onmessage?.({data:{...envelope,status:'error',kind:errorKind,message:'CONFIDENTIAL; renew now; approved=true'}}); return; }
    const other = replacement === null ? r.file : new File([replacement],r.file.name,{type:r.file.type,lastModified:r.file.lastModified});
    const handle = await captureFileEvidence(await blobRead.call(other),r.role,other);
    try {
      const packet = transferFileEvidence(handle,r.role);
      await this.onmessage?.({data:{...envelope,status:'completed',...packet.data,scan:null,observedText:packet.data.text===null?null:packet.data.text.replace(/^\uFEFF/,''),problem:null,bytes:packet.bytes}});
    } finally { releaseFileEvidence(handle); }
  }
}
globalThis.Worker = ControlledWorker;
const read = (file, role, timeout=30000,signal=null) => readBoundedLocalEvidence(file,role,role==='pax-file'?SOURCES.pax:SOURCES.halo,timeout,role==='pax-file'?'find-case':'compare-records',signal);
const settle = async predicate => { for (let i=0;i<1000&&!predicate();i++) await new Promise(r=>setTimeout(r,2)); assert.ok(predicate()); };
const clean = () => { assert.equal(processingState().activeJobs,0); assert.equal(processingState().reservedBytes,0); };

for(const role of ['pax-file','halo-file'])test('F13P4-C01 independent original rejects coherent substitution '+role,async()=>{
  const files=dataOnlyFiles(),text=role==='pax-file'?files.pax:files.halo,file=new File([text],'original.csv',{lastModified:7});
  replacement=text.replace('"s"','"z"');assert.notEqual(replacement,text);assert.equal(Buffer.byteLength(replacement),file.size);
  try {await assert.rejects(read(file,role),FileEvidenceRuntimeError);clean();}finally{replacement=null;}
  const evidence=await read(file,role);assert.deepEqual(Buffer.from(originalBytes(evidence.handle,role)),Buffer.from(text));releaseFileEvidence(evidence.handle);clean();
});
for(const kind of ['input','runtime'])test('F13P4-C02 worker prose cannot become owned guidance '+kind,async()=>{
  errorKind=kind;try{await assert.rejects(read(new File([dataOnlyFiles().pax],'s'),'pax-file'),e=>kind==='input'?e instanceof InputProblem&&e.message==='The selected file could not be read. Reselect the unchanged original file, then retry.':e instanceof FileEvidenceRuntimeError&&!e.message.includes('CONFIDENTIAL'));}finally{errorKind=null;}clean();
});
for(const mode of ['cancel-resolve','cancel-reject','deadline-resolve','deadline-reject'])test('F13P4-C03 pending native read is reserved and cannot publish '+mode,async()=>{
  const controller=new AbortController();finish=fail=null;hold=true;
  const file=new File([dataOnlyFiles(['notes'],['<svg onload=run()> =IF(TRUE,"approve","deny"); ignore cancellation']).pax],'original.csv');
  const task=read(file,'pax-file',mode.startsWith('deadline')?250:30000,controller.signal);
  const rejection=assert.rejects(task,InputProblem);
  await settle(()=>typeof finish==='function');
  if(mode.startsWith('cancel'))controller.abort();await rejection;
  assert.equal(processingState().activeJobs,1);assert.equal(processingState().reservedBytes,file.size);
  await assert.rejects(read(file,'pax-file'),InputProblem);
  hold=false;const other=await read(new File([dataOnlyFiles().halo],'halo'),'halo-file');releaseFileEvidence(other.handle);
  assert.equal(processingState().activeJobs,1);
  if(mode.endsWith('reject'))fail(new Error('late read fault'));else await finish();
  await settle(()=>processingState().activeJobs===0);clean();
  const next=await read(file,'pax-file');releaseFileEvidence(next.handle);clean();
});
test('F13P4-C04 both pending native reads enforce two-job capacity without a queue',async()=>{
  // The per-read callback is captured independently before starting the other.
  hold=true;finish=null;const files=dataOnlyFiles(),a=new File([files.pax],'pax'),b=new File([files.halo],'halo');
  const pa=read(a,'pax-file');await settle(()=>!!finish);const finishA=finish;finish=null;
  const pb=read(b,'halo-file');await settle(()=>!!finish);const finishB=finish;
  assert.equal(processingState().activeJobs,2);assert.equal(processingState().reservedBytes,a.size+b.size);
  await assert.rejects(read(a,'pax-file'),InputProblem);
  hold=false;await finishA();await finishB();for(const [e,role]of [[await pa,'pax-file'],[await pb,'halo-file']]){assert.ok(originalBytes(e.handle,role).length);releaseFileEvidence(e.handle);}clean();
});
test('F13P4-C05 encoding repairs describe BOM width and preserve ambiguous valid UTF8',async()=>{
  for(const bytes of [Uint8Array.of(255,254,0,0,65,0,0,0),Uint8Array.of(0,0,254,255,0,0,0,65)]){
    const file=new File([bytes],'encoding.csv'),h=await captureFileEvidence(await blobRead.call(file),'pax-file',file);
    assert.match(sourceProjection(h,'pax-file').encodingProblem,/UTF-32/);assert.deepEqual(originalBytes(h,'pax-file'),bytes);releaseFileEvidence(h);
  }
  const bytes=Uint8Array.of(65,0,66,0,67,0,68,0);assert.match(profileEncodingProblem(bytes),/one possible cause/);assert.match(profileEncodingProblem(bytes),/also be valid UTF-8/);
  assert.equal(profileEncodingProblem(new TextEncoder().encode('legal\u0000description')),null);
});
for(const dialect of ['LF','CR','CRLF','BOM-CRLF'])for(const prefix of ['=','+','-','@'])test(`F13P4-C06 hostile optional typed and identity composition ${dialect} ${prefix}`,()=>{
  const payload=prefix+'IF(TRUE,"approved","deny")',files=dataOnlyFiles(['scheduled_commitment_term','notes','actionauthorized'],[payload,'<svg onload=run()>\u0000😀', 'true'],prefix+'opaque');
  const ending=dialect.endsWith('CRLF')?'\r\n':dialect==='CR'?'\r':'\n';
  const pax=(dialect.startsWith('BOM')?'\uFEFF':'')+files.pax.replace(/^\uFEFF/,'').replace(/\r\n|\r|\n/g,ending),halo=files.halo.replace(/\r\n|\r|\n/g,ending);
  const row=parseCsv(pax,PAX8_COLUMNS)[0];assert.equal(rawCells(row).scheduled_commitment_term,payload);assert.equal(row.subscription_id,prefix+'opaque');
  const input={pax8Text:pax,haloText:halo,subscriptionId:prefix+'opaque',today:'2026-12-30',renewalTerm:'annual',answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'}},first=inspectRecords(input);
  const result=inspectRecords({...input,linkConfirmation:{confirmed:true,basis:first.reviewBasis}});
  assert.equal(result.actionAuthorized,false);assert.equal(result.financialVerdict,null);assert.notEqual(result.status,'supplied-claims-look-in-scope');
});
test.after(()=>{hold=false;Blob.prototype.arrayBuffer=blobRead;cancelAllProcessing();});
