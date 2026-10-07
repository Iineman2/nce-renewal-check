import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { FILE_SUPPORT } from './file-support.mjs';
import { InputProblem, SOURCES } from './actions.mjs';
import { readLocalEvidence, FileEvidenceRuntimeError, observedFileText } from './runtime.mjs';
import { readBoundedLocalEvidence, processingState, cancelAllProcessing } from './bounded-reader.mjs';
import { transferFileEvidence, releaseFileEvidence } from './file-evidence.mjs';

const text = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
const input = () => new File([text], 'lifecycle.csv', {lastModified:7});
const nativeFile = globalThis.File, nativeWorker = globalThis.Worker;
globalThis.File = File;
let mode = 'hold', workers = [], escape = null;
class LifecycleWorker extends EventTarget {
  constructor() { super(); this.stops=0; this.sends=0; this.listener=null; workers.push(this); }
  get terminate() {
    if(mode==='terminate-getter') cancelAllProcessing('Getter cancellation');
    return this.stop;
  }
  stop() { this.stops++; if(mode==='termination-reentry') cancelAllProcessing('Termination cancellation'); }
  get onerror() { return this.errorHandler; }
  set onerror(value) {
    this.errorHandler=value;
    if(value && mode==='error-setter') value({preventDefault(){}});
  }
  get onmessage() { return this.messageHandler; }
  set onmessage(value) {
    if(value && mode==='message-setter') cancelAllProcessing('Setter cancellation');
    // Deliberately install after cancellation returns, to exercise retired setup.
    this.messageHandler=value;
  }
  addEventListener(type, callback, options) {
    if(type==='messageerror' && mode==='listener-reentry') cancelAllProcessing('Listener cancellation');
    super.addEventListener(type,callback,options);
    if(type==='messageerror') this.listener=callback;
    if(mode==='listener-throw') throw Error('foreign listener failure');
  }
  removeEventListener(type, callback, options) { super.removeEventListener(type,callback,options); if(this.listener===callback)this.listener=null; }
  get postMessage() {
    if(mode==='send-getter')cancelAllProcessing('Send getter cancellation');
    return this.send;
  }
  send(request) {
    this.sends++;this.request=request;
    if(mode==='send-reentry')cancelAllProcessing('Send cancellation');
    if(mode==='throwing-suppression')queueMicrotask(()=>{try{this.onerror({preventDefault(){throw Error('suppression fault');}});}catch(error){escape=error;}});
  }
}
globalThis.Worker=LifecycleWorker;
const read=(signal=null,timeout=30000)=>readBoundedLocalEvidence(input(),'pax-file',SOURCES.pax,timeout,'find-case',signal);
const clean=()=>assert.deepEqual(processingState(),{activeJobs:0,reservedBytes:0,cachedSources:0,halted:false});
const repair=error=>error instanceof InputProblem&&error.target==='pax-file';
const reset=()=>{mode='hold';workers=[];escape=null;};
test.after(()=>{globalThis.File=nativeFile;globalThis.Worker=nativeWorker;});

for(const fault of ['error-setter','message-setter','listener-reentry','terminate-getter','send-getter'])test(`F13P3C-L01 setup retirement fences ${fault}`,async()=>{
  reset();mode=fault;const pending=read();await assert.rejects(pending,repair);
  assert.equal(workers.length,1);const worker=workers[0];assert.equal(worker.stops,1);assert.equal(worker.sends,0);
  assert.equal(worker.onmessage,null);assert.equal(worker.onerror,null);assert.equal(worker.listener,null);clean();
});
test('F13P3C-L02 abort listener synchronous reentry creates no Worker or timer leak',async()=>{
  reset();const controller=new AbortController(),add=controller.signal.addEventListener.bind(controller.signal);
  controller.signal.addEventListener=(...args)=>{add(...args);controller.abort();};
  await assert.rejects(read(controller.signal),repair);assert.equal(workers.length,0);clean();
});
test('F13P3C-L03 throwing listener registration stops tracked Worker without send',async()=>{
  reset();mode='listener-throw';await assert.rejects(read(),e=>e instanceof FileEvidenceRuntimeError);
  assert.equal(workers[0].stops,1);assert.equal(workers[0].sends,0);assert.equal(workers[0].listener,null);clean();
});
test('F13P3C-L04 optional error suppression cannot escape or defer settlement',async()=>{
  reset();mode='throwing-suppression';const start=performance.now();await assert.rejects(read(null,1000),repair);
  assert.ok(performance.now()-start<250);assert.equal(escape,null);assert.equal(workers[0].stops,1);clean();
});
test('F13P3C-L05 send reentry stops once and ignores saved late callback',async()=>{
  reset();mode='send-reentry';await assert.rejects(read(),repair);assert.equal(workers[0].sends,1);assert.equal(workers[0].stops,1);
  assert.equal(workers[0].onmessage,null);clean();
});
test('F13P3C-L06 termination cancellation retires before touching hostile packet payload',async()=>{
  reset();mode='termination-reentry';const pending=read();pending.catch(()=>{});const worker=workers[0],callback=worker.onmessage;
  let visited=0;const hostile={protocol:'wrong'};Object.defineProperty(hostile,'extra',{enumerable:true,get(){visited++;return Array(500000).fill(0);}});
  const start=performance.now();await callback({data:hostile});await assert.rejects(pending,repair);
  assert.equal(visited,0);assert.ok(performance.now()-start<250);assert.equal(worker.stops,1);clean();
});
test('F13P3C-L07 unknown envelope rejects before enumerating a nested large array',async()=>{
  reset();const pending=read();pending.catch(()=>{});const worker=workers[0],r=worker.request;
  const hostile={protocol:FILE_SUPPORT.resourceVersion,id:r.id,role:r.role,operation:r.operation,profile:r.profile,policy:r.policy,reader:r.reader,status:'completed',extra:Array(999000).fill(0)};
  const native=Object.getOwnPropertyNames;let enumerated=0;
  Object.getOwnPropertyNames=value=>{if(value===hostile.extra)enumerated++;return native(value);};
  try{await worker.onmessage({data:hostile});await assert.rejects(pending,e=>e instanceof FileEvidenceRuntimeError);assert.equal(enumerated,0);assert.equal(worker.stops,1);clean();}
  finally{Object.getOwnPropertyNames=native;}
});
test('F13P3C-L08 backward monotonic clock cannot extend an admitted task',async()=>{
  reset();const own=Object.getOwnPropertyDescriptor(performance,'now');let time=100;
  Object.defineProperty(performance,'now',{configurable:true,value:()=>time});
  try{const pending=read();pending.catch(()=>{});time=99;await workers[0].onmessage({data:{}});await assert.rejects(pending,e=>e instanceof FileEvidenceRuntimeError);assert.equal(workers[0].stops,1);clean();}
  finally{if(own)Object.defineProperty(performance,'now',own);else delete performance.now;}
});
test('F13P3C-L09 cancel during genuine graph-free packet verification cannot release before verification exits',async()=>{
  reset();const source=input(),evidence=await readLocalEvidence(source,'pax-file',SOURCES.pax,30000,'find-case'),transfer=transferFileEvidence(evidence.handle,'pax-file'),observedText=observedFileText(evidence,'pax-file',source);releaseFileEvidence(evidence.handle);
  const pending=read();pending.catch(()=>{});const worker=workers[0],r=worker.request;
  const packet={protocol:r.protocol,id:r.id,role:r.role,operation:r.operation,profile:r.profile,policy:r.policy,reader:r.reader,status:'completed',...transfer.data,observedText,scan:null,problem:null,bytes:transfer.bytes};
  const callback=worker.onmessage,processing=callback({data:packet});cancelAllProcessing();await assert.rejects(pending,repair);await processing;
  assert.equal(worker.stops,1);await callback({data:packet});clean();
});
test('F13P3C-L11 synchronous timer reentry cannot register late work after retirement',async()=>{
  reset();const native=globalThis.setTimeout;let registered=0;
  globalThis.setTimeout=(callback,delay)=>{callback();registered++;return native(()=>assert.fail('Retired deadline timer survived'),delay);};
  try{await assert.rejects(read(),repair);assert.equal(registered,1);assert.equal(workers.length,0);clean();}
  finally{globalThis.setTimeout=native;}
});
test('F13P3C-L12 queued retirement after custody verification prevents profile publication',async()=>{
  reset();const source=input(),evidence=await readLocalEvidence(source,'pax-file',SOURCES.pax,30000,'find-case');
  const transfer=transferFileEvidence(evidence.handle,'pax-file'),observedText=observedFileText(evidence,'pax-file',source);releaseFileEvidence(evidence.handle);
  const controller=new AbortController(),digest=crypto.subtle.digest,Encoder=globalThis.TextEncoder;
  let queued=false,retired=false,encodedAfterHash=false;
  crypto.subtle.digest=async function(algorithm,bytes){
    const result=await digest.call(this,algorithm,bytes);
    if(bytes.byteLength===source.size){queued=true;setTimeout(()=>{retired=true;controller.abort();},0);}
    return result;
  };
  globalThis.TextEncoder=class extends Encoder{encode(value){if(queued&&value===text)encodedAfterHash=true;return super.encode(value);}};
  try{
    const pending=read(controller.signal);pending.catch(()=>{});const worker=workers[0],r=worker.request;
    const packet={protocol:r.protocol,id:r.id,role:r.role,operation:r.operation,profile:r.profile,policy:r.policy,reader:r.reader,status:'completed',...transfer.data,observedText,scan:null,problem:null,bytes:transfer.bytes};
    const receiving=worker.onmessage({data:packet});
    await assert.rejects(pending,repair);await receiving;
    assert.equal(queued,true);assert.equal(encodedAfterHash,true);assert.equal(retired,true);
    assert.equal(worker.stops,1);assert.equal(worker.onmessage,null);clean();
  }finally{crypto.subtle.digest=digest;globalThis.TextEncoder=Encoder;}
});

// Cleanup faults permanently halt that module instance, so each uses its own
// Node process. The parent test verifies actual child exit, state and attempts.
for(const fault of ['timer','signal','onmessage','onerror','listener','termination'])test(`F13P3C-L10 cleanup/quarantine ${fault}`,()=>{
  const script=`import assert from 'node:assert/strict';import {File} from 'node:buffer';globalThis.File=File;
    const attempts={timer:0,signal:0,onmessage:0,onerror:0,listener:0};const fault=${JSON.stringify(fault)};
    const clear=globalThis.clearTimeout;globalThis.clearTimeout=id=>{attempts.timer++;clear(id);if(fault==='timer')throw Error('cleanup');};
    class W extends EventTarget{constructor(){super();this.stops=0;globalThis.worker=this;}postMessage(){}terminate(){this.stops++;if(fault==='termination')throw Error('stop');}
      set onmessage(v){this.message=v;if(v===null){attempts.onmessage++;if(fault==='onmessage')throw Error('cleanup');}}get onmessage(){return this.message;}
      set onerror(v){this.error=v;if(v===null){attempts.onerror++;if(fault==='onerror')throw Error('cleanup');}}get onerror(){return this.error;}
      removeEventListener(...a){attempts.listener++;super.removeEventListener(...a);if(fault==='listener')throw Error('cleanup');}}
    globalThis.Worker=W;const r=await import('./scope-fit/bounded-reader.mjs'),s=(await import('./scope-fit/actions.mjs')).SOURCES;
    const controller=new AbortController(),remove=controller.signal.removeEventListener.bind(controller.signal);controller.signal.removeEventListener=(...a)=>{attempts.signal++;remove(...a);if(fault==='signal')throw Error('cleanup');};
    const file=new File(['a'],'cleanup.csv');const pending=r.readBoundedLocalEvidence(file,'pax-file',s.pax,30000,'find-case',controller.signal);pending.catch(()=>{});r.cancelAllProcessing();
    const RuntimeError=(await import('./scope-fit/runtime.mjs')).FileEvidenceRuntimeError;
    await assert.rejects(pending,e=>e instanceof RuntimeError);const state=r.processingState();assert.equal(worker.stops,1);assert.equal(state.halted,true);
    for(const n of Object.values(attempts))assert.ok(n>=1);assert.equal(state.activeJobs,fault==='termination'?1:0);assert.equal(state.reservedBytes,fault==='termination'?1:0);
    await assert.rejects(r.readBoundedLocalEvidence(file,'pax-file',s.pax));console.log(JSON.stringify({fault,state,attempts,stops:worker.stops}));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:5000});
  assert.equal(result.status,0,result.stderr);const observation=JSON.parse(result.stdout);assert.equal(observation.fault,fault);assert.equal(observation.stops,1);
});
