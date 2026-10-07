import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { FILE_SUPPORT, glossaryProjection } from './file-support.mjs';
import { createFileHandlingSession } from './file-handling.mjs';
import { readLocalEvidence, observedFileText } from './runtime.mjs';
import { originalBytes, sourceText, sourceProjection, sourceMatches, transferFileEvidence, releaseFileEvidence } from './file-evidence.mjs';
import { processingState, cancelAllProcessing, clearProcessedEvidence } from './bounded-reader.mjs';
import { SOURCES, InputProblem } from './actions.mjs';
import { createCaseFinder, searchCaseFinder, revokeCaseFinder } from './preflight.mjs';
import { readFileSync } from 'node:fs';

const text='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
const nativeWorker=globalThis.Worker,nativeFile=globalThis.File;
let mode='complete', workers=[];
class LocalWorker extends EventTarget {
  constructor(){super();this.stops=0;workers.push(this);}
  terminate(){this.stops++;}
  postMessage(request){this.request=request;if(mode==='complete')queueMicrotask(()=>this.complete().catch(e=>{this.error=e;this.onerror?.({preventDefault(){}});}));}
  async complete(){
    const r=this.request,e=await readLocalEvidence(r.file,r.role,r.source,r.timeoutMs,r.operation);
    const packet=transferFileEvidence(e.handle,r.role),observedText=observedFileText(e,r.role,r.file);releaseFileEvidence(e.handle);
    await this.onmessage?.({data:{protocol:r.protocol,id:r.id,role:r.role,operation:r.operation,profile:r.profile,policy:r.policy,reader:r.reader,status:'completed',...packet.data,scan:null,observedText,problem:e.problem?.message??null,bytes:packet.bytes}});
  }
}
globalThis.File=File;globalThis.Worker=LocalWorker;
const file=(role='pax-file')=>new File([role==='pax-file'?text:halo],'same.csv',{lastModified:7});
function setup(){const selected=new Map(),session=createFileHandlingSession(role=>selected.get(role));return{selected,session,select(role='pax-file',f=file(role)){selected.set(role,f);session.select(role);return f;},read(role='pax-file',operation='compare-records',f=selected.get(role)){return session.read(f,role,role==='pax-file'?SOURCES.pax:SOURCES.halo,30000,operation);}};}
test.beforeEach(()=>{mode='complete';workers=[];});
test.afterEach(()=>{cancelAllProcessing();clearProcessedEvidence();assert.equal(processingState().activeJobs,0);assert.equal(processingState().reservedBytes,0);});
test.after(()=>{globalThis.Worker=nativeWorker;globalThis.File=nativeFile;});

test('F13P5-M01 immutable explicit local policy and separate glossary agree',()=>{
  const p=FILE_SUPPORT.authorizedHandling;assert.ok(Object.isFrozen(p));assert.equal(p.version,'local-selection-v2');assert.equal(p.handlesPerRole,2);
  for(const key of ['remoteProcessing','persistence','logging','crossPageSharing'])assert.equal(p[key],false);
  assert.ok(p.glossary.every(x=>Object.isFrozen(x)));assert.deepEqual(glossaryProjection().slice(-p.glossary.length),p.glossary);
  assert.throws(()=>p.remoteProcessing=true);assert.throws(()=>p.glossary[0].definition='upload');
});
test('F13P5-M02 unselected missing and fabricated files admit no Worker',async()=>{
  const s=setup();await assert.rejects(s.read(),InputProblem);s.selected.set('pax-file',file());await assert.rejects(s.read(),InputProblem);
  s.selected.set('pax-file',{name:'fake.csv'});assert.throws(()=>s.session.select('pax-file'));await assert.rejects(s.read());assert.equal(workers.length,0);
});
for(const role of ['other','halo-file',{},null])test('F13P5-M03 wrong role/operation cannot broaden selection '+JSON.stringify(role),async()=>{
  const s=setup();const f=s.select();await assert.rejects(s.session.read(f,role,SOURCES.pax,30000,'find-case'));assert.equal(workers.length,0);s.session.clear();
});
for(const operation of ['upload','ocr','save-remote','delete-hosted',{},null])test('F13P5-M04 undeclared operation '+JSON.stringify(operation),async()=>{
  const s=setup();s.select();await assert.rejects(s.read('pax-file',operation));assert.equal(workers.length,0);s.session.clear();
});
test('F13P5-M05 wrong recipient/source fails before Worker admission',async()=>{const s=setup(),f=s.select();await assert.rejects(s.session.read(f,'pax-file',SOURCES.halo,30000));assert.equal(workers.length,0);s.session.clear();});
test('F13P5-M06 local find check exact-original inspection and release',async()=>{
  const s=setup(),f=s.select(),e=await s.read('pax-file','find-case');assert.equal(e.problem,null);assert.equal(sourceText(e.handle,'pax-file'),text);assert.equal(sourceMatches(e.handle,'pax-file',f),true);assert.deepEqual(Buffer.from(originalBytes(e.handle,'pax-file')),Buffer.from(text));
  assert.deepEqual(s.session.state(),{selectedRoles:1,retainedHandles:1});assert.equal(processingState().cachedSources,1);
  assert.deepEqual(Object.keys(workers[0].request).sort(),['file','id','operation','policy','profile','protocol','reader','role','source','timeoutMs']);releaseFileEvidence(e.handle);assert.equal(s.session.state().retainedHandles,0);s.session.clear();
});
test('F13P5-M07 matching name bytes and time on another File give no permission',async()=>{const s=setup();s.select();await assert.rejects(s.read('pax-file','compare-records',file()),InputProblem);assert.equal(workers.length,0);s.session.clear();});
test('F13P5-M08 foreign session and serialized state grant no original access',async()=>{
  const a=setup(),b=setup(),f=a.select(),e=await a.read();b.selected.set('pax-file',f);
  await assert.rejects(b.read(),InputProblem);assert.deepEqual(JSON.parse(JSON.stringify(a.session.state())),{selectedRoles:1,retainedHandles:1});
  assert.throws(()=>originalBytes(JSON.parse(JSON.stringify(e.handle)),'pax-file'));a.session.clear();assert.throws(()=>originalBytes(e.handle,'pax-file'));b.session.clear();
});
test('F13P5-M09 same-object reselection retires old original and creates fresh occurrence',async()=>{const s=setup(),f=s.select(),e=await s.read();s.session.select('pax-file');assert.equal(s.selected.get('pax-file'),f);assert.throws(()=>sourceProjection(e.handle,'pax-file'));const next=await s.read();assert.notEqual(next.handle,e.handle);s.session.clear();});
test('F13P5-M10 role replacement preserves independent role original',async()=>{const s=setup();s.select();s.select('halo-file');const a=await s.read(),b=await s.read('halo-file');s.select('pax-file');assert.throws(()=>originalBytes(a.handle,'pax-file'));assert.equal(sourceText(b.handle,'halo-file'),halo);assert.deepEqual(s.session.state(),{selectedRoles:2,retainedHandles:1});s.session.clear();assert.throws(()=>originalBytes(b.handle,'halo-file'));assert.equal(processingState().cachedSources,0);});
test('F13P5-M11 role removal retires access and cannot reprocess old file',async()=>{const s=setup(),f=s.select(),e=await s.read();s.selected.delete('pax-file');s.session.select('pax-file');assert.throws(()=>originalBytes(e.handle,'pax-file'));await assert.rejects(s.read('pax-file','compare-records',f));assert.deepEqual(s.session.state(),{selectedRoles:0,retainedHandles:0});});
test('F13P5-M12 changed FileList without event fences admission and original consumption',async()=>{const s=setup();s.select();const e=await s.read();s.selected.set('pax-file',file());await assert.rejects(s.read());for(const consume of [originalBytes,sourceText,sourceProjection])assert.throws(()=>consume(e.handle,'pax-file'));s.session.clear();});
test('F13P5-M13 revocation stops pending task and late native callback publishes nothing',async()=>{
  mode='hold';const s=setup();s.select();const p=s.read();p.catch(()=>{});const worker=workers[0],old=worker.onmessage;s.session.clear();await assert.rejects(p,InputProblem);assert.equal(worker.stops,1);await old({data:{permission:true}});assert.equal(processingState().cachedSources,0);assert.equal(s.session.state().selectedRoles,0);
});
test('F13P5-M14 Cancel stops task but retains original and allows retry',async()=>{
  const s=setup();s.select();const e=await s.read();mode='hold';const p=s.read();p.catch(()=>{});cancelAllProcessing();await assert.rejects(p,InputProblem);assert.equal(sourceText(e.handle,'pax-file'),text);assert.equal(s.session.state().selectedRoles,1);mode='complete';const next=await s.read();releaseFileEvidence(e.handle);releaseFileEvidence(next.handle);s.session.clear();
});
test('F13P5-M15 permission checked during packet/native publication, not just admission',async()=>{mode='hold';const s=setup();s.select();const p=s.read();p.catch(()=>{});s.selected.set('pax-file',file());await workers[0].complete();await assert.rejects(p);assert.equal(processingState().cachedSources,0);s.session.clear();});
test('F13P5-M16 finite handle bound and release callbacks do not retain history',async()=>{const s=setup();s.select();for(let i=0;i<20;i++){const e=await s.read();assert.equal(s.session.state().retainedHandles,1);releaseFileEvidence(e.handle);assert.equal(s.session.state().retainedHandles,0);}const a=await s.read(),b=await s.read();await assert.rejects(s.read(),/previous original/);assert.equal(s.session.state().retainedHandles,2);assert.equal(sourceText(a.handle,'pax-file'),text);assert.equal(sourceText(b.handle,'pax-file'),text);s.session.clear();});
test('F13P5-M17 clear is idempotent and old capability cannot become live on reselection',async()=>{const s=setup(),f=s.select(),e=await s.read();s.session.clear();s.session.clear();s.select('pax-file',f);assert.throws(()=>sourceText(e.handle,'pax-file'));const n=await s.read();assert.equal(sourceText(n.handle,'pax-file'),text);s.session.clear();});
test('F13P5-M18 finder derivative owner is explicitly revocable',()=>{const h=createCaseFinder(text);assert.equal(searchCaseFinder(h,{query:''}).matchCount,1);revokeCaseFinder(h);revokeCaseFinder(h);assert.throws(()=>searchCaseFinder(h,{query:''}));});
test('F13P5-M19 independent permissions all retire despite native abort fault',async()=>{const s=setup();s.select();s.select('halo-file');const a=await s.read(),b=await s.read('halo-file');const abort=AbortController.prototype.abort;AbortController.prototype.abort=function(){throw Error('native abort fault');};try{assert.throws(()=>s.session.clear());assert.equal(s.session.state().selectedRoles,0);assert.throws(()=>originalBytes(a.handle,'pax-file'));assert.throws(()=>originalBytes(b.handle,'halo-file'));}finally{AbortController.prototype.abort=abort;}});
for(const kind of ['missing','null','primitive','foreign-version','foreign-scope','handle-bound','remoteProcessing','persistence','logging','crossPageSharing','missing-glossary','identical-clone','empty-glossary','altered-definition','altered-term','sparse-glossary','extra-field'])test('F13P5-M20 mixed declaration rejects before selection and admission '+kind,async()=>{
  const native=FILE_SUPPORT.authorizedHandling;let policy=structuredClone(native);
  if(kind==='missing')policy=undefined;else if(kind==='null')policy=null;else if(kind==='primitive')policy=1;
  else if(kind==='foreign-version')policy.version='foreign';else if(kind==='foreign-scope')policy.scope='all-pages';else if(kind==='handle-bound')policy.handlesPerRole=3;else if(kind==='missing-glossary')delete policy.glossary;
  else if(kind==='empty-glossary')policy.glossary=[];else if(kind==='altered-definition')policy.glossary[0].definition='Remote processing allowed';else if(kind==='altered-term')policy.glossary[0].term='Upload';else if(kind==='sparse-glossary')delete policy.glossary[0];else if(kind==='extra-field')policy.upload=true;else if(kind!=='identical-clone')policy[kind]=true;
  // Simulate a mixed module response. The product has no caller policy seam.
  let source=readFileSync(new URL('./file-handling.mjs',import.meta.url),'utf8');
  const replacement=`import {qualifiedCsvProfile} from '${new URL('./file-support.mjs',import.meta.url).href}';\nconst freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};const FILE_SUPPORT=freeze({authorizedHandling:${policy===undefined?'undefined':JSON.stringify(policy)}});`;
  source=source.replace("import { FILE_SUPPORT, qualifiedCsvProfile } from './file-support.mjs';",replacement).replace(/from '(\.\/.+?\.mjs)'/g,(_,path)=>"from '"+new URL(path,import.meta.url).href+"'");
  const owner=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));let selectedCalls=0;const session=owner.createFileHandlingSession(()=>{selectedCalls++;return file();});
  assert.throws(()=>session.select('pax-file'),/Qualified local/);await assert.rejects(session.read(file(),'pax-file',SOURCES.pax,30000),/Qualified local/);assert.equal(selectedCalls,0);assert.equal(workers.length,0);session.clear();assert.deepEqual(session.state(),{selectedRoles:0,retainedHandles:0});
});
for(const role of ['pax-file','halo-file'])test('F13P5-M21 detected mismatch cannot revive on exact restoration '+role,async()=>{
  const s=setup(),f=s.select(role),e=await s.read(role);s.selected.set(role,file(role));
  assert.throws(()=>sourceText(e.handle,role));s.selected.set(role,f);
  for(const consume of [originalBytes,sourceText,sourceProjection])assert.throws(()=>consume(e.handle,role));
  await assert.rejects(s.read(role));assert.equal(s.session.state().selectedRoles,0);
  s.session.select(role);const next=await s.read(role);assert.notEqual(next.handle,e.handle);s.session.clear();
});
test('F13P5-M22 stale callback and wrong File argument cannot retire newer occurrence',async()=>{
  const s=setup(),f=s.select(),old=await s.read();s.select();const next=await s.read();
  assert.throws(()=>sourceText(old.handle,'pax-file'));await assert.rejects(s.read('pax-file','compare-records',f));
  assert.equal(sourceText(next.handle,'pax-file'),text);assert.equal(s.session.state().selectedRoles,1);s.session.clear();
});
test('F13P5-M23 unchanged dismissal retains occurrence; empty dismissal retires without granting',async()=>{
  const s=setup();assert.equal(s.session.observeDismissal('pax-file'),false);s.select();const e=await s.read();const count=workers.length;
  assert.equal(s.session.observeDismissal('pax-file'),true);assert.equal(sourceText(e.handle,'pax-file'),text);assert.equal(workers.length,count);
  s.selected.delete('pax-file');assert.equal(s.session.observeDismissal('pax-file'),false);assert.throws(()=>originalBytes(e.handle,'pax-file'));assert.equal(s.session.state().selectedRoles,0);
  s.selected.set('pax-file',file());assert.throws(()=>s.session.observeDismissal('pax-file'));assert.equal(s.session.state().selectedRoles,0);
});
test('F13P5-M24 getter failure retires captured occurrence before restoration',async()=>{
  let f=file(),fault=false;const s=createFileHandlingSession(()=>{if(fault)throw Error('getter failure');return f;});s.select('pax-file');const e=await s.read(f,'pax-file',SOURCES.pax);
  fault=true;assert.throws(()=>originalBytes(e.handle,'pax-file'));fault=false;assert.throws(()=>sourceText(e.handle,'pax-file'));await assert.rejects(s.read(f,'pax-file',SOURCES.pax));assert.equal(s.state().selectedRoles,0);
});
test('F13P5-M25 reentrant getter replacement never authorizes or revokes a newer occurrence',async()=>{
  let f=file(),switchOnRead=false;let s; s=createFileHandlingSession(()=>{const previous=f;if(switchOnRead){switchOnRead=false;f=file();s.select('pax-file');return previous;}return f;});
  s.select('pax-file');const oldFile=f;switchOnRead=true;await assert.rejects(s.read(oldFile,'pax-file',SOURCES.pax));assert.equal(s.state().selectedRoles,1);
  const e=await s.read(f,'pax-file',SOURCES.pax);assert.equal(sourceText(e.handle,'pax-file'),text);s.clear();
});
