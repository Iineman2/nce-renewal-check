async page => {
  const passed = [], downloads = [], requests = [], errors = [], consoleEvents = [], privacyEvents = [];
  try {
  page.on('request', request => requests.push({method:request.method(),url:request.url(),body:request.postData(),type:request.resourceType(),headers:request.headers()}));
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => consoleEvents.push(message.type()));
  await page.exposeFunction('__recordEvidencePrivacy',kind=>privacyEvents.push(kind));
  const head = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,customer_name,notes';
  const row = 'account-A,s,customer-A,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew," Café😀 ","a""b\nc" \t';
  const pax = '\uFEFF'+head+'\r\n\r\n'+row+'\r\n';
  const halo = '\uFEFFline_id,subscription_id,customer_ref,billing_system\rline-A,s,customer-A," HaloPSA " \t\r';
  const asBytes = value => Buffer.isBuffer(value) ? value : Buffer.from(value);
  const faultModes=new Set('digest-missing digest-reject digest-malformed digest-mutates pending-hash pending-halo pending-read text-disagree text-reject byte-reject size-disagree decoder-mutates download-click-throws download-canceled download-create-throws download-invalid-url construct-text construct-inherited-attribute construct-tag construct-attribute shell-label shell-text shell-tag'.split(' '));
  const modules=new Set('app fit claims preflight actions runtime file-evidence file-evidence-view file-support file-handling file-handling-policy input csv-evidence bounded-reader resource-packet file-processing-worker'.split(' ').map(name=>'/'+name+'.mjs'));
  const designAssets=new Map([['/termline.css','stylesheet'],['/assets/brand-mark-v1-bright.png','image'],['/assets/fonts/InstrumentSerif-Regular.woff2','font'],['/assets/fonts/SourceSans3-Variable.woff2','font']]);
  const headers=new Set('accept accept-language accept-encoding user-agent referer origin host connection cache-control pragma upgrade-insecure-requests if-none-match if-modified-since sec-ch-ua sec-ch-ua-mobile sec-ch-ua-platform sec-fetch-dest sec-fetch-mode sec-fetch-site sec-fetch-user'.split(' '));
  const requestAllowed=request=>{
    if(request.method!=='GET'||request.body||Object.keys(request.headers??{}).some(name=>!headers.has(name.toLowerCase())))return false;
    if(/^blob:http:\/\/localhost:8765\/[0-9a-f-]+$/.test(request.url))return true;
    const url=new URL(request.url);if(url.origin!=='http://localhost:8765')return false;
    if(request.type==='document'&&url.pathname==='/')return !url.search||url.searchParams.size===1&&faultModes.has(url.searchParams.get('fault'));
    return !url.search&&(designAssets.get(url.pathname)===request.type||request.type==='script'&&(modules.has(url.pathname)||url.pathname==='/qc-vendor/axe-4.10.3.min.js')||request.type==='other'&&url.pathname==='/file-processing-worker.mjs'&&request.headers['sec-fetch-dest']==='worker');
  };
  // Independent negative controls: local GET queries, fetch and payload headers are transport too.
  for(const request of [{method:'GET',body:null,type:'document',url:'http://localhost:8765/collect?original=source_account_id',headers:{}},{method:'GET',body:null,type:'fetch',url:'http://localhost:8765/runtime.mjs',headers:{}},{method:'GET',body:null,type:'script',url:'http://localhost:8765/runtime.mjs',headers:{'x-original':'source_account_id'}}])if(requestAllowed(request))throw Error('Privacy request gate accepted source transport');
  for(const [path,type] of designAssets)if(requestAllowed({method:'GET',body:null,type,url:'http://localhost:8765'+path+'?original=source_account_id',headers:{}}))throw Error('Design asset privacy gate accepted source transport');
  // Route the real module Worker. Configure/release messages are consumed by this
  // fixture before the unchanged production request reaches its native handler.
  const workerPreamble=String.raw`
const fixturePost=self.postMessage.bind(self), fixtureHeld=[];
let fixtureMode='',fixtureRole=null,fixtureScope=null;
const fixtureSignal=(kind,extra={})=>fixturePost({__f13WorkerFixture:1,kind,mode:fixtureMode,role:fixtureRole,native:self instanceof WorkerGlobalScope&&!('document' in self),...extra});
self.addEventListener('message',event=>{const control=event.data?.__f13WorkerControl;if(control==='configure'){event.stopImmediatePropagation();fixtureMode=event.data.mode;fixtureScope=event.data.scope;fixtureRole=event.data.role;fixtureSignal('configured');}else if(control==='release'){event.stopImmediatePropagation();for(const done of fixtureHeld.splice(0))done();}},true);
const fixtureApplies=()=>!fixtureScope||fixtureRole===fixtureScope;
const fixtureHold=run=>{fixtureSignal('held');return new Promise((resolve,reject)=>fixtureHeld.push(()=>Promise.resolve().then(run).then(resolve,reject)));};
const fixtureDigest=crypto.subtle.digest.bind(crypto.subtle);
crypto.subtle.digest=(algorithm,data)=>{if(data.length>3&&fixtureApplies()&&(fixtureMode==='pending-hash'||fixtureMode==='pending-halo'&&fixtureRole==='halo-file'))return fixtureHold(()=>fixtureDigest(algorithm,data));return fixtureDigest(algorithm,data);};
const fixtureRead=File.prototype.arrayBuffer,fixtureText=File.prototype.text;
File.prototype.arrayBuffer=function(){if(fixtureApplies()){if(['stage-hold','pending-read','hold-all'].includes(fixtureMode)||['pending-halo','hold-halo'].includes(fixtureMode)&&fixtureRole==='halo-file')return fixtureHold(()=>fixtureRead.call(this));if(fixtureMode==='byte-reject'){fixtureSignal('reached');return Promise.reject(Error('controlled byte IO'));}if(fixtureMode==='size-disagree'){fixtureSignal('reached');return Promise.resolve(new ArrayBuffer(1));}}return fixtureRead.call(this);};
File.prototype.text=function(){if(fixtureApplies()&&fixtureMode==='text-disagree'){fixtureSignal('reached');return Promise.resolve('forged supplied text');}if(fixtureApplies()&&fixtureMode==='text-reject'){fixtureSignal('reached');return Promise.reject(Error('controlled text IO'));}return fixtureText.call(this);};
const fixtureDecode=TextDecoder.prototype.decode;
TextDecoder.prototype.decode=function(data,...args){if(data?.length>24&&fixtureApplies()){if(fixtureMode==='decoder-mutates'){fixtureSignal('reached');data[0]=0;}if(fixtureMode.startsWith('decoder-')&&fixtureMode!=='decoder-mutates'){fixtureSignal('reached');if(fixtureMode==='decoder-error')throw Error('CONFIDENTIAL supplied source');if(fixtureMode==='decoder-type')throw TypeError('CONFIDENTIAL supplied source');if(fixtureMode==='decoder-zero')throw 0;if(fixtureMode==='decoder-false-text')return 'invented decoded source';if(fixtureMode==='decoder-oversized'){fixtureSignal('altered',{altered:true});return 'a'.repeat(data.length+1);}if(['decoder-unpaired-high','decoder-unpaired-low'].includes(fixtureMode)){const value=fixtureDecode.call(this,data,...args),changed=value.replace('\uFFFD',fixtureMode.endsWith('high')?'\uD800':'\uDC00');fixtureSignal('altered',{altered:changed!==value});return changed;}}}return fixtureDecode.call(this,data,...args);};
for(const [owner,methods]of [[IDBFactory.prototype,['open','deleteDatabase']],[CacheStorage.prototype,['open','delete']]])for(const kind of methods){const old=owner[kind];owner[kind]=function(...args){fixtureSignal('privacy',{operation:kind});return old.apply(this,args);};}
for(const kind of ['log','info','warn','debug','error','table','dir','dirxml','trace']){const old=console[kind];console[kind]=function(...args){fixtureSignal('privacy',{operation:'console.'+kind});return old.apply(this,args);};}
`;
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('self.onmessage = async event =>')||!body.includes('await readLocalEvidence('))throw Error('Native processing worker owner missing');await route.fulfill({response,body:workerPreamble+'\n'+body});});
  await page.addInitScript(() => {
    const D=Date;window.Date=class extends D {constructor(...args){super(...(args.length?args:['2026-10-03T12:00:00']));}};
    const mode=new URL(location.href).searchParams.get('fault');
    window.__held=[];window.__urlCreated=[];window.__urlRevoked=[];window.__storageWrites=[];window.__contentLogs=[];window.__workerEvents=[];window.__workerRecords=[];window.__workerPrivacy=[];window.__mainEvidenceFaults=[];window.__deferredHeldObservations=[];window.__deferHeldObservation=false;
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker{
      constructor(url,options){super(url,options);const record={url:String(url),module:options?.type==='module',native:this instanceof NativeWorker,terminated:false};window.__workerRecords.push(record);this.__fixtureRecord=record;this.addEventListener('message',event=>{const data=event.data;if(data?.__f13WorkerFixture!==1)return;event.stopImmediatePropagation();if(data.native!==true)throw Error('Fault did not run inside a native Worker');const observe=()=>{window.__workerEvents.push({...data,receiverId:record.id});if(data.kind==='privacy'){window.__workerPrivacy.push(data.operation);void window.__recordEvidencePrivacy('worker.'+data.operation);}if(data.kind==='held'){const release=()=>NativeWorker.prototype.postMessage.call(this,{__f13WorkerControl:'release'});release.receiverId=record.id;window.__held.push(release);}if(data.kind==='altered')window.__decoderAltered=data.altered;};if(data.kind==='held'&&data.mode==='pending-hash'&&data.role==='pax-file'&&window.__deferHeldObservation){window.__deferredHeldObservations.push(observe);return;}observe();});}
      postMessage(request,...args){if(request?.file instanceof File&&request.protocol){this.__fixtureRecord.role=request.role;this.__fixtureRecord.id=request.id;this.__fixtureRecord.operation=request.operation;NativeWorker.prototype.postMessage.call(this,{__f13WorkerControl:'configure',mode:window.__fixtureArmed?(window.__fault??mode??''):'stage-hold',scope:window.__workerFaultRole??null,role:request.role});}return NativeWorker.prototype.postMessage.call(this,request,...args);}
      terminate(){this.__fixtureRecord.terminated=true;return NativeWorker.prototype.terminate.call(this);}
    };
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{if(mode==='download-create-throws')throw Error('controlled recovery failure');if(mode==='download-invalid-url')return 'https://invalid.example/original';const url=create(blob);window.__urlCreated.push(url);return url;};
    URL.revokeObjectURL=url=>{window.__urlRevoked.push(url);return revoke(url);};
    const record=kind=>{window.__storageWrites.push(kind);void window.__recordEvidencePrivacy(kind);};
    for(const kind of ['setItem','removeItem','clear']){const old=Storage.prototype[kind];Storage.prototype[kind]=function(...args){record('Storage.'+kind);return old.apply(this,args);};}
    for(const name of ['localStorage','sessionStorage']){
      const descriptor=Object.getOwnPropertyDescriptor(window,name),native=descriptor.get.call(window);
      const proxy=new Proxy(native,{get(target,key){const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){record(name+'.property');return Reflect.set(target,key,value,target);},deleteProperty(target,key){record(name+'.delete');return Reflect.deleteProperty(target,key);},defineProperty(target,key,value){record(name+'.define');return Reflect.defineProperty(target,key,value);}});
      Object.defineProperty(window,name,{...descriptor,get:()=>proxy});
    }
    const cookie=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');Object.defineProperty(Document.prototype,'cookie',{...cookie,set(value){record('cookie');return cookie.set.call(this,value);}});
    for(const [owner,methods] of [[IDBFactory.prototype,['open','deleteDatabase']],[CacheStorage.prototype,['open','delete']]])for(const kind of methods){const old=owner[kind];owner[kind]=function(...args){record(kind);return old.apply(this,args);};}
    for(const kind of ['log','info','warn','debug','error','table','dir','dirxml','trace']){const old=console[kind];console[kind]=function(...args){window.__contentLogs.push(kind);return old.apply(this,args);};}
    const digest=crypto.subtle.digest.bind(crypto.subtle);
    // Main-realm adoption still owns independent hashing; these controls remain
    // there and explicitly record execution rather than only a selected mode.
    if(mode==='digest-missing'){window.__mainEvidenceFaults.push(mode);crypto.subtle.digest=undefined;}
    if(mode==='digest-reject')crypto.subtle.digest=()=>{window.__mainEvidenceFaults.push(mode);return Promise.reject(Error('controlled hash failure'));};
    if(mode==='digest-malformed')crypto.subtle.digest=async()=>{window.__mainEvidenceFaults.push(mode);return new Uint8Array(32);};
    if(mode==='digest-mutates')crypto.subtle.digest=(algorithm,bytes)=>{if(bytes.length>3){window.__mainEvidenceFaults.push(mode);bytes[0]=0;}return digest(algorithm,bytes);};
    if(['download-click-throws','download-canceled'].includes(mode))HTMLAnchorElement.prototype.click=function(){if(mode==='download-click-throws')throw Error('controlled anchor failure');};
    if(mode==='construct-text'){
      const descriptor=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
      Object.defineProperty(Node.prototype,'textContent',{...descriptor,set(value){return descriptor.set.call(this,typeof value==='string'&&value.startsWith('SHA-256 of exact original bytes:')?'Original authenticated; financial action permitted':value);}});
    }
    if(mode==='construct-inherited-attribute'){
      const descriptor=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
      Object.defineProperty(Node.prototype,'textContent',{...descriptor,set(value){descriptor.set.call(this,value);if(typeof value==='string'&&value.startsWith('SHA-256 of exact original bytes:'))this.setAttribute('constructor','Authenticated');}});
    }
    if(mode==='construct-tag'){const old=Document.prototype.createElement;Document.prototype.createElement=function(tag,...args){return old.call(this,tag==='summary'?'div':tag,...args);};}
    if(mode==='construct-attribute'){const old=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){return old.call(this,name,name==='type'&&this.textContent.startsWith('Save original')?'submit':value);};}
    if(mode?.startsWith('shell-')){
      const old=Document.prototype.getElementById;Document.prototype.getElementById=function(id){const node=old.call(this,id);if(id==='original-evidence'&&node&&!window.__shellDone){window.__shellDone=true;const title=old.call(this,'original-evidence-title');if(mode==='shell-label')title.setAttribute('aria-label','Authenticated originals');if(mode==='shell-text')node.appendChild(document.createTextNode('Readers authorized'));if(mode==='shell-tag'){const fake=document.createElement('div');fake.id=title.id;fake.textContent=title.textContent;title.replaceWith(fake);}}return node;};
    }
    window.__release=async()=>{for(const resolve of window.__held.splice(0))await resolve();await new Promise(resolve=>setTimeout(resolve,60));};
  });
  const navigate=async url=>{
    if(page.url().startsWith('http://localhost:8765/')){
      const clean=await page.evaluate(()=>!localStorage.length&&!sessionStorage.length&&!document.cookie&&!(window.__storageWrites?.length)&&!(window.__contentLogs?.length)&&!(window.__workerPrivacy?.length));
      if(!clean||privacyEvents.length||consoleEvents.length)throw Error('A prior scenario persisted or logged supplied evidence');
    }
    await page.goto(url);
  };
  const fit=async(fault='')=>{
    await navigate('http://localhost:8765/'+(fault?'?fault='+fault:''));
    if(await page.locator('#fit-form').count()||!await page.locator('#preflight').isVisible())throw Error('Direct records entry is unavailable');

  };
  const supply=async(role,value,name=role+'.csv')=>{await controls();await page.evaluate(()=>window.__fixtureArmed=false);await page.locator('#'+role).setInputFiles({name,mimeType:'application/octet-stream',buffer:asBytes(value)});};
  const inputs=async(p=pax,h=halo)=>{await supply('pax-file',p);if(h!==null)await supply('halo-file',h);await page.locator('#subscription-id').fill('s');await controls();await page.locator('#renewal-term').selectOption('annual');await controls();await page.locator('#agreement').selectOption('yes');};
  const controls=async()=>{if(await page.locator('#evidence-panels').isVisible())await page.locator('#close-evidence').click();};
  const info=async()=>{if(await page.locator('#runtime-warning').isVisible())return;if(!await page.locator('#evidence-panels').isVisible())await page.locator('#open-evidence').click();};
  const beginCompare=async()=>{await controls();await page.evaluate(()=>{window.__fixtureArmed=true;window.__held=[];});await page.getByRole('button',{name:'Check records',exact:true}).click();};
  const compare=async()=>{await beginCompare();await page.waitForFunction(()=>document.getElementById('read-status').hidden);await info();};
  const attest=async()=>{await controls();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await page.waitForFunction(()=>document.getElementById('read-status').hidden);await info();};
  const ready=async(fault='',p=pax,h=halo)=>{await fit(fault);await inputs(p,h);await compare();};
  const original=role=>page.locator('#original-'+role);
  const open=async role=>{await info();await original(role).evaluate(node=>{node.open=true;});};
  const copied=async role=>original(role).locator('.save-original').count();
  const digestBytes=async bytes=>page.evaluate(async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(byte=>byte.toString(16).padStart(2,'0')).join(''),Array.from(bytes));
  const recover=async(id,role,expected)=>{
    await open(role);const pending=page.waitForEvent('download');await original(role).getByRole('button',{name:'Save original '+(role==='pax-file'?'Pax8':'HaloPSA')+' copy',exact:true}).click();const download=await pending;
    const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const bytes=Buffer.concat(chunks),fixture=asBytes(expected);
    if(!bytes.equals(fixture))throw Error('Original recovery changed bytes: '+id);
    if(!/^original-(pax8|halopsa)-[0-9a-f]{12}\.bin$/.test(download.suggestedFilename()))throw Error('Unsafe original recovery filename');
    const file='downloads/'+id+'.bin';await download.saveAs('output/file-compatibility-principle-3/final-artifacts/evidence/'+file);
    const sha256=await digestBytes(bytes);if(!(await original(role).locator('.original-content-identity').textContent()).includes(sha256))throw Error('Displayed identity disagrees with downloaded original');
    const cleanup=await page.evaluate(()=>__urlCreated.length===__urlRevoked.length&&__urlCreated.every(url=>__urlRevoked.includes(url)));if(!cleanup)throw Error('Recovery URL survived');
    downloads.push({id,role,file,sha256,byteLength:bytes.length,status:'PASS'});
  };
  const halted=async()=>{try{await page.locator('#runtime-warning:not([hidden])').waitFor({timeout:4000});}catch{throw Error('Terminal fault did not halt at '+page.url()+': '+await page.locator('#record-result').textContent());}if(await page.locator('.save-original').count()||await page.locator('#preflight').isVisible())throw Error('A terminal fault retained source recovery or a result');};
  const workerReached=async(mode,role='pax-file',kind='reached')=>{if(!await page.evaluate(({mode,role,kind})=>__workerEvents.some(event=>event.mode===mode&&event.role===role&&event.kind===kind&&event.native===true),{mode,role,kind}))throw Error('Native worker fault was not reached: '+mode+' '+role);};
  const currentWorker=async(role,operation)=>{await page.waitForFunction(({role,operation})=>__workerRecords.filter(record=>!record.terminated&&record.role===role&&record.operation===operation).length===1,{role,operation});return await page.evaluate(({role,operation})=>{const workers=__workerRecords.filter(record=>!record.terminated&&record.role===role&&record.operation===operation);if(workers.length!==1||!workers[0].native||!workers[0].module||!Number.isSafeInteger(workers[0].id))throw Error('Current native request was not reached');return workers[0].id;},{role,operation});};
  const heldRequest=(id,mode,role,operation)=>({id,mode,role,operation});
  const waitHeldWorker=async request=>{await page.waitForFunction(({id,mode,role,operation})=>{const record=__workerRecords.find(record=>record.id===id);return record&&!record.terminated&&record.native&&record.module&&record.role===role&&record.operation===operation&&__workerEvents.some(event=>event.receiverId===id&&event.mode===mode&&event.role===role&&event.kind==='held'&&event.native===true);},request);};
  const releaseHeldWorker=async id=>{await page.evaluate(async id=>{const index=__held.findIndex(release=>release.receiverId===id);if(index<0||!__workerRecords.some(record=>record.id===id&&record.native&&record.module)||!__workerEvents.some(event=>event.receiverId===id&&event.kind==='held'&&event.native===true))throw Error('Exact held native receiver was not reached');const [release]=__held.splice(index,1);await release();await new Promise(resolve=>setTimeout(resolve,60));},id);};
  const stoppedWorkers=async()=>{const state=await page.evaluate(async()=>({records:__workerRecords.map(r=>({...r})),events:__workerEvents.map(e=>({...e})),state:(await import('/bounded-reader.mjs')).processingState()}));if(state.state.activeJobs||state.state.reservedBytes||state.records.some(r=>!r.native||!r.module||!r.terminated||new URL(r.url).pathname!=='/file-processing-worker.mjs'))throw Error('Acquisition did not stop its actual native workers '+JSON.stringify({passed,state}));return state;};
  await ready();await page.getByRole('heading',{name:'Confirm these records describe the same case',exact:true}).waitFor();
  if(await copied('pax-file')!==1||await copied('halo-file')!==1)throw Error('Both originals unavailable');const nativeBaseline=await stoppedWorkers();if(!['pax-file','halo-file'].every(role=>nativeBaseline.records.some(record=>record.role===role)&&nativeBaseline.events.some(event=>event.kind==='configured'&&event.role===role&&event.native)))throw Error('Baseline did not acquire both roles through native Workers');passed.push('both-role-originals');
  await recover('pax-bom','pax-file',pax);passed.push('pax-byteexact-download');await recover('halo-bom','halo-file',halo);passed.push('halo-byteexact-download');
  const inspected=await page.evaluate(async()=>{
    const {readBoundedLocalEvidence}=await import('/bounded-reader.mjs'),{sourceProjection,releaseFileEvidence}=await import('/file-evidence.mjs'),{SOURCES}=await import('/actions.mjs');
    const file=document.getElementById('pax-file').files[0],e=await readBoundedLocalEvidence(file,'pax-file',SOURCES.pax);const p=sourceProjection(e.handle,'pax-file'),text=e.text;
    const notes=p.records[1].cells[11],header=p.headers[11];const result={record:p.records[1].sourceRecordOrdinal,raw:notes.rawValue,lexeme:notes.lexeme,utf16:[notes.startOffset,notes.endOffset],bytes:[notes.startByte,notes.endByte],header:[header.startOffset,header.endOffset],slice:text.slice(notes.startOffset,notes.endOffset),prefixBytes:new TextEncoder().encode(text.slice(0,notes.startOffset)).length};releaseFileEvidence(e.handle);return result;
  });
  const expectedLexeme='"a""b\nc" \t';const expectedStart=pax.indexOf(expectedLexeme);
  if(inspected.record!==3||inspected.raw!=='a"b\nc'||inspected.lexeme!==expectedLexeme||inspected.slice!==expectedLexeme||inspected.utf16[0]!==expectedStart||inspected.utf16[1]!==expectedStart+expectedLexeme.length||inspected.bytes[0]!==Buffer.byteLength(pax.slice(0,expectedStart))||inspected.bytes[1]!==Buffer.byteLength(pax.slice(0,expectedStart+expectedLexeme.length))||inspected.header[0]!==pax.indexOf('notes'))throw Error('Positional/header byte oracle failed');passed.push('independent-header-cell-locations');
  const subject=await page.locator('#case-subject').textContent();if(!subject.includes('Original file SHA-256')||!subject.includes('exact header and cell source locations'))throw Error('Selected provenance missing');passed.push('selected-source-provenance');
  const selectedInspector=page.locator('#case-subject > .case-source-inspector');
  await selectedInspector.locator('details').evaluate(node=>{node.open=true;});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  if(!(await page.locator('#case-subject').textContent()).includes('Pax8 subscription: s')||!await page.getByRole('heading',{name:'Confirm these records describe the same case',exact:true}).isVisible())throw Error('Closed outer disclosure invalidated nested source evidence');passed.push('closed-nested-provenance');
  await selectedInspector.evaluate(node=>{node.open=true;node.querySelector('details').open=false;});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await selectedInspector.locator('details').evaluate(node=>{node.open=true;});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  if(!await selectedInspector.locator('details > p').first().isVisible()||!(await page.locator('#case-subject').textContent()).includes('Pax8 subscription: s'))throw Error('Open nested source evidence failed visibility/currentness');await selectedInspector.evaluate(node=>{node.open=false;});passed.push('opened-nested-provenance');
  await page.locator('#record-info .claim-trail').evaluate(node=>{node.open=true;});const trail=await page.locator('#record-info .claim-trail').textContent();if(!trail.includes('Original Pax8 SHA-256')||!trail.includes('Original HaloPSA SHA-256')||!trail.includes('bytes '))throw Error('Comparison source provenance missing');passed.push('both-role-claim-provenance');
  await fit();await page.evaluate(()=>window.__fixtureArmed=true);for(const[role,value]of[['halo-file',halo],['pax-file',pax]])await page.locator('#'+role).setInputFiles({name:role+'.csv',mimeType:'text/csv',buffer:asBytes(value)});await page.waitForFunction(()=>document.querySelector('#case-choice option[value="1"]:not([disabled])')&&document.getElementById('cancel-case-finder').hidden);await page.locator('#case-choice').selectOption('1');await info();if(!(await page.locator('#case-subject').textContent()).includes('Original file SHA-256'))throw Error('Finder source locator missing');passed.push('finder-source-provenance');
  await ready('',pax.replace(/^\uFEFF/,''));await recover('pax-no-bom','pax-file',pax.replace(/^\uFEFF/,''));passed.push('no-bom-byteexact-download');
  const pages='a,b\n'+Array.from({length:11},(_,i)=>`${i},value\n`).join('');await ready('',pages);await open('pax-file');const seen=[];
  for(let i=0;i<3;i++){const summaries=await original('pax-file').locator('.original-record > summary').allTextContents();if(summaries.length>5)throw Error('Unbounded source page');seen.push(...summaries.map(s=>Number(s.match(/record (\d+)/)[1])));if(i<2)await original('pax-file').getByRole('button',{name:'Next Pax8 evidence page',exact:true}).click();}
  if(JSON.stringify(seen)!==JSON.stringify(Array.from({length:12},(_,i)=>i+1)))throw Error('Source paging omitted or repeated a retained record');passed.push('bounded-reachable-pages');
  for(const [id,text] of [['duplicate-header',pax.replace('notes','customer_name')],['blank-header',pax.replace('notes','')],['malformed-final',pax+'"unclosed']]){
    await ready('',text);if(!await copied('pax-file')||await page.locator('#case-choice option[value]:not([value=""])').count()||await page.getByRole('button',{name:'Confirm this source case',exact:true}).count())throw Error('Rejected profile gained a case');await recover(id,'pax-file',text);
    if(id==='malformed-final'&&!(await original('pax-file').textContent()).includes('partial; no selectable success'))throw Error('Partial scan presented complete');passed.push(id+'-original-inspection');
  }
  for(const [id,bytes] of [['invalid-utf8',Buffer.from([255])],['utf16',Buffer.from([255,254,65,0])]]){await ready('',bytes);await recover(id,'pax-file',bytes);if(!(await original('pax-file').textContent()).includes('Decoded derivative: unavailable')||await original('pax-file').locator('.original-record').count())throw Error('Invalid encoding invented decoded evidence');passed.push(id+'-original-recovery');}
  await ready('text-disagree');await workerReached('text-disagree');await recover('byte-text-disagreement','pax-file',pax);if(!(await page.locator('#record-info').textContent()).includes('disagree'))throw Error('Disagreement promoted');passed.push('byte-text-disagreement-custody');
  await ready('',pax,pax);if(await copied('pax-file')!==1||await copied('halo-file')!==1||!(await page.locator('#case-subject').textContent()).includes('Pax8 subscription: s'))throw Error('Wrong Halo erased Pax8');await recover('wrong-halo-profile','halo-file',pax);passed.push('wrong-halo-retains-pax');
  await ready('',pax,null);if(await copied('pax-file')!==1||await copied('halo-file'))throw Error('Missing Halo corrupted independent custody');passed.push('missing-halo-retains-pax');
  await ready();const prior=await original('pax-file').locator('.original-content-identity').textContent();await supply('pax-file',pax.replace('Café','Cafè'),'pax-file.csv');if(await copied('pax-file')||await copied('halo-file')!==1)throw Error('Replacement retained old source or erased other source');await recover('halo-survives-replacement','halo-file',halo);passed.push('affected-role-replacement');
  await compare();const nextIdentity=await original('pax-file').locator('.original-content-identity').textContent();if(prior===nextIdentity)throw Error('Same filename became content identity');await recover('source-same-name-new','pax-file',pax.replace('Café','Cafè'));passed.push('same-name-different-content');
  await ready();await attest();await supply('pax-file',pax,'same-equal.csv');if((await page.locator('#case-subject').textContent()).includes('Selection state: confirmed'))throw Error('Equal bytes transferred confirmation');await compare();if(!(await page.locator('#case-subject').textContent()).includes('candidate'))throw Error('Equal bytes auto confirmed replacement');passed.push('equal-byte-occurrence-no-authority');
  await controls();await page.locator('#subscription-id').fill('another');if(await copied('pax-file')!==1||await copied('halo-file')!==1)throw Error('ID edit lost originals');passed.push('id-edit-retains-originals');
  await controls();await page.locator('#agreement').selectOption('no');if(await copied('pax-file')!==1||await copied('halo-file')!==1)throw Error('Agreement edit lost originals');passed.push('answer-edit-retains-originals');
  await controls();await page.locator('#renewal-term').selectOption('unknown');if(await copied('pax-file')!==1||await copied('halo-file')!==1)throw Error('Next-term edit lost originals');passed.push('next-term-edit-retains-originals');
  await page.locator('#open-file-guide').click();if(!await page.locator('#file-guide').isVisible()||await page.locator('.save-original').count()!==2)throw Error('Guide navigation lost original custody');await page.locator('#close-file-guide').click();if(await page.locator('.save-original').count()!==2)throw Error('Guide return lost original custody');passed.push('guide-navigation-retains-originals');
  await controls();await page.locator('#subscription-id').fill('');if(await page.locator('.save-original').count()!==2||await page.locator('#subscription-id').inputValue()!=='')throw Error('Case change lost originals or retained old case');passed.push('case-change-retains-originals');
  await ready();
  await supply('pax-file',Buffer.alloc(0));if(await copied('pax-file')||await copied('halo-file')!==1)throw Error('Empty replacement retained stale source');await controls();await page.locator('#halo-file').setInputFiles([]);if(await page.locator('.save-original').count())throw Error('Removal retained originals');passed.push('source-removal-revokes');
  for(const [id,mode,action] of [['cancel-pending-read','pending-read','cancel'],['cancel-pending-hash','pending-hash','cancel'],['replace-pending-hash','pending-hash','replace'],['clear-pending-hash','pending-hash','clear']]){
    await fit(mode);await inputs();let staleDiscoveryId=null;
    if(id==='cancel-pending-hash'){
      staleDiscoveryId=await currentWorker('pax-file','find-case');await waitHeldWorker(heldRequest(staleDiscoveryId,'stage-hold','pax-file','find-case'));
      await page.evaluate(staleId=>{window.__staleHeldCallback=__held.find(release=>release.receiverId===staleId);if(typeof __staleHeldCallback!=='function')throw Error('Exact stale discovery release was not captured');window.__deferHeldObservation=true;},staleDiscoveryId);
    }
    await beginCompare();const pendingPaxId=await currentWorker('pax-file','compare-records'),pendingPaxRequest=heldRequest(pendingPaxId,mode,'pax-file','compare-records');
    if(staleDiscoveryId!==null){
      await page.waitForFunction(()=>__deferredHeldObservations.length===1);
      await page.evaluate(staleId=>{if(!__workerRecords.some(record=>record.id===staleId&&record.terminated&&record.native&&record.operation==='find-case')||!__workerEvents.some(event=>event.receiverId===staleId&&event.mode==='stage-hold'&&event.role==='pax-file'&&event.kind==='held'&&event.native===true))throw Error('Genuine stale native discovery was not reached');__held.push(__staleHeldCallback);},staleDiscoveryId);
      let currentPhaseReached=false;const currentPhaseWait=waitHeldWorker(pendingPaxRequest).then(()=>{currentPhaseReached=true;});await page.waitForTimeout(40);
      if(currentPhaseReached||!await page.evaluate(()=>__held.length===1))throw Error('Stale discovery released current native hash phase wait');
      await page.evaluate(()=>{__deferHeldObservation=false;for(const observe of __deferredHeldObservations.splice(0))observe();});await currentPhaseWait;
    }else await waitHeldWorker(pendingPaxRequest);
    await workerReached(mode,'pax-file','held');if(action==='cancel')await page.locator('#cancel-read').click();
    if(action==='replace'){await supply('pax-file',pax.replace('Café','Cafe'));const replacementId=await currentWorker('pax-file','find-case');if(replacementId===pendingPaxId)throw Error('Replacement reused the pending request');await waitHeldWorker(heldRequest(replacementId,'stage-hold','pax-file','find-case'));await page.locator('#cancel-case-finder').click();}
    if(action==='clear')await page.locator('#clear-records').click();await page.evaluate(()=>__release());await stoppedWorkers();if(await page.locator('.save-original').count()||await page.locator('#record-result').isVisible())throw Error('Late evidence published after '+id);passed.push(id);
  }
  await fit('pending-halo');await inputs();await beginCompare();const pendingHaloId=await currentWorker('halo-file','compare-records');await waitHeldWorker(heldRequest(pendingHaloId,'pending-halo','halo-file','compare-records'));await workerReached('pending-halo','halo-file','held');await page.locator('#cancel-read').click();await page.evaluate(()=>__release());await stoppedWorkers();if(await copied('pax-file')!==1||await copied('halo-file'))throw Error('Cancel lost committed Pax8 or published pending Halo');await recover('canceled-readable','pax-file',pax);passed.push('cancel-retains-committed-source');
  await fit('pending-hash');await inputs();await beginCompare();const oldPaxId=await currentWorker('pax-file','compare-records');await waitHeldWorker(heldRequest(oldPaxId,'pending-hash','pax-file','compare-records'));await workerReached('pending-hash','pax-file','held');
  await page.evaluate(()=>document.getElementById('record-form').requestSubmit());const newPaxId=await currentWorker('pax-file','compare-records');if(newPaxId===oldPaxId)throw Error('Supersession reused the old native request');await waitHeldWorker(heldRequest(newPaxId,'pending-hash','pax-file','compare-records'));
  if(!await page.evaluate(({oldId,newId})=>__workerRecords.some(record=>record.id===oldId&&record.terminated)&&__workerRecords.some(record=>record.id===newId&&!record.terminated)&&[oldId,newId].every(id=>__workerEvents.filter(event=>event.receiverId===id&&event.mode==='pending-hash'&&event.role==='pax-file'&&event.kind==='held'&&event.native===true).length===1),{oldId:oldPaxId,newId:newPaxId}))throw Error('Supersession did not stop the exact old Worker and reach its new Worker');
  await releaseHeldWorker(oldPaxId);if(await page.locator('.save-original').count())throw Error('Superseded acquisition published');await waitHeldWorker(heldRequest(newPaxId,'pending-hash','pax-file','compare-records'));await releaseHeldWorker(newPaxId);
  const newHaloId=await currentWorker('halo-file','compare-records');if(newHaloId===oldPaxId||newHaloId===newPaxId)throw Error('Dependent Halo receiver reused a Pax request');await waitHeldWorker(heldRequest(newHaloId,'pending-hash','halo-file','compare-records'));await workerReached('pending-hash','halo-file','held');await releaseHeldWorker(newHaloId);await page.waitForFunction(()=>document.getElementById('read-status').hidden);await stoppedWorkers();if(await copied('pax-file')!==1||await copied('halo-file')!==1||!(await page.locator('#case-subject').textContent()).includes('candidate'))throw Error('Current acquisition did not recover after supersession');passed.push('superseded-acquisition-fenced');
  await ready();await page.evaluate(()=>document.getElementById('record-form').reset());if(await page.locator('.save-original').count())throw Error('Reset retained recovery');passed.push('native-reset-revokes');
  await ready();await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));if(await page.locator('.save-original').count())throw Error('History restored live handles');passed.push('history-revokes');
  for(const [id,mode] of [['text-failure-no-copy','text-reject'],['byte-failure-no-copy','byte-reject'],['size-mismatch-no-copy','size-disagree']]){await ready(mode);await workerReached(mode);await stoppedWorkers();if(await page.locator('.save-original').count()||!await page.getByRole('heading',{name:'Repair the supplied input',exact:true}).isVisible())throw Error('Acquisition failure produced original receipt or lost input repair');passed.push(id);}
  await navigate('http://localhost:8765/?fault=digest-missing');await halted();if(!await page.evaluate(()=>__mainEvidenceFaults.includes('digest-missing')))throw Error('Missing main hash fault was not installed');passed.push('missing-hash-runtime');
  for(const [id,mode] of [['rejecting-hash-runtime','digest-reject'],['malformed-hash-runtime','digest-malformed'],['mutating-hash-runtime','digest-mutates'],['mutating-decoder-runtime','decoder-mutates']]){await ready(mode);await halted();if(mode==='decoder-mutates')await workerReached(mode);else if(!await page.evaluate(mode=>__mainEvidenceFaults.includes(mode),mode))throw Error('Main adoption hash fault was not reached');await stoppedWorkers();passed.push(id);}
  // Isolate the owned root in a fresh document. Native module imports preserve
  // the application CSP; this authority probe needs neither a frame nor eval.
  await navigate('http://localhost:8765/');const forged=await page.evaluate(async()=>{
    window.__fixtureArmed=true;
    const {readBoundedLocalEvidence}=await import('/bounded-reader.mjs'),{createOriginalEvidenceView}=await import('/file-evidence-view.mjs'),{SOURCES}=await import('/actions.mjs');
    const file=new File(['a,a\nx,y'],'rejected.csv'),e=await readBoundedLocalEvidence(file,'pax-file',SOURCES.pax);
    if(!window.__workerRecords.some(record=>record.native&&record.module&&record.terminated&&record.role==='pax-file')||!window.__workerEvents.some(event=>event.kind==='configured'&&event.role==='pax-file'&&event.native))throw Error('Rejected acquisition bypassed native worker');
    const root=document.getElementById('original-evidence');const view=createOriginalEvidenceView(root,{guarded:fn=>fn,getFile:role=>role==='pax-file'?file:null,active:()=>false});
    try{
      view.commit(e,'pax-file',file);view.assertCurrent();
      if(!root.textContent.includes('Input problem:')||root.querySelectorAll('.save-original').length!==1)throw Error('Genuine rejected acquisition did not commit');
      try{view.commit({...e,problem:null},'pax-file',file);}catch(error){return error instanceof TypeError&&error.message==='Original reading outcome requires its issued current acquisition.';}
      return false;
    }finally{view.clear();}
  });if(!forged)throw Error('Forged acquisition declared success or failed for an unrelated reason');passed.push('forged-outcome-rejected');
  for(const fault of ['shell-label','shell-text','shell-tag','construct-tag']){await navigate('http://localhost:8765/?fault='+fault);await halted();passed.push('startup-'+fault);}
  for(const fault of ['construct-text','construct-attribute','construct-inherited-attribute']){await ready(fault);await halted();passed.push('silent-'+fault);}
  for(const fault of ['digest','role','locator','save-label','save-type','inherited-attribute','duplicate-root','clone-node','transparent','clipping','mask','aria','generated','ancestor']){
    await ready();await open('pax-file');await original('pax-file').locator('.original-record').nth(1).evaluate(node=>{node.open=true;});
    await page.evaluate(fault=>{const root=document.getElementById('original-evidence'),source=document.getElementById('original-pax-file');if(fault==='digest')source.querySelector('.original-content-identity').textContent='SHA-256: forged';if(fault==='role')source.querySelector('summary').textContent='Inspect authenticated HaloPSA original';if(fault==='locator')source.querySelector('.original-record p').textContent='bytes 0–1';if(fault==='save-label')source.querySelector('button').textContent='Authorize financial action';if(fault==='save-type')source.querySelector('button').type='submit';if(fault==='duplicate-root')root.after(root.cloneNode(true));if(fault==='clone-node')source.querySelector('summary').replaceWith(source.querySelector('summary').cloneNode(true));if(fault==='transparent')root.style.color='transparent';if(fault==='clipping')root.style.cssText='overflow:hidden;height:1px;width:1px';if(fault==='mask')root.style.maskImage='linear-gradient(transparent,transparent)';if(fault==='aria')root.setAttribute('aria-hidden','true');if(fault==='generated'){const style=document.createElement('style');style.textContent='#original-pax-file::before{content:"Authenticated files authorize billing"}';document.head.append(style);}if(fault==='ancestor')root.parentElement.style.opacity='0';},fault);
    if(fault==='inherited-attribute')await original('pax-file').locator('.original-content-identity').evaluate(node=>node.setAttribute('constructor','Authenticated'));
    await halted();passed.push('late-'+fault);
  }
  for(const mode of ['download-create-throws','download-click-throws','download-invalid-url']){await ready(mode);await open('pax-file');await original('pax-file').locator('.save-original').click();await halted();const clean=await page.evaluate(()=>__urlCreated.every(url=>__urlRevoked.includes(url)));if(mode!=='download-invalid-url'&&!clean)throw Error('Failed recovery leaked URL');passed.push(mode);}
  await ready('download-canceled');await open('pax-file');await original('pax-file').locator('.save-original').click();const canceled=await page.evaluate(()=>__urlCreated.length===1&&__urlRevoked.length===1);if(!canceled||await copied('pax-file')!==1)throw Error('Canceled recovery changed custody or leaked URL');passed.push('download-canceled-cleanup');
  await ready('',pax.replace('a""b\nc','<svg onload=window.__injected=1>\n=SUM(A1)\u202e[U+202E]'));await open('pax-file');if(await page.locator('#original-evidence svg').count()||await page.evaluate(()=>window.__injected))throw Error('Original preview executed content');passed.push('inert-original-text');
  await ready();await supply('pax-file',pax,'scope\u202e<script>alert(1)</script>.xlsx');await compare();await open('pax-file');if(!(await original('pax-file').textContent()).includes('[U+202E]')||await page.locator('#original-evidence script').count()||await page.evaluate(()=>window.__injected))throw Error('Filename escaped evidence or hid direction marks');passed.push('inert-filename-metadata');
  await ready();await info();await original('pax-file').locator('summary').first().focus();await page.keyboard.press('Enter');if(!await original('pax-file').evaluate(node=>node.open))throw Error('Keyboard disclosure failed');passed.push('keyboard-original-disclosure');
  await page.setViewportSize({width:375,height:812});await page.evaluate(()=>document.body.style.fontSize='200%');await open('halo-file');await original('pax-file').locator('.original-record').nth(1).evaluate(node=>{node.open=true;});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))throw Error('Original evidence overflows mobile viewport');
  await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});if(await page.evaluate(()=>axe.version)!=='4.10.3')throw Error('Axe version drift');const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));if(violations.length)throw Error('Original evidence accessibility violations: '+violations.join(','));passed.push('expanded-mobile-font200-axe');
  const privacy=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookies:document.cookie,writes:__storageWrites.length,logs:__contentLogs.length,workerWrites:__workerPrivacy.length,urls:__urlCreated.length-__urlRevoked.length}));if(privacy.local||privacy.session||privacy.cookies||privacy.writes||privacy.logs||privacy.workerWrites||privacy.urls||privacyEvents.length||consoleEvents.length||requests.some(r=>!requestAllowed(r)))throw Error('Original evidence escaped local custody');await stoppedWorkers();passed.push('local-no-upload-storage-logging');
  // Expanded-cell reflow/axe was exercised above. Capture both source overviews
  // with inner records closed so Chrome never repeats content beyond its tile bound.
  await page.locator('#original-evidence .original-record').evaluateAll(nodes=>nodes.forEach(node=>{node.open=false;}));
  const overview=await page.evaluate(()=>{const rect=document.getElementById('original-evidence').getBoundingClientRect(),top=Math.floor(rect.top+scrollY);return {width:document.documentElement.clientWidth,top,height:Math.ceil(rect.bottom+scrollY)-top,font:getComputedStyle(document.body).fontSize,roles:['pax-file','halo-file'].every(role=>document.getElementById('original-'+role).open),records:[...document.querySelectorAll('#original-evidence .original-record')].every(node=>!node.open)};});
  if(overview.width!==375||overview.height<1000||overview.height>16000||overview.font!=='32px'||!overview.roles||!overview.records)throw Error('Original evidence overview is outside its bounded visual capture contract: '+JSON.stringify(overview));
  const png=await page.screenshot({path:'output/file-compatibility-principle-3/final-artifacts/evidence/original-evidence.png',fullPage:true,clip:{x:0,y:overview.top,width:375,height:overview.height}});const dimensions=Buffer.from(png);
  if(dimensions.readUInt32BE(16)!==375||dimensions.readUInt32BE(20)!==overview.height)throw Error('Original evidence PNG differs from its bounded rendered extent');passed.push('both-source-overview-renderer-bounded');
  const producer={sha256:await digestBytes(png),policyVersion:'file-support-v4',readerVersion:'normalized-csv-v4',roles:['pax-file','halo-file'],scope:'local synthetic original evidence',viewportWidth:375,fontPercent:200,recordDisclosures:'collapsed',heightCeiling:16000,captureRegion:'original-source-section'};
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: F13P2-BROWSER-ASSERTIONS:'+JSON.stringify(passed)+'\nF13P2-DOWNLOAD-PRODUCER:'+JSON.stringify(downloads)+'\nF13P2-LOCATION-PRODUCER:'+JSON.stringify(inspected)+'\nF13P2-SCREENSHOT-PRODUCER:'+JSON.stringify(producer);
  }catch(error){throw Error(error.message+'; completed='+JSON.stringify(passed));}
}
