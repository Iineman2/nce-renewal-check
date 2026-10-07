import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { FILE_SUPPORT } from './file-support.mjs';
import { scanCsvEvidence, CSV_DATA_ROW_LIMIT_MESSAGE } from './csv-evidence.mjs';
import { parseCsv, PAX8_COLUMNS, HALO_COLUMNS } from './preflight.mjs';
import { captureResourceData, assertWorkerScan } from './resource-packet.mjs';
import { readLocalEvidence, issueLocalEvidence, FileEvidenceRuntimeError, observedFileText } from './runtime.mjs';
import { readBoundedLocalEvidence, processingState, cancelAllProcessing, takeProcessingPacket } from './bounded-reader.mjs';
import { transferFileEvidence, captureFileEvidence, adoptProcessedEvidence, sourceProjection, originalBytes, releaseFileEvidence } from './file-evidence.mjs';
import { InputProblem, SOURCES } from './actions.mjs';
import { padCsvBytes } from './qc-resource-fixtures.mjs';

const pax = 'source_account_id,' + PAX8_COLUMNS.join(',') + '\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
const halo = HALO_COLUMNS.join(',') + '\nl,s,c,HaloPSA\n';
const file = (text = pax) => new File([text], 'source.csv', { lastModified: 7 });
const nativeWorker = globalThis.Worker, nativeFile = globalThis.File;
globalThis.File = File;
const instances = []; let mode = 'normal', mutate = null, borrowed = null, reenter = null, stopReenter = null;
class WorkerControl extends EventTarget {
  constructor() {
    super();
    if (mode === 'constructor') throw borrowed ?? Error('foreign constructor');
    instances.push(this); this.stops = 0; this.sent = 0; this.request = null;
    reenter?.();
  }
  postMessage(request) {
    this.sent++; this.request = request;
    if (mode === 'send') throw borrowed ?? Error('foreign send');
    if (mode === 'hold') return;
    if (mode === 'error') { queueMicrotask(() => this.onerror?.({ preventDefault() {} })); return; }
    if (mode === 'messageerror') { queueMicrotask(() => this.dispatchEvent(new Event('messageerror'))); return; }
    this.emit().catch(() => this.onerror?.({ preventDefault() {} }));
  }
  terminate() { this.stops++; stopReenter?.(); if (mode === 'terminate') throw Error('termination unavailable'); }
  async emit() {
    const request = this.request; let handle = null;
    try {
      const evidence = await readLocalEvidence(request.file, request.role, request.source, request.timeoutMs, request.operation); handle = evidence.handle;
      const result = transferFileEvidence(handle, request.role);
      const packet = structuredClone({ protocol: FILE_SUPPORT.resourceVersion, id: request.id, role: request.role, operation: request.operation,
        profile: request.profile, policy: FILE_SUPPORT.policyVersion, reader: FILE_SUPPORT.readerVersion, status: 'completed',
        ...result.data, observedText: observedFileText(evidence, request.role, request.file), scan: null, problem: evidence.problem?.message ?? null, bytes: result.bytes });
      mutate?.(packet); const callback = this.onmessage;
      if (callback) await callback({ data: packet });
    } finally { releaseFileEvidence(handle); }
  }
}
globalThis.Worker = WorkerControl;
const read = (input = file(), role = 'pax-file', timeout = 30000, signal = null) => readBoundedLocalEvidence(input, role, role === 'pax-file' ? SOURCES.pax : SOURCES.halo, timeout, role === 'pax-file' ? 'find-case' : 'compare-records', signal);
const reset = () => { mode = 'normal'; mutate = borrowed = reenter = stopReenter = null; };
const repair = role => error => error instanceof InputProblem && error.target === role && !error.message.includes('CONFIDENTIAL');
const technical = error => error instanceof FileEvidenceRuntimeError && !(error instanceof InputProblem) && !error.message.includes('CONFIDENTIAL');
const clean = () => { assert.equal(processingState().activeJobs, 0); assert.equal(processingState().reservedBytes, 0); };
// Completion transport has no lexical graph. These are deliberately unsupported
// non-null wire values, not claims that their internals reach reconstruction.
const unsupportedWireScan = change => packet => { packet.scan = structuredClone(scanCsvEvidence(packet.text)); change(packet.scan); };

test('F13P3-M01 decoded length rejects before allocating offset storage', () => {
  const Native = globalThis.Uint32Array; let allocations = 0;
  try {
    globalThis.Uint32Array = class extends Native { constructor(...args) { allocations++; super(...args); } };
    const scan = scanCsvEvidence('a'.repeat(2000001)); assert.equal(scan.complete, false); assert.match(scan.failure.message, /decoded text limit/); assert.equal(allocations, 0);
  } finally { globalThis.Uint32Array = Native; }
});
for (const size of [1999999,2000000,2000001]) test(`F13P3-M02 original-byte frontier ${size}`, async () => {
  const input = file(padCsvBytes(pax,size)), before = instances.length;
  if (size > 2000000) { await assert.rejects(read(input),repair('pax-file')); assert.equal(instances.length,before); }
  else { const evidence = await read(input); assert.equal(evidence.problem,null); assert.equal(originalBytes(evidence.handle,'pax-file').length,size); releaseFileEvidence(evidence.handle); }
  clean();
});
for (const n of [9999,10000,10001]) test(`F13P3-M03 lexical source-record frontier ${n} including blanks`, () => {
  const scan = scanCsvEvidence('a\nx\n'+'\n'.repeat(n-2)); assert.equal(scan.complete,n<=10000);
  assert.equal(scan.sourceRecordCount,Math.min(n,10000)); if(n>10000)assert.match(scan.failure.message,/lexical source records/);
});
for (const n of [4999,5000,5001]) test(`F13P3-M04 independent data-row frontier ${n}`, () => {
  const text = HALO_COLUMNS.join(',')+'\n'+('l,s,c,HaloPSA\n').repeat(n);
  if(n<=5000)assert.equal(parseCsv(text,HALO_COLUMNS).length,n);else assert.throws(()=>parseCsv(text,HALO_COLUMNS),/5000 rows/);
});
for (const n of [65535,65536,65537]) test(`F13P3-M05 aggregate cell frontier ${n}`, () => {
  const line = Array(64).fill('x').join(',')+'\n', remainder = n%64;
  const text = line.repeat(Math.floor(n/64))+(remainder?Array(remainder).fill('x').join(',')+'\n':'');
  const scan=scanCsvEvidence(text);assert.equal(scan.complete,n<=65536);
  if(n<=65536)assert.equal(scan.records.reduce((sum,r)=>sum+r.cells.length,0),n);else assert.match(scan.failure.message,/65536 total cells/);
});
for (const n of [63,64,65]) test(`F13P3-M06 column frontier ${n}`,()=>{
  const scan=scanCsvEvidence(Array.from({length:n},(_,i)=>'h'+i).join(',')+'\n'+Array(n).fill('x').join(','));assert.equal(scan.complete,n<=64);
  if(n>64)assert.match(scan.failure.message,/64 columns/);
});
for (const n of [63,64,65]) test(`F13P3-M07 normalized header-unit frontier ${n}`,()=>{
  // The required-column list stays valid so the source header, rather than
  // the independent required-name guard, reaches this normalization frontier.
  const name='h'.repeat(n),text='required, '+name.toUpperCase()+' \nkept,x',required=['required'];
  const scan=scanCsvEvidence(text);assert.equal(scan.complete,true);assert.equal(scan.records[0].cells[1].rawValue.length,n+2);
  if(n<=64){const row=parseCsv(text,required)[0];assert.equal(row.required,'kept');assert.equal(row[name],'x');}
  else assert.throws(()=>parseCsv(text,required),error=>error instanceof TypeError &&
    error.message==='CSV headers must contain at most 64 nonempty names of at most 64 characters');
});
for (const n of [1023,1024,1025]) test(`F13P3-M08 raw UTF16 cell frontier ${n}`,()=>{
  const value='\u{1f600}'.repeat(Math.floor(n/2))+(n%2?'x':''),scan=scanCsvEvidence('h\n"'+value+'"');assert.equal(scan.complete,n<=1024);
  if(n<=1024)assert.equal(scan.records[1].cells[0].rawValue.length,n);else assert.match(scan.failure.message,/1024/);
});
for (const n of [4095,4096,4097]) test(`F13P3-M09 lexical field frontier ${n} with ignored whitespace`,()=>{
  const lexeme='"x"'+' '.repeat(n-3),scan=scanCsvEvidence('h\n'+lexeme);assert.equal(scan.complete,n<=4096);
  if(n<=4096){assert.equal(scan.records[1].cells[0].lexeme.length,n);assert.equal(scan.records[1].cells[0].rawValue,'x');}else assert.match(scan.failure.message,/lexical field/);
});
test('F13P3-M10 quoted newlines are one lexical record and EOF creates no phantom',()=>{
  const scan=scanCsvEvidence('a\n"'+('\n'.repeat(1024))+'"\n');assert.equal(scan.complete,true);assert.equal(scan.sourceRecordCount,2);
});
test('F13P3-M11 compact skipped runs retain exact varying-width cell work',()=>{
  const scan=scanCsvEvidence('a\nx\n\n,,,\n"" ,\n');assert.equal(scan.complete,true);assert.equal(scan.emptyRuns[0].totalCells,7);
  assertWorkerScan(captureResourceData(scan),'a\nx\n\n,,,\n"" ,\n',15);
});
for(const depth of [11,12,13])test(`F13P3-M12 packet depth frontier ${depth}`,()=>{
  let value=0;for(let i=0;i<depth;i++)value={next:value};if(depth<=12)assert.ok(captureResourceData(value));else assert.throws(()=>captureResourceData(value),/depth budget/);
});
for(const count of [999999,1000000,1000001])test(`F13P3-M13 packet value frontier ${count}`,()=>{
  const value=Array(count-1).fill(0);if(count<=1000000)assert.equal(captureResourceData(value).length,count-1);else assert.throws(()=>captureResourceData(value),/value budget/);
});
for(const count of [15999999,16000000,16000001])test(`F13P3-M14 aggregate packet string frontier ${count}`,()=>{
  const value=Array(7).fill('x'.repeat(2000000));value.push('y'.repeat(count-14000000));
  if(count<=16000000)assert.equal(captureResourceData(value).at(-1).length,count-14000000);else assert.throws(()=>captureResourceData(value),/text budget/);
});
test('F13P3-M15 packet accessors sparse cycles hidden fields symbols and exotic values reject',()=>{
  let calls=0;const getter={get text(){calls++;return 'forged';}},hidden={};Object.defineProperty(hidden,'secret',{get(){calls++;return 'x';}});
  const cycle={};cycle.self=cycle;for(const value of [getter,hidden,new Date(),cycle,[,1],{x:Infinity},{[Symbol('x')]:1},{x:()=>1}])assert.throws(()=>captureResourceData(value));assert.equal(calls,0);
});
test('F13P3-M16 native File admission wrong role operation and invalid deadline cause no worker work',async()=>{
  let access=0;const input={get size(){access++;return 1;}};const before=instances.length;
  await assert.rejects(read(input),technical);
  for(const timeout of [0,-1,1.5,30001,Infinity,'1'])await assert.rejects(read(file(),'pax-file',timeout),technical);
  await assert.rejects(readBoundedLocalEvidence(input,'agreement',SOURCES.pax),technical);
  await assert.rejects(readBoundedLocalEvidence(input,'halo-file',SOURCES.halo,30000,'find-case'),technical);
  await assert.rejects(readBoundedLocalEvidence(input,'pax-file',SOURCES.halo),technical);assert.equal(access,0);assert.equal(instances.length,before);clean();
});
test('F13P3-M17 abort before admission creates no worker or reservation',async()=>{
  const controller=new AbortController();controller.abort();const before=instances.length;await assert.rejects(read(file(),'pax-file',30000,controller.signal),repair('pax-file'));assert.equal(instances.length,before);clean();
});
test('F13P3-M18 cancellation terminates once settles once and fences late callback',async()=>{
  mode='hold';const controller=new AbortController(),promise=read(file(),'pax-file',30000,controller.signal);let settlements=0;promise.catch(()=>settlements++);
  const worker=instances.at(-1),late=worker.onmessage;const started=performance.now();controller.abort();controller.abort();await assert.rejects(promise,repair('pax-file'));
  assert.ok(performance.now()-started<250);assert.equal(worker.stops,1);assert.equal(worker.onmessage,null);assert.equal(settlements,1);await late({data:{id:worker.request.id}});clean();reset();
});
test('F13P3-M19 two-job capacity admits both roles rejects overflow no queue and retry succeeds',async()=>{
  mode='hold';const a=read(file()),b=read(file(halo),'halo-file');a.catch(()=>{});b.catch(()=>{});const state=processingState();assert.equal(state.activeJobs,2);assert.equal(state.reservedBytes,new TextEncoder().encode(pax+halo).length);
  const before=instances.length;await assert.rejects(read(file()),repair('pax-file'));assert.equal(instances.length,before);
  cancelAllProcessing();await assert.rejects(a,repair('pax-file'));await assert.rejects(b,repair('halo-file'));clean();reset();const result=await read();releaseFileEvidence(result.handle);clean();
});
test('F13P3-M20 deadline stops a stalled worker and releases capacity for retry',async()=>{
  mode='hold';const promise=read(file(),'pax-file',5),worker=instances.at(-1);await assert.rejects(promise,e=>repair('pax-file')(e)&&/timed out/.test(e.message));assert.equal(worker.stops,1);clean();reset();const result=await read();releaseFileEvidence(result.handle);
});
test('F13P3-M21 constructor cancellation cannot send to an untracked late worker',async()=>{
  mode='hold';const controller=new AbortController();reenter=()=>controller.abort();const promise=read(file(),'pax-file',30000,controller.signal),worker=instances.at(-1);
  await assert.rejects(promise,repair('pax-file'));assert.equal(worker.sent,0);assert.equal(worker.stops,1);clean();reset();
});
test('F13P3-M22 constructor send worker-error and messageerror paths clean up exactly',async()=>{
  for(const fault of ['constructor','send','error','messageerror']){mode=fault;await assert.rejects(read(),fault==='error'?repair('pax-file'):technical);clean();reset();}
});
test('F13P3-M23 borrowed same-role and wrong-role input errors cannot impersonate owned repair',async()=>{
  for(const fault of ['constructor','send'])for(const role of ['pax-file','halo-file']){
    mode=fault;borrowed=new InputProblem('CONFIDENTIAL foreign dependency text',role,role==='pax-file'?SOURCES.pax:SOURCES.halo);
    await assert.rejects(read(),e=>technical(e)&&e!==borrowed);clean();reset();
  }
});
test('F13P3-M24 exact decoded/profile faults are privately issued partial outcomes with original recovery',async()=>{
  for(const [text,role]of[['a\nx\n','pax-file'],['a\nx\n','halo-file']]){const e=await read(file(text),role);assert.ok(e.problem instanceof InputProblem);assert.equal(e.problem.target,role);assert.deepEqual(Buffer.from(originalBytes(e.handle,role)),Buffer.from(text));releaseFileEvidence(e.handle);}clean();
});
test('F13P3-M25 forged packets and ordinary capture handles cannot issue browser acquisition',async()=>{
  const input=file(),handle=await captureFileEvidence(await input.arrayBuffer(),'pax-file',input);
  for(const fake of [null,{},Object.freeze({}),structuredClone({})]){assert.throws(()=>issueLocalEvidence(handle,'pax-file',input,null,fake),technical);assert.throws(()=>takeProcessingPacket(fake,'pax-file',input),technical);await assert.rejects(adoptProcessedEvidence(fake,'pax-file',input),technical);}
  releaseFileEvidence(handle);clean();
});
test('F13P3-M26 foreign stale malformed identities and non-null wire scan cannot publish evidence',async()=>{
  for(const transform of [p=>p.id++,p=>p.role='halo-file',p=>p.policy='old',p=>p.reader='old',p=>p.operation='compare-records',p=>p.profile='foreign',p=>p.protocol='old',p=>p.extra='unowned',p=>p.scan={complete:'yes'},p=>p.metadata.name='different']){
    mutate=transform;await assert.rejects(read(),technical);clean();reset();
  }
  // Even a complete, source-equivalent graph is unsupported transport. Scalar
  // and container alternatives cannot activate a legacy graph-copy branch.
  for(const value of [undefined,false,0,'',[],{},structuredClone(scanCsvEvidence(pax))]){
    mutate=packet=>{packet.scan=value;};await assert.rejects(read(),technical);clean();reset();
  }
  let visited=0;const foreign={};Object.defineProperty(foreign,'records',{enumerable:true,get(){visited++;throw Error('Foreign graph traversed');}});
  mutate=packet=>{packet.scan=foreign;};await assert.rejects(read(),technical);assert.equal(visited,0);clean();reset();
});
test('F13P3-M27 actual byte hash text faults and unsupported wire lexical inventories reject',async()=>{
  for(const transform of [p=>new Uint8Array(p.bytes)[0]^=1,p=>p.sha256='0'.repeat(64),p=>p.text=p.text.replace('pax8','fake'),
    unsupportedWireScan(scan=>scan.records[0].cells[0].lexeme='foreign'),
    unsupportedWireScan(scan=>{scan.records[1].cells[0].rawValue='invented';scan.records[1].cells[0].normalizedValue='invented';}),
    unsupportedWireScan(scan=>scan.records[1].cells[0].startByte++),unsupportedWireScan(scan=>scan.sourceRecordCount=10001),
    unsupportedWireScan(scan=>scan.records=Array(5002).fill(scan.records[0]))]){
    mutate=transform;await assert.rejects(read(),technical);clean();reset();
  }
});
test('F13P3-M28 two-role cache immutable canonical row reuse and old release preserve new occurrence',async()=>{
  const a=await read(),b=await read(file(halo),'halo-file');assert.equal(processingState().cachedSources,2);
  const rows=parseCsv(a.text,PAX8_COLUMNS);assert.strictEqual(parseCsv(a.text,PAX8_COLUMNS),rows);assert.ok(Object.isFrozen(rows)&&Object.isFrozen(rows[0]));assert.throws(()=>{rows[0].subscription_id='foreign';});
  const replacement=await read(file(pax.replace(',s,c,',',s2,c2,')));assert.equal(processingState().cachedSources,2);releaseFileEvidence(a.handle);assert.equal(processingState().cachedSources,2);
  assert.equal(sourceProjection(replacement.handle,'pax-file').records[1].cells[1].rawValue,'s2');releaseFileEvidence(b.handle);releaseFileEvidence(replacement.handle);assert.equal(processingState().cachedSources,0);clean();
});
test('F13P3-M31 native termination reentry cannot stop or release twice',async()=>{
  mode='hold';const promise=read();const worker=instances.at(-1);stopReenter=()=>cancelAllProcessing('reentrant cancel');cancelAllProcessing();
  await assert.rejects(promise,repair('pax-file'));assert.equal(worker.stops,1);clean();reset();
  stopReenter=()=>cancelAllProcessing('cancel during completed worker stop');await assert.rejects(read(),repair('pax-file'));clean();reset();
});

test('F13P3-M32 canceled and expired native adoption remain reserved until actual settlement',async()=>{
  const native=crypto.subtle.digest.bind(crypto.subtle);
  const waitUntil=async(test,label)=>{const start=performance.now();while(!test()){if(performance.now()-start>2500)throw Error(label+' did not finish within the fixture bound');await new Promise(r=>setTimeout(r,1));}};
  for(const reason of ['cancel','deadline','cancel-probe','deadline-probe']) {
    let hashes=0,probes=0,release=null;const probe=reason.endsWith('probe');
    crypto.subtle.digest=(algorithm,bytes)=>{
      const phase=bytes.byteLength===3?++probes:++hashes;
      if(phase===2&&(probe?bytes.byteLength===3:bytes.byteLength>3))return new Promise(resolve=>{release=()=>native(algorithm,bytes).then(resolve);});
      return native(algorithm,bytes);
    };
    const input=file(),controller=new AbortController(),promise=read(input,'pax-file',reason.startsWith('deadline')?1000:30000,controller.signal);promise.catch(()=>{});
    await waitUntil(()=>release,'Native adoption registration');
    if(reason.startsWith('cancel'))controller.abort();await assert.rejects(promise,repair('pax-file'));
    assert.equal(processingState().activeJobs,1);assert.equal(processingState().reservedBytes,input.size);
    const before=instances.length;await assert.rejects(read(),repair('pax-file'));assert.equal(instances.length,before);
    await release();await waitUntil(()=>!processingState().activeJobs,'Canceled adoption cleanup');assert.equal(hashes,probe?1:2);clean();
    crypto.subtle.digest=native;const retry=await read();releaseFileEvidence(retry.handle);clean();
  }
});

test('F13P3-M33 supplied non-null wire graph rejects irrespective of cross-row or omitted-run corruption',async()=>{
  const text=halo+'l2,s2,c2,other\n';
  for(const transform of [
    unsupportedWireScan(scan=>scan.records[1].cells[3]=structuredClone(scan.records[2].cells[3])),
    unsupportedWireScan(scan=>scan.records[1].dataRecordNumber=2),unsupportedWireScan(scan=>{[scan.records[1],scan.records[2]]=[scan.records[2],scan.records[1]];scan.records[1].dataRecordNumber=1;scan.records[2].dataRecordNumber=2;}),
    unsupportedWireScan(scan=>scan.records[1].terminatorLocation=structuredClone(scan.records[2].terminatorLocation)),
    unsupportedWireScan(scan=>scan.records[1].sourceRecordOrdinal=3),
    unsupportedWireScan(scan=>scan.records[0].cells[0].startByte++),
  ]){mutate=transform;await assert.rejects(read(file(text),'halo-file'),technical);clean();reset();}
  for(const transform of [unsupportedWireScan(scan=>scan.emptyRuns[0].count++),unsupportedWireScan(scan=>scan.emptyRuns[0].firstSourceRecordOrdinal++),unsupportedWireScan(scan=>scan.emptyRuns[0].firstRecord.cells[0].rawValue='invented')]){
    mutate=transform;await assert.rejects(read(file(pax+'\n')),technical);clean();reset();
  }
});

test('F13P3-M34 simultaneous maximum native byte reservations never exceed four million',async()=>{
  for(const n of[1999999,2000000]){mode='hold';const a=read(new File([new Uint8Array(2000000)],'pax.csv')),b=read(new File([new Uint8Array(n)],'halo.csv'),'halo-file');a.catch(()=>{});b.catch(()=>{});
    assert.equal(processingState().reservedBytes,2000000+n);assert.equal(processingState().activeJobs,2);
    await assert.rejects(read(new File([new Uint8Array(2000001)],'oversize.csv')),repair('pax-file'));cancelAllProcessing();await assert.rejects(a);await assert.rejects(b);clean();reset();}
});

for(const n of[63,64,65])test(`F13P3-M35 packet property name frontier ${n}`,()=>{
  const value={['k'.repeat(n)]:0};if(n<=64)assert.ok(captureResourceData(value));else assert.throws(()=>captureResourceData(value),/property name/);
});

test('F13P3-M36 lexical CRLF boundaries cannot split into invented blank source records',()=>{
  const text='h\nx\n\n\r\n',scan=structuredClone(scanCsvEvidence(text));
  scan.emptyRuns[0].endOffset--;scan.emptyRuns[0].endByte--;scan.complete=false;
  scan.failure={message:'invented partial boundary',startOffset:null,endOffset:null,startByte:null,endByte:null,sourceRecordOrdinal:null};
  assert.throws(()=>assertWorkerScan(captureResourceData(scan),text,text.length),/CRLF|known location/);
});

test('F13P3-M38 duplicate delivery cannot release the first in-progress packet verification',async()=>{
  const input=file(pax.split('\n')[0]+'\n'+(pax.split('\n')[1]+'\n').repeat(300));
  const prepared=await readLocalEvidence(input,'pax-file',SOURCES.pax,30000,'find-case'),transferred=transferFileEvidence(prepared.handle,'pax-file'),observedText=observedFileText(prepared,'pax-file',input);releaseFileEvidence(prepared.handle);
  mode='hold';const promise=read(input),worker=instances.at(-1),callback=worker.onmessage;promise.catch(()=>{});
  const request=worker.request,packet={protocol:FILE_SUPPORT.resourceVersion,id:request.id,role:request.role,operation:request.operation,profile:request.profile,policy:FILE_SUPPORT.policyVersion,reader:FILE_SUPPORT.readerVersion,status:'completed',...transferred.data,observedText,scan:null,problem:null,bytes:transferred.bytes};
  const first=callback({data:packet});assert.equal(worker.stops,1);assert.equal(processingState().activeJobs,1);
  const duplicate=callback({data:{}});assert.equal(processingState().activeJobs,1);assert.equal(processingState().reservedBytes,input.size);
  await assert.rejects(promise,technical);await duplicate;await first;assert.equal(worker.stops,1);clean();reset();
});
for(const n of[29999,30000,30001])test(`F13P3-M39 monotonic deadline frontier ${n}`,async()=>{
  const own=Object.getOwnPropertyDescriptor(performance,'now');let time=0;
  Object.defineProperty(performance,'now',{configurable:true,value:()=>time});mutate=()=>time=n;
  try{if(n<30000){const result=await read();releaseFileEvidence(result.handle);}else await assert.rejects(read(),e=>repair('pax-file')(e)&&/timed out/.test(e.message));clean();}
  finally{if(own)Object.defineProperty(performance,'now',own);else delete performance.now;reset();}
});

for(const n of[16383,16384,16385])test(`F13P3-M40 native filename unit frontier ${n}`,async()=>{
  const input=new File([pax],'n'.repeat(n-4)+'.csv');const before=instances.length;
  if(n<=16384){const result=await read(input);assert.equal(sourceProjection(result.handle,'pax-file').metadata.name.length,n);assert.deepEqual(Buffer.from(originalBytes(result.handle,'pax-file')),Buffer.from(pax));releaseFileEvidence(result.handle);}
  else{await assert.rejects(read(input),repair('pax-file'));assert.equal(instances.length,before);}clean();
});
for(const n of[1023,1024,1025])test(`F13P3-M41 native media-type unit frontier ${n}`,async()=>{
  const input=new File([pax],'source.csv',{type:'x'.repeat(n)}),before=instances.length;
  if(n<=1024){const result=await read(input);assert.equal(sourceProjection(result.handle,'pax-file').metadata.type.length,n);releaseFileEvidence(result.handle);}
  else{await assert.rejects(read(input),repair('pax-file'));assert.equal(instances.length,before);}clean();
});

test('F13P3-M42 genuine partial lexical failure provenance rejects malformed and lost frontiers',()=>{
  const text='h\nx\n"unterminated',original=scanCsvEvidence(text);assert.equal(original.complete,false);assertWorkerScan(captureResourceData(original),text,text.length);
  for(const mutate of[
    p=>p.failure=false,p=>p.failure=0,p=>p.failure='',p=>p.failure.message='',p=>p.failure.extra='foreign',
    p=>{p.failure.startOffset=p.failure.endOffset=p.failure.startByte=p.failure.endByte=0;},
    p=>p.failure.sourceRecordOrdinal=1,p=>p.failure.sourceRecordOrdinal=10001,p=>p.sourceRecordCount=10000,
    p=>p.records.pop(),p=>p.failure.endByte=null,p=>{for(const k of['startOffset','endOffset','startByte','endByte'])p.failure[k]=null;p.failure.sourceRecordOrdinal=null;}
  ]){const scan=structuredClone(original);mutate(scan);assert.throws(()=>assertWorkerScan(captureResourceData(scan),text,text.length));}
  const zero='"unterminated',scan=structuredClone(scanCsvEvidence(zero));for(const k of['startOffset','endOffset','startByte','endByte'])scan.failure[k]=null;scan.failure.sourceRecordOrdinal=null;assert.throws(()=>assertWorkerScan(captureResourceData(scan),zero,zero.length));
  const full='h\n'+'x\n'.repeat(5000),tail=full+'"unterminated',phantom=structuredClone(scanCsvEvidence(tail));phantom.sourceRecordCount++;assert.throws(()=>assertWorkerScan(captureResourceData(phantom),tail,tail.length));phantom.failure.message='CSV exceeds 5000 rows';assert.throws(()=>assertWorkerScan(captureResourceData(phantom),tail,tail.length));
  for(const ending of['\uFEFF\n','\uFEFF,\n','"\uFEFF"\n']){const value=full+ending,partial=scanCsvEvidence(value);assert.equal(partial.sourceRecordCount,5002);assertWorkerScan(captureResourceData(partial),value,new TextEncoder().encode(value).length);}
  const line=n=>Array(n).fill('a').join(',')+'\n',saturated='h\n'+line(14).repeat(534)+line(13).repeat(4466);
  assert.equal(scanCsvEvidence(saturated).records.reduce((n,r)=>n+r.cells.length,0),65535);
  for(const ending of['a\n','a,a\n','a,a,a\n']){
    const value=saturated+ending,canonical=scanCsvEvidence(value);assertWorkerScan(captureResourceData(canonical),value,value.length);
    if(ending==='a\n')assert.equal(canonical.sourceRecordCount,5002);
    else{assert.equal(canonical.sourceRecordCount,5001);const spoof=structuredClone(canonical);spoof.sourceRecordCount++;spoof.failure.message=CSV_DATA_ROW_LIMIT_MESSAGE;for(const k of['startOffset','endOffset','startByte','endByte'])spoof.failure[k]=saturated.length;assert.throws(()=>assertWorkerScan(captureResourceData(spoof),value,value.length));}
  }
  for(const value of['h\nx\n',full]){const complete=structuredClone(scanCsvEvidence(value));complete.complete=false;complete.failure={message:'CSV exceeds 5000 rows',startOffset:value.length,endOffset:value.length,startByte:value.length,endByte:value.length,sourceRecordOrdinal:complete.sourceRecordCount+1};assert.throws(()=>assertWorkerScan(captureResourceData(complete),value,value.length));complete.sourceRecordCount++;assert.throws(()=>assertWorkerScan(captureResourceData(complete),value,value.length));}
  for(const value of['','h\n'+ 'x\n'.repeat(5001),'h\nx\n'+Array(65).fill('a').join(','),'h\nx\n'+ 'a'.repeat(1025),'h\nx\n"x"'+ ' '.repeat(4094),'h\nx\n'+ '\n'.repeat(9999),'h\nx\n'+Array(64).fill('a').join(',')+',']){
    const canonical=scanCsvEvidence(value);assert.equal(canonical.complete,false);assertWorkerScan(captureResourceData(canonical),value,new TextEncoder().encode(value).length);
  }
});

test('F13P3-M29 native Worker unavailability has no synchronous browser fallback',async()=>{
  const before=instances.length;globalThis.Worker=undefined;try{await assert.rejects(read(),technical);assert.equal(instances.length,before);clean();}finally{globalThis.Worker=WorkerControl;}
});
test('F13P3-M30 failed termination quarantines its reservation and halts new admission',async()=>{
  mode='hold';const controller=new AbortController(),input=file(),promise=read(input,'pax-file',30000,controller.signal);mode='terminate';controller.abort();await assert.rejects(promise,technical);
  const state=processingState();assert.equal(state.halted,true);assert.equal(state.activeJobs,1);assert.equal(state.reservedBytes,input.size);
  reset();const before=instances.length;await assert.rejects(read(),technical);assert.equal(instances.length,before);
  globalThis.Worker=nativeWorker;globalThis.File=nativeFile;
});


test('F13P3-M43 coherent failure-coordinate moves and diagnostic retags reject canonical replay',()=>{
  for(const value of ['h\n"unterminated','h\n\uFEFF"unterminated','h\n"x"bad','h\n'+('x'.repeat(1025))]){
    const canonical=scanCsvEvidence(value),length=new TextEncoder().encode(value).length;
    assert.equal(canonical.complete,false);assertWorkerScan(captureResourceData(canonical),value,length);
    const moved=structuredClone(canonical),point=moved.failure.startOffset+1;
    moved.failure.startOffset=moved.failure.endOffset=point;
    moved.failure.startByte=moved.failure.endByte=new TextEncoder().encode(value.slice(0,point)).length;
    assert.throws(()=>assertWorkerScan(captureResourceData(moved),value,length),/canonical source frontier/);
    const renamed=structuredClone(canonical);renamed.failure.message='CSV exceeds 5000 rows';
    assert.throws(()=>assertWorkerScan(captureResourceData(renamed),value,length),/canonical source frontier/);
  }
});
