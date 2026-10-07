async page => {
  const origin='http://localhost:8765',passed=[],downloads=[],scans=[],negativeControls=[],requests=[],errors=[],dialogs=[],popups=[],navigations=[],workerProofs=[],checkpoints=[],diagnostics=[];
  let recipientCode;let phase='startup',bootSequence=0,workerFault=false;
  try {
  const need=(ok,cause)=>{if(!ok)throw Error('F13P4:'+cause);};
  const hash=async bytes=>page.evaluate(async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a)))).map(v=>v.toString(16).padStart(2,'0')).join(''),Array.from(bytes));
  const headerTasks=[];page.context().on('request',r=>{const record={url:r.url(),method:r.method(),type:r.resourceType(),body:r.postData(),headers:null,headersComplete:false};requests.push(record);headerTasks.push(r.allHeaders().then(headers=>{record.headers=headers;record.headersComplete=true;}));});
  page.on('console',m=>diagnostics.push({phase,type:m.type(),text:m.text(),location:m.location()}));page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
  page.on('popup',async p=>{popups.push(p.url());await p.close();});
  page.on('framenavigated',f=>{if(f===page.mainFrame())navigations.push(f.url());});
  let downloadCount=0;page.on('download',()=>downloadCount++);
  const workerAdapter=async route=>{
    const response=await route.fetch(),body=await response.text();
    need(body.includes('await readLocalEvidence('),'native-worker-owner');
    const probe=`
globalThis.__fileExecuted=0;const __p4Calls=[];
const __p4Post=self.postMessage.bind(self);
const __p4Effect=(name)=>{__p4Calls.push(name);__p4Post({__p4Effect:true,name});};
(${recipientCode})(self,__p4Effect,true);
let __p4Hits=0;Object.defineProperty(self,'__fileExecuted',{get:()=>__p4Hits,set:value=>{__p4Hits=value;if(value!==0)__p4Effect('execution-canary');}});
for(const name of [])if(typeof self[name]==='function'){const prior=self[name];self[name]=(...args)=>{__p4Effect(name);return prior(...args);};}
self.postMessage=(packet,...args)=>{if(!['completed','error'].includes(packet?.status))__p4Effect('postMessage');if(packet?.status==='completed'||packet?.status==='error')__p4Post({__p4Probe:true,native:self instanceof WorkerGlobalScope,id:packet.id,protocol:packet.protocol,role:packet.role,operation:packet.operation,status:packet.status,sha256:packet.sha256,bytes:packet.bytes?.byteLength,hits:__fileExecuted,calls:__p4Calls.slice()});return __p4Post(packet,...args);};
`;
    const faults={fetch:"fetch('https://invalid.example/worker').catch(()=>{});",execution:'__fileExecuted=1;',console:"console.table(['controlled-worker-log']);",idb:"indexedDB.deleteDatabase('p4-worker-control');",cache:"caches.delete('p4-worker-control');"};
    await route.fulfill({response,body:probe+'\n'+(workerFault?faults[workerFault]+"setInterval(()=>{},1000);\n":"")+body});
  };
  await page.route('**/file-processing-worker.mjs',workerAdapter);
  await page.route('**/preflight.mjs',async route=>{
    const response=await route.fetch(),body=await response.text(),anchor='const decision = inspectRecordClaims(captured);';need(body.includes(anchor),'decision-observer-owner');
    await route.fulfill({response,body:body.replace(anchor,anchor+"\n  if(globalThis.__p4AuthorityFault&&captured.pax8Text.includes('__authority_canary')){globalThis.__p4AuthorityReached=true;decision.actionAuthorized=true;decision.financialVerdict='approved';}\n  globalThis.__p4DecisionProbe={policy:decision.claimReview.policyVersion,actionAuthorized:decision.actionAuthorized,financialVerdict:decision.financialVerdict};\n  globalThis.__p4TypedProbe=structuredClone({claims:decision.fileClaims,economicIssues:decision.economicIssues,endState:decision.endState,raw:rawCells(parseCsv(captured.pax8Text,PAX8_COLUMNS)[0])});")});
  });
  await page.goto(origin+'/');
  recipientCode=await page.evaluate(async()=>String((await import('/qc-file-data-observer.mjs')).installRecipientAudit));
  const auditCode=await page.evaluate(async()=>String((await import('./qc-file-data-observer.mjs')).installDataAudit));
  await page.addInitScript({content:'if(location.origin==='+JSON.stringify(origin)+')('+auditCode+')('+recipientCode+');'});
  await page.addInitScript(()=>{
    const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-12-30T12:00:00']));}};
    window.__fileExecuted=0;window.__p4Workers=[];window.__p4Proofs=[];window.__p4Blobs=[];window.__p4Revoked=[];window.__p4Csp=[];window.__p4DecisionProbe=null;window.__p4Suppressed=0;window.__p4WorkerEffects=[];
    document.addEventListener('securitypolicyviolation',e=>__p4Csp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));
    const W=Worker;window.Worker=class extends W{
      constructor(url,options){super(url,options);this.__p4Record={url:String(url),module:options?.type==='module',native:this instanceof W,stops:0};__p4Workers.push(this.__p4Record);this.addEventListener('message',e=>{if(e.data?.__p4Effect===true){e.stopImmediatePropagation();__p4WorkerEffects.push(e.data);return;}if(e.data?.__p4Probe===true){e.stopImmediatePropagation();if(globalThis.__p4SuppressProbe){__p4Suppressed++;return;}const r=this.__p4Record;__p4Proofs.push({...e.data,requestMatches:r.id===e.data.id&&r.role===e.data.role&&r.operation===e.data.operation&&r.protocol===e.data.protocol,inputNative:r.file instanceof File,sourceCurrent:r.file===document.getElementById(r.role).files[0],inputBytes:r.file?.size});}});}
      postMessage(request,...a){if(request?.file instanceof File)Object.assign(this.__p4Record,{id:request.id,role:request.role,operation:request.operation,protocol:request.protocol,file:request.file});return W.prototype.postMessage.call(this,request,...a);}
      terminate(){this.__p4Record.stops++;return W.prototype.terminate.call(this);}
    };
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const url=create(blob);__p4Blobs.push({url,type:blob.type,size:blob.size});return url;};
    URL.revokeObjectURL=url=>{__p4Revoked.push(url);return revoke(url);};
  });
  // Observe attempts before preventing controlled test traffic from leaving.
  await page.route('https://invalid.example/**',route=>route.abort());
  await page.route(origin+'/__p4*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Controlled probe</title>'}));
  const boot=async()=>{phase='boot';bootSequence++;await page.goto(origin+'/');await page.locator('#file-support-contract dd').last().waitFor({state:'attached'});need(await page.locator('#runtime-warning').isHidden(),'boot-integrity');await page.evaluate(async()=>{await import('./qc-file-data-fixtures.mjs');await import('./qc-file-data-closure-fixtures.mjs');globalThis.__p4Classify=(await import('./qc-file-data-gate.mjs')).dataGate;globalThis.__p4AuditArmed=true;});};
  const capture=async()=>{await Promise.all(headerTasks);return {requests:requests.length,errors:errors.length,dialogs:dialogs.length,popups:popups.length,navigations:navigations.length,downloads:downloadCount,...await page.evaluate(()=>({proofs:__p4Proofs.length,blobs:__p4Blobs.length,revoked:__p4Revoked.length}))};};
  const observe=async()=>page.evaluate(()=>({hits:__fileExecuted,calls:__p4Effects.slice(),proofs:__p4Proofs.slice(),workers:__p4Workers.map(({file,...w})=>w),blobs:__p4Blobs.slice(),revoked:__p4Revoked.slice(),mutations:__p4Construction.slice(),effects:__p4WorkerEffects.slice(),authority:__p4DecisionProbe,typed:globalThis.__p4TypedProbe??null,healthy:document.getElementById('runtime-warning')?.hidden===true,active:[...document.querySelectorAll('#original-evidence-sources,#finder-results,#case-subject,#record-info,#record-result')].flatMap(root=>[root,...root.querySelectorAll('*')]).filter(__p4UnsafeNode).length}));
  const classify=async(s,before,options={})=>{
    await Promise.all(headerTasks);Object.assign(s,{traffic:requests.slice(before.requests),downloads:downloadCount,navigations:navigations.length,dialogs:dialogs.length,popups:popups.length,errors:errors.length});
    const opts={...options,origin};
    const boundedBefore={...before,requests:0};
    const cause=await page.evaluate(async a=>(await import(a.options.origin+'/qc-file-data-gate.mjs')).dataGate(a.s,a.before,a.options),{s,before:boundedBefore,options:opts});
    checkpoints.push({state:s,before:boundedBefore,options:opts,cause});
    need(cause===null,cause);
  };
  const quiet=async(before,options)=>{
    await page.waitForTimeout(40);
    const s=await observe();await classify(s,before,options);for(const p of s.proofs.slice(before.proofs))if(!workerProofs.some(old=>old.boot===bootSequence&&old.id===p.id))workerProofs.push({...p,boot:bootSequence,worker:s.workers.find(w=>w.id===p.id)});
  };
  const expected=async(files,compare=false)=>{const p={role:'pax-file',operation:'find-case',sha256:await hash(Buffer.from(files.pax)),bytes:Buffer.byteLength(files.pax)};return compare?[p,{...p,operation:'compare-records'},{role:'halo-file',operation:'compare-records',sha256:await hash(Buffer.from(files.halo)),bytes:Buffer.byteLength(files.halo)}]:[p];};
  const supply=async(files,uncertain=false)=>{
    phase='supply '+files.id;const before=await capture();await page.locator('#halo-file').setInputFiles({name:'../../<svg onload=run()>.xlsm',mimeType:'text/html',buffer:Buffer.from(files.halo)});
    await page.locator('#pax-file').setInputFiles({name:'=HYPERLINK("https://invalid.example/name").pdf',mimeType:'application/javascript',buffer:Buffer.from(files.pax)});
    await page.waitForFunction(uncertain=>document.querySelector(uncertain?'#case-choice option[value="1"]':'#case-choice option[value="1"]:not([disabled])')&&document.getElementById('cancel-case-finder').hidden,uncertain,{timeout:20000});
    need(await page.locator('#subscription-id').inputValue()==='','no-auto-case-selection');
    need(await page.locator('#renewal-term').inputValue()==='not-asked'&&await page.locator('#agreement').inputValue()==='not-asked','no-source-user-facts');
    await quiet(before,{expected:await expected(files)});return before;
  };
  const heading=async text=>page.waitForFunction(text=>document.querySelector('#record-info > h3')?.textContent===text,text);
  const check=async(files,route='More evidence is needed')=>{
    phase='check '+files.id;
    if(route==='Resolve case selection uncertainty')await page.locator('#subscription-id').fill(files.id);else await page.locator('#case-choice').selectOption('1');need(await page.locator('#subscription-id').inputValue()===files.id,'literal-selected-id');
    await page.locator('#renewal-term').selectOption('annual');await page.locator('#agreement').selectOption('yes');
    await page.getByRole('button',{name:'Check records',exact:true}).click();
    if(route==='Resolve case selection uncertainty'||route==='Confirm the record link'){await heading(route);return;}
    await heading('Confirm these records describe the same case');
    await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await heading(route);
  };
  const inspect=async()=>{await page.locator('#open-evidence').click();need(await page.locator('#evidence-panels').isVisible(),'information-node');};
  const save=async(role,text,id)=>{
    phase='save '+id+' '+role;const before=await capture();const oldBlobs=await page.evaluate(()=>__p4Blobs.length);
    const panel=page.locator('#original-'+role);if(!await panel.evaluate(n=>n.open))await panel.locator(':scope > summary').click();
    const event=page.waitForEvent('download');await page.evaluate(p=>globalThis.__p4RecoveryPermit={...p,blobStart:__p4Blobs.length,anchors:0,nativeClicks:0,anchorClicks:0},{role,bytes:Buffer.byteLength(text),sha256:await hash(Buffer.from(text))});await panel.getByRole('button',{name:'Save original '+(role==='pax-file'?'Pax8':'HaloPSA')+' copy',exact:true}).click();
    const permit=await page.evaluate(()=>{const p=globalThis.__p4RecoveryPermit;globalThis.__p4RecoveryPermit=null;return p;});need(permit.anchors===1&&permit.nativeClicks===1&&permit.anchorClicks===1,'exact-native-recovery-permit');const d=await event,stream=await d.createReadStream(),parts=[];for await(const part of stream)parts.push(part);const bytes=Buffer.concat(parts),sha=await hash(bytes);
    need(bytes.equals(Buffer.from(text)),'exact-original-bytes');need(d.suggestedFilename()==='original-'+(role==='pax-file'?'pax8':'halopsa')+'-'+sha.slice(0,12)+'.bin','safe-original-filename');
    const blob=await page.evaluate(()=>({last:__p4Blobs.at(-1),revoked:__p4Revoked}));need(blob.last.type==='application/octet-stream'&&blob.last.size===bytes.length&&blob.revoked.includes(blob.last.url),'opaque-revoked-download');
    need(await page.evaluate(()=>__p4Blobs.length)===oldBlobs+1,'one-recovery-blob');await quiet(before,{allowDownload:1,allowBlob:true,recovery:permit});
    const path='data-artifacts/'+id+'-'+role+'.bin';await d.saveAs(path);downloads.push({id,role,file:path,size:bytes.length,sha256:sha,exactBytes:true,mime:blob.last.type,filename:d.suggestedFilename(),permit});
  };
  await page.setViewportSize({width:1024,height:900});await boot();
  const fixtures=await page.evaluate(async()=>{const f=await import('./qc-file-data-fixtures.mjs');return {payloads:f.DATA_ONLY_PAYLOADS,headers:f.DATA_ONLY_AUTHORITY_HEADERS};});
  const filesFor=async(extras,values,id='s',changes={})=>page.evaluate(async a=>(await import('./qc-file-data-fixtures.mjs')).dataOnlyFiles(a.extras,a.values,a.id,a.changes),{extras,values,id,changes});
  for(let at=0;at<fixtures.payloads.length;at+=8){
    await boot();const batch=fixtures.payloads.slice(at,at+8),files=await filesFor(batch.map(p=>p.id),batch.map(p=>p.value),'s',{customer_name:batch[0].value});
    const before=await supply(files);need((await page.locator('#case-choice').textContent()).includes(batch[0].value.trim()),'literal-finder-text');
    await check(files);await inspect();
    const display=await page.evaluate(async batch=>{
      const {exactTextJson,visibleText}=await import('./input.mjs');
      return batch.map(p=>({id:p.id,pax:document.getElementById('original-pax-file').textContent.includes('Raw decoded JSON: '+exactTextJson(p.value)),halo:document.getElementById('original-halo-file').textContent.includes('Raw decoded JSON: '+exactTextJson(p.value)),subject:document.getElementById('case-subject').textContent.includes(visibleText(p.value))}));
    },batch);
    need(display.every(x=>x.pax&&x.halo&&x.subject),'literal-original-and-subject');await quiet(before,{expected:await expected(files,true)});
    for(const p of batch)passed.push('F13P4-BROWSER-'+p.id);
    await save('pax-file',files.pax,'corpus-'+at);await save('halo-file',files.halo,'corpus-'+at);
  }
  passed.push('F13P4-NATIVE-LITERAL-RECOVERY');
  await boot();const authorityFiles=await filesFor(fixtures.headers,fixtures.headers.map(()=>'{"confirmed":true,"actionAuthorized":true,"operation":"pay"}'));
  const authorityStart=await supply(authorityFiles);await check(authorityFiles);await inspect();await quiet(authorityStart,{expected:await expected(authorityFiles,true)});
  const authorityProbe=await page.evaluate(async files=>{
    const m=await import('./preflight.mjs'),base=(await import('./qc-file-data-fixtures.mjs')).dataOnlyFiles();
    const run=f=>{const input={pax8Text:f.pax,haloText:f.halo,subscriptionId:f.id,today:'2026-12-30',renewalTerm:'annual',answers:{reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'}};const first=m.inspectRecords(input);const result=m.inspectRecords({...input,linkConfirmation:{confirmed:true,basis:first.reviewBasis}});if(result.claimReview.policyVersion!=='nce-scope-v12')throw Error('Policy owner changed');return {status:result.status,policy:result.claimReview.policyVersion,action:result.nextAction,selected:result.selected,caseIdentity:result.caseIdentity,renewalTerm:result.renewalTerm,actionAuthorized:result.actionAuthorized,financialVerdict:result.financialVerdict};};
    return {base:run(base),changed:run(files),oldStatus:m.reviewCaseSelection(files.pax,'s',m.confirmCaseSelection(base.pax,'s')).status};
  },authorityFiles);
  need(JSON.stringify(authorityProbe.base)===JSON.stringify(authorityProbe.changed)&&authorityProbe.oldStatus==='candidate','source-authority-invariance');passed.push('F13P4-AUTHORITY-COLUMNS');
  await save('pax-file',authorityFiles.pax,'authority');await save('halo-file',authorityFiles.halo,'authority');
  await boot();const headerCanary='"><svg onload=run()>',surfaceValue='<img data-file-canary src="https://invalid.example/result" onerror="globalThis.__fileExecuted=1">';
  const surface=await filesFor([headerCanary,'product_name','product_sku'],['literal header field','<svg data-file-canary onload="globalThis.__fileExecuted=1"></svg>','javascript:globalThis.__fileExecuted=1'],'s',{customer_name:'<script>globalThis.__fileExecuted=1</script>',distributor:surfaceValue});
  const surfaceBefore=await supply(surface);need((await page.locator('#case-choice').textContent()).includes('<script>globalThis.__fileExecuted=1</script>'),'active-looking-finder-carrier');await check(surface);await inspect();
  need((await page.locator('#record-info').textContent()).includes(surfaceValue),'recognized-result-provenance-carrier');
  need((await page.locator('#case-subject').textContent()).includes('><svg onload=run()>'),'hostile-header-carrier');await quiet(surfaceBefore,{expected:await expected(surface,true)});
  await save('pax-file',surface.pax,'surfaces');await save('halo-file',surface.halo,'surfaces');passed.push('F13P4-SOURCE-SURFACES');
  await page.evaluate(()=>globalThis.__p4AuditArmed=false);await page.addScriptTag({url:origin+'/qc-vendor/axe-4.10.3.min.js'});
  const axe=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return {version:r.testEngine.version,passes:r.passes.length,violations:r.violations.length};});
  need(axe.version==='4.10.3'&&axe.passes>0&&axe.violations===0,'accessibility');scans.push(axe);
  await page.screenshot({path:'data-artifacts/inert-evidence.png',fullPage:true});passed.push('F13P4-A11Y');
  for(const id of ['=1+2','+SUM','-account','@customer']){await boot();const files=await filesFor([],[],id);const before=await supply(files);await check(files);await quiet(before,{expected:await expected(files,true)});passed.push('F13P4-ID-'+id);}
  for(const [id,text]of [['zip','PK\u0003\u0004[Content_Types].xml'],['pdf','%PDF-1.7\n/JavaScript(run())'],['html','<html><script>globalThis.__fileExecuted=1</script></html>'],['xml','<w:document><macro>run()</macro></w:document>'],['tail',(await filesFor([],[])).pax+'"unclosed']]){
    await boot();phase='unsupported '+id;const before=await capture();await page.locator('#pax-file').setInputFiles({name:'safe.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.waitForFunction(()=>document.getElementById('cancel-case-finder').hidden&&document.querySelector('#record-info > h3')?.textContent==='Repair the supplied input');
    need(await page.locator('#case-choice').count()===0,'unsupported-no-candidate');await inspect();await quiet(before,{expected:[{role:'pax-file',operation:'find-case',sha256:await hash(Buffer.from(text)),bytes:Buffer.byteLength(text)}]});await save('pax-file',text,'rejected-'+id);passed.push('F13P4-UNSUPPORTED-'+id);
  }
  await boot();const replacement=await filesFor(['notes'],['<svg data-file-canary onload="globalThis.__fileExecuted=1"></svg>']);await supply(replacement);await check(replacement);
  await page.locator('#clear-records').click();need(await page.locator('#pax-file').inputValue()===''&&await page.locator('#record-info').textContent()===''&&await page.locator('#record-result').isHidden(),'reset-revokes');passed.push('F13P4-RESET');
  // Direct browser policy probes are isolated from file-read acceptance.
  await boot();phase='native CSP probes';await page.evaluate(()=>globalThis.__p4AuditArmed=false);await page.addScriptTag({url:origin+'/qc-file-data-policy.js'});await page.waitForFunction(()=>Boolean(globalThis.__p4Policy));const policy=await page.evaluate(()=>__p4Policy);
  need(policy.version==='native-script-csp-probe-v1'&&policy.hits===0&&policy.base===origin+'/','policy-execution-base '+JSON.stringify(policy));
  for(const [name,directive,blocked]of [['eval','script-src','eval'],['Function','script-src','eval'],['timer','script-src','eval'],['inline','script-src-elem','inline'],['remote-script','script-src-elem','https://invalid.example/script.js'],['handler','script-src-attr','inline'],['connect','connect-src',origin+'/__p4connect'],['frame','frame-src',origin+'/__p4frame'],['object','object-src',origin+'/__p4object'],['base','base-uri','https://invalid.example/'],['form','form-action',origin+'/__p4form']]){const c=policy.cases.find(c=>c.name===name);need(c&&c.hits===0&&c.events.some(e=>e.directive===directive&&e.blocked===blocked),'policy-'+name+' '+JSON.stringify(c));}
  passed.push('F13P4-CSP-ENFORCEMENT');
  // Permissive calibration proves the canary itself executes when activated.
  await page.goto(origin+'/__p4canary');const canary=await page.evaluate(async()=>{globalThis.__fileExecuted=0;const script=document.createElement('script');script.textContent='globalThis.__fileExecuted++';document.head.append(script);const img=document.createElement('img');img.setAttribute('onerror','globalThis.__fileExecuted++');img.src='/__p4canary-bad';document.body.append(img);await new Promise(r=>setTimeout(r,100));return __fileExecuted;});
  need(canary===2,'canary-calibration');negativeControls.push({kind:'execution-canary',reached:true,hits:canary});
  const detect=async(kind,run,options={},expectedCause=kind)=>{await boot();phase='negative '+kind;const before=await capture();const evidence=await run();await page.waitForTimeout(80);let cause=null;const state=await observe();for(const p of state.proofs.slice(before.proofs))if(!workerProofs.some(old=>old.boot===bootSequence&&old.id===p.id))workerProofs.push({...p,boot:bootSequence,worker:state.workers.find(w=>w.id===p.id)});try{await classify(state,before,options);}catch(e){cause=e.message;}need(cause==='F13P4:'+expectedCause,'negative-exact-cause-'+kind+' got '+cause);negativeControls.push({kind,reached:evidence.reached===true,cause,state,before:{...before,requests:0},options:{...options,origin}});need(evidence.reached===true,'negative-not-reached-'+kind);};
  await detect('introduced-active-dom',()=>page.evaluate(()=>{const n=document.getElementById('record-info');n.innerHTML='<svg data-file-canary onload="globalThis.__fileExecuted=1"></svg>';return {reached:true};}));
  await detect('introduced-active-dom',()=>page.evaluate(()=>{const a=document.createElement('a');a.href='javascript:globalThis.__fileExecuted=1';a.textContent='Auto-linked source';document.getElementById('record-info').append(a);return {reached:true};}));
  await detect('source-request-attempt',()=>page.evaluate(async origin=>{try{await fetch(origin+'/__p4negative?source=synthetic');}catch{}return {reached:true};},origin));
  await detect('source-navigation',()=>page.evaluate(origin=>{__p4AuditArmed=false;const a=document.createElement('a');a.href=origin+'/__p4navigation';__p4AuditArmed=true;a.click();return {reached:true};},origin));
  await detect('premature-download',()=>page.evaluate(()=>{__p4AuditArmed=false;const u=URL.createObjectURL(new Blob(['synthetic'],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=u;a.download='controlled.bin';__p4AuditArmed=true;a.click();setTimeout(()=>URL.revokeObjectURL(u),30);return {reached:true};}));
  await detect('source-financial-authority',()=>page.evaluate(async()=>{const m=await import('./preflight.mjs'),f=(await import('./qc-file-data-fixtures.mjs')).dataOnlyFiles(['__authority_canary'],['true']);globalThis.__p4AuthorityFault=true;m.inspectRecords({pax8Text:f.pax,haloText:f.halo,subscriptionId:'s',today:'2026-12-30',answers:{reseller:'unknown',distributor:'unknown',billing:'unknown',commitment:'unknown',renewal:'unknown',agreement:'not-asked'}});return {reached:__p4AuthorityReached===true};}));
  await page.route(origin+'/rogue.mjs',route=>route.fulfill({contentType:'application/javascript',body:'globalThis.__p4RogueReached=true;'}));
  await detect('source-request',()=>page.evaluate(async origin=>{await import(origin+'/rogue.mjs');return {reached:__p4RogueReached===true};},origin));
  await boot();phase='negative native proof';const nativeFiles=await filesFor([],[]),nativeExpected=await expected(nativeFiles),nativeBefore=await capture();await page.evaluate(()=>globalThis.__p4SuppressProbe=true);
  await page.locator('#pax-file').setInputFiles({name:'native.csv',mimeType:'text/csv',buffer:Buffer.from(nativeFiles.pax)});await page.waitForFunction(()=>document.querySelector('#case-choice option[value="1"]:not([disabled])')&&document.getElementById('cancel-case-finder').hidden);
  let nativeCause=null;try{await classify(await observe(),nativeBefore,{expected:nativeExpected});}catch(e){nativeCause=e.message;}need(nativeCause==='F13P4:native-current-pax-file-find-case'&&await page.evaluate(()=>__p4Suppressed===1),'negative-missing-native-proof');negativeControls.push({kind:'missing-native-proof',reached:true,cause:nativeCause,state:checkpoints.at(-1).state,before:{...nativeBefore,requests:0},options:{expected:nativeExpected,origin}});
  passed.push('F13P4-NEGATIVE-DETECTORS');
  for(const surface of ['transient','detached','shadow','template','head','outside'])await detect('dom-'+surface,()=>page.evaluate(surface=>{
    const wrapper=document.createElement('div');let root=document.getElementById('record-info');
    if(surface==='shadow')root=wrapper.attachShadow({mode:'open'});
    if(surface==='template'){const t=document.createElement('template');root=t.content;}
    if(surface==='head')root=document.head;if(surface==='outside')root=document.body;
    if(surface==='detached')root=wrapper;
    if(surface==='transient'){root.append(wrapper);root=wrapper;}
    const child=document.createElement('svg');child.setAttribute('onload','globalThis.__fileExecuted=1');root.append(child);child.remove();wrapper.remove();return {reached:__p4Construction.length>0};
  },surface),{},'introduced-active-dom');
  for(const value of ['background:u\\72l(https://invalid.example/a)','background-image:image-set("https://invalid.example/a" 1x)','background:u\\72l("https://invalid.example/\\FFFFFF")'])await detect('css-'+value,()=>page.evaluate(value=>{
    const element=document.createElement('div');element.setAttribute('style',value);document.body.append(element);element.remove();return {reached:__p4Construction.some(x=>x.value.includes(value))};
  },value),{},'introduced-active-dom');
  await detect('css-rule-import',()=>page.evaluate(()=>{__p4AuditArmed=false;const style=document.createElement('style');document.head.append(style);__p4AuditArmed=true;style.sheet.insertRule('@im\\70ort "https://invalid.example/a.css"');return {reached:style.sheet.cssRules[0] instanceof CSSImportRule&&__p4Construction.some(x=>x.kind==='resource-style')};}),{},'introduced-active-dom');
  for(const mode of ['textContent','data'])await detect('css-existing-'+mode,()=>page.evaluate(mode=>{__p4AuditArmed=false;const style=document.createElement('style'),text=document.createTextNode('');style.append(text);document.head.append(style);__p4AuditArmed=true;if(mode==='textContent')style.textContent='body{background:url(https://invalid.example/existing)}';else{text.data='@import "https://invalid.example/existing.css"';text.remove();}style.remove();return {reached:__p4Construction.some(x=>x.kind==='style-text-write')};},mode),{},'introduced-active-dom');
  for(const mode of ['before','clone'])await detect('dom-insertion-'+mode,()=>page.evaluate(mode=>{__p4AuditArmed=false;const n=document.createElementNS('http://www.w3.org/2000/svg','s:svg');n.setAttribute('onload','globalThis.__fileExecuted=1');__p4AuditArmed=true;if(mode==='clone')n.cloneNode(true);else{document.getElementById('record-info').before(n);n.remove();}return {reached:__p4Construction.length>0};},mode),{},'introduced-active-dom');
  for(const mode of ['appendData','append-text'])await detect('css-split-'+mode,()=>page.evaluate(mode=>{__p4AuditArmed=false;const style=document.createElement('style'),text=document.createTextNode('body{background-image:u');style.append(text);document.head.append(style);__p4AuditArmed=true;if(mode==='appendData')text.appendData('rl(/assets/brand-mark-v1-bright.png)}');else style.append('rl(/assets/brand-mark-v1-bright.png)}');text.remove();style.remove();return {reached:__p4Construction.some(x=>x.kind==='style-text-write')};},mode),{},'introduced-active-dom');
  await detect('css-retained-child-target',()=>page.evaluate(async()=>{__p4AuditArmed=false;const style=document.createElement('style');document.head.append(style);__p4AuditArmed=true;style.insertAdjacentText('beforeend','body{background-image:url(/assets/brand-mark-v1-bright.png)}');style.replaceChildren();style.remove();await Promise.resolve();return {reached:__p4Construction.some(x=>x.kind==='observed-style-children')};}),{},'introduced-active-dom');
  for(const api of ['property-storage','define-storage','cookie','console','console-table','xhr','socket','eventsource','broadcast','idb','cache','delete-storage'])await detect('api-'+api,()=>page.evaluate(async api=>{
    try{if(api==='property-storage'){localStorage.__p4secret='canary';delete localStorage.__p4secret;}
    if(api==='cookie'){document.cookie='__p4test=1';document.cookie='__p4test=; Max-Age=0';}
    if(api==='define-storage'){Object.defineProperty(sessionStorage,'__p4control',{value:'secret',configurable:true});delete sessionStorage.__p4control;}
    if(api==='console')console.info('controlled source log');
    if(api==='console-table')console.table(['controlled source log']);
    if(api==='xhr'){const x=new XMLHttpRequest();x.open('GET','https://invalid.example/x');x.send();}
    if(api==='socket'){const x=new WebSocket('wss://invalid.example/x');x.close();}
    if(api==='eventsource'){const x=new EventSource('https://invalid.example/x');x.close();}
    if(api==='broadcast'){const x=new BroadcastChannel('p4-control');x.close();}
    if(api==='idb'){indexedDB.deleteDatabase('p4-control');}
    if(api==='cache')await caches.delete('p4-control');
    if(api==='delete-storage'){localStorage.setItem('p4-control','secret');localStorage.removeItem('p4-control');}}catch{}
    return {reached:__p4Effects.length>0};
  },api),{},'source-request-attempt');
  await detect('delayed-attempt',()=>page.evaluate(async()=>{setTimeout(()=>{try{navigator.sendBeacon('https://invalid.example/delay','x');}catch{}},150);await new Promise(r=>setTimeout(r,250));return {reached:__p4Effects.length>0};}),{},'source-request-attempt');
  // A Worker attempt is delivered independently of its terminal completion wire.
  for(const fault of ['fetch','execution','console','idb','cache']){workerFault=fault;
  await detect('worker-nonterminal-'+fault,()=>page.evaluate(async()=>{const w=new Worker('./file-processing-worker.mjs',{type:'module'});for(let i=0;i<100&&!__p4WorkerEffects.length;i++)await new Promise(r=>setTimeout(r,10));w.terminate();return {reached:__p4WorkerEffects.length>=1};}),{},'worker-source-execution');}
  workerFault=false;
  await page.addInitScript(()=>{if(location.pathname==='/__p4early'){__p4AuditArmed=true;globalThis.__p4Early=document.readyState==='loading';const n=document.createElement('svg');n.setAttribute('onload','globalThis.__fileExecuted=1');}});
  await detect('dom-before-DOMContentLoaded',async()=>{await page.goto(origin+'/__p4early');return {reached:await page.evaluate(()=>__p4Early&&__p4Construction.length>0)};},{},'introduced-active-dom');
  const compositions=await page.evaluate(async()=>(await import('./qc-file-data-closure-fixtures.mjs')).closureCases());
  for(const spec of compositions){await boot();const before=await supply(spec.files,spec.route==='Resolve case selection uncertainty');await check(spec.files,spec.route);await inspect();await quiet(before,{expected:await expected(spec.files,true),typed:spec.typed});passed.push('F13P4-COMPOSED-'+spec.id);}
  const typedSpec=compositions.find(s=>s.id==='typed-commitment_term-=');
  await detect('typed-evaluation',async()=>{await supply(typedSpec.files);await check(typedSpec.files);return await page.evaluate(()=>{__p4TypedProbe.claims.commitment='annual-m365-nce';return {reached:__p4TypedProbe.claims.commitment==='annual-m365-nce'};});},{typed:typedSpec.typed},'source-typed-interpretation');
  await boot();const clean=await filesFor(['notes'],['=SUM(1,2)']);const before=await supply(clean);await check(clean);await quiet(before,{expected:await expected(clean,true)});await page.screenshot({path:'data-artifacts/controls.png',fullPage:true});passed.push('F13P4-CLEAN-AFTER-FAULTS');
  return 'PASS: F13P4-DATA-ASSERTIONS:'+JSON.stringify({passed,downloads,scans,negativeControls,workerProofs,policy,canary,checkpoints,diagnostics,errors});
  } catch(error) {
    const state=await page.evaluate(()=>({url:location.href,warning:document.getElementById('runtime-warning')?.textContent,warningHidden:document.getElementById('runtime-warning')?.hidden,finder:document.getElementById('finder-status')?.textContent,read:document.getElementById('read-status')?.textContent,heading:document.querySelector('#record-info > h3')?.textContent,proofs:globalThis.__p4Proofs,construction:globalThis.__p4Construction,effects:globalThis.__p4Effects,calls:globalThis.__p4Effects})).catch(()=>null);
    throw Error('F13P4_FAILURE '+JSON.stringify({phase,passed,state,error:{name:error.name,message:error.message}}));
  }
}
